"use strict";
// Building sprites. Local origin (0,0) is the top corner of the footprint, so
// render.js draws them at iso(b.gx, b.gy). Footprint w×h in tiles.

// ---------- architectural parts ----------
// Opening on the front-left face (plane y = Y), u from x0 to x1, z from z0 to z1.
function doorL(x0, x1, Y, z0, z1, mat = M.door, frame = M.timber) {
  const e = 0.004;
  face([[x0 - 0.03, Y + e, z0], [x1 + 0.03, Y + e, z0], [x1 + 0.03, Y + e, z1 + 1.2], [x0 - 0.03, Y + e, z1 + 1.2]], frame);
  face([[x0, Y + 2 * e, z0], [x1, Y + 2 * e, z0], [x1, Y + 2 * e, z1], [x0, Y + 2 * e, z1]], mat, { dim: 0.55 });
  // lintel shadow
  poly2([[x0, Y + 3 * e, z1], [x1, Y + 3 * e, z1], [x1, Y + 3 * e, z1 - 1.5], [x0, Y + 3 * e, z1 - 1.5]], "rgba(0,0,0,0.35)");
  if (!MODE.shadow) { // threshold stone
    face([[x0 - 0.05, Y + 0.08, z0], [x1 + 0.05, Y + 0.08, z0], [x1 + 0.05, Y + 0.08, z0 + 0.8], [x0 - 0.05, Y + 0.08, z0 + 0.8]], M.graniteSlab);
    face([[x0 - 0.05, Y, z0 + 0.8], [x1 + 0.05, Y, z0 + 0.8], [x1 + 0.05, Y + 0.08, z0 + 0.8], [x0 - 0.05, Y + 0.08, z0 + 0.8]], M.graniteSlab);
  }
}
function doorR(y0, y1, X, z0, z1, mat = M.door, frame = M.timber) {
  const e = 0.004;
  face([[X + e, y1 + 0.03, z0], [X + e, y0 - 0.03, z0], [X + e, y0 - 0.03, z1 + 1.2], [X + e, y1 + 0.03, z1 + 1.2]], frame);
  face([[X + 2 * e, y1, z0], [X + 2 * e, y0, z0], [X + 2 * e, y0, z1], [X + 2 * e, y1, z1]], mat, { dim: 0.55 });
}
// Lattice window on the right face (plane x = X).
function windowR(y0, y1, X, z0, z1) {
  if (MODE.shadow) return;
  const e = 0.004;
  face([[X + e, y1 + 0.03, z0 - 0.6], [X + e, y0 - 0.03, z0 - 0.6], [X + e, y0 - 0.03, z1 + 0.6], [X + e, y1 + 0.03, z1 + 0.6]], M.timber);
  face([[X + 2 * e, y1, z0], [X + 2 * e, y0, z0], [X + 2 * e, y0, z1], [X + 2 * e, y1, z1]], M.dark, { light: 0.4 });
  const n = Math.max(2, Math.round((y1 - y0) * 14));
  for (let i = 1; i < n; i++) {
    const y = y1 - ((y1 - y0) * i) / n;
    gline([X + 3 * e, y, z0], [X + 3 * e, y, z1], css(lit(COL.timber, 0.75)), 0.7, "butt");
  }
}
function windowL(x0, x1, Y, z0, z1) {
  if (MODE.shadow) return;
  const e = 0.004;
  face([[x0 - 0.03, Y + e, z0 - 0.6], [x1 + 0.03, Y + e, z0 - 0.6], [x1 + 0.03, Y + e, z1 + 0.6], [x0 - 0.03, Y + e, z1 + 0.6]], M.timber);
  face([[x0, Y + 2 * e, z0], [x1, Y + 2 * e, z0], [x1, Y + 2 * e, z1], [x0, Y + 2 * e, z1]], M.dark, { light: 0.45 });
  const n = Math.max(2, Math.round((x1 - x0) * 14));
  for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    gline([x, Y + 3 * e, z0], [x, Y + 3 * e, z1], css(lit(COL.timber, 1.0)), 0.7, "butt");
  }
}

// Square timber pillar with a carved capital.
function pillar(x, y, z0, z1, mat = M.timber, s = 0.06) {
  box(x - s / 2, y - s / 2, z0, s, s, z1 - z0 - 1.2, mat, { edges: false });
  box(x - s * 0.9, y - s * 0.9, z1 - 1.2, s * 1.8, s * 1.8, 1.2, mat, { edges: false });
  box(x - s * 0.75, y - s * 0.75, z0, s * 1.5, s * 1.5, 0.8, M.timber, { edges: false });
}

// Whitewashed hall on a laterite plinth with a hipped roof.
// o: plinth, wallH, roofH, roof, wall, overhang, door, windows, veranda, inset
function hall(gx, gy, w, h, o = {}) {
  const pl = o.plinth ?? 3, wh = o.wallH ?? 12, inset = o.inset ?? 0.14, ov = o.overhang ?? 0.16;
  const wx = gx + inset, wy = gy + inset, ww = w - inset * 2, wd = h - inset * 2;
  box(gx + 0.04, gy + 0.04, 0, w - 0.08, h - 0.08, pl, { top: o.floor || M.graniteSlab, left: o.plinthMat || M.laterite, right: o.plinthMat || M.laterite }, { ao: 1.5 });
  const vr = o.veranda ? 0.22 : 0;
  // walls (set back behind a veranda when present)
  box(wx, wy, pl, ww - vr, wd - vr, wh, o.wall || M.white, { ao: 3, eave: 5, top: false });
  const fx = wx + ww - vr, fy = wy + wd - vr; // front wall planes
  if (o.door !== false) {
    const dw = o.doorW ?? Math.min(0.24, (ww - vr) * 0.3);
    const dc = o.doorAt ?? 0.5;
    doorL(wx + (ww - vr) * dc - dw / 2, wx + (ww - vr) * dc + dw / 2, fy, pl, pl + wh * 0.72);
  }
  const wins = o.windows ?? 1;
  for (let i = 0; i < wins; i++) {
    const v = (i + 1) / (wins + 1), half = Math.min(0.09, (wd - vr) * 0.12);
    windowR(wy + (wd - vr) * v - half, wy + (wd - vr) * v + half, fx, pl + wh * 0.38, pl + wh * 0.72);
  }
  if (o.windowsL) for (let i = 0; i < o.windowsL; i++) {
    const v = (i + 0.5) / o.windowsL * 0.5 + (i ? 0.5 : 0) * 0, half = 0.07;
    const cx = wx + (ww - vr) * (i % 2 ? 0.8 : 0.2);
    windowL(cx - half, cx + half, fy, pl + wh * 0.38, pl + wh * 0.72);
  }
  if (o.veranda) {
    // veranda floor and pillars along both front sides
    const n = Math.max(2, Math.round(ww / 0.3));
    for (let i = 0; i <= n; i++) pillar(wx + 0.03 + (ww - 0.06) * i / n, wy + wd - 0.03, pl, pl + wh);
    const m = Math.max(2, Math.round(wd / 0.3));
    for (let i = 0; i < m; i++) pillar(wx + ww - 0.03, wy + 0.03 + (wd - 0.06) * i / m, pl, pl + wh);
  }
  // timber wall plate under the eaves
  if (!o.veranda) box(wx - 0.01, wy - 0.01, pl + wh - 1.2, ww - vr + 0.02, wd - vr + 0.02, 1.2, M.timberH, { edges: false, top: false });
  else box(wx - 0.01, wy - 0.01, pl + wh - 1.2, ww + 0.02, wd + 0.02, 1.2, M.timberH, { edges: false, top: false });
  const roofZ = pl + wh;
  const thatchy = (o.roof || M.tile).tex === TEX.thatch || (o.roof || M.tile).tex === TEX.palmleaf;
  hipRoof(wx - ov, wy - ov, ww + ov * 2, wd + ov * 2, roofZ, o.roofH ?? 12, o.roof || M.tile,
    { hip: o.hip, thick: thatchy ? 2 : 1.2, capCol: thatchy ? shadeC((o.roof || M.tile).col, 0.78) : null, capW: thatchy ? 1.0 : 1 });
  return roofZ + (o.roofH ?? 12);
}

// Kandyan finial: a small clay pinnacle at the ends of the ridge.
function finial(p, z, col = "#8e3f22") {
  at(p[0], p[1], z, c => {
    c.fillStyle = col; c.beginPath(); c.moveTo(-1.2, 0.5); c.quadraticCurveTo(-1.4, -2, 0, -4.2); c.quadraticCurveTo(1.4, -2, 1.2, 0.5); c.fill();
    c.fillStyle = "rgba(255,220,180,0.35)"; c.fillRect(-0.8, -2.5, 0.5, 2);
  });
}

function clayPot(gx, gy, s = 1, col = "#a0532c") {
  lathe(gx, gy, [[0.02 * s, 0], [0.06 * s, 1.2 * s], [0.075 * s, 2.6 * s], [0.06 * s, 4 * s], [0.035 * s, 4.6 * s], [0.045 * s, 5.2 * s]], { col }, { seg: 14 });
}
function logPile(gx, gy, n = 3) {
  for (let r = 0; r < n; r++) for (let i = 0; i < n - r; i++) {
    const x = gx, y = gy + i * 0.11 + r * 0.055;
    at(x, y, 2 + r * 3.2, c => {
      c.fillStyle = css(jit("#7d5125", 0.15)); c.beginPath(); c.ellipse(0, 0, 1.9, 1.7, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#d9b27a"; c.beginPath(); c.ellipse(-0.1, -0.1, 1.3, 1.15, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(120,80,40,0.6)"; c.lineWidth = 0.25; c.beginPath(); c.ellipse(-0.1, -0.1, 0.6, 0.5, 0, 0, Math.PI * 2); c.stroke();
    });
    if (MODE.shadow) poly2([[x - 0.04, y, 0], [x + 0.35, y, 0], [x + 0.35, y + 0.1, 0], [x - 0.04, y + 0.1, 0]], "#000");
  }
  // log bodies running back along x
  if (!MODE.shadow) for (let r = 0; r < n; r++) for (let i = 0; i < n - r; i++) { /* ends drawn above */ }
}
function haystack(gx, gy, s = 1) {
  lathe(gx, gy, [[0.17 * s, 0], [0.18 * s, 4 * s], [0.14 * s, 9 * s], [0.07 * s, 13 * s], [0, 15 * s]], { col: "#d4b25e", band: (a, t, f) => lit(jit("#d4b25e", 0.12), f) }, { seg: 24 });
  post(gx, gy, 0.01, 14 * s, 18 * s, M.timber, 4);
}

// ---------- buildings ----------
// House (Gedara): wattle-and-daub walls, thatched or cadjan roof, veranda. Three variants.
for (let v = 0; v < 3; v++) {
  ART.add(`house.${v}`, () => {
    const roof = [M.thatch, M.cadjan, M.thatchOld][v];
    const wall = [M.ochre, M.white, M.mud][v];
    const [w, h] = [[0.86, 0.66], [0.9, 0.72], [0.7, 0.86]][v];
    hall(0.07, 0.07, w, h, { plinth: 2, wallH: 13, roofH: 15, roof, wall, windows: 1, inset: 0.1, overhang: 0.12, veranda: v === 1,
      doorAt: v === 2 ? 0.35 : 0.5, floor: M.earth, hip: 0.85 });
    clayPot(0.86, 0.92, 0.9);
    clayPot(0.93, 0.8, 0.7, "#8a4a2a");
    if (v === 0) logPile(0.93, 0.15, 2);
    if (v === 2) { // drying mat with chillies / rice
      poly2([[0.12, 0.88, 0.2], [0.42, 0.88, 0.2], [0.42, 0.98, 0.2], [0.12, 0.98, 0.2]], "#c8a868");
      for (let i = 0; i < 18; i++) at(rr(0.14, 0.4), rr(0.9, 0.97), 0.4, c => { c.fillStyle = pick(["#b42a1a", "#d1452a", "#8e1d12"]); c.fillRect(0, 0, 0.8, 0.5); });
    }
  }, { size: 140 });
}

// Walawwa (manor): an upgraded house: whitewashed walls, tiled two-stage roof, veranda, gate posts.
ART.add("walawwa", () => {
  box(0.03, 0.03, 0, 0.94, 0.94, 0.8, { top: M.graniteSlab, left: M.laterite, right: M.laterite }, { edges: false });
  hall(0.08, 0.08, 0.84, 0.78, { plinth: 3.4, wallH: 14, roofH: 0.01, wall: M.white, veranda: true, windows: 2, doorW: 0.18, overhang: 0, inset: 0.04 });
  hipRoof(0.02, 0.02, 0.96, 0.9, 17.4, 7, M.tile, { hip: 1, thick: 1.2 });
  box(0.26, 0.24, 20, 0.48, 0.42, 5, M.white, { eave: 2, top: false });
  hipRoof(0.2, 0.18, 0.6, 0.54, 25, 9, M.tile, { hip: 1 });
  finial([0.5, 0.45], 34, "#9a4426");
  for (const x of [0.12, 0.88]) { box(x - 0.04, 0.9, 0.8, 0.08, 0.08, 9, M.lime); lathe(x, 0.94, [[0.03, 9.8], [0.0, 12]], M.lime, { seg: 8 }); }
  clayPot(0.95, 0.6, 1, "#a0532c");
}, { size: 140 });

// Woodcutter (Dara Maduwa): open shed, chopping block, log pile.
ART.add("woodcutter", () => {
  hall(0, 0, 0.72, 0.72, { plinth: 1, wallH: 10, roofH: 11, roof: M.thatch, wall: M.mud, windows: 0, inset: 0.1 });
  logPile(0.8, 0.35, 3);
  box(0.42, 0.82, 0, 0.12, 0.12, 2.5, { top: { col: "#d9b27a" }, left: M.timber, right: M.timber });
  gline([0.48, 0.88, 2.5], [0.55, 0.8, 7], "#5a3a1c", 0.8);
  at(0.55, 0.8, 7, c => { c.fillStyle = "#bfc4c8"; c.fillRect(-0.4, -1.2, 2, 1.4); });
}, { size: 140 });

// Quarry (Gal Wala): thatched shelter on poles over cut granite blocks.
ART.add("quarry", () => {
  box(0.05, 0.05, 0, 0.9, 0.9, 0.6, { top: M.earth, left: M.earth, right: M.earth }, { edges: false });
  // cut blocks stacked
  box(0.55, 0.62, 0.6, 0.3, 0.22, 5, M.granite, { ao: 1 });
  box(0.6, 0.66, 5.6, 0.2, 0.16, 4, M.granite);
  box(0.2, 0.72, 0.6, 0.24, 0.18, 4, M.granite, { ao: 1 });
  for (const [x, y] of [[0.12, 0.12], [0.62, 0.12], [0.12, 0.55], [0.62, 0.55]]) post(x, y, 0.025, 0.6, 13, M.timber, 8);
  hipRoof(0.04, 0.04, 0.66, 0.6, 13, 8, M.thatchOld, { thick: 1.6, capCol: shadeC(COL.thatch, 0.7) });
  // chisels, hammer, stone chips
  gline([0.4, 0.95, 0.6], [0.5, 0.92, 1.4], "#888d92", 0.6);
  for (let i = 0; i < 20; i++) at(rr(0.1, 0.9), rr(0.6, 0.95), 0.7, c => { c.fillStyle = pick(["#cfc8ba", "#a49d90", "#8d877c"]); c.fillRect(0, 0, rr(0.5, 1.2), rr(0.4, 0.8)); });
}, { size: 140 });

// Kammala (smithy): open forge shed, clay hearth with glowing coals, anvil, bellows, racks of spears.
ART.add("kammala", () => {
  box(0.05, 0.05, 0, 0.9, 0.9, 0.6, { top: { col: "#6a5a48", tex: TEX.earth }, left: M.earth, right: M.earth }, { edges: false });
  // roofed workshop at the back
  box(0.08, 0.08, 0.6, 0.84, 0.36, 11, { top: M.mud, left: M.mud, right: M.mud }, { ao: 2, eave: 3, top: false });
  doorL(0.35, 0.55, 0.44, 0.6, 8.5);
  hipRoof(0.02, 0.02, 0.96, 0.48, 11.6, 9, M.tileDark, { hip: 1 });
  // open-air hearth with glowing coals and a clay chimney
  box(0.14, 0.56, 0.6, 0.3, 0.28, 4, { top: { col: "#3a2216" }, left: M.mud, right: M.mud });
  at(0.29, 0.7, 4.6, c => {
    const gr = c.createRadialGradient(0, 0, 0, 0, 0, 5.5); gr.addColorStop(0, "#fff4b0"); gr.addColorStop(0.3, "#ff9a28"); gr.addColorStop(1, "rgba(140,30,0,0)");
    c.fillStyle = gr; c.beginPath(); c.ellipse(0, 0, 5.5, 2.6, 0, 0, 7); c.fill();
  });
  lathe(0.2, 0.62, [[0.06, 4.6], [0.045, 10], [0.03, 15]], M.mud, { seg: 10 });
  box(0.46, 0.6, 0.6, 0.14, 0.1, 2.4, { col: "#5a3a22", tex: TEX.plain }); // bellows
  latheAt([0.66, 0.78, 0.6], [[0.07, 0], [0.065, 3]], { col: "#5a4028" }, { seg: 10 });
  box(0.6, 0.74, 3.6, 0.14, 0.08, 1.8, { col: "#4a4c50", tex: TEX.plain });
  // rack of finished spears
  for (let i = 0; i < 4; i++) {
    gline([0.9, 0.52 + i * 0.1, 0.6], [0.88, 0.5 + i * 0.1, 15], "#7a5530", 0.6);
    gline([0.88, 0.5 + i * 0.1, 15], [0.88, 0.5 + i * 0.1, 17.5], "#cfd3d6", 0.8);
  }
}, { size: 140 });

// Storehouse (Gabadawa): long tiled hall, wide doors, crates and sacks.
ART.add("storehouse", () => {
  box(0.05, 0.05, 0, 1.9, 1.9, 0.5, M.earth, { edges: false, top: true });
  hall(0.1, 0.25, 1.8, 1.3, { plinth: 4, wallH: 15, roofH: 15, roof: M.tile, windows: 2, doorW: 0.42, doorAt: 0.45, windowsL: 2 });
  for (let i = 0; i < 4; i++) box(0.3 + i * 0.2, 1.68, 0.5, 0.16, 0.16, 4.5, M.timber, { ao: 1 });
  box(0.4, 1.69, 5, 0.16, 0.16, 4.5, M.timber);
  for (let i = 0; i < 4; i++) lathe(1.3 + (i % 2) * 0.16, 1.68 + Math.floor(i / 2) * 0.13, [[0.06, 0.5], [0.075, 2], [0.06, 4.6], [0.02, 5.4]], { col: "#c9b48a" }, { seg: 12 });
  for (let i = 0; i < 3; i++) box(1.72, 0.45 + i * 0.12, 0.5, 0.18, 0.09, 1.8, M.timberH, { edges: false });
  box(1.72, 0.45, 2.3, 0.18, 0.33, 1.8, M.timberH, { edges: false });
}, { size: 220 });

// Vee Bissa: woven granary on stone stilts with a conical thatch cap.
ART.add("bissa", () => {
  const c = 0.5;
  box(0.18, 0.18, 0, 0.64, 0.64, 1, M.granite, { ao: 1 });
  for (const [x, y] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) post(x, y, 0.035, 1, 7, { col: "#8f897d" }, 8);
  box(0.2, 0.2, 7, 0.6, 0.6, 1.2, M.timberH, { edges: false });
  lathe(c, c, [[0.27, 8.2], [0.31, 11], [0.32, 15], [0.31, 19], [0.29, 21.5]], {
    col: COL.mud, band: (a, t, f) => lit(mixC(COL.mud, [130, 95, 60], (Math.sin(a * 22) * 0.5 + 0.5) * 0.25 + R() * 0.1), f)
  }, { seg: 48 });
  // woven bands
  for (const z of [11.5, 15.5, 19]) lathe(c, c, [[0.322, z], [0.322, z + 0.7]], { col: "#7d5a34" }, { seg: 48 });
  lathe(c, c, [[0.37, 21], [0.34, 22.3], [0.24, 26], [0.11, 29.5], [0.02, 31.5]], {
    col: COL.thatch, band: (a, t, f) => lit(jit(COL.thatch, 0.18), f * (0.94 + Math.sin(a * 60) * 0.06))
  }, { seg: 72 });
  lathe(c, c, [[0.03, 31], [0.015, 33.5]], { col: "#6b4426" }, { seg: 8 });
  // ladder
  gline([0.86, 0.72, 0], [0.8, 0.66, 12], "#6b4426", 0.7); gline([0.92, 0.62, 0], [0.86, 0.56, 12], "#6b4426", 0.7);
  for (let i = 1; i < 5; i++) gline([0.86 - i * 0.012, 0.72 - i * 0.012, i * 2.5], [0.92 - i * 0.012, 0.62 - i * 0.012, i * 2.5], "#8a6a40", 0.5);
}, { size: 140 });

// Pola (market): an open bazaar of four stalls with cadjan and cloth roofs.
function stall(x, y, roof, goods) {
  for (const [px, py] of [[0, 0], [0.6, 0], [0, 0.5], [0.6, 0.5]]) post(x + px, y + py, 0.02, 2, 13, M.timber, 6);
  box(x + 0.05, y + 0.05, 2, 0.5, 0.4, 3.2, M.timberH, { edges: false });
  for (let k = 0; k < 4; k++) {
    const bx = x + 0.13 + (k % 2) * 0.24, by = y + 0.15 + Math.floor(k / 2) * 0.2;
    lathe(bx, by, [[0.06, 5.2], [0.07, 6.2], [0.06, 6.6]], { col: "#9c7a44" }, { seg: 12 });
    lathe(bx, by, [[0.06, 6.4], [0.04, 7.6], [0.0, 8.4]], { col: goods[k % goods.length] }, { seg: 12 });
  }
  hipRoof(x - 0.08, y - 0.08, 0.76, 0.66, 13, 7, roof, { hip: 0.8, thick: 1.2, caps: roof !== M.cadjan });
}
ART.add("market", () => {
  box(0.04, 0.04, 0, 1.92, 1.92, 2, { top: { col: "#b8ad98", tex: TEX.blocks, course: 9, blockLen: 9, var: 0.06 }, left: M.granite, right: M.granite }, { ao: 1, topOpt: {} });
  const G = ["#e8dfc6", "#c0392b", "#e9b949", "#6c9a3a", "#8e5a2c", "#f0e6d0", "#d46a1a"];
  stall(0.2, 0.18, M.cadjan, [G[0], G[2], G[4], G[1]]);
  stall(1.1, 0.18, { col: "#a8321e", tex: TEX.plain }, [G[3], G[5], G[1], G[6]]);
  // central well
  lathe(1.0, 1.0, [[0.16, 2], [0.16, 6], [0.13, 6], [0.13, 5.5]], M.granite, { seg: 28 });
  poly2([[0.9, 0.9, 5.4], [1.1, 0.9, 5.4], [1.1, 1.1, 5.4], [0.9, 1.1, 5.4]], null);
  stall(0.2, 1.22, { col: "#2d5e8a", tex: TEX.plain }, [G[6], G[0], G[3], G[2]]);
  stall(1.1, 1.22, M.cadjan, [G[1], G[4], G[5], G[0]]);
  // sacks and baskets on the ground
  for (let i = 0; i < 6; i++) lathe(rr(0.25, 1.75), rr(1.85, 1.92), [[0.05, 2], [0.06, 3.5], [0.04, 5.5], [0.02, 6]], { col: "#c9b48a" }, { seg: 10 });
}, { size: 230 });

// Angam Maduwa (barracks): sand training ground, pillared hall, weapon racks.
ART.add("barracks", () => {
  box(0, 0, 0, 2, 2, 0.6, { top: { col: "#cbb486", tex: TEX.earth }, left: M.earth, right: M.earth }, { edges: false });
  // low enclosure wall at the back
  box(0.02, 0.02, 0.6, 1.96, 0.12, 6, M.laterite, { ao: 1 });
  box(0.02, 0.14, 0.6, 0.12, 1.84, 6, M.laterite, { ao: 1 });
  hall(0.2, 0.2, 1.2, 1.2, { plinth: 3, wallH: 14, roofH: 14, roof: M.tileDark, veranda: true, windows: 1 });
  // weapon rack
  box(1.6, 0.3, 0.6, 0.06, 0.6, 9, M.timber, { edges: false });
  for (let i = 0; i < 6; i++) {
    const y = 0.35 + i * 0.09;
    gline([1.68, y, 0.6], [1.66, y - 0.02, 16], "#8a6a40", 0.6);
    gline([1.66, y - 0.02, 16], [1.66, y - 0.025, 18.5], "#cfd3d6", 0.8);
  }
  // training post (wrapped in rope)
  post(1.55, 1.55, 0.05, 0.6, 13, M.timber, 10);
  for (let z = 4; z < 12; z += 1.2) lathe(1.55, 1.55, [[0.056, z], [0.056, z + 0.6]], { col: "#c9a45a" }, { seg: 10 });
  gline([1.55, 1.55, 11], [1.4, 1.55, 11], "#6b4426", 1.2);
  // shields leaning on the hall
  for (let i = 0; i < 2; i++) at(0.5 + i * 0.25, 1.48, 4, c => {
    c.fillStyle = "#7c1d1d"; c.beginPath(); c.ellipse(0, 0, 2.2, 3, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#e9b949"; c.lineWidth = 0.5; c.stroke(); c.fillStyle = "#e9b949"; c.beginPath(); c.arc(0, 0, 0.6, 0, 7); c.fill();
  });
}, { size: 230 });

// Maligawa (citadel): moulded laterite terrace, verandah storey, two-tier Kandyan roof.
ART.add("citadel", () => {
  const TY = 1.72; // terrace depth; stairs fill the rest of the footprint
  box(0, 0, 0, 2, TY, 10, { top: M.graniteSlab, left: M.lateriteBig, right: M.lateriteBig }, { ao: 3 });
  box(-0.02, -0.02, 9, 2.04, TY + 0.04, 1.5, M.granite, { edges: true });
  box(-0.02, -0.02, 0, 2.04, TY + 0.04, 1.2, M.granite, { edges: false });
  for (let i = 0; i < 5; i++) box(0.74, TY, 0, 0.52, 0.055 * (i + 1), 10 * (5 - i) / 5, { top: M.graniteSlab, left: M.granite, right: M.granite }, { edges: false });
  box(0.66, TY, 0, 0.08, 0.27, 10, M.granite); box(1.26, TY, 0, 0.08, 0.27, 10, M.granite);
  lathe(0.7, TY + 0.22, [[0.05, 10], [0.05, 12], [0.0, 14]], M.lime, { seg: 10 });
  lathe(1.3, TY + 0.22, [[0.05, 10], [0.05, 12], [0.0, 14]], M.lime, { seg: 10 });
  hall(0.15, 0.12, 1.7, 1.48, { plinth: 10, wallH: 17, roofH: 0.01, wall: M.white, veranda: true, windows: 2, doorW: 0.3, overhang: 0, plinthMat: M.lateriteBig, inset: 0.05 });
  hipRoof(0.02, -0.01, 1.96, 1.72, 27, 10, M.tile, { hip: 1, thick: 1.4 });
  box(0.55, 0.45, 30, 0.9, 0.82, 13, M.white, { ao: 2, eave: 4, top: false });
  windowR(0.62, 0.75, 1.45, 34, 40); windowR(1.0, 1.13, 1.45, 34, 40);
  windowL(0.75, 0.88, 1.27, 34, 40); windowL(1.12, 1.25, 1.27, 34, 40);
  box(0.54, 0.44, 42, 0.92, 0.84, 1.2, M.timberH, { edges: false, top: false });
  hipRoof(0.4, 0.3, 1.2, 1.12, 43, 19, M.tile, { hip: 1, thick: 1.4 });
  lathe(1.0, 0.86, [[0.06, 61.5], [0.08, 63], [0.05, 65], [0.03, 68], [0.0, 72]], M.gold, { seg: 16 });
  for (const [x, y] of [[0.02, -0.01], [1.98, -0.01], [0.02, 1.71], [1.98, 1.71]]) finial([x, y], 27);
}, { size: 260, oy: 0.68 });

// Dagoba: stone terrace, three basal rings, bell dome, harmika and spire.
ART.add("dagoba", () => {
  box(0.03, 0.03, 0, 1.94, 1.94, 4, { top: M.graniteSlab, left: M.granite, right: M.granite }, { ao: 2 });
  // low parapet wall with elephant-head studs
  box(0.03, 0.03, 4, 1.94, 0.07, 3, M.lime); box(0.03, 0.1, 4, 0.07, 1.87, 3, M.lime);
  box(0.03, 1.9, 4, 1.94, 0.07, 3, M.lime); box(1.9, 0.03, 4, 0.07, 1.94, 3, M.lime);
  const white = { col: "#efe9dc", spec: 0.25, band: (a, t, f) => lit(mixC("#efe9dc", [200, 190, 165], R() * 0.12 + (t < 0.2 ? 0.08 : 0)), f) };
  lathe(1, 1, [[0.8, 4], [0.8, 6.5], [0.72, 6.5], [0.72, 9], [0.64, 9], [0.64, 11.5]], white, { seg: 64 });
  const dome = [];
  for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI / 2; dome.push([0.6 * Math.cos(a) * (1 - 0.06 * Math.sin(a)), 11.5 + Math.sin(a) * 34]); }
  lathe(1, 1, dome, white, { seg: 64 });
  box(0.87, 0.87, 44, 0.26, 0.26, 8, M.lime);
  box(0.84, 0.84, 52, 0.32, 0.32, 1.4, M.lime);
  const spire = [];
  for (let i = 0; i <= 10; i++) spire.push([0.09 * (1 - i / 10) + 0.01, 53.4 + i * 2.8]);
  lathe(1, 1, spire, { col: "#e8e1d0", band: (a, t, f) => lit(Math.floor(t * 10) % 2 ? "#d9d1bf" : "#efe8d8", f) }, { seg: 24 });
  lathe(1, 1, [[0.025, 81], [0.03, 82.5], [0.0, 85]], M.gold, { seg: 12 });
  // offering flowers at the steps
  for (let i = 0; i < 10; i++) at(rr(0.5, 1.5), 1.97, 4, c => { c.fillStyle = pick(["#f4f0e6", "#f2c94c", "#e68aa6"]); c.beginPath(); c.arc(0, 0, 0.5, 0, 7); c.fill(); });
}, { size: 260, oy: 0.7 });

// Pansala (monastery): image house, bodhighara with a bo tree, small stupa, sand court.
ART.add("pansala", () => {
  box(0, 0, 0, 2, 2, 0.8, { top: { col: "#d8c9a4", tex: TEX.earth }, left: M.earth, right: M.earth }, { edges: false });
  // low white boundary wall at the back
  box(0.02, 0.02, 0.8, 1.96, 0.08, 5, M.lime, { ao: 1 }); box(0.02, 0.1, 0.8, 0.08, 1.88, 5, M.lime, { ao: 1 });
  // bodhighara: raised square terrace with the sacred bo tree
  box(1.05, 0.15, 0.8, 0.8, 0.8, 4, { top: M.graniteSlab, left: M.lime, right: M.lime }, { ao: 1 });
  box(1.05, 0.15, 4.8, 0.8, 0.06, 2.4, M.lime); box(1.79, 0.15, 4.8, 0.06, 0.8, 2.4, M.lime);
  latheAt([1.45, 0.55, 4.8], [[0.07, 0], [0.05, 4], [0.045, 14]], { col: "#7a6a58", band: (a, t, f) => lit(jit("#7a6a58", 0.06), f) }, { seg: 10 });
  for (const [dx, dy, z, r] of [[-0.18, 0.05, 24, 11], [0.2, -0.1, 25, 10], [0, 0.15, 28, 10], [0, -0.05, 32, 9]]) {
    canopy(1.45 + dx, 0.55 + dy, z, r, r * 0.75, SEASON_GREENS.maha, { n: 110, leaf: 1.7, leaves: 6 });
  }
  // prayer flags strung from the tree
  if (!MODE.shadow) { const cols = ["#2d5e8a", "#e9b949", "#a8321e", "#f2efe6", "#d9822b"]; for (let i = 0; i < 10; i++) { const a = P(1.1 + i * 0.07, 0.95, 16 - Math.sin(i / 9 * Math.PI) * 3); g.fillStyle = cols[i % 5]; g.fillRect(a.x - 0.6, a.y, 1.2, 1.6); } }
  // image house (pilimage)
  hall(0.15, 0.95, 1.0, 0.9, { plinth: 3, wallH: 13, roofH: 12, roof: M.tile, wall: M.white, windows: 1, veranda: true, plinthMat: M.laterite });
  // small stupa
  lathe(1.55, 1.45, [[0.2, 0.8], [0.2, 2.6], [0.17, 2.6], [0.17, 4]], M.lime, { seg: 28 });
  const dome = []; for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; dome.push([0.16 * Math.cos(a), 4 + Math.sin(a) * 9]); }
  lathe(1.55, 1.45, dome, { col: "#efe9dc", spec: 0.25 }, { seg: 28 });
  box(1.51, 1.41, 12.6, 0.08, 0.08, 2, M.lime);
  lathe(1.55, 1.45, [[0.03, 14.6], [0.0, 20]], { col: "#e8e1d0" }, { seg: 10 });
  lathe(1.55, 1.45, [[0.012, 19.5], [0.0, 21.5]], M.gold, { seg: 8 });
  // oil-lamp stand and flowers at the stupa
  for (let i = 0; i < 8; i++) at(1.55 + rr(-0.22, 0.22), 1.7, 0.8, c => { c.fillStyle = pick(["#f4f0e6", "#f2c94c", "#e68aa6"]); c.beginPath(); c.arc(0, 0, 0.5, 0, 7); c.fill(); });
}, { size: 230 });

// Atuwa (watchtower): tapering laterite base, timber lookout, tiled roof.
// Yantra Atuwa (bolt tower): squat granite tower with a great bolt-thrower on top.
ART.add("bolt", () => {
  box(0.06, 0.06, 0, 0.88, 0.88, 4, { top: M.graniteSlab, left: M.granite, right: M.granite }, { ao: 2 });
  box(0.1, 0.1, 4, 0.8, 0.8, 22, M.granite, { ao: 2 });
  box(0.06, 0.06, 26, 0.88, 0.88, 1.8, M.lateriteBig);
  // crenellated parapet
  for (let i = 0; i < 4; i++) {
    box(0.06 + i * 0.24, 0.84, 27.8, 0.14, 0.1, 4, M.laterite);
    box(0.84, 0.06 + i * 0.24, 27.8, 0.1, 0.14, 4, M.laterite);
  }
  windowR(0.42, 0.58, 0.9, 14, 20);
  // the engine: a timber stock on a turntable, with a great composite bow
  post(0.5, 0.5, 0.08, 27.8, 31, M.darkTimber, 12);
  box(0.25, 0.42, 31, 0.55, 0.16, 2, M.timberH);
  if (!MODE.shadow) {
    const a = P(0.78, 0.5, 33), l = P(0.62, 0.12, 33.5), r = P(0.62, 0.88, 33.5), back = P(0.28, 0.5, 33);
    g.strokeStyle = "#5a3418"; g.lineWidth = 1.6; g.lineCap = "round";
    g.beginPath(); g.moveTo(l.x, l.y); g.quadraticCurveTo(a.x + 3, a.y - 1, r.x, r.y); g.stroke();
    g.strokeStyle = "rgba(240,230,200,0.85)"; g.lineWidth = 0.5;
    g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(back.x, back.y); g.lineTo(r.x, r.y); g.stroke();
    g.strokeStyle = "#3a2a1a"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(back.x, back.y); g.lineTo(a.x + 4, a.y - 1); g.stroke();
    g.fillStyle = "#c8ccd0"; g.beginPath(); g.moveTo(a.x + 6, a.y - 1); g.lineTo(a.x + 3, a.y - 2.4); g.lineTo(a.x + 3, a.y + 0.4); g.fill();
  }
  finial([0.12, 0.12], 31.8, "#9a4426");
}, { size: 150, oy: 0.78 });

ART.add("tower", () => {
  box(0.06, 0.06, 0, 0.88, 0.88, 4, { top: M.graniteSlab, left: M.granite, right: M.granite }, { ao: 2 });
  box(0.12, 0.12, 4, 0.76, 0.76, 14, M.lateriteBig, { ao: 2 });
  box(0.16, 0.16, 18, 0.68, 0.68, 16, M.laterite, {});
  box(0.1, 0.1, 33, 0.8, 0.8, 1.6, M.granite);
  windowR(0.42, 0.58, 0.84, 23, 29);
  // timber gallery
  box(0.0, 0.0, 34.6, 1.0, 1.0, 1.6, M.timberH);
  for (const [x, y] of [[0.05, 0.05], [0.95, 0.05], [0.05, 0.95], [0.95, 0.95], [0.5, 0.95], [0.95, 0.5]]) post(x, y, 0.03, 36, 47, M.timber, 8);
  // railing
  gline([0.02, 0.98, 40], [0.98, 0.98, 40], css(lit(COL.timber, 1)), 0.9);
  gline([0.98, 0.98, 40], [0.98, 0.02, 40], css(lit(COL.timber, 0.6)), 0.9);
  for (let i = 1; i < 8; i++) { gline([i / 8, 0.98, 36.2], [i / 8, 0.98, 40], css(lit(COL.timber, 0.9)), 0.4); gline([0.98, i / 8, 36.2], [0.98, i / 8, 40], css(lit(COL.timber, 0.55)), 0.4); }
  hipRoof(-0.08, -0.08, 1.16, 1.16, 47, 13, M.tile, { hip: 1 });
  finial([0.5, 0.5], 60, "#b0502c");
}, { size: 160, oy: 0.78 });

// Vahalkada (gate): two laterite bastions, timber doors, roofed chamber above.
// a: wall runs along gy (passage along gx); b: wall runs along gx (passage along gy).
for (const dir of ["a", "b"]) ART.add(`gate.${dir}`, () => {
  const H = 30;
  if (dir === "a") {
    box(0.1, 0.0, 0, 0.8, 0.3, H, M.lateriteBig, { ao: 2 });
    box(0.1, 0.3, 19, 0.8, 0.4, H - 19, M.laterite, {});
    face([[0.9, 0.7, 0], [0.9, 0.3, 0], [0.9, 0.3, 19], [0.9, 0.7, 19]], M.darkTimber, { dim: 0.85 });
    for (let i = 1; i < 4; i++) gline([0.905, 0.7 - i * 0.1, 0], [0.905, 0.7 - i * 0.1, 19], "rgba(0,0,0,0.4)", 0.4);
    for (const z of [5, 13]) gline([0.906, 0.69, z], [0.906, 0.31, z], "#2a2522", 1);
    box(0.1, 0.7, 0, 0.8, 0.3, H, M.lateriteBig, { ao: 2 });
    box(0.05, -0.04, H, 0.9, 1.08, 1.6, M.granite);
    box(0.18, 0.12, H + 1.6, 0.64, 0.76, 9, M.white, { eave: 3, top: false });
    windowR(0.35, 0.65, 0.82, H + 3.5, H + 8);
    hipRoof(0.05, -0.02, 0.9, 1.04, H + 10.6, 12, M.tile, { hip: 0.9 });
  } else {
    box(0.0, 0.1, 0, 0.3, 0.8, H, M.lateriteBig, { ao: 2 });
    box(0.3, 0.1, 19, 0.4, 0.8, H - 19, M.laterite, {});
    face([[0.3, 0.9, 0], [0.7, 0.9, 0], [0.7, 0.9, 19], [0.3, 0.9, 19]], M.darkTimber, { dim: 0.85 });
    for (let i = 1; i < 4; i++) gline([0.3 + i * 0.1, 0.905, 0], [0.3 + i * 0.1, 0.905, 19], "rgba(0,0,0,0.4)", 0.4);
    for (const z of [5, 13]) gline([0.31, 0.906, z], [0.69, 0.906, z], "#2a2522", 1);
    box(0.7, 0.1, 0, 0.3, 0.8, H, M.lateriteBig, { ao: 2 });
    box(-0.04, 0.05, H, 1.08, 0.9, 1.6, M.granite);
    box(0.12, 0.18, H + 1.6, 0.76, 0.64, 9, M.white, { eave: 3, top: false });
    windowL(0.35, 0.65, 0.82, H + 3.5, H + 8);
    hipRoof(-0.02, 0.05, 1.04, 0.9, H + 10.6, 12, M.tile, { hip: 0.9 });
  }
}, { size: 160, oy: 0.78 });

// ---------- walls that join their neighbours ----------
// Pieces: c (centre) and arms toward +x, -x, +y, -y. render.js draws the back
// arms, then the centre, then the front arms.
const ARMS = { px: [1, 0], nx: [-1, 0], py: [0, 1], ny: [0, -1] };
function stake(x, y, hgt) {
  post(x, y, 0.055, 0, hgt, { col: "#8a5a2b", band: (a, t, f) => lit(jit("#8a5a2b", 0.08), f) }, 8);
  lathe(x, y, [[0.055, hgt], [0.0, hgt + 5]], { col: "#a77a46" }, { seg: 8 });
}
function palisadeRun(x0, y0, x1, y1, n) {
  const pts = [];
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; pts.push([lerp(x0, x1, t), lerp(y0, y1, t)]); }
  pts.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  for (const [x, y] of pts) stake(x, y, 17 + R() * 5);
  // lashing rails
  for (const z of [6, 13]) gline([x0, y0, z], [x1, y1, z], "#b18a4c", 0.8);
}
ART.add("palisade.c", () => { stake(0.5, 0.5, 21); blob(0.5, 0.5, 6, 3, "rgba(30,20,5,0.3)"); }, { size: 80, oy: 0.8 });
for (const [k, [dx, dy]] of Object.entries(ARMS)) ART.add(`palisade.${k}`, () => {
  palisadeRun(0.5 + dx * 0.08, 0.5 + dy * 0.08, 0.5 + dx * 0.5, 0.5 + dy * 0.5, 3);
}, { size: 90, oy: 0.8 });

const RW = 0.62, RO = (1 - RW) / 2, RH = 26;
function rampartPiece(x, y, w, h, along) {
  box(x, y, 0, w, h, RH - 2, M.lateriteBig, { ao: 3 });
  box(x - 0.015, y - 0.015, RH - 2, w + 0.03, h + 0.03, 1.4, M.granite);
  // merlons only along the outer (front) parapet, evenly spaced from the tile edge
  const m = 0.16, step = 0.31;
  if (along === "x" || along === "both") for (let u = 0.04; u < 1; u += step) {
    const x0 = Math.max(x, u), x1 = Math.min(x + w, u + m);
    if (x1 - x0 > 0.04) box(x0, y + h - 0.1, RH - 0.6, x1 - x0, 0.1, 5, M.laterite);
  }
  if (along === "y" || along === "both") for (let v = 0.04; v < 1; v += step) {
    const y0 = Math.max(y, v), y1 = Math.min(y + h, v + m);
    if (y1 - y0 > 0.04) box(x + w - 0.1, y0, RH - 0.6, 0.1, y1 - y0, 5, M.laterite);
  }
}
ART.add("rampart.c", () => rampartPiece(RO, RO, RW, RW, "both"), { size: 110, oy: 0.8 });
ART.add("rampart.px", () => rampartPiece(RO + RW, RO, 1 - RO - RW, RW, "x"), { size: 110, oy: 0.8 });
ART.add("rampart.nx", () => rampartPiece(0, RO, RO, RW, "x"), { size: 110, oy: 0.8 });
ART.add("rampart.py", () => rampartPiece(RO, RO + RW, RW, 1 - RO - RW, "y"), { size: 110, oy: 0.8 });
ART.add("rampart.ny", () => rampartPiece(RO, 0, RW, RO, "y"), { size: 110, oy: 0.8 });

// Katu wetiya: a hedge of cut thorny branches piled between a few stakes.
for (let v = 0; v < 2; v++) ART.add(`thorn.${v}`, () => {
  blob(0.5, 0.5, 26, 12, "rgba(30,20,8,0.35)");
  for (const [x, y] of [[0.2, 0.25], [0.75, 0.3], [0.3, 0.78], [0.8, 0.8]]) post(x, y, 0.018, 0, 9 + R() * 3, M.timber, 6);
  const branches = [];
  for (let i = 0; i < 46; i++) branches.push([rr(0.08, 0.92), rr(0.08, 0.92), rr(-1, 1), rr(5, 11)]);
  branches.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  for (const [x, y, lean, h] of branches) {
    if (MODE.shadow) { gline([x, y, 0], [x + lean * 0.1, y, h], "#000", 0.8); continue; }
    const p = P(x, y, 0);
    const col = pick(["#6b5434", "#7d6440", "#584530", "#8a7048"]);
    g.strokeStyle = col; g.lineWidth = rr(0.5, 0.9); g.lineCap = "round";
    const tx = p.x + lean * 6, ty = p.y - h;
    g.beginPath(); g.moveTo(p.x, p.y); g.quadraticCurveTo(p.x + lean * 2, p.y - h * 0.6, tx, ty); g.stroke();
    // thorns and twigs
    g.lineWidth = 0.3;
    for (let k = 0; k < 4; k++) {
      const t = rr(0.25, 0.95), mx = lerp(p.x, tx, t), my = lerp(p.y, ty, t), side = R() < 0.5 ? -1 : 1;
      g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + side * rr(1, 2.5), my - rr(0.5, 1.5)); g.stroke();
    }
    if (R() < 0.3) { g.fillStyle = pick(["#5d7a2e", "#7a8f3a", "#4a6a28"]); g.beginPath(); g.ellipse(tx, ty, 1.1, 0.6, lean, 0, 7); g.fill(); }
  }
  gline([0.2, 0.25, 6], [0.8, 0.8, 6], "#b18a4c", 0.5);
}, { size: 90 });

// ---------- water works ----------
// Wewa: earthen bund around a basin. "base" is drawn before the water, "front" after.
function bundRing(front) {
  const o = 0.04, t = 0.32, H = 7;
  // outer slope and crest of the four sides; front sides only when front=true
  const g0 = [o, o], g1 = [2 - o, 2 - o];
  const crest = (x0, y0, x1, y1) => quadXY(x0, y0, x1 - x0, y1 - y0, H, null);
  const sides = front
    ? [
      [[o, 2 - o, 0], [2 - o, 2 - o, 0], [2 - o - t, 2 - o - t, H], [o + t, 2 - o - t, H]],
      [[2 - o, 2 - o, 0], [2 - o, o, 0], [2 - o - t, o + t, H], [2 - o - t, 2 - o - t, H]]
    ]
    : [
      [[o, o, 0], [2 - o, o, 0], [2 - o - t, o + t, H], [o + t, o + t, H]].reverse(),
      [[o, o, 0], [o + t, o + t, H], [o + t, 2 - o - t, H], [o, 2 - o, 0]]
    ];
  for (const pts of sides) face(pts, { col: "#6f8a3c", tex: TEX.earth, grassy: true });
  // inner slopes down to the basin floor at z=0 (back two visible)
  const i0 = o + t, i1 = 2 - o - t, j = 0.2;
  if (!front) {
    face([[i1, i0, H], [i0, i0, H], [i0 + j, i0 + j, 0], [i1 - j, i0 + j, 0]], { col: "#7c6440", tex: TEX.earth });
    face([[i0, i0, H], [i0, i1, H], [i0 + j, i1 - j, 0], [i0 + j, i0 + j, 0]], { col: "#7c6440", tex: TEX.earth });
    // crest path on back sides
    poly2([[o + t - 0.04, o + t - 0.04, H], [2 - o - t + 0.04, o + t - 0.04, H], [2 - o - t + 0.04, o + t, H], [o + t, o + t, H]], "#8a7448");
  } else {
    // stone sluice tower (biso kotuwa) on the front corner
    box(1.55, 1.55, 0, 0.3, 0.3, 11, M.granite, { ao: 2 });
    box(1.53, 1.53, 11, 0.34, 0.34, 1.5, M.graniteSlab);
    // stone steps down the front bund
    for (let i = 0; i < 4; i++) box(0.75, 1.68 + i * 0.065, 0, 0.3, 0.07, H - i * 1.7, { top: M.graniteSlab, left: M.granite, right: M.granite }, { edges: false });
  }
}
ART.add("wewa.base", () => {
  // basin floor (mud, cracked)
  face([[0.3, 1.7, 0], [1.7, 1.7, 0], [1.7, 0.3, 0], [0.3, 0.3, 0]], { col: "#6b5434", tex: TEX.earth });
  if (!MODE.shadow) for (let i = 0; i < 26; i++) {
    const a = [rr(0.4, 1.6), rr(0.4, 1.6), 0], b = [a[0] + rr(-0.15, 0.15), a[1] + rr(-0.15, 0.15), 0];
    gline(a, b, "rgba(35,22,10,0.55)", 0.4);
  }
  bundRing(false);
}, { size: 220, shadow: false });
ART.add("wewa.front", () => bundRing(true), { size: 220 });

// Canal pieces: a stone-lined channel; mask bits 1=+x 2=-x 4=+y 8=-y.
const CH0 = 0.33, CH1 = 0.67, CD = 3;
function canalRects(mask) {
  const r = [[CH0, CH0, CH1, CH1]];
  if (mask & 1) r.push([CH1, CH0, 1, CH1]);
  if (mask & 2) r.push([0, CH0, CH0, CH1]);
  if (mask & 4) r.push([CH0, CH1, CH1, 1]);
  if (mask & 8) r.push([CH0, 0, CH1, CH0]);
  return r;
}
for (let mask = 0; mask < 16; mask++) ART.add(`canal.${mask}`, () => {
  const rects = canalRects(mask);
  for (const [x0, y0, x1, y1] of rects) face([[x0, y1, -CD], [x1, y1, -CD], [x1, y0, -CD], [x0, y0, -CD]], { col: "#5a4630", tex: TEX.earth });
  // inner walls facing +x or +y (visible), on edges not shared with another rect
  const open = { px: mask & 1, nx: mask & 2, py: mask & 4, ny: mask & 8 };
  const walls = [];
  // centre square sides
  if (!open.nx) walls.push(["x", CH0, CH0, CH1]); // wall at x=CH0 facing +x
  if (!open.ny) walls.push(["y", CH0, CH0, CH1]); // wall at y=CH0 facing +y
  if (open.px) walls.push(["y", CH0, CH1, 1]);
  if (open.nx) walls.push(["y", CH0, 0, CH0]);
  if (open.py) walls.push(["x", CH0, CH1, 1]);
  if (open.ny) walls.push(["x", CH0, 0, CH0]);
  const stone = { col: "#8d8676", tex: TEX.blocks, course: 1.5, blockLen: 4, speck: true, var: 0.1 };
  for (const [ax, c, a0, a1] of walls) {
    if (ax === "x") face([[c, a1, -CD], [c, a0, -CD], [c, a0, 0], [c, a1, 0]], stone);
    else face([[a0, c, -CD], [a1, c, -CD], [a1, c, 0], [a0, c, 0]], stone);
  }
  // coping stones along every rim
  const rim = [];
  const add = (x0, y0, x1, y1) => rim.push([x0, y0, x1, y1]);
  const k = 0.07;
  if (!open.nx) add(CH0 - k, CH0 - k, CH0, CH1 + k);
  if (!open.px) add(CH1, CH0 - k, CH1 + k, CH1 + k);
  if (!open.ny) add(CH0 - k, CH0 - k, CH1 + k, CH0);
  if (!open.py) add(CH0 - k, CH1, CH1 + k, CH1 + k);
  if (open.px) { add(CH1, CH0 - k, 1, CH0); add(CH1, CH1, 1, CH1 + k); }
  if (open.nx) { add(0, CH0 - k, CH0, CH0); add(0, CH1, CH0, CH1 + k); }
  if (open.py) { add(CH0 - k, CH1, CH0, 1); add(CH1, CH1, CH1 + k, 1); }
  if (open.ny) { add(CH0 - k, 0, CH0, CH0); add(CH1, 0, CH1 + k, CH0); }
  for (const [x0, y0, x1, y1] of rim) box(x0, y0, 0, x1 - x0, y1 - y0, 0.9, { col: "#a39c8c", tex: TEX.blocks, course: 9, blockLen: 3.2, speck: true, var: 0.12 }, { edges: false });
}, { size: 90, oy: 0.6, shadow: false, outline: false });

// Sluice (Sorowwa): stone posts and lintel over the channel, timber gate.
for (const st of ["open", "closed"]) ART.add(`sluice.${st}`, () => {
  box(0.2, 0.2, 0, 0.14, 0.14, 17, M.granite, { ao: 2 });
  box(0.66, 0.66, 0, 0.14, 0.14, 17, M.granite, { ao: 2 });
  box(0.16, 0.16, 17, 0.68, 0.68, 2.4, M.granite);
  box(0.3, 0.3, st === "open" ? 9 : -2, 0.4, 0.4, 9, M.darkTimber);
  gline([0.5, 0.5, st === "open" ? 18 : 7], [0.5, 0.5, 19.4], "#3a3a3a", 0.8);
  // windlass
  post(0.5, 0.5, 0.03, 19.4, 22, M.timber, 8);
  gline([0.42, 0.5, 21], [0.58, 0.5, 21], "#6b4426", 1);
}, { size: 90, oy: 0.75 });

// Kumbura (paddy): bunds around flooded or dry fields, rice at five growth stages.
for (const wet of [1, 0]) for (let stg = 0; stg < 5; stg++) ART.add(`paddy.${wet ? "w" : "d"}${stg}`, () => {
  const H = 2.2;
  // field surface
  const water = wet ? { col: "#5b8790", tex: (gg, U, V, uv, f) => {
    const gr = gg.createLinearGradient(0, 0, U, V); gr.addColorStop(0, "rgba(190,220,230,0.35)"); gr.addColorStop(1, "rgba(30,60,70,0.25)");
    gg.fillStyle = gr; gg.fillRect(0, 0, U, V);
    for (let i = 0; i < U * V / 30; i++) { gg.fillStyle = "rgba(230,245,255,0.25)"; gg.fillRect(R() * U, R() * V, rr(1, 3), 0.25); }
  } } : { col: stg === 0 ? "#8a7448" : "#7d6a42", tex: TEX.earth };
  face([[0.08, 1.92, 0.4], [1.92, 1.92, 0.4], [1.92, 0.08, 0.4], [0.08, 0.08, 0.4]], water);
  if (!wet && !MODE.shadow) for (let i = 0; i < 40; i++) {
    const a = [rr(0.15, 1.85), rr(0.15, 1.85), 0.4], b = [a[0] + rr(-0.12, 0.12), a[1] + rr(-0.12, 0.12), 0.4];
    gline(a, b, "rgba(50,35,15,0.45)", 0.35);
  }
  // bunds (vakkada) around and across the middle
  const bund = { col: "#7a6a40", tex: TEX.earth, grassy: true };
  const bunds = [[0, 0, 2, 0.1], [0, 0.1, 0.1, 1.8], [0, 1.9, 2, 0.1], [1.9, 0.1, 0.1, 1.8], [0.1, 0.96, 1.8, 0.08]];
  bunds.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  // rice tufts back to front, the middle bund placed in depth order
  const n = 9, tufts = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = 0.2 + i * 1.6 / (n - 1) + rr(-0.02, 0.02), y = 0.2 + j * 1.6 / (n - 1) + rr(-0.02, 0.02);
    if (Math.abs(y - 1.0) < 0.1) continue;
    tufts.push([x, y]);
  }
  for (const [x, y, w, h] of bunds.filter(b => b[1] < 0.5 || b[0] < 0.05 && b[1] < 0.5)) box(x, y, 0, w, h, H, bund, { edges: false });
  for (const [x, y, w, h] of bunds.filter(b => b[0] < 0.05 && b[1] > 0.05 && b[1] < 0.5)) box(x, y, 0, w, h, H, bund, { edges: false });
  const mid = bunds.find(b => b[3] === 0.08);
  let midDrawn = false;
  tufts.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  const hgt = [2.5, 5, 8, 10, 10.5][stg];
  const green = wet ? ["#5aa83a", "#4c9a30", "#3f8a2a", "#a7b84a", "#d9b94c"][stg] : ["#8a9a3a", "#93a04a", "#9aa04e", "#b0a24c", "#c9aa50"][stg];
  for (const [x, y] of tufts) {
    if (!midDrawn && x + y > mid[0] + mid[1] + 1.1) { box(mid[0], mid[1], 0, mid[2], mid[3], H, bund, { edges: false }); midDrawn = true; }
    if (MODE.shadow) { gline([x, y, 0.4], [x + 0.02, y, hgt], "#000", 1.5); continue; }
    const p = P(x, y, 0.4);
    const blades = 5 + stg * 2;
    for (let b = 0; b < blades; b++) {
      const a = rr(-0.6, 0.6), h = hgt * rr(0.75, 1.05);
      g.strokeStyle = css(lit(jit(green, 0.15), rr(0.8, 1.15))); g.lineWidth = rr(0.35, 0.55);
      g.beginPath(); g.moveTo(p.x + a * 0.6, p.y); g.quadraticCurveTo(p.x + a * 2, p.y - h * 0.6, p.x + a * 3.2 + (stg >= 3 ? 1 : 0), p.y - h); g.stroke();
    }
    if (stg >= 3) for (let b = 0; b < 3; b++) { // drooping panicles
      g.strokeStyle = css(lit(stg === 4 ? "#e8c25a" : "#c9c070", 1.05)); g.lineWidth = 0.6;
      const a = rr(-1.5, 2.5);
      g.beginPath(); g.moveTo(p.x + a, p.y - hgt); g.quadraticCurveTo(p.x + a + 1.2, p.y - hgt - 1, p.x + a + 2, p.y - hgt + 1.2); g.stroke();
    }
  }
  if (!midDrawn) box(mid[0], mid[1], 0, mid[2], mid[3], H, bund, { edges: false });
  for (const [x, y, w, h] of bunds.filter(b => b[1] > 1.8 || b[0] > 1.8)) box(x, y, 0, w, h, H, bund, { edges: false });
}, { size: 220, oy: 0.55, shadow: false });

// ---------- construction & ruin ----------
for (const n of [1, 2]) {
  ART.add(`site.${n}`, () => {
    box(0.08, 0.08, 0, n - 0.16, n - 0.16, 1.5, { top: { col: "#9a7a52", tex: TEX.earth }, left: M.laterite, right: M.laterite }, { edges: false });
    // laterite blocks and timber waiting
    box(n - 0.4, n - 0.25, 1.5, 0.22, 0.14, 3, M.laterite); box(n - 0.38, n - 0.24, 4.5, 0.16, 0.12, 2.6, M.laterite);
    for (let i = 0; i < 3; i++) gline([0.15, n - 0.2 + i * 0.04, 1.6 + i * 0.6], [0.6, n - 0.2 + i * 0.04, 1.6 + i * 0.6], "#8a5a2b", 1.4);
  }, { size: n === 1 ? 110 : 200 });
  ART.add(`scaffold.${n}`, () => {
    const H = n === 1 ? 26 : 34, poles = [];
    for (let i = 0; i <= n * 2; i++) { poles.push([i / 2, n + 0.03]); poles.push([n + 0.03, i / 2]); }
    poles.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
    for (const [x, y] of poles) gline([x, y, 0], [x, y, H], "#9c7a48", 0.9);
    for (let z = 8; z < H; z += 9) {
      gline([0, n + 0.03, z], [n + 0.03, n + 0.03, z], "#8a6a3c", 0.8);
      gline([n + 0.03, 0, z], [n + 0.03, n + 0.03, z], "#7a5a30", 0.8);
      poly2([[0, n - 0.06, z], [n, n - 0.06, z], [n, n + 0.06, z], [0, n + 0.06, z]], "rgba(150,110,60,0.9)");
    }
    for (let i = 0; i < n * 2; i++) gline([i / 2, n + 0.03, 8], [(i + 1) / 2, n + 0.03, 17], "#7a5a30", 0.6);
  }, { size: n === 1 ? 120 : 210, shadow: false });
  ART.add(`rubble.${n}`, () => {
    const cnt = n === 1 ? 14 : 36;
    const items = [];
    for (let i = 0; i < cnt; i++) items.push([rr(0.12, n - 0.25), rr(0.12, n - 0.25), rr(0.08, 0.2), R()]);
    items.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
    blob(n / 2, n / 2, 26 * n, 13 * n, "rgba(30,20,10,0.45)");
    for (const [x, y, s, t] of items) {
      if (t < 0.55) box(x, y, rr(0, 3), s, s * rr(0.6, 1), rr(2, 5), t < 0.3 ? M.laterite : M.white, { edges: false });
      else if (t < 0.8) gline([x, y, 1], [x + rr(0.15, 0.4), y + rr(-0.1, 0.1), rr(2, 6)], "#3a2412", 1.4);
      else box(x, y, 0, s * 0.8, s * 0.5, 1.5, M.tileDark, { edges: false });
    }
    // charred timbers
    for (let i = 0; i < n * 3; i++) gline([rr(0.1, n - 0.2), rr(0.1, n - 0.2), 0.5], [rr(0.1, n - 0.2), rr(0.1, n - 0.2), rr(3, 9)], "#2a1a10", 1.2);
  }, { size: n === 1 ? 120 : 210, shadow: false });
}
