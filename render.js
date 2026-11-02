"use strict";
// ============================================================================
// BALAKOTUWA — renderer. Everything that draws lives here; nothing here
// changes game state except cosmetic particles (S.fx).
//
// Art direction: Kandyan hipped clay-tile roofs, whitewashed walls on
// laterite plinths, thatched village huts, dagobas, terraced paddies.
// Light comes from the upper left: left faces lit, right faces in shade.
//
// Art pipeline: painted sprites are baked offline by tools/bake.mjs (see
// tools/art/) into assets/atlas*.png + assets/atlas.js. drawBuilding,
// drawUnit, drawTree etc. use them first and fall back to the procedural
// drawing below when the atlas is missing, so the game never depends on it.
//
// Cosmetic state lives here and never touches the simulation: S.fx
// (particles) plus the render-local caches below (terrain, shadows,
// footpaths, ruins, construction timers, ambient animals).
// ============================================================================

// SPRITES[key] = { img, sx, sy, sw, sh, ax, ay, k }: a rectangle of an atlas
// page, its anchor (ax, ay) in world pixels (the ground point / footprint top
// corner), and the bake scale k (atlas pixels per world pixel). A hand-made
// image can be dropped in as { img, ax, ay, scale } too.
const SPRITES = {};
const atlas = { pages: [], mips: [], ready: false, version: 0 };

(function loadAtlas() {
  const A = window.ATLAS;
  if (!A) return;
  let left = A.pages.length;
  atlas.pages = A.pages.map(src => {
    const im = new Image();
    im.onload = () => { if (--left === 0) buildMips(); };
    im.src = src;
    return im;
  });
  for (const [key, [pg, sx, sy, sw, sh, ax, ay, k]] of Object.entries(A.sprites)) {
    SPRITES[key] = { img: atlas.pages[pg], page: pg, sx, sy, sw, sh, ax, ay, k };
  }
})();

// Pre-filtered half and quarter size copies of each page, so sprites drawn
// smaller than their bake size stay smooth instead of aliasing.
function buildMips() {
  atlas.mips = atlas.pages.map(im => {
    const levels = [im];
    let src = im;
    for (let l = 1; l <= 2; l++) {
      const c = document.createElement("canvas");
      c.width = Math.ceil(src.width / 2); c.height = Math.ceil(src.height / 2);
      const x = c.getContext("2d");
      x.imageSmoothingQuality = "high";
      x.drawImage(src, 0, 0, c.width, c.height);
      levels.push(c); src = c;
    }
    return levels;
  });
  atlas.ready = true;
  atlas.version++;
}

const hasSprite = key => { const s = SPRITES[key]; return !!(s && s.img.complete && s.img.naturalWidth); };

// Draw sprite `key` with its anchor at grid point (gx, gy, z).
// o: { flip, scale, alpha, clip (0..1 visible fraction from the bottom) }
function drawSprite(key, gx, gy, z = 0, o) {
  const s = SPRITES[key];
  if (!s || !s.img.complete || !s.img.naturalWidth) return false;
  const p = iso(gx, gy, z);
  return blitSprite(s, p.x, p.y, o);
}
function blitSprite(s, x, y, o) {
  const sc = (o && o.scale) || 1;
  if (s.sw === undefined) { // hand-made single image
    const k = s.scale || 1;
    ctx.drawImage(s.img, x - s.ax * k * sc, y - s.ay * k * sc, s.img.width * k * sc, s.img.height * k * sc);
    return true;
  }
  // pick the mip level whose density still covers the screen density
  let img = s.img, f = 1;
  if (atlas.ready) {
    const need = view.zoom * view.dpr * sc;
    let L = 0;
    while (L < 2 && s.k / (2 << L) >= need * 0.95) L++;
    img = atlas.mips[s.page][L]; f = 1 / (1 << L);
  }
  const w = (s.sw / s.k) * sc, h = (s.sh / s.k) * sc;
  let sy = s.sy * f, sh = s.sh * f, dy = y - s.ay * sc, dh = h;
  if (o && o.clip !== undefined && o.clip < 1) {
    const cut = 1 - Math.max(0, o.clip);
    sy += sh * cut; dy += dh * cut; sh *= 1 - cut; dh *= 1 - cut;
    if (sh <= 0.5) return true;
  }
  if (o && o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o && o.flip) {
    ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1);
    ctx.drawImage(img, s.sx * f, sy, s.sw * f, sh, -s.ax * sc, dy, w, dh);
    ctx.restore();
  } else ctx.drawImage(img, s.sx * f, sy, s.sw * f, sh, x - s.ax * sc, dy, w, dh);
  if (o && o.alpha !== undefined) ctx.globalAlpha = 1;
  return true;
}

const PAL = {
  whitewash: "#ece3cf", laterite: "#a9572f", lateriteDark: "#7d3a1c",
  tile: "#b65a32", thatch: "#c9a45a", timber: "#6b4426", stone: "#a8a194",
  earth: "#7b5a36", gold: "#e9b949", maroon: "#7c1d1d", sand: "#cdb47c"
};

// ==================== PROJECTION ====================
function iso(gx, gy, z = 0) {
  return { x: view.camX + (gx - gy) * (TW / 2), y: view.camY + (gx + gy) * (TH / 2) - z };
}

function screenToGrid(sx, sy) {
  const dx = sx - view.camX, dy = sy - view.camY;
  const gx = (dx / (TW / 2) + dy / (TH / 2)) / 2;
  const gy = (dy / (TH / 2) - dx / (TW / 2)) / 2;
  return { gx: Math.floor(gx), gy: Math.floor(gy), ex: gx, ey: gy };
}

// ==================== COLOUR & PRIMITIVES ====================
const shadeCache = new Map();
function shade(hex, f) {
  const key = hex + f;
  let out = shadeCache.get(key);
  if (!out) {
    // Accepts "#rrggbb" or "rgb(r,g,b)" so shaded colours can be shaded again.
    let r, g, b;
    if (hex[0] === "#") {
      const n = parseInt(hex.slice(1), 16);
      r = n >> 16; g = (n >> 8) & 255; b = n & 255;
    } else {
      [r, g, b] = hex.match(/\d+/g).map(Number);
    }
    const c = v => Math.round(clamp(v * f, 0, 255));
    out = `rgb(${c(r)},${c(g)},${c(b)})`;
    shadeCache.set(key, out);
  }
  return out;
}

function hash(x, y, k = 0) {
  const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

const lerpP = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

function poly(pts, fill, stroke, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function line(a, b, col, lw = 1) {
  ctx.strokeStyle = col; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function diamond(gx, gy, w, h, z, fill, stroke) {
  poly([iso(gx, gy, z), iso(gx + w, gy, z), iso(gx + w, gy + h, z), iso(gx, gy + h, z)], fill, stroke);
}

// Extruded prism with explicit face colours.
function block(gx, gy, w, h, z0, zh, top, left, right) {
  const b1 = iso(gx + w, gy, z0), b2 = iso(gx + w, gy + h, z0), b3 = iso(gx, gy + h, z0);
  const t0 = iso(gx, gy, z0 + zh), t1 = iso(gx + w, gy, z0 + zh), t2 = iso(gx + w, gy + h, z0 + zh), t3 = iso(gx, gy + h, z0 + zh);
  const edge = "rgba(20,10,5,0.35)";
  poly([b3, b2, t2, t3], left, edge);
  poly([b1, b2, t2, t1], right, edge);
  poly([t0, t1, t2, t3], top, edge);
}

// Prism shaded from one base colour.
function box(gx, gy, w, h, z0, zh, col) {
  block(gx, gy, w, h, z0, zh, shade(col, 1.12), shade(col, 0.92), shade(col, 0.68));
}

// Horizontal courses on the two visible faces (masonry / plank lines).
function courses(gx, gy, w, h, z0, zh, n, col) {
  for (let i = 1; i < n; i++) {
    const z = z0 + (zh * i) / n;
    line(iso(gx, gy + h, z), iso(gx + w, gy + h, z), col, 0.7);
    line(iso(gx + w, gy, z), iso(gx + w, gy + h, z), col, 0.7);
  }
}

// Quad on the front-left (y = gy+h) face: u along x, z up.
function leftFaceQuad(gx, gy, w, h, u0, u1, z0, z1, col) {
  const y = gy + h;
  poly([iso(gx + w * u0, y, z0), iso(gx + w * u1, y, z0), iso(gx + w * u1, y, z1), iso(gx + w * u0, y, z1)], col);
}
// Quad on the front-right (x = gx+w) face: v along y.
function rightFaceQuad(gx, gy, w, h, v0, v1, z0, z1, col) {
  const x = gx + w;
  poly([iso(x, gy + h * v0, z0), iso(x, gy + h * v1, z0), iso(x, gy + h * v1, z1), iso(x, gy + h * v0, z1)], col);
}

// Hipped roof. Faces are drawn back to front with eave-parallel texture.
function hipRoof(gx, gy, w, h, z0, rh, col, thatch = false) {
  const A = iso(gx, gy, z0), B = iso(gx + w, gy, z0), C = iso(gx + w, gy + h, z0), D = iso(gx, gy + h, z0);
  const m = Math.min(w, h) / 2;
  let faces;
  if (w >= h) {
    const r1 = iso(gx + m, gy + h / 2, z0 + rh), r2 = iso(gx + w - m, gy + h / 2, z0 + rh);
    faces = [[A, B, r2, r1, 1.08], [D, A, r1, r1, 0.98], [C, D, r1, r2, 0.9], [B, C, r2, r2, 0.66]];
  } else {
    const r1 = iso(gx + w / 2, gy + m, z0 + rh), r2 = iso(gx + w / 2, gy + h - m, z0 + rh);
    faces = [[A, B, r1, r1, 1.08], [D, A, r1, r2, 0.98], [C, D, r2, r2, 0.9], [B, C, r2, r1, 0.66]];
  }
  const edge = thatch ? "rgba(70,50,20,0.55)" : "rgba(60,20,10,0.6)";
  for (const [P, Q, Rq, Rp, f] of faces) {
    poly([P, Q, Rq, Rp], shade(col, f), edge);
    const n = thatch ? 7 : 5;
    for (let i = 1; i < n; i++) {
      const k = i / n;
      line(lerpP(P, Rp, k), lerpP(Q, Rq, k), thatch ? shade(col, f * 0.82) : shade(col, f * 0.75), thatch ? 0.8 : 0.9);
    }
    line(P, Q, thatch ? shade(col, 0.55) : "rgba(40,15,5,0.8)", 1.4);
  }
  return faces;
}

function cylinder(cx, cy, rx, hgt, col) {
  const ry = rx * 0.5;
  const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  g.addColorStop(0, shade(col, 1.05)); g.addColorStop(0.45, shade(col, 0.95)); g.addColorStop(1, shade(col, 0.6));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy - hgt);
  ctx.lineTo(cx - rx, cy);
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rx, cy - hgt);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(20,10,5,0.35)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = shade(col, 1.15);
  ctx.beginPath(); ctx.ellipse(cx, cy - hgt, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

function cone(cx, cy, rx, hgt, col) {
  const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  g.addColorStop(0, shade(col, 1.1)); g.addColorStop(1, shade(col, 0.62));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  ctx.ellipse(cx, cy, rx, rx * 0.5, 0, Math.PI, 0, true);
  ctx.lineTo(cx, cy - hgt);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(60,40,15,0.5)"; ctx.stroke();
}

function flag(p, h, col, t) {
  line(p, { x: p.x, y: p.y - h }, "#3b2a1a", 1.5);
  const wave = Math.sin(t * 0.005 + p.x) * 2;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(p.x + 1, p.y - h);
  ctx.quadraticCurveTo(p.x + 8, p.y - h - 2 + wave, p.x + 15, p.y - h + 1 + wave);
  ctx.lineTo(p.x + 15, p.y - h + 8 + wave);
  ctx.quadraticCurveTo(p.x + 8, p.y - h + 6 + wave, p.x + 1, p.y - h + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(p.x + 1, p.y - h, 3, 8);
}

function groundShadow(gx, gy, w, h, height) {
  const off = Math.min(1.2, height / 40);
  diamond(gx + off * 0.7, gy - off * 0.15, w, h, 0, "rgba(10,20,5,0.28)");
}

function label(text, gx, gy, z, font = "14px sans-serif", color = "#fff") {
  const p = iso(gx, gy, z);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.strokeText(text, p.x, p.y);
  ctx.fillStyle = color;
  ctx.fillText(text, p.x, p.y);
}

// ==================== TERRAIN ====================
// The ground is generated per pixel: a smooth colour field (meadow, dry
// patches, bare earth, gravel near rock, sand and mud along the river, water
// shaded by depth) with hillshaded elevation and fine grain, then painted
// over with grass blades, flowers and reeds. No tile diamonds anywhere.
// Both seasons are baked when a level starts and cross-faded when the season
// turns. Canvases cover the whole map in world pixels × terrain.scale.
const terrain = { key: "", S: null, canvases: {}, shown: "", fadeFrom: null, fadeAt: 0, scale: 1.5,
  ox: MAP * TW / 2 + 20, oy: 60, w: MAP * TW + 40, h: MAP * TH + 120 };

function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, seed, oct = 4) {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f, seed + i * 13); f *= 2.03; amp *= 0.5; }
  return s / (1 - Math.pow(0.5, oct));
}

const TERRAIN_SUB = 8; // field samples per tile edge
// Signed distance to the river bank (negative in water) and distance to rock,
// sampled on a fine grid. Shared by both seasons and by ambient props.
function terrainDist() {
  const N = MAP * TERRAIN_SUB + 1, river = [], rock = [];
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    const t = S.tiles[y][x].t;
    if (t === "river") river.push([x + 0.5, y + 0.5]); else if (t === "rock") rock.push([x + 0.5, y + 0.5]);
  }
  const sd = new Float32Array(N * N), rd = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const gx = i / TERRAIN_SUB, gy = j / TERRAIN_SUB;
    let dr = 99, dk = 99;
    for (const [x, y] of river) { const d = (x - gx) ** 2 + (y - gy) ** 2; if (d < dr) dr = d; }
    for (const [x, y] of rock) { const d = (x - gx) ** 2 + (y - gy) ** 2; if (d < dk) dk = d; }
    // river tiles touching the map edge continue off-map
    sd[j * N + i] = Math.sqrt(dr) - 0.66 + (fbm(gx * 0.9, gy * 0.9, 5, 2) - 0.5) * 0.3;
    rd[j * N + i] = Math.sqrt(dk);
  }
  return { N, sd, rd };
}
const sampleField = (F, arr, gx, gy) => {
  const N = F.N, fx = clamp(gx * TERRAIN_SUB, 0, N - 1.001), fy = clamp(gy * TERRAIN_SUB, 0, N - 1.001);
  const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, k = j * N + i;
  return (arr[k] * (1 - u) + arr[k + 1] * u) * (1 - v) + (arr[k + N] * (1 - u) + arr[k + N + 1] * u) * v;
};

function terrainColours(season, D) {
  const N = D.N, col = new Float32Array(N * N * 3);
  const yala = season === "yala";
  const amp = [6, 5, 10, 5, 18][S.idx] ?? 8;
  const hgt = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const gx = i / TERRAIN_SUB, gy = j / TERRAIN_SUB, k = j * N + i;
    const sd = D.sd[k], rd = D.rd[k];
    hgt[k] = fbm(gx * 0.16, gy * 0.16, 31, 3) * amp + Math.max(0, 1.6 - rd) * 5 - (sd < 0.6 ? (0.6 - sd) * 4 : 0);
  }
  const lush = yala ? [146, 138, 72] : [70, 118, 44], lush2 = yala ? [168, 150, 86] : [96, 138, 54];
  const dry = yala ? [184, 156, 100] : [120, 130, 62], earth = yala ? [160, 126, 84] : [118, 92, 58];
  const sand = yala ? [204, 184, 136] : [176, 156, 112], mud = yala ? [150, 124, 86] : [104, 86, 58];
  const gravel = [138, 128, 110], shallow = [86, 150, 156], deep = [26, 78, 108];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const gx = i / TERRAIN_SUB, gy = j / TERRAIN_SUB, k = j * N + i;
    const sd = D.sd[k], rd = D.rd[k];
    let c;
    if (sd < 0) {
      const t = Math.min(1, -sd / 0.9);
      c = mix(shallow, deep, Math.sqrt(t));
      if (sd > -0.07) c = mix(c, [220, 232, 228], 0.55 * (1 + sd / 0.07)); // foam line
      const n = fbm(gx * 1.4 + 3, gy * 1.4, 9, 2);
      c = mix(c, [120, 170, 190], (n - 0.5) * 0.25 + 0.05);
    } else {
      const n1 = fbm(gx * 0.35, gy * 0.35, 1), n2 = fbm(gx * 0.7 + 11, gy * 0.7, 2), n3 = fbm(gx * 2.2, gy * 2.2, 3, 2);
      c = mix(lush, lush2, clamp(n1 * 1.4 - 0.2, 0, 1));
      c = mix(c, dry, clamp((n2 - 0.58) * 4, 0, 1) * (yala ? 0.9 : 0.6));
      c = mix(c, earth, clamp((n3 - 0.72) * 5, 0, 0.7));
      if (rd < 1.05) c = mix(c, gravel, clamp((1.05 - rd) / 0.6, 0, 0.55));
      if (sd < 0.6) c = mix(c, sd < 0.18 ? mud : sand, clamp((0.6 - sd) / 0.35, 0, 1));
      // hillshade from the height field, light from the upper left
      const hx = hgt[Math.min(k + 1, N * N - 1)] - hgt[Math.max(k - 1, 0)], hy = hgt[Math.min(k + N, N * N - 1)] - hgt[Math.max(k - N, 0)];
      const sh = clamp(1 - (hx * 0.7 - hy * 0.7) * 0.11 + (hgt[k] / (amp + 6)) * 0.08, 0.72, 1.18);
      c = [c[0] * sh, c[1] * sh, c[2] * sh];
    }
    col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
  }
  return col;
}

function buildTerrain(season, D) {
  const sc = terrain.scale, W = Math.round(terrain.w * sc), H = Math.round(terrain.h * sc);
  const col = terrainColours(season, D), N = D.N;
  const field = document.createElement("canvas"); field.width = W; field.height = H;
  const fx = field.getContext("2d");
  const img = fx.createImageData(W, H), d = img.data;
  const hw = TW / 2, hh = TH / 2;
  for (let py = 0; py < H; py++) {
    const wy = py / sc - terrain.oy;
    for (let px = 0; px < W; px++) {
      const wx = px / sc - terrain.ox;
      const gx = (wx / hw + wy / hh) / 2, gy = (wy / hh - wx / hw) / 2;
      if (gx < 0 || gy < 0 || gx >= MAP || gy >= MAP) continue;
      const fxp = gx * TERRAIN_SUB, fyp = gy * TERRAIN_SUB, i = fxp | 0, j = fyp | 0, u = fxp - i, v = fyp - j, k = j * N + i;
      const w00 = (1 - u) * (1 - v), w10 = u * (1 - v), w01 = (1 - u) * v, w11 = u * v;
      // cheap per-pixel grain
      let h = (px * 374761393 + py * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177);
      const gr = 1 + (((h >>> 16) & 255) / 255 - 0.5) * 0.09;
      const o = (py * W + px) * 4;
      for (let ch = 0; ch < 3; ch++) {
        d[o + ch] = (col[k * 3 + ch] * w00 + col[(k + 1) * 3 + ch] * w10 + col[(k + N) * 3 + ch] * w01 + col[(k + N + 1) * 3 + ch] * w11) * gr;
      }
      d[o + 3] = 255;
    }
  }
  fx.putImageData(img, 0, 0);

  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const saved = { ctx, camX: view.camX, camY: view.camY };
  ctx = c.getContext("2d");
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  view.camX = terrain.ox; view.camY = terrain.oy;
  try {
    drawSkirt(season);
    ctx.drawImage(field, 0, 0, terrain.w, terrain.h);
    paintGroundDetail(season, D);
  } finally { ctx = saved.ctx; view.camX = saved.camX; view.camY = saved.camY; }
  return c;
}

function drawSkirt(season) {
  const depth = 54, top = season === "yala" ? "#8a6a42" : "#6e5232";
  const sides = [[iso(0, MAP), iso(MAP, MAP), 0.92], [iso(MAP, MAP), iso(MAP, 0), 0.66]];
  for (const [a, b, f] of sides) {
    const g = ctx.createLinearGradient(0, Math.min(a.y, b.y), 0, Math.max(a.y, b.y) + depth);
    g.addColorStop(0, shade(top, f)); g.addColorStop(1, shade("#2a1e12", f));
    poly([a, b, { x: b.x, y: b.y + depth }, { x: a.x, y: a.y + depth }], g);
    for (let k = 1; k < 6; k++) {
      const off = k * 8 + hash(k, f) * 3;
      ctx.strokeStyle = `rgba(30,18,8,${0.15 + 0.05 * k})`; ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const t = i / 40, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + off + Math.sin(t * 30 + k) * 1.2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    // stones in the cut
    for (let i = 0; i < 60; i++) {
      const t = hash(i, f, 3), x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + 6 + hash(i, 4) * (depth - 10);
      ctx.fillStyle = `rgba(${150 * f | 0},${135 * f | 0},${110 * f | 0},0.6)`;
      ctx.beginPath(); ctx.ellipse(x, y, 1 + hash(i, 5) * 2.5, 0.8 + hash(i, 6) * 1.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    // grass lip
    ctx.strokeStyle = season === "yala" ? "#9a8a48" : "#4f7a2c"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a.x, a.y + 0.5); ctx.lineTo(b.x, b.y + 0.5); ctx.stroke();
  }
}

function paintGroundDetail(season, D) {
  const yala = season === "yala";
  const blades = yala ? ["#c4b46a", "#9a8a46", "#b8a05a", "#7e7a3e"] : ["#7fb04f", "#4f8a34", "#3d6b2a", "#93c060"];
  ctx.lineWidth = 0.6;
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    const t = S.tiles[y][x].t;
    if (t === "river") continue;
    const n = t === "rock" ? 6 : 26;
    for (let i = 0; i < n; i++) {
      const u = hash(x, y, i), v = hash(x, y, i + 50);
      const gx = x + u, gy = y + v;
      const sd = sampleField(D, D.sd, gx, gy);
      if (sd < 0.12) continue;
      const p = iso(gx, gy, 0);
      const len = 1.6 + hash(x, y, i + 90) * (sd < 0.5 ? 4.5 : 2.6);
      ctx.strokeStyle = blades[(hash(x, y, i + 7) * blades.length) | 0];
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (u - 0.5) * 2.2, p.y - len); ctx.stroke();
    }
    // wildflowers
    if (t === "grass" && hash(x, y, 99) > 0.82) {
      const cols = yala ? ["#e8c060", "#d9a040", "#f0e0b0"] : ["#f4e3f0", "#f2c94c", "#e68aa6", "#ffffff", "#b9a0e8"];
      const cx = x + 0.2 + hash(x, y, 3) * 0.6, cy = y + 0.2 + hash(x, y, 4) * 0.6;
      for (let i = 0; i < 9; i++) {
        const p = iso(cx + (hash(x, i, 8) - 0.5) * 0.3, cy + (hash(i, y, 9) - 0.5) * 0.3, 0);
        ctx.fillStyle = cols[(hash(x, y, i) * cols.length) | 0];
        ctx.fillRect(p.x, p.y - 1.4, 1.3, 1.3);
      }
    }
    // pebbles near rock
    if (t !== "rock" && sampleField(D, D.rd, x + 0.5, y + 0.5) < 1.6) for (let i = 0; i < 5; i++) {
      const p = iso(x + hash(x, y, i + 30), y + hash(x, y, i + 40), 0);
      ctx.fillStyle = `rgba(${150 + hash(i, x) * 40 | 0},${142 + hash(i, y) * 30 | 0},${125},0.85)`;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 1 + hash(x, i) * 1.4, 0.7 + hash(y, i) * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // reeds and lilies along the banks
  for (let j = 0; j < MAP * 3; j++) for (let i = 0; i < MAP * 3; i++) {
    const gx = (i + hash(i, j, 1)) / 3, gy = (j + hash(i, j, 2)) / 3;
    const sd = sampleField(D, D.sd, gx, gy);
    if (sd > -0.12 && sd < 0.12 && hash(i, j, 3) < 0.5) drawSprite(`reeds.${(hash(i, j, 4) * 3) | 0}`, gx, gy);
    else if (sd < -0.35 && sd > -0.7 && hash(i, j, 5) < 0.04 && !yala) drawSprite("lotus.1", gx, gy);
  }
}

// ==================== CACHED LAYERS ====================
// Footpaths: soft earth worn in wherever villagers walk.
const paths = { canvas: null, S: null, last: 0, scale: 0.5 };
function wearPaths() {
  if (paths.S !== S) {
    paths.S = S; paths.last = 0;
    paths.canvas = paths.canvas || document.createElement("canvas");
    paths.canvas.width = Math.round(terrain.w * paths.scale); paths.canvas.height = Math.round(terrain.h * paths.scale);
  }
  if (S.time - paths.last < 0.25) return;
  paths.last = S.time;
  const x = paths.canvas.getContext("2d"), k = paths.scale;
  x.fillStyle = "rgba(118,92,58,0.045)";
  for (const w of S.workers) {
    if (w.phase === "work" || w.phase === "tend") continue;
    const px = ((w.gx - w.gy) * TW / 2 + terrain.ox) * k, py = ((w.gx + w.gy) * TH / 2 + terrain.oy) * k;
    x.beginPath(); x.ellipse(px, py, 5 * k * 2, 2.6 * k * 2, 0, 0, Math.PI * 2); x.fill();
  }
}

// Soft cast shadows of every standing thing, rebuilt only when the world changes.
const shadows = { canvas: null, key: "", scale: 1 };
function shadowKey() {
  let t = 0;
  for (const tr of S.trees) t += tr.stage >= 35 ? (tr.stage / 20) | 0 : 0;
  return `${S.idx}|${S.buildings.length}|${S.uid}|${S.trees.length}|${t}|${atlas.version}|${amb.props ? amb.props.size : 0}`;
}
function bakeShadows() {
  const key = shadowKey();
  if (key === shadows.key && shadows.S === S) return;
  shadows.key = key; shadows.S = S;
  const c = shadows.canvas || (shadows.canvas = document.createElement("canvas"));
  c.width = terrain.w; c.height = terrain.h;
  const saved = { ctx, camX: view.camX, camY: view.camY, zoom: view.zoom, dpr: view.dpr };
  ctx = c.getContext("2d");
  view.camX = terrain.ox; view.camY = terrain.oy; view.zoom = 1; view.dpr = 1;
  try {
    for (const t of S.trees) {
      if (t.stage < 35) continue;
      drawSprite(`${treeSpriteKey(t)}#sh`, t.gx, t.gy, 0, { scale: treeScale(t) });
    }
    for (const b of S.buildings) {
      if (b.def.ground && b.id !== "sluice" || b.id === "wewa") { if (b.id === "wewa") drawSprite("wewa.front#sh", b.gx, b.gy); continue; }
      if (b.def.wall && b.id !== "gate") { for (const k of wallKeys(b)) drawSprite(`${k}#sh`, b.gx, b.gy); continue; }
      drawSprite(`${buildingKey(b)}#sh`, b.gx, b.gy);
    }
    for (const r of amb.rocks || []) drawSprite(`rock.${r.v}#sh`, r.x, r.y);
    for (const [, list] of amb.props || []) for (const pr of list) drawSprite(`${pr.key}#sh`, pr.gx, pr.gy);
    for (const bu of amb.bushes || []) drawSprite(`bush.maha.${bu.v}#sh`, bu.gx, bu.gy);
  } finally { ctx = saved.ctx; Object.assign(view, { camX: saved.camX, camY: saved.camY, zoom: saved.zoom, dpr: saved.dpr }); }
}

function bakeTerrain() {
  const key = `${S.idx}|${S.L.seed}|${atlas.version}`;
  if (terrain.key !== key) {
    terrain.key = key; terrain.S = S;
    const D = terrainDist();
    terrain.D = D;
    terrain.canvases = { maha: buildTerrain("maha", D), yala: buildTerrain("yala", D) };
    terrain.shown = S.season; terrain.fadeFrom = null;
  }
  if (terrain.S !== S) { terrain.S = S; terrain.shown = S.season; terrain.fadeFrom = null; }
  if (terrain.shown !== S.season) { terrain.fadeFrom = terrain.shown; terrain.fadeAt = performance.now(); terrain.shown = S.season; }
  if (amb.S !== S) resetAmbient();
}

// ==================== FRAME ====================
function render(now) {
  bakeTerrain();
  const zs = view.zoom * view.dpr;
  ctx.imageSmoothingEnabled = true;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, S.season === "maha" ? "#1c2b33" : "#2e2a20");
  bg.addColorStop(1, "#0b1214");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(zs, 0, 0, zs, 0, 0);
  const tx = view.camX - terrain.ox, ty = view.camY - terrain.oy;
  if (terrain.fadeFrom) {
    const k = (now - terrain.fadeAt) / 4000;
    if (k >= 1) terrain.fadeFrom = null;
    else { ctx.drawImage(terrain.canvases[terrain.fadeFrom], tx, ty, terrain.w, terrain.h); ctx.globalAlpha = k; }
  }
  ctx.drawImage(terrain.canvases[terrain.shown], tx, ty, terrain.w, terrain.h);
  ctx.globalAlpha = 1;
  wearPaths();
  ctx.drawImage(paths.canvas, tx, ty, terrain.w, terrain.h);
  drawWaterShimmer(now);

  for (const b of S.buildings) if (b.def.ground || b.id === "wewa") drawGround(b, now);

  updateAmbient(now);
  bakeShadows();
  ctx.globalAlpha = S.season === "maha" ? 0.3 : 0.38;
  ctx.drawImage(shadows.canvas, tx, ty, terrain.w, terrain.h);
  ctx.globalAlpha = 1;
  if (!hasSprite("citadel")) {
    for (const b of S.buildings) if (!b.def.ground && b.id !== "wewa") groundShadow(b.gx, b.gy, b.w, b.h, b.def.z || 18);
  }
  drawRuins();

  drawHoverTile();
  drawWaveMarkers(now);

  // Depth-sorted world objects
  const list = [];
  for (const t of S.trees) if (onScreen(t.gx, t.gy)) list.push([t.gx + t.gy, 0, t]);
  for (const b of S.buildings) {
    if (!b.def.ground && b.id !== "wewa") list.push([b.gx + b.gy + b.w + b.h - 1.2, 1, b]);
    else if (b.id === "sluice") list.push([b.gx + b.gy + 1, 1, b]);
  }
  for (const w of S.workers) list.push([w.gx + w.gy, 2, w]);
  for (const u of S.units) list.push([u.gx + u.gy + (u.z ? 1 : 0), 3, u]);
  for (const r of amb.rocks) if (onScreen(r.x + 0.5, r.y + 0.5)) list.push([r.x + r.y + 1.0, 4, r]);
  for (const bu of amb.bushes) if (!buildingAt(Math.floor(bu.gx), Math.floor(bu.gy)) && onScreen(bu.gx, bu.gy)) list.push([bu.gx + bu.gy, 5, bu]);
  for (const [, pl] of amb.props) for (const pr of pl) if (propFree(pr)) list.push([pr.gx + pr.gy, 6, pr]);
  for (const a of amb.animals) if (onScreen(a.gx, a.gy)) list.push([a.gx + a.gy, 7, a]);
  for (const m of peraheraMembers()) list.push([m.gx + m.gy, 8, m]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, kind, o] of list) {
    if (kind === 0) drawTree(o, now);
    else if (kind === 1) { if (o.id === "sluice") drawSluice(o); else drawBuilding(o, now); }
    else if (kind === 2) drawWorker(o, now);
    else if (kind === 3) drawUnit(o, now);
    else if (kind === 4) { if (!drawSprite(`rock.${o.v}`, o.x, o.y)) drawRock(o.x, o.y); }
    else if (kind === 5) drawSprite(`bush.${S.season}.${o.v}`, o.gx, o.gy);
    else if (kind === 6) drawSprite(o.key, o.gx, o.gy);
    else if (kind === 7) drawAnimal(o, now);
    else drawPeraheraMember(o, now);
  }

  drawGhost();
  for (const b of S.buildings) drawBuildingStatus(b, now);
  drawShots();
  drawFx();
  drawBirds(now);
  if (S.season === "maha") drawCloudShadows(now);
  for (const f of S.floats) label(f.text, f.gx, f.gy, f.z, "bold 12px sans-serif", f.color);

  if (input.drag) {
    const { x1, y1, x2, y2 } = input.drag;
    ctx.fillStyle = "rgba(108,192,112,0.15)";
    ctx.strokeStyle = "#6cc070";
    ctx.lineWidth = 1.5 / view.zoom;
    ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  }

  // Screen-space atmosphere and seasonal grading
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  if (S.season === "maha") {
    ctx.fillStyle = "rgba(40,70,90,0.07)"; ctx.fillRect(0, 0, view.w, view.h);
    drawRain(now);
  } else {
    const g = ctx.createLinearGradient(0, 0, view.w, view.h);
    g.addColorStop(0, "rgba(255,214,140,0.10)"); g.addColorStop(1, "rgba(255,170,90,0.04)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
  }
  const vg = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.35, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, view.w, view.h);
}

function onScreen(gx, gy, pad = 90) {
  const p = iso(gx, gy);
  const W = view.w / view.zoom, H = view.h / view.zoom;
  return p.x > -pad && p.x < W + pad && p.y > -pad && p.y < H + pad * 2;
}

function drawWaterShimmer(now) {
  const step = Math.floor(now / 400);
  ctx.lineWidth = 0.8;
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    if (!isRiver(x, y) || !onScreen(x, y)) continue;
    for (let i = 0; i < 2; i++) {
      const h = hash(x * 3 + i, y, step % 9);
      if (h > 0.6) continue;
      const drift = (now * 0.00018 + hash(x, y, i + 1)) % 1;
      const p = iso(x + drift, y + hash(x, y, i + 2) * 0.8 + 0.1, 0);
      const a = Math.sin(drift * Math.PI) * (0.18 + 0.3 * (1 - h));
      ctx.strokeStyle = `rgba(225,242,255,${a})`;
      ctx.beginPath(); ctx.moveTo(p.x - 4, p.y); ctx.quadraticCurveTo(p.x, p.y - 0.8, p.x + 4, p.y); ctx.stroke();
    }
  }
}

const isRiver = (x, y) => inb(x, y) && S.tiles[y][x].t === "river";

function drawRock(x, y) {
  diamond(x, y, 1, 1, 0, "#7c766b");
  const n = 2 + Math.floor(hash(x, y, 7) * 2);
  for (let i = 0; i < n; i++) {
    const s = 0.32 + hash(x, y, i + 8) * 0.25;
    const ox = 0.1 + hash(x, y, i + 11) * (0.85 - s), oy = 0.1 + hash(x, y, i + 13) * (0.85 - s);
    const hgt = 5 + hash(x, y, i + 15) * 11;
    box(x + ox, y + oy, s, s, 0, hgt, "#9a9387");
    const t = iso(x + ox + s * 0.3, y + oy + s * 0.3, hgt);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(t.x - 3, t.y - 1, 5, 2);
  }
}

function drawHoverTile() {
  const h = input.hover;
  if (S.tool || !inb(h.gx, h.gy) || S.mode !== "play") return;
  diamond(h.gx, h.gy, 1, 1, 0, null, S.demolish ? "rgba(255,90,70,0.9)" : "rgba(233,185,73,0.75)");
}

// ==================== GROUND-LEVEL STRUCTURES ====================
function drawGround(b, now) {
  const { gx, gy, w, h } = b;
  if (hasSprite("wewa.base")) {
    if (b.id === "wewa") return drawWewaSprite(b, now);
    if (b.id === "canal" || b.id === "sluice") return drawCanalSprite(b, now);
    if (b.id === "paddy") return drawPaddySprite(b, now);
  }
  if (b.id === "wewa") drawWewa(b, now);
  else if (b.id === "canal" || b.id === "sluice") drawCanal(b, now);
  else if (b.id === "paddy") drawPaddy(b, now);
}

function drawWewa(b, now) {
  const { gx, gy, w, h } = b;
  // Earthen bund with a grassy crest
  block(gx, gy, w, h, 0, 6, "#6f8a3c", "#7c5d36", "#5c432a");
  diamond(gx + 0.18, gy + 0.18, w - 0.36, h - 0.36, 6, "#5a4630");
  const k = b.water / WEWA_CAP;
  const ix = gx + 0.24, iy = gy + 0.24, iw = w - 0.48, ih = h - 0.48;
  if (k < 0.15) {
    // Cracked mud
    for (let i = 0; i < 6; i++) {
      const a = iso(ix + hash(gx, i) * iw, iy + hash(gy, i + 3) * ih, 6);
      line(a, { x: a.x + (hash(i, gx) - 0.5) * 14, y: a.y + (hash(gy, i) - 0.5) * 6 }, "rgba(30,20,10,0.6)", 1);
    }
  }
  if (k > 0) {
    const z = 3 + 3 * k;
    const p0 = iso(ix, iy, z), p2 = iso(ix + iw, iy + ih, z);
    const g = ctx.createLinearGradient(p0.x, p0.y, p2.x, p2.y);
    g.addColorStop(0, `rgba(90,170,215,${0.5 + 0.5 * k})`);
    g.addColorStop(1, `rgba(28,92,140,${0.5 + 0.5 * k})`);
    diamond(ix, iy, iw, ih, z, g);
    const sh = (now * 0.0004 + gx) % 1;
    line(iso(ix + 0.2, iy + sh * ih, z), iso(ix + 0.7, iy + sh * ih, z), "rgba(255,255,255,0.25)", 1);
    if (k > 0.3) {
      for (let i = 0; i < 5; i++) {
        const p = iso(ix + 0.15 + hash(b.uid, i) * (iw - 0.3), iy + 0.15 + hash(i, b.uid) * (ih - 0.3), z);
        ctx.fillStyle = "#3f7d3a";
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 4, 2, 0, 0.3, Math.PI * 2); ctx.fill();
        if (S.season === "maha" && i % 2 === 0) { ctx.fillStyle = "#f2a7c3"; ctx.beginPath(); ctx.arc(p.x + 1, p.y - 2, 1.8, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  }
  // Stone spill steps on the front corner
  box(gx + w - 0.32, gy + h - 0.32, 0.26, 0.26, 0, 7, PAL.stone);
}

function drawCanal(b, now) {
  const { gx, gy } = b;
  const id = S.netOf[gy][gx];
  const wet = id !== -1 && S.nets[id].water >= 1;
  const flooded = S.flooded.has(gy * MAP + gx);
  const water = flooded ? `rgb(${110 + Math.sin(now * 0.01 + gx + gy) * 30},205,250)` : wet ? "#2f86ba" : "#5a4630";
  const segs = [[gx + 0.3, gy + 0.3, 0.4, 0.4]];
  const arms = [[1, 0, gx + 0.7, gy + 0.3, 0.3, 0.4], [-1, 0, gx, gy + 0.3, 0.3, 0.4], [0, 1, gx + 0.3, gy + 0.7, 0.4, 0.3], [0, -1, gx + 0.3, gy, 0.4, 0.3]];
  for (const [dx, dy, x, y, w, h] of arms) {
    const nb = buildingAt(gx + dx, gy + dy);
    if (nb && nb.def.water) segs.push([x, y, w, h]);
  }
  for (const [x, y, w, h] of segs) diamond(x - 0.06, y - 0.06, w + 0.12, h + 0.12, 0, "#8d8676");
  for (const [x, y, w, h] of segs) diamond(x, y, w, h, 0, water);
  if (flooded) {
    const p = iso(gx + 0.5, gy + 0.5, 0);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(p.x - 4 + Math.sin(now * 0.02) * 2, p.y - 1, 3, 1.5);
  }
  if (b.id === "sluice") {
    box(gx + 0.12, gy + 0.12, 0.2, 0.2, 0, 16, PAL.stone);
    box(gx + 0.68, gy + 0.68, 0.2, 0.2, 0, 16, PAL.stone);
    box(gx + 0.12, gy + 0.12, 0.76, 0.76, 16, 3, "#8d8676");
    box(gx + 0.3, gy + 0.3, 0.4, 0.4, b.open ? 10 : 0, b.open ? 6 : 10, PAL.timber);
  }
}

function drawPaddy(b, now) {
  const { gx, gy, w, h } = b;
  const k = b.growth / 100;
  const dry = !b.irrigated && S.season === "yala";
  // Bund rim and flooded field
  block(gx, gy, w, h, 0, 2.5, "#7a6a40", "#6b5532", "#54422a");
  diamond(gx + 0.1, gy + 0.1, w - 0.2, h - 0.2, 2.5, b.irrigated || S.season === "maha" ? "#56808a" : "#8a7448");
  line(iso(gx + 0.1, gy + h / 2, 2.5), iso(gx + w - 0.1, gy + h / 2, 2.5), "#7a6a40", 2);
  // Rice clumps, drawn back to front
  const n = 5;
  const col = k >= 1 ? "#e2c25a" : dry ? "#9c8e4a" : `rgb(${80 + 70 * k},${150 + 40 * k},${60})`;
  const tall = 2 + 9 * Math.max(0.15, k);
  for (let s = 0; s < n * 2 - 1; s++) {
    for (let i = 0; i < n; i++) {
      const j = s - i;
      if (j < 0 || j >= n) continue;
      const p = iso(gx + 0.25 + i * (w - 0.5) / (n - 1), gy + 0.25 + j * (h - 0.5) / (n - 1), 2.5);
      const sway = Math.sin(now * 0.002 + i + j) * (0.6 + k);
      ctx.strokeStyle = col; ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(p.x - 2, p.y); ctx.lineTo(p.x - 3 + sway, p.y - tall);
      ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + sway, p.y - tall - 1);
      ctx.moveTo(p.x + 2, p.y); ctx.lineTo(p.x + 3 + sway, p.y - tall);
      ctx.stroke();
      if (k >= 1) { ctx.fillStyle = "#f3d77a"; ctx.fillRect(p.x - 1 + sway, p.y - tall - 2, 2, 2); }
    }
  }
}

// ---- sprite versions of the water works ----
function drawWewaSprite(b, now) {
  const { gx, gy } = b;
  drawSprite("wewa.base", gx, gy);
  const k = b.water / WEWA_CAP;
  if (k > 0.01) {
    const z = 0.6 + 5.6 * k, inset = 0.56 - 0.2 * (z / 7);
    const p0 = iso(gx + inset, gy + inset, z), p2 = iso(gx + 2 - inset, gy + 2 - inset, z);
    const g = ctx.createLinearGradient(p0.x, p0.y, p2.x, p2.y);
    g.addColorStop(0, `rgba(120,185,215,${0.75 + 0.2 * k})`);
    g.addColorStop(0.5, `rgba(52,120,160,${0.8 + 0.2 * k})`);
    g.addColorStop(1, `rgba(24,80,118,${0.85 + 0.15 * k})`);
    diamond(gx + inset, gy + inset, 2 - inset * 2, 2 - inset * 2, z, g);
    // sky glint and ripples
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      const t = (now * 0.00012 + i * 0.25 + b.uid * 0.13) % 1;
      const a = iso(gx + inset + 0.15, gy + inset + t * (2 - inset * 2 - 0.2), z), c = iso(gx + 2 - inset - 0.3, gy + inset + t * (2 - inset * 2 - 0.2), z);
      ctx.globalAlpha = Math.sin(t * Math.PI);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // waterline darkening along the back banks
    ctx.strokeStyle = "rgba(30,40,30,0.35)"; ctx.lineWidth = 1.2;
    const q0 = iso(gx + 2 - inset, gy + inset, z), q1 = iso(gx + inset, gy + 2 - inset, z);
    ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(p0.x, p0.y); ctx.lineTo(q1.x, q1.y); ctx.stroke();
    if (k > 0.3) for (let i = 0; i < 6; i++) {
      const lx = gx + inset + 0.15 + hash(b.uid, i) * (1.7 - inset * 2), ly = gy + inset + 0.15 + hash(i, b.uid) * (1.7 - inset * 2);
      drawSprite(S.season === "maha" && i % 2 === 0 ? "lotus.0" : "lotus.1", lx, ly, z);
    }
  }
  drawSprite("wewa.front", gx, gy);
}

function canalMask(b) {
  let m = 0;
  for (const [bit, dx, dy] of [[1, 1, 0], [2, -1, 0], [4, 0, 1], [8, 0, -1]]) {
    const nb = buildingAt(b.gx + dx, b.gy + dy);
    if (nb && nb.def.water) m |= bit;
  }
  return m;
}
function drawCanalSprite(b, now) {
  const { gx, gy } = b;
  const m = canalMask(b);
  drawSprite(`canal.${m}`, gx, gy);
  const id = S.netOf[gy][gx];
  const wet = id !== -1 && S.nets[id].water >= 1;
  const flooded = S.flooded.has(gy * MAP + gx);
  if (!wet && !flooded) return;
  const z = flooded ? -0.4 : -1.4;
  const col = flooded ? `rgba(${120 + Math.sin(now * 0.008 + gx + gy) * 25 | 0},200,240,0.92)` : "rgba(46,124,170,0.9)";
  const r = [[0.33, 0.33, 0.34, 0.34]];
  if (m & 1) r.push([0.67, 0.33, 0.33, 0.34]);
  if (m & 2) r.push([0, 0.33, 0.33, 0.34]);
  if (m & 4) r.push([0.33, 0.67, 0.34, 0.33]);
  if (m & 8) r.push([0.33, 0, 0.34, 0.33]);
  for (const [x, y, w, h] of r) diamond(gx + x, gy + y, w, h, z, col);
  // flowing glints
  const t = (now * 0.0006 + gx * 0.3 + gy * 0.2) % 1;
  ctx.fillStyle = flooded ? "rgba(255,255,255,0.7)" : "rgba(220,240,255,0.45)";
  const p = iso(gx + 0.38 + t * 0.24, gy + 0.5, z);
  ctx.fillRect(p.x - 1.5, p.y - 0.4, 3, 0.8);
  if (flooded) { const q = iso(gx + 0.5, gy + 0.38 + ((t + 0.5) % 1) * 0.24, z); ctx.fillRect(q.x - 1.5, q.y - 0.4, 3, 0.8); }
}
function drawSluice(b) {
  if (!drawSprite(`sluice.${b.open ? "open" : "closed"}`, b.gx, b.gy)) {
    box(b.gx + 0.12, b.gy + 0.12, 0.2, 0.2, 0, 16, PAL.stone);
    box(b.gx + 0.68, b.gy + 0.68, 0.2, 0.2, 0, 16, PAL.stone);
    box(b.gx + 0.12, b.gy + 0.12, 0.76, 0.76, 16, 3, "#8d8676");
    box(b.gx + 0.3, b.gy + 0.3, 0.4, 0.4, b.open ? 10 : 0, b.open ? 6 : 10, PAL.timber);
  }
}
function paddyKey(b) {
  const wet = b.irrigated || S.season === "maha";
  return `paddy.${wet ? "w" : "d"}${Math.min(4, Math.floor(b.growth / 100 * 4.999))}`;
}
function drawPaddySprite(b, now) {
  drawSprite(paddyKey(b), b.gx, b.gy);
}

// ==================== BUILDINGS ====================
// A whitewashed hall on a plinth with a hipped roof.
function hall(gx, gy, w, h, o = {}) {
  const plinth = o.plinth ?? 3, wallH = o.wallH ?? 12, inset = o.inset ?? 0.12;
  const wx = gx + inset, wy = gy + inset, ww = w - inset * 2, wh = h - inset * 2;
  box(gx + 0.04, gy + 0.04, w - 0.08, h - 0.08, 0, plinth, o.plinthCol || PAL.laterite);
  if (o.pillars) {
    box(wx + 0.2, wy + 0.2, ww - 0.4, wh - 0.4, plinth, wallH, o.wall || PAL.whitewash);
    for (const [px, py] of [[0, 1], [0.5, 1], [1, 1], [1, 0], [1, 0.5], [0, 0], [0.5, 0], [0, 0.5]]) {
      box(wx + px * (ww - 0.1), wy + py * (wh - 0.1), 0.1, 0.1, plinth, wallH, PAL.timber);
    }
  } else {
    box(wx, wy, ww, wh, plinth, wallH, o.wall || PAL.whitewash);
    if (o.timberFrame !== false) {
      line(iso(wx, wy + wh, plinth + wallH - 1), iso(wx + ww, wy + wh, plinth + wallH - 1), PAL.timber, 1.5);
      line(iso(wx + ww, wy, plinth + wallH - 1), iso(wx + ww, wy + wh, plinth + wallH - 1), shade(PAL.timber, 0.7), 1.5);
    }
    if (o.door !== false) leftFaceQuad(wx, wy, ww, wh, 0.42, 0.58, plinth, plinth + wallH * 0.75, "#3a2614");
    const wins = o.windows ?? 1;
    for (let i = 0; i < wins; i++) {
      const v = (i + 1) / (wins + 1);
      rightFaceQuad(wx, wy, ww, wh, v - 0.07, v + 0.07, plinth + wallH * 0.4, plinth + wallH * 0.72, "#2b1d10");
    }
  }
  const ov = o.overhang ?? 0.1;
  hipRoof(wx - ov, wy - ov, ww + ov * 2, wh + ov * 2, plinth + wallH, o.roofH ?? 12, o.roof || PAL.tile, o.thatch);
  return plinth + wallH + (o.roofH ?? 12);
}

function wallLinks(b) {
  const links = [];
  for (const [dx, dy] of DIRS4) {
    const n = buildingAt(b.gx + dx, b.gy + dy);
    if (n && (n.def.wall || n.def.tower)) links.push([dx, dy]);
  }
  return links;
}

function drawPalisade(b) {
  const { gx, gy } = b;
  let links = wallLinks(b);
  if (!links.length) links = [[1, 0], [-1, 0]];
  const stakes = [{ x: gx + 0.5, y: gy + 0.5 }];
  for (const [dx, dy] of links) for (let t = 0.17; t <= 0.51; t += 0.17) stakes.push({ x: gx + 0.5 + dx * t, y: gy + 0.5 + dy * t });
  stakes.sort((a, c) => a.x + a.y - c.x - c.y);
  for (const s of stakes) {
    const hgt = 17 + hash(s.x * 3, s.y * 3) * 5;
    box(s.x - 0.07, s.y - 0.07, 0.14, 0.14, 0, hgt, "#8a5a2b");
    const tip = iso(s.x, s.y, hgt + 5), l = iso(s.x - 0.07, s.y + 0.07, hgt), r = iso(s.x + 0.07, s.y + 0.07, hgt), rr = iso(s.x + 0.07, s.y - 0.07, hgt);
    poly([l, r, tip], "#9d6a36", "rgba(20,10,5,0.3)");
    poly([r, rr, tip], "#6b441f", "rgba(20,10,5,0.3)");
  }
  // Binding rope
  for (const [dx, dy] of links) line(iso(gx + 0.5, gy + 0.5, 11), iso(gx + 0.5 + dx * 0.5, gy + 0.5 + dy * 0.5, 11), "#c9a45a", 1);
}

function drawRampart(b, height = 26) {
  const { gx, gy } = b;
  const links = wallLinks(b);
  const t = 0.62, o = (1 - t) / 2;
  const parts = [[gx + o, gy + o, t, t]];
  for (const [dx, dy] of links) {
    if (dx === 1) parts.push([gx + o + t, gy + o, 1 - o - t, t]);
    if (dx === -1) parts.push([gx, gy + o, o, t]);
    if (dy === 1) parts.push([gx + o, gy + o + t, t, 1 - o - t]);
    if (dy === -1) parts.push([gx + o, gy, t, o]);
  }
  parts.sort((a, c) => a[0] + a[1] - c[0] - c[1]);
  for (const [x, y, w, h] of parts) {
    box(x, y, w, h, 0, height, PAL.laterite);
    courses(x, y, w, h, 0, height, 4, "rgba(60,20,8,0.35)");
  }
  // Walkway and merlons
  for (const [x, y, w, h] of parts) {
    for (let i = 0; i < 2; i++) {
      box(x + (w > 0.4 ? i * (w - 0.14) : 0), y + h - 0.14, 0.14, 0.14, height, 5, shade(PAL.laterite, 1.05));
      box(x + w - 0.14, y + (h > 0.4 ? i * (h - 0.14) : 0), 0.14, 0.14, height, 5, shade(PAL.laterite, 1.05));
    }
  }
}

function drawGate(b, now) {
  const { gx, gy } = b;
  const links = wallLinks(b);
  const alongY = links.some(([dx]) => dx === 0) && !links.some(([, dy]) => dy === 0);
  const H = 30;
  if (alongY) {
    box(gx + 0.15, gy, 0.7, 0.3, 0, H, PAL.laterite);
    box(gx + 0.15, gy + 0.7, 0.7, 0.3, 0, H, PAL.laterite);
    box(gx + 0.15, gy + 0.3, 0.7, 0.4, 18, H - 18, PAL.laterite);
    rightFaceQuad(gx + 0.15, gy + 0.3, 0.7, 0.4, 0.05, 0.95, 0, 17, "#4a2f17");
    hipRoof(gx + 0.05, gy - 0.05, 0.9, 1.1, H, 10, PAL.tile);
  } else {
    box(gx, gy + 0.15, 0.3, 0.7, 0, H, PAL.laterite);
    box(gx + 0.7, gy + 0.15, 0.3, 0.7, 0, H, PAL.laterite);
    box(gx + 0.3, gy + 0.15, 0.4, 0.7, 18, H - 18, PAL.laterite);
    leftFaceQuad(gx + 0.3, gy + 0.15, 0.4, 0.7, 0.05, 0.95, 0, 17, "#4a2f17");
    hipRoof(gx - 0.05, gy + 0.05, 1.1, 0.9, H, 10, PAL.tile);
  }
  flag(iso(gx + 0.5, gy + 0.5, H + 10), 14, PAL.maroon, now);
}

function drawTower(b, now) {
  const { gx, gy } = b;
  box(gx + 0.08, gy + 0.08, 0.84, 0.84, 0, 10, PAL.laterite);
  box(gx + 0.14, gy + 0.14, 0.72, 0.72, 10, 24, PAL.laterite);
  courses(gx + 0.14, gy + 0.14, 0.72, 0.72, 10, 24, 4, "rgba(60,20,8,0.35)");
  rightFaceQuad(gx + 0.14, gy + 0.14, 0.72, 0.72, 0.4, 0.6, 22, 28, "#24160a");
  box(gx + 0.02, gy + 0.02, 0.96, 0.96, 34, 3, PAL.timber);
  for (const [px, py] of [[0.05, 0.05], [0.83, 0.05], [0.05, 0.83], [0.83, 0.83]]) box(gx + px, gy + py, 0.1, 0.1, 37, 10, PAL.timber);
  hipRoof(gx - 0.04, gy - 0.04, 1.08, 1.08, 47, 12, PAL.tile);
  flag(iso(gx + 0.5, gy + 0.5, 59), 12, PAL.maroon, now);
}

function drawCitadel(b, now) {
  const { gx, gy, w, h } = b;
  // Laterite terrace with front steps
  box(gx, gy, w, h, 0, 9, PAL.laterite);
  courses(gx, gy, w, h, 0, 9, 3, "rgba(60,20,8,0.4)");
  for (let i = 0; i < 3; i++) box(gx + 0.7, gy + h + 0.02 - i * 0.08, 0.6, 0.12, i * 3, 3, PAL.stone);
  // Ground storey with verandah pillars
  box(gx + 0.25, gy + 0.25, w - 0.5, h - 0.5, 9, 16, PAL.whitewash);
  for (let i = 0; i <= 4; i++) {
    box(gx + 0.15 + i * 0.4, gy + h - 0.22, 0.08, 0.08, 9, 16, "#f4ecda");
    box(gx + w - 0.22, gy + 0.15 + i * 0.4, 0.08, 0.08, 9, 16, "#f4ecda");
  }
  leftFaceQuad(gx + 0.25, gy + 0.25, w - 0.5, h - 0.5, 0.42, 0.58, 9, 21, "#3a2614");
  hipRoof(gx + 0.02, gy + 0.02, w - 0.04, h - 0.04, 25, 9, PAL.tile);
  // Upper storey (Kandyan two-tier roof)
  box(gx + 0.55, gy + 0.55, w - 1.1, h - 1.1, 31, 12, PAL.whitewash);
  rightFaceQuad(gx + 0.55, gy + 0.55, w - 1.1, h - 1.1, 0.3, 0.45, 34, 40, "#2b1d10");
  rightFaceQuad(gx + 0.55, gy + 0.55, w - 1.1, h - 1.1, 0.55, 0.7, 34, 40, "#2b1d10");
  hipRoof(gx + 0.38, gy + 0.38, w - 0.76, h - 0.76, 43, 18, PAL.tile);
  const top = iso(gx + 1, gy + 1, 61);
  ctx.fillStyle = PAL.gold;
  ctx.beginPath(); ctx.moveTo(top.x - 3, top.y + 2); ctx.lineTo(top.x, top.y - 8); ctx.lineTo(top.x + 3, top.y + 2); ctx.fill();
  flag(iso(gx + 1, gy + 1, 60), 26, PAL.maroon, now);
}

function drawDagoba(b) {
  const { gx, gy, w, h } = b;
  box(gx + 0.05, gy + 0.05, w - 0.1, h - 0.1, 0, 5, PAL.stone);
  box(gx + 0.05, gy + 0.05, w - 0.1, 0.08, 5, 4, shade(PAL.stone, 1.05));
  box(gx + 0.05, gy + 0.05, 0.08, h - 0.1, 5, 4, shade(PAL.stone, 1.05));
  const c = iso(gx + w / 2, gy + h / 2, 5);
  // Three basal rings
  for (let i = 0; i < 3; i++) cylinder(c.x, c.y - i * 4, 30 - i * 3, 4, "#ebe6da");
  // Bell dome, lit from upper left
  const dy = c.y - 12;
  const g = ctx.createRadialGradient(c.x - 10, dy - 22, 4, c.x, dy - 8, 34);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.6, "#e9e3d5"); g.addColorStop(1, "#b9b2a2");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(c.x, dy, 24, 30, 0, Math.PI, 0); ctx.ellipse(c.x, dy, 24, 6, 0, 0, Math.PI); ctx.fill();
  ctx.strokeStyle = "rgba(60,50,30,0.35)"; ctx.lineWidth = 1; ctx.stroke();
  // Harmika and spire
  ctx.fillStyle = "#d9d2c2"; ctx.fillRect(c.x - 6, dy - 38, 12, 8);
  ctx.fillStyle = "#b9b2a2"; ctx.fillRect(c.x + 1, dy - 38, 5, 8);
  cone(c.x, dy - 38, 5, 26, "#e4ddcd");
  for (let i = 1; i < 5; i++) line({ x: c.x - 5 + i, y: dy - 38 - i * 5 }, { x: c.x + 5 - i, y: dy - 38 - i * 5 }, "rgba(80,70,50,0.4)", 1);
  ctx.fillStyle = PAL.gold;
  ctx.beginPath(); ctx.arc(c.x, dy - 66, 2.5, 0, Math.PI * 2); ctx.fill();
}

function drawBissa(b) {
  const { gx, gy } = b;
  const c = iso(gx + 0.5, gy + 0.5, 0);
  for (const [ox, oy] of [[-9, -2], [9, -2], [-5, 3], [5, 3]]) line({ x: c.x + ox, y: c.y + oy }, { x: c.x + ox, y: c.y + oy - 8 }, PAL.timber, 2);
  cylinder(c.x, c.y - 8, 14, 14, "#b58e57");
  for (let i = 1; i < 3; i++) line({ x: c.x - 14, y: c.y - 8 - i * 5 }, { x: c.x + 14, y: c.y - 8 - i * 5 }, "rgba(80,50,20,0.35)", 1);
  cone(c.x, c.y - 22, 19, 22, PAL.thatch);
}

function drawMarket(b, now) {
  const { gx, gy, w, h } = b;
  box(gx + 0.05, gy + 0.05, w - 0.1, h - 0.1, 0, 3, PAL.stone);
  // Stalls of goods
  const goods = ["#f2efe6", "#c0392b", "#e9b949", "#6cc070", "#8e5a2c"];
  for (let i = 0; i < 6; i++) {
    const p = iso(gx + 0.4 + (i % 3) * 0.6, gy + 0.5 + Math.floor(i / 3) * 0.8, 3);
    ctx.fillStyle = "#6b4426"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = goods[i % goods.length]; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const [px, py] of [[0.1, 0.1], [w - 0.2, 0.1], [0.1, h - 0.2], [w - 0.2, h - 0.2], [w / 2 - 0.05, h - 0.2], [w - 0.2, h / 2 - 0.05]]) {
    box(gx + px, gy + py, 0.1, 0.1, 3, 13, PAL.timber);
  }
  hipRoof(gx - 0.02, gy - 0.02, w + 0.04, h + 0.04, 16, 12, PAL.tile);
  // Striped awning on the front
  for (let i = 0; i < 6; i++) leftFaceQuad(gx, gy, w, h, i / 6, (i + 1) / 6, 12, 16, i % 2 ? "#e9b949" : "#a8321e");
}

function drawWoodcutter(b) {
  const { gx, gy } = b;
  hall(gx, gy, 0.75, 0.75, { plinth: 1, wallH: 10, roofH: 11, roof: PAL.thatch, thatch: true, wall: "#c99a5e", windows: 0 });
  // Log pile to the right
  const p = iso(gx + 0.88, gy + 0.55, 0);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) {
    const x = p.x - 6 + i * 6 + r * 3, y = p.y - 3 - r * 5;
    ctx.fillStyle = "#7d5125"; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d9b27a"; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
  }
}

function drawQuarry(b) {
  const { gx, gy } = b;
  for (const [px, py] of [[0.05, 0.05], [0.7, 0.05], [0.05, 0.7], [0.7, 0.7]]) box(gx + px, gy + py, 0.08, 0.08, 0, 12, PAL.timber);
  hipRoof(gx - 0.02, gy - 0.02, 0.86, 0.86, 12, 8, PAL.thatch, true);
  box(gx + 0.7, gy + 0.72, 0.25, 0.2, 0, 5, PAL.stone);
  box(gx + 0.72, gy + 0.72, 0.18, 0.15, 5, 4, shade(PAL.stone, 1.05));
  box(gx + 0.45, gy + 0.85, 0.2, 0.12, 0, 4, PAL.stone);
}

function drawBarracks(b, now) {
  const { gx, gy, w, h } = b;
  diamond(gx, gy, w, h, 0, "#c9b07a");
  hall(gx + 0.25, gy + 0.25, 1.5, 1.5, { pillars: true, wallH: 14, roofH: 14 });
  // Weapon rack
  const p = iso(gx + 1.95, gy + 0.35, 0);
  for (let i = 0; i < 4; i++) line({ x: p.x - 6 + i * 4, y: p.y + i * 2 }, { x: p.x - 7 + i * 4, y: p.y - 18 + i * 2 }, "#a0896a", 1.2);
  line({ x: p.x - 8, y: p.y - 10 }, { x: p.x + 8, y: p.y - 2 }, PAL.timber, 2);
  flag(iso(gx + 0.15, gy + 1.85, 0), 30, PAL.maroon, now);
}

// Sprite key for a (non-wall) building.
function buildingKey(b) {
  if (b.id === "house") return `house.${b.uid % 3}`;
  if (b.id === "gate") {
    const links = wallLinks(b);
    return links.some(([dx]) => dx === 0) && !links.some(([, dy]) => dy === 0) ? "gate.a" : "gate.b";
  }
  return b.id;
}
// Wall pieces in draw order: back arms, centre, front arms.
function wallKeys(b) {
  let links = wallLinks(b);
  if (!links.length) links = b.id === "palisade" ? [[1, 0], [-1, 0]] : [];
  const has = (dx, dy) => links.some(([a, c]) => a === dx && c === dy);
  const out = [];
  if (has(-1, 0)) out.push(`${b.id}.nx`);
  if (has(0, -1)) out.push(`${b.id}.ny`);
  out.push(`${b.id}.c`);
  if (has(1, 0)) out.push(`${b.id}.px`);
  if (has(0, 1)) out.push(`${b.id}.py`);
  return out;
}

// Construction: a building first appears as a marked-out site, then rises
// out of its scaffolding. Timed in simulation seconds; purely cosmetic.
const BUILD_TIME = 2.6;
// b.at is the simulation time the building was placed (set in addBuilding).
function buildProgress(b) {
  if (!(b.at > 0)) return 1; // placed at level start
  return clamp((S.time - b.at) / BUILD_TIME, 0, 1);
}

const FLAGS = { citadel: [1.42, 0.5, 52, 20], tower: [0.5, 0.5, 60, 12], gate: [0.5, 0.5, 51, 12], barracks: [1.85, 1.85, 0, 30] };

function drawBuildingSprite(b, now) {
  const key = b.def.wall && b.id !== "gate" ? null : buildingKey(b);
  if (key && !hasSprite(key)) return false;
  if (!key && !hasSprite(`${b.id}.c`)) return false;
  const prog = buildProgress(b);
  const n = Math.max(b.w, b.h) > 1 ? 2 : 1;
  if (prog < 0.3) { drawSprite(`site.${n}`, b.gx, b.gy); return true; }
  const clip = prog < 1 ? (prog - 0.3) / 0.7 : undefined;
  const o = clip !== undefined ? { clip } : undefined;
  if (key) drawSprite(key, b.gx, b.gy, 0, o);
  else for (const k of wallKeys(b)) drawSprite(k, b.gx, b.gy, 0, o);
  if (prog < 1) { drawSprite(`scaffold.${n}`, b.gx, b.gy); return true; }
  const fl = FLAGS[b.id];
  if (fl) flag(iso(b.gx + fl[0], b.gy + fl[1], fl[2]), fl[3], PAL.maroon, now);
  drawDamage(b);
  return true;
}

// Soot and cracks on damaged buildings (fire and smoke come from updateFx).
function drawDamage(b) {
  const k = b.hp / b.maxHp;
  if (k > 0.65) return;
  const sev = (0.65 - k) / 0.65;
  const top = b.def.z || 18;
  for (let i = 0; i < 3 + b.w * 2; i++) {
    const p = iso(b.gx + 0.15 + hash(b.uid, i) * (b.w - 0.3), b.gy + 0.15 + hash(i, b.uid) * (b.h - 0.3), 3 + hash(b.uid, i, 3) * top * 0.7);
    const r = 4 + hash(b.uid, i, 4) * 7;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, `rgba(20,14,10,${0.55 * sev})`); g.addColorStop(1, "rgba(20,14,10,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = `rgba(25,15,8,${0.7 * sev})`; ctx.lineWidth = 0.7;
  for (let i = 0; i < 3; i++) {
    let p = iso(b.gx + b.w * (0.3 + hash(i, b.uid, 7) * 0.5), b.gy + b.h, 4 + hash(b.uid, i, 8) * top * 0.4);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    for (let j = 0; j < 4; j++) { p = { x: p.x + (hash(i, j, b.uid) - 0.5) * 5, y: p.y - 2 - hash(j, i) * 3 }; ctx.lineTo(p.x, p.y); }
    ctx.stroke();
  }
}

// Rubble left where a building was destroyed (render-local, fades after a while).
const ruins = { S: null, list: [], seen: new Map() };
function drawRuins() {
  if (ruins.S !== S) { ruins.S = S; ruins.list = []; ruins.seen = new Map(); }
  const now = new Map();
  for (const b of S.buildings) now.set(b.uid, b);
  for (const [uid, b] of ruins.seen) {
    if (!now.has(uid) && b.hp <= 0 && b.id !== "canal" && b.id !== "paddy") ruins.list.push({ gx: b.gx, gy: b.gy, n: Math.max(b.w, b.h) > 1 ? 2 : 1, t: S.time });
  }
  ruins.seen = now;
  ruins.list = ruins.list.filter(r => S.time - r.t < 60);
  for (const r of ruins.list) {
    const occ = buildingAt(r.gx, r.gy);
    if (occ && buildProgress(occ) >= 0.3) continue;
    drawSprite(`rubble.${r.n}`, r.gx, r.gy, 0, { alpha: clamp((60 - (S.time - r.t)) / 10, 0, 1) });
  }
}

function drawBuilding(b, now) {
  if (drawBuildingSprite(b, now)) return;
  const { gx, gy, w, h } = b;
  switch (b.id) {
    case "citadel": drawCitadel(b, now); break;
    case "dagoba": drawDagoba(b); break;
    case "palisade": drawPalisade(b); break;
    case "rampart": drawRampart(b); break;
    case "gate": drawGate(b, now); break;
    case "tower": drawTower(b, now); break;
    case "bissa": drawBissa(b); break;
    case "market": drawMarket(b, now); break;
    case "woodcutter": drawWoodcutter(b); break;
    case "quarry": drawQuarry(b); break;
    case "barracks": drawBarracks(b, now); break;
    case "house":
      hall(gx, gy, w, h, { plinth: 2, wallH: 11, roofH: 13, roof: PAL.thatch, thatch: true, wall: "#cfa36a", windows: 1 });
      break;
    case "storehouse":
      hall(gx, gy, w, h, { wallH: 14, roofH: 14, windows: 2 });
      for (let i = 0; i < 3; i++) {
        const p = iso(gx + 0.4 + i * 0.25, gy + h + 0.1, 0);
        ctx.fillStyle = "#8a5a2b"; ctx.fillRect(p.x - 3, p.y - 8, 6, 8);
        ctx.fillStyle = "#6b441f"; ctx.fillRect(p.x - 3, p.y - 6, 6, 1.5);
      }
      break;
    default:
      hall(gx, gy, w, h);
  }
}

function drawBuildingStatus(b, now) {
  const z = (b.def.z || 8) + 18;
  if (b.def.worker && !b.worker) label("💤", b.gx + b.w / 2, b.gy + b.h / 2, z + Math.sin(now * 0.004) * 2, "13px sans-serif");
  if (b.id === "paddy" && b.growth >= 100 && b.worker) label("🍚", b.gx + 1, b.gy + 1, 22, "13px sans-serif");
  if (b.hp < b.maxHp) {
    const p = iso(b.gx + b.w / 2, b.gy + b.h / 2, z + 6);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(p.x - 17, p.y - 7, 34, 5);
    ctx.fillStyle = b.hp / b.maxHp > 0.4 ? "#6cc070" : "#d9473a";
    ctx.fillRect(p.x - 16, p.y - 6, 32 * Math.max(0, b.hp / b.maxHp), 3);
  }
}

// ==================== TREES ====================
function treeKind(t) {
  if (t.kind) return t.kind;
  const x = Math.floor(t.gx), y = Math.floor(t.gy);
  let nearRiver = false;
  for (let dy = -2; dy <= 2 && !nearRiver; dy++) for (let dx = -2; dx <= 2; dx++) if (isRiver(x + dx, y + dy)) { nearRiver = true; break; }
  const r = hash(t.gx * 10, t.gy * 10);
  t.kind = nearRiver && r < 0.7 ? "palm" : r < 0.12 ? "flame" : r < 0.4 ? "jak" : "broad";
  return t.kind;
}

const treeScale = t => 0.5 + 0.5 * (t.stage / 100);
function treeSpriteKey(t) {
  const k = treeKind(t);
  return `tree.${k === "palm" ? "palm" : k}.${S.season}.${Math.floor(hash(t.gx * 7, t.gy * 7, 2) * 3)}`;
}
function drawTree(t, now) {
  if (drawSprite("tree", t.gx, t.gy)) return;
  if (hasSprite("stump")) {
    if (t.stage < 12) { drawSprite("stump", t.gx, t.gy); return; }
    if (t.stage < 35) { drawSprite(`tree.sapling.${S.season}`, t.gx, t.gy, 0, { scale: 0.6 + t.stage / 60 }); return; }
    // gentle sway: draw the tree twice? no — a tiny horizontal skew is enough
    const sway = Math.sin(now * 0.0012 + t.gx * 3 + t.gy) * 0.012;
    const p = iso(t.gx, t.gy, 0);
    ctx.save(); ctx.translate(p.x, p.y); ctx.transform(1, 0, sway, 1, 0, 0); ctx.translate(-p.x, -p.y);
    drawSprite(treeSpriteKey(t), t.gx, t.gy, 0, { scale: treeScale(t), flip: hash(t.gx, t.gy, 9) > 0.5 });
    ctx.restore();
    return;
  }
  const p = iso(t.gx, t.gy, 0);
  if (t.stage < 35) {
    ctx.fillStyle = "#6b4426"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c9a26a"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 3, 2.6, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    if (t.stage > 10) { ctx.fillStyle = "#5c9a3a"; ctx.beginPath(); ctx.arc(p.x + 3, p.y - 5, 2, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  const s = 0.5 + 0.5 * (t.stage / 100);
  const sway = Math.sin(now * 0.0015 + t.gx * 3) * 1.2 * s;
  const yala = S.season === "yala";
  const kind = treeKind(t);
  if (kind === "palm") {
    const topX = p.x + 6 * s + sway, topY = p.y - 34 * s;
    ctx.strokeStyle = "#7a5a38"; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x - 2, p.y - 18 * s, topX, topY); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      const ex = topX + Math.cos(a) * 15 * s, ey = topY + Math.sin(a) * 6 * s + 5 * s;
      ctx.strokeStyle = i % 2 ? (yala ? "#5f7a2c" : "#2f7a2e") : (yala ? "#7b9440" : "#3f9a3a");
      ctx.lineWidth = 2.4 * s;
      ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo((topX + ex) / 2, topY - 5 * s, ex, ey); ctx.stroke();
    }
    ctx.fillStyle = "#7a5a20";
    ctx.beginPath(); ctx.arc(topX - 1.5, topY + 2, 1.8 * s, 0, Math.PI * 2); ctx.arc(topX + 2, topY + 2, 1.8 * s, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const trunkH = (kind === "jak" ? 12 : 14) * s;
  ctx.fillStyle = "#4f3317";
  ctx.fillRect(p.x - 1.8 * s, p.y - trunkH, 3.6 * s, trunkH);
  const base = kind === "jak" ? (yala ? "#3c5420" : "#1f4a1d") : (yala ? "#55702a" : "#2c6424");
  const mid = kind === "jak" ? (yala ? "#4e6a2a" : "#2b5f27") : (yala ? "#6c8a36" : "#3c7f2f");
  const hi = yala ? "#93ab52" : "#5fa646";
  const cy = p.y - trunkH - 6 * s;
  const blobs = kind === "jak"
    ? [[0, 0, 9, base], [-4, -4, 7, mid], [3, -7, 6, mid], [-1, -10, 5, hi]]
    : [[0, 0, 11, base], [-6, -3, 8, mid], [6, -2, 8, mid], [0, -8, 8, mid], [-3, -10, 5, hi]];
  for (const [dx, dy, r, col] of blobs) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(p.x + dx * s + sway, cy + dy * s, r * s, 0, Math.PI * 2); ctx.fill();
  }
  if (kind === "flame") {
    ctx.fillStyle = yala ? "#e8562a" : "#d8452a";
    for (let i = 0; i < 9; i++) ctx.fillRect(p.x + (hash(t.gx, i) - 0.5) * 18 * s + sway, cy + (hash(i, t.gy) - 0.7) * 16 * s, 2, 2);
  }
  if (kind === "jak" && t.stage >= 100) {
    ctx.fillStyle = "#9db04a";
    ctx.beginPath(); ctx.ellipse(p.x + 2, p.y - trunkH + 2, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// ==================== PEOPLE ====================
// A small person: skin, clothing, optional headgear and held item.
function person(p, o, now) {
  const moving = o.moving;
  const ph = moving ? Math.sin(now * 0.016 + o.seed) : 0;
  const s = o.scale || 1;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 5 * s, 2.3 * s, 0, 0, Math.PI * 2); ctx.fill();
  // Legs
  ctx.strokeStyle = o.skin; ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(p.x - 1.2 * s, p.y - 5 * s); ctx.lineTo(p.x - 1.2 * s + ph * 1.8, p.y);
  ctx.moveTo(p.x + 1.2 * s, p.y - 5 * s); ctx.lineTo(p.x + 1.2 * s - ph * 1.8, p.y);
  ctx.stroke();
  // Sarong / lower garment
  ctx.fillStyle = o.lower;
  ctx.beginPath();
  ctx.moveTo(p.x - 3 * s, p.y - 9 * s); ctx.lineTo(p.x + 3 * s, p.y - 9 * s);
  ctx.lineTo(p.x + 3.4 * s, p.y - 3.5 * s); ctx.lineTo(p.x - 3.4 * s, p.y - 3.5 * s);
  ctx.closePath(); ctx.fill();
  // Torso
  ctx.fillStyle = o.upper;
  ctx.fillRect(p.x - 3 * s, p.y - 14 * s, 6 * s, 5.5 * s);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(p.x + 1 * s, p.y - 14 * s, 2 * s, 5.5 * s);
  if (o.sash) { ctx.fillStyle = o.sash; ctx.fillRect(p.x - 3 * s, p.y - 9.8 * s, 6 * s, 1.4 * s); }
  // Arms
  ctx.strokeStyle = o.skin; ctx.lineWidth = 1.3 * s;
  ctx.beginPath();
  ctx.moveTo(p.x - 3 * s, p.y - 13 * s); ctx.lineTo(p.x - 4 * s - ph, p.y - 8.5 * s);
  ctx.moveTo(p.x + 3 * s, p.y - 13 * s); ctx.lineTo(p.x + 4 * s + ph, p.y - 8.5 * s);
  ctx.stroke();
  // Head
  ctx.fillStyle = o.skin;
  ctx.beginPath(); ctx.arc(p.x, p.y - 16.5 * s, 2.8 * s, 0, Math.PI * 2); ctx.fill();
  if (o.head === "turban") { ctx.fillStyle = o.headCol || "#f2efe6"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 18.5 * s, 3.2 * s, 1.9 * s, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (o.head === "helm") { ctx.fillStyle = o.headCol || "#3a3a3a"; ctx.beginPath(); ctx.arc(p.x, p.y - 17.3 * s, 3 * s, Math.PI, 0); ctx.fill(); ctx.fillRect(p.x - 0.5, p.y - 22 * s, 1, 2.5 * s); }
  else if (o.head === "band") { ctx.fillStyle = o.headCol; ctx.fillRect(p.x - 3 * s, p.y - 18 * s, 6 * s, 1.3 * s); ctx.fillStyle = "#1d140c"; ctx.beginPath(); ctx.arc(p.x, p.y - 17.5 * s, 2.8 * s, Math.PI, 0); ctx.fill(); }
  else { ctx.fillStyle = "#1d140c"; ctx.beginPath(); ctx.arc(p.x, p.y - 17.3 * s, 2.8 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
  // Held items
  if (o.item === "spear") {
    line({ x: p.x + 4.5 * s, y: p.y - 1 }, { x: p.x + 5.5 * s, y: p.y - 26 * s }, "#8a6a40", 1.3);
    poly([{ x: p.x + 5.5 * s, y: p.y - 30 * s }, { x: p.x + 4.3 * s, y: p.y - 25 * s }, { x: p.x + 6.6 * s, y: p.y - 25 * s }], "#d9d9d9");
  } else if (o.item === "bow") {
    ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(p.x + 3 * s, p.y - 11 * s, 7 * s, -1.3, 1.3); ctx.stroke();
    line({ x: p.x + 3 * s + 7 * s * Math.cos(-1.3), y: p.y - 11 * s + 7 * s * Math.sin(-1.3) }, { x: p.x + 3 * s + 7 * s * Math.cos(1.3), y: p.y - 11 * s + 7 * s * Math.sin(1.3) }, "rgba(240,230,200,0.7)", 0.6);
  } else if (o.item === "sword") {
    line({ x: p.x + 4.5 * s, y: p.y - 8 * s }, { x: p.x + 9 * s, y: p.y - 17 * s }, "#e0e0e0", 1.4);
  }
  if (o.shield) {
    ctx.fillStyle = o.shield;
    ctx.beginPath(); ctx.ellipse(p.x - 4 * s, p.y - 10 * s, 3 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(p.x - 4.5 * s, p.y - 11 * s, 1, 2);
  }
  if (o.load) {
    const [col, kind] = o.load;
    if (kind === "logs") { ctx.fillStyle = col; ctx.fillRect(p.x - 7 * s, p.y - 15 * s, 12 * s, 2.6 * s); ctx.fillRect(p.x - 6 * s, p.y - 17.5 * s, 11 * s, 2.4 * s); }
    else { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(p.x, p.y - 21.5 * s, 4 * s, 2.6 * s, 0, 0, Math.PI * 2); ctx.fill(); }
  }
}

// Facing and stride tracking for anything that walks (render-local).
const gait = new WeakMap();
function stride(o) {
  let g = gait.get(o);
  if (!g) { g = { x: o.gx, y: o.gy, d: 0, back: false, flip: false, moving: false }; gait.set(o, g); }
  const dx = o.gx - g.x, dy = o.gy - g.y, m = Math.hypot(dx, dy);
  g.moving = m > 0.0005;
  if (m > 0.002) {
    const sx = dx - dy, sy = dx + dy;
    g.back = sy < -0.05 * m; g.flip = sx < 0;
  }
  g.d += m; g.x = o.gx; g.y = o.gy;
  return g;
}
function drawWorkerSprite(w, now) {
  const base = `u.v.${w.job === "bucket" ? "farmer" : w.job}`;
  if (!hasSprite(`${base}.f.i0`)) return false;
  const g = stride(w);
  const f = g.back ? "b" : "f";
  const moving = g.moving;
  const working = w.phase === "work" || (w.phase === "tend" && w.job !== "trader") || (w.job === "trader" && w.phase === "tend");
  let fr;
  if (moving) fr = `w${Math.floor(g.d * 7) % 6}`;
  else if (working) fr = `a${Math.floor(now / (w.job === "farmer" || w.job === "trader" ? 260 : 150) + w.b.uid) % 3}`;
  else fr = "i0";
  drawSprite(`${base}.${f}.${fr}`, w.gx, w.gy, 0, { flip: g.flip });
  if (w.carry && moving) drawSprite(`load.${w.carry.key}.${f}.${fr}`, w.gx, w.gy, 0, { flip: g.flip });
  if (w.phase === "work" && Math.floor(now / 150) % 3 === 2 && hash(now | 0, 1) > 0.6) {
    const p = iso(w.gx, w.gy, 0);
    ctx.fillStyle = w.job === "mason" ? "#ddd" : "#d9b27a";
    ctx.fillRect(p.x + (g.flip ? -9 : 7), p.y - 6, 1.5, 1.5);
  }
  return true;
}

function drawWorker(w, now) {
  if (drawWorkerSprite(w, now)) return;
  const p = iso(w.gx, w.gy, 0);
  const moving = w.phase === "toSite" || w.phase === "toStore";
  const working = w.phase === "work";
  const load = w.carry ? { timber: ["#8c5828", "logs"], stone: ["#bdbdb5", "basket"], rice: ["#efe2b0", "basket"] }[w.carry.key] : null;
  person(p, {
    moving, seed: w.b.uid, skin: "#8a5a36", upper: w.job === "trader" ? "#e9b949" : "#f2efe6",
    lower: ["#3d6fa8", "#a8321e", "#2f8f4e", "#6b4a8a"][w.b.uid % 4], head: w.job === "farmer" ? "turban" : null, load
  }, now);
  if (working) {
    const swing = Math.sin(now * 0.02) * 6;
    line({ x: p.x + 3, y: p.y - 12 }, { x: p.x + 8, y: p.y - 18 + swing }, "#6b4426", 1.6);
    if (Math.sin(now * 0.02) > 0.9) {
      ctx.fillStyle = w.job === "mason" ? "#ddd" : "#d9b27a";
      ctx.fillRect(p.x + 9, p.y - 10, 2, 2); ctx.fillRect(p.x + 7, p.y - 7, 1.5, 1.5);
    }
  }
}

function drawElephant(p, u, now) {
  const moving = Math.hypot(u.tx - u.gx, u.ty - u.gy) > 0.15;
  const ph = moving ? Math.sin(now * 0.008 + u.uid) * 2 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5e5e64";
  for (const [lx, o] of [[-8, ph], [-3, -ph], [4, ph], [9, -ph]]) ctx.fillRect(p.x + lx - 2, p.y - 9, 4.5, 9 + o * 0.3);
  const g = ctx.createRadialGradient(p.x - 4, p.y - 18, 3, p.x, p.y - 13, 16);
  g.addColorStop(0, "#8a8a92"); g.addColorStop(1, "#4e4e55");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(p.x, p.y - 14, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + 12, p.y - 17, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#6e6e76";
  ctx.beginPath(); ctx.ellipse(p.x + 9, p.y - 16, 4, 6, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5e5e64"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(p.x + 16, p.y - 15); ctx.quadraticCurveTo(p.x + 21, p.y - 6 + ph, p.x + 18, p.y - 2); ctx.stroke();
  line({ x: p.x + 15, y: p.y - 13 }, { x: p.x + 20, y: p.y - 10 }, "#f4efe2", 1.8);
  // Caparison and mahout
  ctx.fillStyle = "#a8321e";
  ctx.beginPath(); ctx.ellipse(p.x - 1, p.y - 19, 9, 5, 0, Math.PI, 0); ctx.lineTo(p.x + 8, p.y - 13); ctx.lineTo(p.x - 10, p.y - 13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(p.x - 10, p.y - 14, 18, 1.6);
  person({ x: p.x + 2, y: p.y - 18 }, { skin: "#8a5a36", upper: "#f2efe6", lower: "#a8321e", head: "turban", headCol: PAL.gold, scale: 0.75, seed: 0 }, now);
}

function drawUnit(u, now) {
  const p = iso(u.gx, u.gy, u.z);
  const heavy = u.def.heavy;
  if (u.sel) {
    ctx.strokeStyle = "#6cc070"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, heavy ? 16 : 8, heavy ? 7 : 4, 0, 0, Math.PI * 2); ctx.stroke();
  }
  const moving = u.team === "p" ? Math.hypot(u.tx - u.gx, u.ty - u.gy) > 0.15 : true;
  const base = `u.${u.type}`;
  if (hasSprite(`${base}.f.i0`)) {
    const g = stride(u);
    const since = S.time - u.last;
    let fr;
    if (since >= 0 && since < 0.45) fr = `a${Math.min(2, Math.floor(since / 0.15))}`;
    else if (g.moving) fr = `w${Math.floor(g.d * (u.type === "elephant" ? 4 : 7)) % 6}`;
    else fr = "i0";
    const f = u.type === "elephant" || !g.back ? "f" : "b";
    drawSprite(`${base}.${f}.${fr}`, u.gx, u.gy, u.z, { flip: g.flip });
    // hidden in the forest: foliage in front of the soldier
    if (u.team === "p" && typeof inCover === "function" && inCover(u)) drawSprite(`bush.${S.season}.${u.uid % 3}`, u.gx + 0.08, u.gy + 0.08, 0, { scale: u.type === "elephant" ? 1.4 : 0.85, alpha: 0.9 });
  }
  else if (u.type === "elephant") drawElephant(p, u, now);
  else if (u.team === "p") {
    const look = {
      archer: { upper: "#2f8f4e", lower: "#f2efe6", item: "bow", head: "turban", headCol: "#2f8f4e" },
      spearman: { upper: "#2d6fa8", lower: "#f2efe6", item: "spear", shield: "#c9a24a", head: "turban", headCol: "#f2efe6" },
      angampora: { upper: "#8a5a36", lower: "#d2902a", item: "sword", head: "band", headCol: "#d2902a", sash: "#a8321e" }
    }[u.type];
    person(p, { ...look, moving, seed: u.uid, skin: "#8a5a36" }, now);
  } else {
    const look = {
      raider: { upper: "#4a2a2a", lower: "#2a2a2a", item: "sword", shield: "#7a1d1d", head: "helm" },
      bowman: { upper: "#3b3226", lower: "#2a2a2a", item: "bow", head: "helm", headCol: "#5a4a3a" },
      brute: { upper: "#5a1414", lower: "#2a2a2a", head: "helm", scale: 1.35 }
    }[u.type];
    person(p, { ...look, moving, seed: u.uid, skin: "#b98a62", sash: "#a8321e" }, now);
    if (u.type === "brute") {
      box(u.gx - 0.45, u.gy - 0.05, 0.9, 0.1, 12, 4, "#6b4a2a");
      const tip = iso(u.gx + 0.45, u.gy, 14);
      ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(tip.x, tip.y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  const k = Math.max(0, u.hp / u.maxHp);
  if (k < 1 || u.sel) {
    const top = u.type === "elephant" ? 40 : heavy ? 34 : 26;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(p.x - 9, p.y - top, 18, 3);
    ctx.fillStyle = u.team === "p" ? "#6cc070" : "#ff5a4a";
    ctx.fillRect(p.x - 9, p.y - top, 18 * k, 3);
  }
}

// ==================== PROJECTILES, FX & OVERLAYS ====================
function drawShots() {
  for (const s of S.shots) {
    const k = s.t / s.dur;
    const x = s.sx + (s.target.gx - s.sx) * k, y = s.sy + (s.target.gy - s.sy) * k;
    const z = s.sz * (1 - k) + 10 * k + Math.sin(k * Math.PI) * 26;
    const p = iso(x, y, z);
    const k2 = Math.min(1, k + 0.05);
    const q = iso(s.sx + (s.target.gx - s.sx) * k2, s.sy + (s.target.gy - s.sy) * k2, s.sz * (1 - k2) + 10 * k2 + Math.sin(k2 * Math.PI) * 26);
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    line({ x: p.x - Math.cos(a) * 6, y: p.y - Math.sin(a) * 6 }, p, "#e8dcb0", 1.4);
    if (s.fire) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 5);
      g.addColorStop(0, "rgba(255,240,170,1)"); g.addColorStop(0.4, "rgba(255,140,30,0.8)"); g.addColorStop(1, "rgba(255,60,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
    } else { ctx.fillStyle = "#cfcfcf"; ctx.fillRect(p.x - 1, p.y - 1, 2, 2); }
  }
}

function puff(gx, gy, n, col) {
  if (!S.fx) S.fx = [];
  for (let i = 0; i < n; i++) {
    S.fx.push({ gx: gx + (Math.random() - 0.5) * 0.8, gy: gy + (Math.random() - 0.5) * 0.8, z: 4 + Math.random() * 10,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, vz: 10 + Math.random() * 18,
      life: 1.2 + Math.random(), max: 2.2, r: 3 + Math.random() * 4, col });
  }
}

function updateFx(dt) {
  if (!S.fx) S.fx = [];
  for (const b of S.buildings) {
    // Hearth smoke from the citadel and houses
    if ((b.id === "citadel" || b.id === "house") && Math.random() < dt * 0.8) {
      S.fx.push({ gx: b.gx + b.w * 0.3, gy: b.gy + b.h * 0.3, z: b.id === "citadel" ? 58 : 24, vx: 0.15, vy: -0.05, vz: 9, life: 2.5, max: 2.5, r: 2.5, col: "#d8d4cc" });
    }
    // Sparks and smoke from a working forge
    if (b.id === "kammala" && b.worker && b.worker.phase === "work") {
      if (Math.random() < dt * 6) S.fx.push({ gx: b.gx + 0.35, gy: b.gy + 0.75, z: 7, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, vz: 20 + Math.random() * 15, life: 0.5, max: 0.5, r: 1.2, col: "#ffb040", kind: "flame" });
      if (Math.random() < dt * 1.2) S.fx.push({ gx: b.gx + 0.3, gy: b.gy + 0.3, z: 24, vx: 0.15, vy: -0.05, vz: 9, life: 2.5, max: 2.5, r: 2.5, col: "#7a7470", kind: "smoke" });
    }
    // Burning buildings (fire arrows)
    if (b.fire > 0) {
      if (Math.random() < dt * 10 * b.fire) S.fx.push({ gx: b.gx + 0.15 + Math.random() * (b.w - 0.3), gy: b.gy + 0.15 + Math.random() * (b.h - 0.3), z: (b.def.z || 10) * (0.3 + Math.random() * 0.7), vx: 0.05, vy: -0.03, vz: 20 + Math.random() * 12, life: 0.8, max: 0.8, r: 3 + Math.random() * 2.5 * b.fire, col: "#ff9a2a", kind: "flame" });
      if (Math.random() < dt * 3 * b.fire) S.fx.push({ gx: b.gx + Math.random() * b.w, gy: b.gy + Math.random() * b.h, z: (b.def.z || 10) + 4, vx: 0.25, vy: -0.1, vz: 16, life: 3.5, max: 3.5, r: 4, col: "#3a3430", kind: "smoke" });
    }
    // Damaged buildings smoke; badly damaged ones burn
    const k = b.hp / b.maxHp;
    if (k < 0.6 && Math.random() < dt * (0.6 - k) * 8) {
      S.fx.push({ gx: b.gx + Math.random() * b.w, gy: b.gy + Math.random() * b.h, z: (b.def.z || 10) * (0.4 + Math.random() * 0.6), vx: 0.2, vy: -0.1, vz: 14, life: 3, max: 3, r: 3, col: "#4a4440", kind: "smoke" });
    }
    if (k < 0.35 && Math.random() < dt * 14) {
      S.fx.push({ gx: b.gx + 0.15 + Math.random() * (b.w - 0.3), gy: b.gy + 0.15 + Math.random() * (b.h - 0.3), z: (b.def.z || 10) * Math.random() * 0.8, vx: 0.05, vy: -0.03, vz: 18 + Math.random() * 10, life: 0.7, max: 0.7, r: 2.5 + Math.random() * 2, col: "#ff9a2a", kind: "flame" });
    }
  }
  for (let i = S.fx.length - 1; i >= 0; i--) {
    const f = S.fx[i];
    f.gx += f.vx * dt; f.gy += f.vy * dt; f.z += f.vz * dt; f.r += dt * 3; f.life -= dt;
    if (f.life <= 0) S.fx.splice(i, 1);
  }
}

function drawFx() {
  for (const f of S.fx || []) {
    if (f.kind === "flame") continue;
    const p = iso(f.gx, f.gy, f.z);
    const a = Math.max(0, f.life / f.max);
    ctx.globalAlpha = a * (f.kind === "smoke" ? 0.55 : 0.45);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, f.r);
    g.addColorStop(0, f.col); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, f.r, 0, Math.PI * 2); ctx.fill();
  }
  // flames glow additively
  ctx.globalCompositeOperation = "lighter";
  for (const f of S.fx || []) {
    if (f.kind !== "flame") continue;
    const p = iso(f.gx, f.gy, f.z);
    const a = Math.max(0, f.life / f.max);
    const r = f.r * (0.5 + a * 0.7);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, `rgba(255,236,160,${a})`); g.addColorStop(0.4, `rgba(255,140,30,${a * 0.8})`); g.addColorStop(1, "rgba(200,40,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.75, r * 1.2, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

function drawGhost() {
  const h = input.hover;
  if (!S.tool || !inb(h.gx, h.gy)) return;
  const def = BUILDINGS[S.tool];
  const ok = !canPlace(def, h.gx, h.gy);
  const gk = { house: "house.0", palisade: "palisade.c", rampart: "rampart.c", gate: "gate.b", canal: "canal.0", sluice: "sluice.closed", paddy: "paddy.w1", wewa: "wewa.front" }[S.tool] || S.tool;
  if (hasSprite(gk)) {
    diamond(h.gx, h.gy, def.w, def.h, 0, ok ? "rgba(110,230,110,0.35)" : "rgba(245,75,75,0.4)", ok ? "rgba(140,255,140,0.9)" : "rgba(255,110,110,0.9)");
    if (S.tool === "wewa") drawSprite("wewa.base", h.gx, h.gy, 0, { alpha: 0.6 });
    drawSprite(gk, h.gx, h.gy, 0, { alpha: ok ? 0.75 : 0.45 });
    if (def.tower) {
      const c = iso(h.gx + 0.5, h.gy + 0.5, 0);
      ctx.strokeStyle = "rgba(233,185,73,0.7)"; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.ellipse(c.x, c.y, def.tower.range * TW / 1.41, def.tower.range * TH / 1.41, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    return;
  }
  ctx.globalAlpha = 0.55;
  block(h.gx, h.gy, def.w, def.h, 0, def.ground ? 2 : (def.z || 16),
    ok ? "#7ef07e" : "#f54b4b", ok ? "#46b446" : "#be2d2d", ok ? "#329632" : "#962323");
  ctx.globalAlpha = 1;
  if (def.tower) {
    const c = iso(h.gx + 0.5, h.gy + 0.5, 0);
    ctx.strokeStyle = "rgba(233,185,73,0.7)"; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.ellipse(c.x, c.y, def.tower.range * TW / 1.41, def.tower.range * TH / 1.41, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawWaveMarkers(now) {
  const soon = nextWaveIn();
  if (soon > 25) return;
  const w = S.L.waves[S.nextWave];
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
  const m = MAP / 2;
  for (const edge of w.from) {
    const [x, y] = edge === "east" ? [MAP - 0.5, m] : edge === "west" ? [0.5, m] : edge === "north" ? [m, 0.5] : [m, MAP - 0.5];
    const c = iso(x, y, 0);
    const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 60);
    g.addColorStop(0, `rgba(220,50,30,${0.35 + pulse * 0.25})`);
    g.addColorStop(1, "rgba(220,50,30,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, 60, 30, 0, 0, Math.PI * 2); ctx.fill();
    flag(c, 30, "#2a2a2a", now);
    label(`${soon}s`, x, y, -10, "bold 12px sans-serif", "#ff8a7a");
  }
}

function drawCloudShadows(now) {
  for (let i = 0; i < 4; i++) {
    const gx = ((now * 0.0004 + i * 7.3) % (MAP + 10)) - 5;
    const gy = (i * 6.1 + 3) % MAP;
    const c = iso(gx, gy, 0);
    const g = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, 160);
    g.addColorStop(0, "rgba(10,20,30,0.18)");
    g.addColorStop(1, "rgba(10,20,30,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, 160, 80, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawRain(now) {
  ctx.strokeStyle = "rgba(190,215,235,0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 140; i++) {
    const x = (i * 137.3 + now * 0.22) % (view.w + 20) - 10;
    const y = (i * 263.7 + now * 0.7) % (view.h + 20) - 10;
    ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 10);
  }
  ctx.stroke();
}

// ==================== AMBIENT LIFE ====================
// Purely cosmetic and render-local: boulders and bushes scattered on the
// meadow, props beside buildings (carts, haystacks, firewood), cattle and
// water buffalo grazing, egrets stalking the wet paddies, flocks overhead.
// Animated on wall-clock time; never read by the simulation.
const amb = { S: null, rocks: [], bushes: [], props: new Map(), animals: [], last: 0, flock: null };

const freeTile = (x, y) => inb(x, y) && S.tiles[y][x].t === "grass" && !S.occ[y][x];

function resetAmbient() {
  amb.S = S; amb.last = 0; amb.flock = null;
  amb.rocks = []; amb.bushes = []; amb.props = new Map(); amb.animals = [];
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    const t = S.tiles[y][x].t;
    if (t === "rock") amb.rocks.push({ x, y, v: Math.floor(hash(x, y, 21) * 4) });
    else if (t === "grass" && hash(x, y, 33) < 0.075 && Math.hypot(x - S.L.citadel[0], y - S.L.citadel[1]) > 3.5) {
      amb.bushes.push({ gx: x + 0.2 + hash(x, y, 34) * 0.6, gy: y + 0.2 + hash(x, y, 35) * 0.6, v: Math.floor(hash(x, y, 36) * 3) });
    }
  }
  // A herd on an open meadow away from the citadel; buffalo near water if there is any.
  const [cx, cy] = S.L.citadel;
  let best = null, bs = -1;
  for (let i = 0; i < 80; i++) {
    const x = 2 + Math.floor(hash(i, S.idx, 41) * (MAP - 4)), y = 2 + Math.floor(hash(S.idx, i, 42) * (MAP - 4));
    if (!freeTile(x, y)) continue;
    let open = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (freeTile(x + dx, y + dy)) open++;
    const score = open + Math.min(8, Math.hypot(x - cx, y - cy)) * 0.8;
    if (score > bs) { bs = score; best = [x, y]; }
  }
  if (best) {
    let wet = false;
    for (let dy = -4; dy <= 4 && !wet; dy++) for (let dx = -4; dx <= 4; dx++) if (inb(best[0] + dx, best[1] + dy) && S.tiles[best[1] + dy][best[0] + dx].t === "river") { wet = true; break; }
    const n = 4 + Math.floor(hash(S.idx, 7) * 3);
    for (let i = 0; i < n; i++) {
      const type = wet && i < 2 ? "buffalo" : "cow";
      amb.animals.push({ type, home: best, gx: best[0] + 0.5 + (hash(i, 1) - 0.5) * 2, gy: best[1] + 0.5 + (hash(i, 2) - 0.5) * 2, tx: 0, ty: 0, state: "graze", t: hash(i, 3) * 6, d: 0, flip: hash(i, 4) > 0.5, seed: i });
    }
  }
}

// Props beside buildings, placed once per building on free neighbouring ground.
const PROP_FOR = { house: ["prop.woodpile", "prop.pots", "prop.fence"], storehouse: ["prop.cart", "prop.stones"], market: ["prop.cart", "prop.pots"], paddy: ["prop.haystack"], bissa: ["prop.haystack"], woodcutter: ["prop.woodpile"], quarry: ["prop.stones"], barracks: ["prop.fence"] };
function propsFor(b) {
  let list = amb.props.get(b.uid);
  if (list) return list;
  list = [];
  const opts = PROP_FOR[b.id];
  if (opts) {
    const n = b.id === "house" ? (hash(b.uid, 2) < 0.6 ? 1 : 0) : 1;
    for (let i = 0; i < n; i++) {
      const key = opts[Math.floor(hash(b.uid, i, 5) * opts.length)];
      // try the tiles in front of the building first
      const cand = [[b.gx + b.w, b.gy + Math.floor(b.h / 2)], [b.gx + Math.floor(b.w / 2), b.gy + b.h], [b.gx - 1, b.gy], [b.gx, b.gy - 1]];
      for (const [x, y] of cand) if (freeTile(x, y)) { list.push({ key, gx: x + 0.3 + hash(b.uid, 8) * 0.4, gy: y + 0.3 + hash(b.uid, 9) * 0.4, b }); break; }
    }
  }
  amb.props.set(b.uid, list);
  return list;
}
const propFree = pr => S.buildings.includes(pr.b) && !buildingAt(Math.floor(pr.gx), Math.floor(pr.gy)) && onScreen(pr.gx, pr.gy) && buildProgress(pr.b) >= 1;

function updateAmbient(now) {
  const dt = amb.last ? Math.min(0.1, (now - amb.last) / 1000) : 0;
  amb.last = now;
  for (const b of S.buildings) propsFor(b);
  if (amb.props.size > S.buildings.length + 20) {
    const live = new Set(S.buildings.map(b => b.uid));
    for (const k of amb.props.keys()) if (!live.has(k)) amb.props.delete(k);
  }
  const playing = S.mode === "play" && !S.paused;
  if (!playing) return;
  for (const a of amb.animals) {
    a.t -= dt;
    if (a.state === "walk") {
      const dx = a.tx - a.gx, dy = a.ty - a.gy, d = Math.hypot(dx, dy);
      // shy away from fighting
      if (d < 0.05 || a.t < 0) { a.state = "graze"; a.t = 4 + hash(a.seed, now | 0) * 8; continue; }
      const sp = (a.type === "buffalo" ? 0.22 : 0.3) * dt;
      a.gx += dx / d * sp; a.gy += dy / d * sp; a.d += sp;
      a.flip = dx - dy < 0;
    } else if (a.t <= 0) {
      // pick a free spot near home, with a clear straight path
      for (let tries = 0; tries < 6; tries++) {
        const tx = a.home[0] + 0.5 + (Math.random() - 0.5) * 5, ty = a.home[1] + 0.5 + (Math.random() - 0.5) * 5;
        let ok = true;
        for (let k = 0; k <= 8 && ok; k++) { const x = Math.floor(a.gx + (tx - a.gx) * k / 8), y = Math.floor(a.gy + (ty - a.gy) * k / 8); if (!inb(x, y) || S.occ[y][x] || S.tiles[y][x].t === "rock") ok = false; }
        if (ok) { a.tx = tx; a.ty = ty; a.state = "walk"; a.t = 20; break; }
      }
      if (a.state !== "walk") a.t = 3;
    }
  }
  // egrets come and go over the wet paddies
  if (!amb.flock && Math.random() < dt / 25) {
    const fromLeft = Math.random() < 0.5;
    amb.flock = { x: fromLeft ? -2 : MAP + 2, y: Math.random() * MAP, vx: fromLeft ? 1.6 : -1.6, vy: (Math.random() - 0.5) * 0.6, n: 3 + Math.floor(Math.random() * 4), t: 0 };
  }
  if (amb.flock) {
    const f = amb.flock;
    f.x += f.vx * dt; f.y += f.vy * dt; f.t += dt;
    if (f.x < -4 || f.x > MAP + 4) amb.flock = null;
  }
}

function drawAnimal(a, now) {
  let fr;
  if (a.state === "walk") fr = `w${Math.floor(a.d * 9) % 4}`;
  else fr = Math.floor(now / 2400 + a.seed) % 3 === 0 ? "i0" : "g0";
  drawSprite(`animal.${a.type}.${fr}`, a.gx, a.gy, 0, { flip: a.flip });
}

function drawBirds(now) {
  // egrets on wet paddies
  for (const b of S.buildings) {
    if (b.id !== "paddy" || !(b.irrigated || S.season === "maha") || b.growth > 70 || hash(b.uid, 3) < 0.35) continue;
    if (!onScreen(b.gx + 1, b.gy + 1)) continue;
    for (let i = 0; i < 2; i++) {
      const t = Math.floor(now / 1700 + hash(b.uid, i) * 9);
      const gx = b.gx + 0.35 + hash(b.uid, i, t % 5) * 1.3, gy = b.gy + 0.35 + hash(i, b.uid, t % 5) * 1.3;
      drawSprite(t % 3 === 0 ? "animal.egret.s" : "animal.egret.p", gx, gy, 0.5, { flip: (t + i) % 2 === 0 });
    }
  }
  const f = amb.flock;
  if (f) for (let i = 0; i < f.n; i++) {
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    const gx = f.x - Math.sign(f.vx) * row * 0.35, gy = f.y + side * row * 0.3;
    drawSprite(`animal.egret.f${Math.floor(now / 180 + i) % 2}`, gx, gy, 70 + Math.sin(now * 0.002 + i) * 2, { flip: f.vx < 0 });
  }
}

// ==================== PERAHERA ====================
// While the festival decree is in force, a procession circles the citadel:
// tuskers, Kandyan dancers and torch-bearers. Positions follow S.time so the
// parade halts when the game is paused.
const PERAHERA = ["u.v.farmer", "u.angampora", "u.angampora", "u.elephant", "u.v.trader", "u.v.farmer", "u.angampora", "u.elephant", "u.v.farmer"];
function peraheraMembers() {
  if (typeof edictOn !== "function" || !edictOn("perahera") || !hasSprite("u.elephant.f.i0")) return [];
  const c = S.citadel, x0 = c.gx - 1.4, y0 = c.gy - 1.4, x1 = c.gx + c.w + 1.4, y1 = c.gy + c.h + 1.4;
  const W = x1 - x0, H = y1 - y0, per = 2 * (W + H);
  const at = d => {
    d = ((d % per) + per) % per;
    if (d < W) return [x0 + d, y1, 1, 0];
    d -= W; if (d < H) return [x1, y1 - d, 0, -1];
    d -= H; if (d < W) return [x1 - d, y0, -1, 0];
    d -= W; return [x0, y0 + d, 0, 1];
  };
  const head = S.time * 0.55;
  return PERAHERA.map((key, i) => {
    const d = head - i * (key === "u.elephant" || PERAHERA[i - 1] === "u.elephant" ? 0.75 : 0.5);
    const [gx, gy, dx, dy] = at(d);
    return { key, gx, gy, sx: dx - dy, sy: dx + dy, d, torch: key === "u.v.farmer" };
  });
}
function drawPeraheraMember(m, now) {
  const back = m.sy < 0, flip = m.sx < 0;
  const elephant = m.key === "u.elephant";
  const fr = `w${Math.floor(m.d * (elephant ? 4 : 7)) % 6}`;
  drawSprite(`${m.key}.${elephant || !back ? "f" : "b"}.${fr}`, m.gx, m.gy, 0, { flip });
  if (m.torch) {
    const p = iso(m.gx, m.gy, 26);
    const r = 5 + Math.sin(now * 0.02 + m.d * 9) * 1.2;
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4);
    g.addColorStop(0, "rgba(255,230,150,0.95)"); g.addColorStop(0.35, "rgba(255,140,40,0.55)"); g.addColorStop(1, "rgba(255,80,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    line(iso(m.gx, m.gy, 14), p, "#5a3a1c", 1.2);
  }
}

// ==================== MINIMAP ====================
function renderMinimap() {
  const W = mini.width, s = W / (MAP * 2), cx = W / 2, top = 2;
  mctx.fillStyle = "#0b1416";
  mctx.fillRect(0, 0, W, mini.height);
  const px = (gx, gy) => [cx + (gx - gy) * s, top + (gx + gy) * s * 0.5];
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    const t = S.tiles[y][x].t;
    mctx.fillStyle = t === "river" ? "#2f7fae" : t === "rock" ? "#77736b" : S.season === "yala" ? "#8a8a48" : "#3e6f30";
    const [a, b] = px(x, y);
    mctx.fillRect(a - s, b, s * 2, s);
  }
  mctx.fillStyle = "#1f4a1d";
  for (const t of S.trees) if (t.stage >= 35) { const [a, b] = px(t.gx, t.gy); mctx.fillRect(a - 0.8, b - 0.8, 1.6, 1.6); }
  for (const b of S.buildings) {
    const [a, c] = px(b.gx + b.w / 2, b.gy + b.h / 2);
    mctx.fillStyle = b === S.citadel ? "#e9b949" : b.def.water ? "#7fd0ff" : b.id === "paddy" ? "#a6c24a" : "#d8c49c";
    mctx.fillRect(a - 1.5, c - 1, 3, 2.5);
  }
  for (const u of S.units) {
    const [a, c] = px(u.gx, u.gy);
    mctx.fillStyle = u.team === "p" ? "#6cc070" : "#ff4a3a";
    mctx.fillRect(a - 1, c - 1, 2.5, 2.5);
  }
  const W2 = view.w / view.zoom, H2 = view.h / view.zoom;
  const corners = [screenToGrid(0, 0), screenToGrid(W2, 0), screenToGrid(W2, H2), screenToGrid(0, H2)];
  mctx.strokeStyle = "rgba(255,255,255,0.7)";
  mctx.lineWidth = 1;
  mctx.beginPath();
  corners.forEach((g, i) => { const [a, b] = px(g.ex, g.ey); if (i) mctx.lineTo(a, b); else mctx.moveTo(a, b); });
  mctx.closePath();
  mctx.stroke();
}
