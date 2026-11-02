"use strict";
// ============================================================================
// BALAKOTUWA art kit — offline sprite generator toolkit.
//
// Every sprite is modelled in the game's grid space (gx, gy, z) and drawn with
// real lighting: each planar face is lit from its normal, then textured in its
// own face space (bricks run along walls, tiles run along roof eaves). The
// same geometry, drawn again through a shadow projection, gives an accurate
// soft cast shadow. Run tools/bake.mjs to bake everything into assets/.
//
// Light comes from the upper left of the screen: left faces lit, right faces
// in shade, shadows fall to the right. Matches render.js.
// ============================================================================

const TILE = 36;                 // physical units per grid tile edge (lighting / texture scale)
const LIGHT = norm3([-0.45, 0.45, 0.77]);
const VIEW = norm3([1, 1, 1.22]); // towards the camera
const SHADOW_K = 0.62;           // shadow length per unit height

let g = null;                    // current 2D context
const MODE = { shadow: false };

// ---------- math ----------
function norm3(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const phys = p => [p[0] * TILE, p[1] * TILE, p[2]];
const grid = p => [p[0] / TILE, p[1] / TILE, p[2]];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => Math.max(0, Math.min(1, v));

function rng(seed) {
  let a = typeof seed === "string" ? [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) : seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let R = rng(1);                  // current sprite RNG (reseeded per sprite)
const rr = (a, b) => a + (b - a) * R();
const pick = arr => arr[Math.floor(R() * arr.length)];

// ---------- projection ----------
function P(gx, gy, z = 0) {
  if (MODE.shadow) {
    const d = (z * SHADOW_K) / (TILE * Math.SQRT2);
    gx += d; gy -= d; z = 0;
  }
  return { x: (gx - gy) * 32, y: (gx + gy) * 16 - z };
}
const Pv = p => P(p[0], p[1], p[2]);

// ---------- colour ----------
function hex(c) {
  if (Array.isArray(c)) return c;
  if (c[0] === "#") { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  return c.match(/[\d.]+/g).slice(0, 3).map(Number);
}
const css = (c, a = 1) => { const [r, gg, b] = hex(c); return a >= 1 ? `rgb(${r | 0},${gg | 0},${b | 0})` : `rgba(${r | 0},${gg | 0},${b | 0},${a})`; };
const shadeC = (c, f) => hex(c).map(v => Math.max(0, Math.min(255, v * f)));
const mixC = (a, b, t) => { a = hex(a); b = hex(b); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
const jit = (c, amt) => { const k = 1 + (R() - 0.5) * 2 * amt; return shadeC(c, k); };
// Warm light, cool shade: lit faces drift warm, shaded faces drift blue.
function lit(c, f) {
  const base = shadeC(c, f);
  const t = clamp01((f - 0.75) / 0.3);
  const warm = [255, 236, 200], cool = [70, 90, 130];
  return f >= 0.75 ? mixC(base, shadeC(warm, f * 0.95), t * 0.08) : mixC(base, cool, (0.75 - f) * 0.35);
}
function lightOf(n) {
  const d = dot3(n, LIGHT), w = 0.6;
  return (0.45 + 0.6 * Math.max(0, (d + w) / (1 + w))) / 0.964;
}

// ---------- faces ----------
// A planar polygon in grid space, lit by its normal and textured in face space.
// pts: [[gx,gy,z],...]. The first edge is the face's u axis (eave / base line).
// mat: { col, tex?, opt } where tex(g, U, V, poly, f, mat) paints in face space.
function face(pts, mat, opt = {}) {
  const ph = pts.map(phys);
  const p0 = ph[0];
  const e1 = norm3(sub3(ph[1], p0));
  let far = null, fd = -1;
  for (const p of ph) {
    const d = sub3(p, p0), perp = sub3(d, mul3(e1, dot3(d, e1)));
    const l = Math.hypot(...perp);
    if (l > fd) { fd = l; far = perp; }
  }
  const e2 = norm3(far);
  let n = norm3(cross3(e1, e2));
  if (dot3(n, VIEW) < 0) n = mul3(n, -1);
  const uv = ph.map(p => { const d = sub3(p, p0); return [dot3(d, e1), dot3(d, e2)]; });
  const O = Pv(grid(p0));
  const eu = P(...add3(grid(p0), grid(e1))), ev = P(...add3(grid(p0), grid(e2)));
  const ax = eu.x - O.x, ay = eu.y - O.y, bx = ev.x - O.x, by = ev.y - O.y;
  g.save();
  g.transform(ax, ay, bx, by, O.x, O.y);
  g.beginPath();
  uv.forEach(([u, v], i) => (i ? g.lineTo(u, v) : g.moveTo(u, v)));
  g.closePath();
  if (MODE.shadow) { g.fillStyle = "#000"; g.fill(); g.restore(); return; }
  const f = (opt.light ?? lightOf(n)) * (opt.dim ?? 1);
  g.fillStyle = css(lit(mat.col, f));
  g.fill();
  g.clip();
  let U = 0, V = 0, minV = Infinity;
  for (const [u, v] of uv) { U = Math.max(U, u); V = Math.max(V, v); minV = Math.min(minV, v); }
  if (mat.tex) mat.tex(g, U, V, uv, f, mat, opt);
  // Ambient occlusion towards the base of walls
  if (opt.ao) {
    const gr = g.createLinearGradient(0, 0, 0, opt.ao);
    gr.addColorStop(0, "rgba(20,12,6,0.45)"); gr.addColorStop(1, "rgba(20,12,6,0)");
    g.fillStyle = gr; g.fillRect(-2, -2, U + 4, opt.ao + 2);
  }
  // Shadow under eaves at the top of a wall
  if (opt.eave) {
    const gr = g.createLinearGradient(0, V, 0, V - opt.eave);
    gr.addColorStop(0, "rgba(25,12,5,0.6)"); gr.addColorStop(1, "rgba(25,12,5,0)");
    g.fillStyle = gr; g.fillRect(-2, V - opt.eave, U + 4, opt.eave + 2);
  }
  g.restore();
  if (opt.edge) edgeLines(pts, opt.edge);
  return { U, V, f };
}

// Thin highlight/outline along selected polygon edges: edge = [[i,j,color,width],...]
function edgeLines(pts, edges) {
  for (const [i, j, col, w] of edges) {
    const a = Pv(pts[i]), b = Pv(pts[j]);
    g.strokeStyle = col; g.lineWidth = w ?? 0.6;
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
}

// Draw in screen space anchored at a grid point (for small details).
function at(gx, gy, z, fn) { if (MODE.shadow) return; const p = P(gx, gy, z); g.save(); g.translate(p.x, p.y); fn(g); g.restore(); }

// ---------- solids ----------
const HL = "rgba(255,245,220,0.35)", DK = "rgba(30,15,5,0.45)";
// Axis-aligned prism. mats: { top, left, right } or one material for all.
function box(gx, gy, z0, w, h, zh, mats, opt = {}) {
  const m = mats.col ? { top: mats, left: mats, right: mats } : mats;
  const A = [gx, gy + h, z0], B = [gx + w, gy + h, z0], C = [gx + w, gy, z0];
  const At = [gx, gy + h, z0 + zh], Bt = [gx + w, gy + h, z0 + zh], Ct = [gx + w, gy, z0 + zh], Dt = [gx, gy, z0 + zh];
  face([A, B, Bt, At], m.left, { ao: opt.ao, eave: opt.eave, ...opt.leftOpt });
  face([B, C, Ct, Bt], m.right, { ao: opt.ao, eave: opt.eave, ...opt.rightOpt });
  if (opt.top !== false) face([At, Bt, Ct, Dt], m.top, opt.topOpt);
  if (!MODE.shadow && opt.edges !== false) {
    edgeLines([At, Bt, Ct, Dt, B, A], [[3, 0, HL, 0.6], [0, 1, HL, 0.7], [1, 2, "rgba(255,240,210,0.18)", 0.6], [1, 4, "rgba(255,240,210,0.22)", 0.5]]);
  }
}

// Hipped roof over the eave rectangle. Ridge runs along the long side.
function hipRoof(gx, gy, w, h, z0, rise, mat, opt = {}) {
  const A = [gx, gy, z0], B = [gx + w, gy, z0], C = [gx + w, gy + h, z0], D = [gx, gy + h, z0];
  const m = Math.min(w, h) / 2 * (opt.hip ?? 1);
  let r1, r2;
  if (w >= h) { r1 = [gx + m, gy + h / 2, z0 + rise]; r2 = [gx + w - m, gy + h / 2, z0 + rise]; }
  else { r1 = [gx + w / 2, gy + m, z0 + rise]; r2 = [gx + w / 2, gy + h - m, z0 + rise]; }
  const W = w >= h;
  // back faces first (visible on low pitches), then the front pair
  const faces = W
    ? [[[B, A, r1, r2]], [[A, D, r1]], [[C, B, r2]], [[D, C, r2, r1]]]
    : [[[B, A, r1]], [[A, D, r2, r1]], [[C, B, r1, r2]], [[D, C, r2]]];
  for (const [pts] of faces) face(pts, mat, { roof: true, ...opt });
  // eave thickness on the two front sides
  const th = opt.thick ?? 1.2;
  if (th > 0) {
    face([[gx, gy + h, z0 - th], [gx + w, gy + h, z0 - th], [gx + w, gy + h, z0], [gx, gy + h, z0]], opt.fascia || mat, { dim: 0.8 });
    face([[gx + w, gy + h, z0 - th], [gx + w, gy, z0 - th], [gx + w, gy, z0], [gx + w, gy + h, z0]], opt.fascia || mat, { dim: 0.8 });
  }
  if (!MODE.shadow) {
    // ridge and hip caps
    const caps = [[r1, r2], [A, r1], [D, W ? r1 : r2], [C, r2], [B, W ? r2 : r1]];
    if (opt.caps !== false) for (const [a, b] of caps) ridgeCap(a, b, mat, opt.capCol, opt.capW);
    // eave fascia line
    const pa = Pv(D), pb = Pv(C), pc = Pv(B);
    g.strokeStyle = "rgba(25,10,4,0.75)"; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(Pv(A).x, Pv(A).y); g.lineTo(pa.x, pa.y); g.lineTo(pb.x, pb.y); g.lineTo(pc.x, pc.y); g.stroke();
    g.strokeStyle = "rgba(255,225,190,0.18)"; g.lineWidth = 0.5;
    g.beginPath(); g.moveTo(pa.x, pa.y - 0.8); g.lineTo(pb.x, pb.y - 0.8); g.stroke();
  }
  return { r1, r2 };
}

function ridgeCap(a, b, mat, capCol, cw = 1) {
  const pa = Pv(a), pb = Pv(b);
  const col = capCol || shadeC(mat.col, 0.85);
  g.lineCap = "round";
  g.strokeStyle = css(shadeC(col, 0.55)); g.lineWidth = 2.6 * cw;
  g.beginPath(); g.moveTo(pa.x, pa.y + 0.4); g.lineTo(pb.x, pb.y + 0.4); g.stroke();
  g.strokeStyle = css(col); g.lineWidth = 1.7 * cw;
  g.beginPath(); g.moveTo(pa.x, pa.y); g.lineTo(pb.x, pb.y); g.stroke();
  g.strokeStyle = "rgba(255,230,200,0.35)"; g.lineWidth = 0.5;
  g.beginPath(); g.moveTo(pa.x - 0.3, pa.y - 0.6); g.lineTo(pb.x - 0.3, pb.y - 0.6); g.stroke();
  g.lineCap = "butt";
}

// Solid of revolution around a vertical axis at (cx, cy). profile: [[r (tiles), z], ...] bottom to top.
function lathe(cx, cy, profile, mat, opt = {}) {
  const N = opt.seg || 40;
  for (let k = 0; k < profile.length - 1; k++) {
    const [r0, z0] = profile[k], [r1, z1] = profile[k + 1];
    const J = opt.jag || (() => 1);
    // draw back facets first, then the front half, sorted by depth
    const quads = [];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const nrm = norm3([Math.cos(am) * (z1 - z0), Math.sin(am) * (z1 - z0), (r0 - r1) * TILE]);
      const depth = Math.cos(am) + Math.sin(am);
      quads.push([depth, a0, a1, nrm, i]);
    }
    quads.sort((a, b) => a[0] - b[0]);
    for (const [, a0, a1, nrm, i] of quads) {
      if (!MODE.shadow && dot3(nrm, VIEW) < -0.05 && z1 > z0) continue;
      const i1 = (i + 1) % N;
      const pts = [
        [cx + Math.cos(a0) * r0 * J(i, k), cy + Math.sin(a0) * r0 * J(i, k), z0], [cx + Math.cos(a1) * r0 * J(i1, k), cy + Math.sin(a1) * r0 * J(i1, k), z0],
        [cx + Math.cos(a1) * r1 * J(i1, k + 1), cy + Math.sin(a1) * r1 * J(i1, k + 1), z1], [cx + Math.cos(a0) * r1 * J(i, k + 1), cy + Math.sin(a0) * r1 * J(i, k + 1), z1]
      ];
      if (r1 < 1e-4) pts.pop();
      if (r0 < 1e-4) pts.shift();
      if (pts.length < 3) continue;
      latheFacet(pts, nrm, mat, opt, (a0 + a1) / 2, k / (profile.length - 1));
    }
  }
  // flat top cap
  const [rt, zt] = profile[profile.length - 1];
  if (rt > 1e-4) {
    const pts = [];
    for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; pts.push([cx + Math.cos(a) * rt, cy + Math.sin(a) * rt, zt]); }
    poly2(pts, MODE.shadow ? "#000" : css(lit(mat.col, lightOf([0, 0, 1]))));
  }
}
function latheFacet(pts, nrm, mat, opt, ang, t) {
  const s = pts.map(Pv);
  g.beginPath(); s.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath();
  if (MODE.shadow) { g.fillStyle = "#000"; g.fill(); return; }
  let f = lightOf(nrm);
  if (mat.spec) f += Math.pow(Math.max(0, dot3(nrm, norm3(add3(LIGHT, VIEW)))), 24) * mat.spec;
  const c = mat.band ? mat.band(ang, t, f) : lit(mat.col, f);
  g.fillStyle = css(c); g.fill();
  g.strokeStyle = css(c); g.lineWidth = 0.5; g.stroke(); // hide seams
}

// Flat polygon in grid space, solid colour.
function poly2(pts, fill, stroke, lw = 1) {
  const s = pts.map(Pv);
  g.beginPath(); s.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath();
  if (fill) { g.fillStyle = MODE.shadow ? "#000" : fill; g.fill(); }
  if (stroke && !MODE.shadow) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function quadXY(gx, gy, w, h, z, fill) { poly2([[gx, gy, z], [gx + w, gy, z], [gx + w, gy + h, z], [gx, gy + h, z]], fill); }

// A round post / cylinder.
function post(gx, gy, r, z0, z1, mat, seg = 10) { lathe(gx, gy, [[r, z0], [r, z1]], mat, { seg }); }

// Line in grid space
function gline(a, b, col, w = 1, cap = "round") {
  if (MODE.shadow) { col = "#000"; }
  const pa = Pv(a), pb = Pv(b);
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = cap;
  g.beginPath(); g.moveTo(pa.x, pa.y); g.lineTo(pb.x, pb.y); g.stroke(); g.lineCap = "butt";
}

// Soft ellipse decal on the ground (contact shadow, puddles)
function blob(gx, gy, rx, ry, col) {
  if (MODE.shadow) return;
  const p = P(gx, gy, 0);
  const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rx);
  gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.save(); g.translate(p.x, p.y); g.scale(1, ry / rx); g.translate(-p.x, -p.y);
  g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, rx, 0, Math.PI * 2); g.fill(); g.restore();
}

// ---------- registry ----------
// ART.add(key, draw, opts) — opts.k bake scale, opts.shadow (default true), opts.outline
const ART = {
  list: [],
  add(key, draw, opts = {}) { this.list.push({ key, draw, opts }); }
};
