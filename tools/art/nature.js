"use strict";
// Trees, rocks, reeds and other natural sprites. Origin = ground point at the trunk base.

const SEASON_GREENS = {
  maha: { deep: "#1f4a22", mid: "#2f6b2c", lit: "#5f9a3e", tip: "#8cbf55" },
  yala: { deep: "#3d4a20", mid: "#5f6a2c", lit: "#93993f", tip: "#c4b65a" }
};

// Painterly foliage: leaf clusters scattered over an ellipsoid, lit by their normal.
function canopy(cx, cy, cz, rx, rz, pal, o = {}) {
  const N = o.n || 140;
  if (MODE.shadow) {
    const prof = [];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI; prof.push([Math.max(0.001, Math.cos(a) * rx / TILE), cz + Math.sin(a) * rz]); }
    lathe(cx, cy, prof, { col: "#000" }, { seg: 16 });
    return;
  }
  // dark core so gaps never show through
  const c = P(cx, cy, cz);
  g.fillStyle = css(shadeC(pal.deep, 0.75));
  g.beginPath(); g.ellipse(c.x, c.y, rx * 0.9, rz * 0.88, 0, 0, Math.PI * 2); g.fill();
  const pts = [];
  for (let i = 0; i < N; i++) {
    // random point on the ellipsoid surface, mostly the visible hemisphere
    const u = R() * 2 - 1, th = R() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    let n = [s * Math.cos(th), s * Math.sin(th), u];
    if (dot3(n, VIEW) < -0.2) n = [-n[0], -n[1], n[2]];
    const lump = 0.85 + R() * 0.25 + (o.lumpy ? 0.18 * Math.sin(th * 3 + u * 4) : 0);
    const pos = [cx + n[0] * rx * lump / TILE, cy + n[1] * rx * lump / TILE, cz + n[2] * rz * lump];
    const depth = dot3(n, VIEW);
    pts.push([depth, pos, n]);
  }
  pts.sort((a, b) => a[0] - b[0]);
  for (const [depth, pos, n] of pts) {
    let f = lightOf(n) * (0.75 + 0.3 * clamp01(depth + 0.3));
    const under = clamp01(-n[2]);
    const col = f > 0.92 ? mixC(pal.lit, pal.tip, clamp01((f - 0.92) * 6)) : f > 0.7 ? mixC(pal.mid, pal.lit, (f - 0.7) / 0.22) : mixC(pal.deep, pal.mid, f / 0.7);
    const p = P(pos[0], pos[1], pos[2]);
    const leaves = o.leaves || 6, sz = o.leaf || 2.2;
    for (let k = 0; k < leaves; k++) {
      g.fillStyle = css(shadeC(jit(col, 0.1), 1 - under * 0.25));
      const lx = p.x + rr(-sz, sz) * 1.3, ly = p.y + rr(-sz, sz);
      g.beginPath(); g.ellipse(lx, ly, sz * rr(0.5, 0.9), sz * rr(0.3, 0.55), rr(-0.8, 0.8), 0, Math.PI * 2); g.fill();
    }
    if (o.flowers && R() < o.flowers && f > 0.6) {
      g.fillStyle = css(jit(o.flowerCol || "#e0442a", 0.12));
      for (let k = 0; k < 3; k++) g.fillRect(p.x + rr(-2, 2), p.y + rr(-2, 2), 0.9, 0.9);
    }
  }
}

function trunk(x0, y0, x1, y1, z1, w0, w1, col = "#5a3c22") {
  // tapered, lit trunk as a lathe-like strip
  const N = 6;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N;
    const r0 = lerp(w0, w1, t0) / TILE, r1 = lerp(w0, w1, t1) / TILE;
    const a = [lerp(x0, x1, t0 * t0), lerp(y0, y1, t0 * t0), z1 * t0], b = [lerp(x0, x1, t1 * t1), lerp(y0, y1, t1 * t1), z1 * t1];
    lathe(0, 0, [[r0, 0], [r1, b[2] - a[2]]].map(([r, z]) => [r, z]), { col, band: (an, t, f) => lit(jit(col, 0.06), f) }, { seg: 10, jag: null, _off: a });
  }
}
// lathe at an offset point (helper for trunks / branches)
function latheAt(p, profile, mat, opt) { lathe(p[0], p[1], profile.map(([r, z]) => [r, z + p[2]]), mat, opt); }
function branch(a, b, w0, w1, col) {
  // a slanted tapered limb drawn as a thick lit stroke
  if (MODE.shadow) { gline(a, b, "#000", (w0 + w1) * 0.5); return; }
  const pa = Pv(a), pb = Pv(b);
  const lw = (w0 + w1) * 0.6;
  g.lineCap = "round";
  g.strokeStyle = css(lit(col, 0.6)); g.lineWidth = lw;
  g.beginPath(); g.moveTo(pa.x, pa.y); g.lineTo(pb.x, pb.y); g.stroke();
  g.strokeStyle = css(lit(col, 1.0)); g.lineWidth = lw * 0.5;
  g.beginPath(); g.moveTo(pa.x - lw * 0.2, pa.y); g.lineTo(pb.x - lw * 0.2, pb.y); g.stroke();
  g.lineCap = "butt";
}

function broadleaf(season, v, kind) {
  const pal = { ...SEASON_GREENS[season] };
  if (kind === "jak") { pal.deep = shadeC(pal.deep, 0.8); pal.mid = shadeC(pal.mid, 0.82); pal.lit = shadeC(pal.lit, 0.85); }
  const bark = kind === "jak" ? "#4a3420" : kind === "flame" ? "#6a5a48" : "#5a4430";
  const H = kind === "jak" ? 18 : kind === "flame" ? 20 : 22;
  const lean = rr(-0.05, 0.05);
  blob(0, 0, 9, 4.5, "rgba(15,25,5,0.35)");
  latheAt([0, 0, 0], [[0.075, 0], [0.05, 3], [0.04, H]], { col: bark, band: (a, t, f) => lit(jit(bark, 0.06), f) }, { seg: 10 });
  // limbs
  const lobes = kind === "jak" ? [[0, 0, H + 9, 14, 12]] : [];
  if (kind !== "jak") {
    const n = 3 + (v % 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + v;
      const dx = Math.cos(a) * rr(0.18, 0.3), dy = Math.sin(a) * rr(0.18, 0.3);
      branch([lean, 0, H - 2], [dx, dy, H + rr(6, 10)], 2.2, 1.2, bark);
      lobes.push([dx, dy, H + rr(11, 15), rr(9, 12), rr(7, 9)]);
    }
    lobes.push([0, 0, H + 15, kind === "flame" ? 13 : 12, 8]);
  }
  lobes.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) + (b[2] - a[2]) * 0.0);
  for (const [dx, dy, z, rx, rz] of lobes) canopy(dx + lean, dy, z, rx, rz, pal, {
    n: kind === "jak" ? 220 : 110, leaf: kind === "jak" ? 2.0 : 1.9, lumpy: kind === "jak",
    flowers: kind === "flame" ? (season === "yala" ? 0.6 : 0.25) : 0, flowerCol: "#e2462a"
  });
  if (kind === "jak" && !MODE.shadow) for (let i = 0; i < 3; i++) at(rr(-0.06, 0.06), 0.05, rr(7, 14), c => {
    c.fillStyle = "#8f9a3a"; c.beginPath(); c.ellipse(0, 0, 1.8, 2.8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,255,200,0.3)"; c.beginPath(); c.ellipse(-0.6, -0.8, 0.6, 1, 0, 0, Math.PI * 2); c.fill();
  });
}

function palm(season, v) {
  const pal = SEASON_GREENS[season];
  const H = rr(34, 42), bend = rr(0.12, 0.25) * (v % 2 ? 1 : -0.6);
  blob(0, 0, 6, 3, "rgba(15,25,5,0.35)");
  // ringed trunk, curving
  const segs = 14;
  let prev = [0, 0, 0];
  for (let i = 1; i <= segs; i++) {
    const t = i / segs, cur = [bend * t * t, -bend * 0.3 * t * t, H * t];
    const w = lerp(2.4, 1.6, t);
    if (MODE.shadow) gline(prev, cur, "#000", w * 1.2);
    else {
      const pa = Pv(prev), pb = Pv(cur);
      g.lineCap = "butt";
      g.strokeStyle = css(lit("#7a6248", 0.65)); g.lineWidth = w * 1.25; g.beginPath(); g.moveTo(pa.x, pa.y); g.lineTo(pb.x, pb.y); g.stroke();
      g.strokeStyle = css(lit("#8d765a", 1.0)); g.lineWidth = w * 0.6; g.beginPath(); g.moveTo(pa.x - w * 0.3, pa.y); g.lineTo(pb.x - w * 0.3, pb.y); g.stroke();
      g.strokeStyle = "rgba(40,25,10,0.5)"; g.lineWidth = 0.35;
      g.beginPath(); g.moveTo(pb.x - w * 0.6, pb.y + 0.3); g.lineTo(pb.x + w * 0.6, pb.y - 0.1); g.stroke();
    }
    prev = cur;
  }
  const top = prev;
  // fronds: back ones first
  const fronds = [];
  const nf = 11;
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + rr(-0.2, 0.2) + v;
    fronds.push([Math.cos(a) + Math.sin(a), a, rr(0.42, 0.55), rr(-4, 2)]);
  }
  fronds.sort((a, b) => a[0] - b[0]);
  for (const [, a, len, droop] of fronds) {
    const dir = [Math.cos(a), Math.sin(a)];
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      pts.push([top[0] + dir[0] * len * t, top[1] + dir[1] * len * t, top[2] + 6 * Math.sin(t * Math.PI * 0.6) - t * t * (14 - droop)]);
    }
    if (MODE.shadow) { for (let k = 0; k < 8; k++) gline(pts[k], pts[k + 1], "#000", 2.6 * (1 - k / 10)); continue; }
    const nrm = norm3([dir[0], dir[1], 1.2]);
    const f = lightOf(nrm);
    for (let k = 1; k <= 8; k++) {
      const p = Pv(pts[k]), q = Pv(pts[k - 1]);
      const t = k / 8, ll = 4.2 * Math.sin(t * Math.PI) + 0.8;
      const ang = Math.atan2(p.y - q.y, p.x - q.x);
      for (const side of [-1, 1]) for (let s = 0; s < 2; s++) {
        const mx = lerp(q.x, p.x, s / 2), my = lerp(q.y, p.y, s / 2);
        const la = ang + side * 1.25 + 0.5;
        g.strokeStyle = css(lit(jit(side > 0 ? pal.lit : pal.mid, 0.12), f * rr(0.85, 1.1))); g.lineWidth = 0.55;
        g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + Math.cos(la) * ll, my + Math.sin(la) * ll + 1.2); g.stroke();
      }
    }
    g.strokeStyle = css(lit("#9a8a4a", f)); g.lineWidth = 0.6;
    g.beginPath(); pts.map(Pv).forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
  }
  // king coconuts
  if (!MODE.shadow) for (let i = 0; i < 5; i++) at(top[0] + rr(-0.03, 0.03), top[1] + rr(-0.03, 0.03), top[2] - rr(1, 3), c => {
    c.fillStyle = pick(["#c98a2a", "#a87a28", "#7a8a2a"]); c.beginPath(); c.arc(rr(-2.4, 2.4), 0, 1.5, 0, 7); c.fill();
  });
}

for (const season of ["maha", "yala"]) {
  for (let v = 0; v < 3; v++) {
    ART.add(`tree.palm.${season}.${v}`, () => { R = rng(`palm${v}`); palm(season, v); }, { size: 150 });
    for (const kind of ["broad", "jak", "flame"]) ART.add(`tree.${kind}.${season}.${v}`, () => { R = rng(`${kind}${v}`); broadleaf(season, v, kind); }, { size: 150 });
  }
  ART.add(`tree.sapling.${season}`, () => {
    latheAt([0, 0, 0], [[0.02, 0], [0.012, 9]], { col: "#6b4c30" }, { seg: 6 });
    canopy(0, 0, 10, 4.5, 4, SEASON_GREENS[season], { n: 30, leaf: 1.4, leaves: 4 });
  }, { size: 60 });
}
ART.add("stump", () => {
  latheAt([0, 0, 0], [[0.09, 0], [0.075, 1.5], [0.07, 4]], { col: "#5a4028" }, { seg: 14 });
  at(0, 0, 4, c => { c.fillStyle = "#d9b27a"; c.beginPath(); c.ellipse(0, 0, 3.6, 1.8, 0, 0, 7); c.fill(); c.strokeStyle = "rgba(130,90,45,0.7)"; c.lineWidth = 0.3; for (let r = 0.8; r < 3.5; r += 0.9) { c.beginPath(); c.ellipse(0, 0, r, r / 2, 0, 0, 7); c.stroke(); } });
  for (let i = 0; i < 12; i++) at(rr(-0.25, 0.25), rr(-0.15, 0.25), 0, c => { c.fillStyle = pick(["#e2c08a", "#c9a46a"]); c.fillRect(0, 0, rr(0.6, 1.4), 0.5); });
}, { size: 60 });

// Granite outcrop boulders (one rock tile).
for (let v = 0; v < 4; v++) ART.add(`rock.${v}`, () => {
  blob(0.5, 0.5, 30, 14, "rgba(20,20,10,0.35)");
  const n = 2 + (v % 3);
  const items = [];
  for (let i = 0; i < n; i++) items.push([rr(0.2, 0.8), rr(0.2, 0.8), rr(0.16, 0.3), rr(8, 20)]);
  items.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  for (const [x, y, r, h] of items) {
    const jag = [];
    for (let i = 0; i < 13; i++) { jag.push([]); for (let k = 0; k < 5; k++) jag[i].push(rr(0.88, 1.1)); }
    const prof = [[r, 0], [r * 1.06, h * 0.2], [r * 1.0, h * 0.45], [r * 0.82, h * 0.7], [r * 0.5, h * 0.9], [r * 0.12, h]];
    lathe(x, y, prof, { col: pick(["#9c968a", "#a59f92", "#8f897c"]), band: (a, t, f) => lit(mixC("#a39d90", "#6f6a5e", R() * 0.18 + (t < 0.2 ? 0.25 : 0)), f) }, { seg: 13, jag: (i, k) => jag[i % 13][k] });
    // lichen
    if (!MODE.shadow) for (let i = 0; i < 6; i++) at(x + rr(-r, r) * 0.6, y + rr(-r, r) * 0.6, h * rr(0.4, 0.9), c => { c.fillStyle = pick(["rgba(200,195,140,0.5)", "rgba(110,130,70,0.5)"]); c.beginPath(); c.arc(0, 0, rr(0.6, 1.6), 0, 7); c.fill(); });
  }
  // grass tufts at the base
  if (!MODE.shadow) for (let i = 0; i < 14; i++) { const p = P(rr(0.05, 0.95), rr(0.05, 0.95), 0); g.strokeStyle = pick(["#4c7a2c", "#6f9a3a"]); g.lineWidth = 0.5; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + rr(-1, 1), p.y - rr(2, 4)); g.stroke(); }
}, { size: 110 });

// Reeds along banks, bushes, lotus.
for (let v = 0; v < 3; v++) ART.add(`reeds.${v}`, () => {
  const n = 14 + v * 4;
  const stems = [];
  for (let i = 0; i < n; i++) stems.push([rr(-0.12, 0.12), rr(-0.08, 0.08), rr(7, 14), rr(-2, 2)]);
  stems.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  for (const [x, y, h, b] of stems) {
    if (MODE.shadow) { gline([x, y, 0], [x, y, h], "#000", 0.5); continue; }
    const p = P(x, y, 0);
    g.strokeStyle = css(jit(pick(["#5d7a2e", "#7a8f3a", "#4a6a28"]), 0.1)); g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(p.x, p.y); g.quadraticCurveTo(p.x + b * 0.3, p.y - h * 0.6, p.x + b, p.y - h); g.stroke();
    if (R() < 0.35) { g.fillStyle = "#6b4426"; g.beginPath(); g.ellipse(p.x + b * 0.85, p.y - h * 0.85, 0.6, 1.6, 0, 0, 7); g.fill(); }
  }
}, { size: 50, blur: 0.8 });
for (const season of ["maha", "yala"]) for (let v = 0; v < 3; v++) ART.add(`bush.${season}.${v}`, () => {
  blob(0, 0, 6, 3, "rgba(15,25,5,0.35)");
  canopy(0, 0, 4, rr(5, 7), rr(4, 5), SEASON_GREENS[season], { n: 45, leaf: 1.5, leaves: 5, flowers: v === 2 ? 0.4 : 0, flowerCol: pick(["#f4f0f8", "#e66a9a", "#f2c94c"]) });
}, { size: 60 });
for (let v = 0; v < 2; v++) ART.add(`lotus.${v}`, () => {
  for (let i = 0; i < 4; i++) at(rr(-0.08, 0.08), rr(-0.08, 0.08), 0, c => {
    c.fillStyle = css(jit("#3f7d3a", 0.15)); c.beginPath(); c.ellipse(0, 0, 3.2, 1.6, 0, 0.35, Math.PI * 2); c.lineTo(0, 0); c.fill();
    c.strokeStyle = "rgba(200,240,180,0.35)"; c.lineWidth = 0.3; c.stroke();
  });
  if (v === 0) at(0.02, 0, 0, c => {
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.38; c.fillStyle = k % 2 ? "#f6b9cf" : "#ec8fb0"; c.beginPath(); c.ellipse(Math.cos(a) * 1.4, -1.6 + Math.sin(a) * 1.2, 0.8, 1.9, a + Math.PI / 2, 0, 7); c.fill(); }
    c.fillStyle = "#f2d24c"; c.beginPath(); c.arc(0, -1.8, 0.6, 0, 7); c.fill();
  });
}, { size: 30, shadow: false, outline: false });
