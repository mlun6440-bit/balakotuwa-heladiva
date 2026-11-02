"use strict";
// Material texture painters. Each runs in face space after the lit base fill:
// u runs along the face's first edge (U long), v runs "up" the face (V long).
// Units are roughly screen pixels at zoom 1. f is the face's light factor.

const COL = {
  whitewash: "#ece3cf", laterite: "#a9572f", lateriteDark: "#7d3a1c", tile: "#b65a32",
  thatch: "#c9a45a", timber: "#6b4426", granite: "#a8a194", earth: "#7b5a36", gold: "#e9b949",
  maroon: "#7c1d1d", sand: "#cdb47c", mud: "#b58a5a", grass: "#5f8a3a", lime: "#f4ecda"
};

function speckle(g, U, V, n, base, f, amt, size = 0.6, alpha = 0.5) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = css(lit(jit(base, amt), f), alpha * R());
    const s = size * (0.5 + R());
    g.fillRect(R() * U, R() * V, s, s);
  }
}
function mottle(g, U, V, n, cols, f, rmin, rmax, alpha) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = css(lit(pick(cols), f), alpha * (0.4 + 0.6 * R()));
    g.beginPath(); g.ellipse(R() * U, R() * V, rr(rmin, rmax), rr(rmin, rmax) * rr(0.4, 1), 0, 0, Math.PI * 2); g.fill();
  }
}

const TEX = {
  whitewash(g, U, V, uv, f, mat) {
    mottle(g, U, V, U * V / 18, [mat.col, shadeC(mat.col, 0.93), shadeC(mat.col, 1.04)], f, 0.6, 2.4, 0.35);
    // vertical rain streaks
    for (let i = 0; i < U / 3; i++) {
      const x = R() * U, len = rr(V * 0.2, V * 0.8);
      g.fillStyle = css(lit([150, 135, 110], f), 0.08 + R() * 0.08);
      g.fillRect(x, V - len, rr(0.3, 0.8), len);
    }
    // grime splashed up from the ground
    const gr = g.createLinearGradient(0, 0, 0, Math.min(V, 6));
    gr.addColorStop(0, css(lit([120, 92, 58], f), 0.55)); gr.addColorStop(1, css(lit([120, 92, 58], f), 0));
    g.fillStyle = gr; g.fillRect(0, 0, U, Math.min(V, 6));
    speckle(g, U, Math.min(V, 4), U, [110, 80, 50], f, 0.2, 0.6, 0.5);
    // occasional spalled patch showing laterite
    if (R() < 0.5 && U > 10) {
      const x = rr(2, U - 6), y = rr(2, V * 0.5);
      g.fillStyle = css(lit(COL.laterite, f * 0.9), 0.8);
      g.beginPath(); g.ellipse(x, y, rr(1.2, 2.5), rr(0.8, 1.5), 0, 0, Math.PI * 2); g.fill();
    }
  },

  mudwall(g, U, V, uv, f, mat) {
    mottle(g, U, V, U * V / 10, [mat.col, shadeC(mat.col, 0.88), shadeC(mat.col, 1.08)], f, 0.5, 2, 0.45);
    for (let i = 0; i < U / 4; i++) {
      g.strokeStyle = css(lit(shadeC(mat.col, 0.6), f), 0.5); g.lineWidth = 0.35;
      const x = R() * U, y = R() * V;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(-2, 2), y + rr(1, 3)); g.lineTo(x + rr(-2, 2), y + rr(2, 5)); g.stroke();
    }
    const gr = g.createLinearGradient(0, 0, 0, Math.min(V, 5));
    gr.addColorStop(0, css(lit([90, 60, 35], f), 0.5)); gr.addColorStop(1, css(lit([90, 60, 35], f), 0));
    g.fillStyle = gr; g.fillRect(0, 0, U, 5);
  },

  blocks(g, U, V, uv, f, mat) {
    const ch = mat.course || 4, bl = mat.blockLen || 8;
    const mortar = css(lit(shadeC(mat.col, 0.55), f), 0.85);
    for (let y = 0, row = 0; y < V + ch; y += ch, row++) {
      let x = row % 2 ? -bl / 2 : 0;
      x -= R() * 2;
      while (x < U) {
        const len = bl * rr(0.7, 1.3);
        const c = lit(jit(mat.col, mat.var ?? 0.12), f);
        g.fillStyle = css(c);
        g.fillRect(x + 0.35, y + 0.35, len - 0.7, ch - 0.7);
        // top-left highlight and bottom shadow of each block
        g.fillStyle = css(shadeC(c, 1.18), 0.55); g.fillRect(x + 0.35, y + ch - 0.95, len - 0.7, 0.45);
        g.fillStyle = css(shadeC(c, 0.7), 0.6); g.fillRect(x + 0.35, y + 0.35, len - 0.7, 0.4);
        if (mat.pits) for (let k = 0; k < len * ch * 0.25; k++) {
          g.fillStyle = css(shadeC(c, rr(0.55, 0.8)), 0.8);
          g.fillRect(x + R() * len, y + R() * ch, rr(0.3, 0.7), rr(0.3, 0.6));
        }
        if (mat.speck) for (let k = 0; k < len * ch * 0.3; k++) {
          g.fillStyle = css(shadeC(c, R() < 0.5 ? 0.75 : 1.2), 0.6);
          g.fillRect(x + R() * len, y + R() * ch, 0.35, 0.35);
        }
        g.fillStyle = mortar;
        g.fillRect(x, y, 0.35, ch);
        x += len;
      }
      g.fillStyle = mortar; g.fillRect(0, y, U, 0.35);
    }
    if (mat.moss) mottle(g, U, Math.min(V, 5), U / 2, ["#4f6a2a", "#3d5a24"], f, 0.4, 1.6, 0.35);
  },

  planks(g, U, V, uv, f, mat) {
    const w = mat.plank || 2.4;
    const horiz = mat.horiz;
    const L = horiz ? V : U, M = horiz ? U : V;
    for (let x = 0; x < L; x += w) {
      const c = lit(jit(mat.col, 0.12), f);
      g.fillStyle = css(c);
      if (horiz) g.fillRect(0, x, M, w - 0.3); else g.fillRect(x, 0, w - 0.3, M);
      g.strokeStyle = css(shadeC(c, 0.75), 0.6); g.lineWidth = 0.25;
      for (let k = 0; k < 2; k++) {
        const o = x + rr(0.4, w - 0.6);
        g.beginPath();
        if (horiz) { g.moveTo(0, o); for (let t = 0; t <= M; t += 3) g.lineTo(t, o + Math.sin(t * 0.4 + k) * 0.25); }
        else { g.moveTo(o, 0); for (let t = 0; t <= M; t += 3) g.lineTo(o + Math.sin(t * 0.4 + k) * 0.25, t); }
        g.stroke();
      }
      g.fillStyle = css(shadeC(c, 0.5), 0.8);
      if (horiz) g.fillRect(0, x + w - 0.35, M, 0.35); else g.fillRect(x + w - 0.35, 0, 0.35, M);
    }
  },

  // Half-round clay tiles in rows along the eave. v=0 at the eave.
  tiles(g, U, V, uv, f, mat) {
    const rowH = mat.rowH || 2.7, tw = mat.tileW || 2.3;
    for (let v = V + rowH, row = 0; v > -rowH; v -= rowH, row++) {
      const off = row % 2 ? tw / 2 : 0;
      for (let u = -tw + off; u < U + tw; u += tw) {
        const age = R();
        let c = jit(mat.col, 0.1);
        if (age < 0.08) c = mixC(c, [70, 80, 40], 0.45); // moss
        else if (age < 0.18) c = shadeC(c, 0.78);         // weathered
        const cl = lit(c, f);
        // tile body: lighter crown, darker channel
        const gr = g.createLinearGradient(u, 0, u + tw, 0);
        gr.addColorStop(0, css(shadeC(cl, 0.72))); gr.addColorStop(0.35, css(shadeC(cl, 1.15)));
        gr.addColorStop(0.65, css(cl)); gr.addColorStop(1, css(shadeC(cl, 0.62)));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(u + 0.15, v + rowH * 1.05);
        g.lineTo(u + 0.15, v + 0.4);
        g.quadraticCurveTo(u + tw / 2, v - 0.55, u + tw - 0.15, v + 0.4);
        g.lineTo(u + tw - 0.15, v + rowH * 1.05);
        g.closePath(); g.fill();
      }
      // shadow cast by the row above onto this row
      g.fillStyle = "rgba(30,8,0,0.35)";
      g.fillRect(-2, v + rowH * 0.92, U + 4, rowH * 0.25);
    }
    if (mat.lichen) mottle(g, U, V, U * V / 60, ["#c8c08a", "#8f9a5a"], f, 0.3, 0.9, 0.35);
  },

  // Layered straw thatch, strokes running down-slope.
  thatch(g, U, V, uv, f, mat) {
    const band = mat.band || 3.2;
    const cols = [mat.col, shadeC(mat.col, 0.82), shadeC(mat.col, 1.12), mixC(mat.col, [120, 100, 70], 0.4)];
    for (let v = V + band; v > -band; v -= band) {
      g.fillStyle = "rgba(40,25,5,0.32)";
      g.fillRect(-2, v - 0.6, U + 4, 1.1);
      for (let u = -1; u < U + 1; u += 0.32) {
        const c = lit(pick(cols), f * rr(0.88, 1.08));
        g.strokeStyle = css(c, 0.85); g.lineWidth = rr(0.25, 0.45);
        const len = band * rr(1.0, 1.7);
        g.beginPath(); g.moveTo(u, v + band * 0.6); g.lineTo(u + rr(-0.4, 0.4), v + band * 0.6 - len); g.stroke();
      }
    }
    // darker weathered bottom edge
    const gr = g.createLinearGradient(0, 0, 0, 3);
    gr.addColorStop(0, "rgba(50,30,10,0.45)"); gr.addColorStop(1, "rgba(50,30,10,0)");
    g.fillStyle = gr; g.fillRect(-2, 0, U + 4, 3);
  },

  palmleaf(g, U, V, uv, f, mat) {
    // cadjan (woven coconut leaf): diagonal weave
    for (let v = -U; v < V + U; v += 1.1) {
      g.strokeStyle = css(lit(jit(mat.col, 0.15), f), 0.7); g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(0, v); g.lineTo(U, v + U * 0.5); g.stroke();
    }
    TEX.thatch(g, U, V, uv, f, { ...mat, band: 4 });
  },

  earth(g, U, V, uv, f, mat) {
    mottle(g, U, V, U * V / 8, [mat.col, shadeC(mat.col, 0.85), shadeC(mat.col, 1.12)], f, 0.5, 2.2, 0.5);
    speckle(g, U, V, U * V / 3, mat.col, f, 0.35, 0.5, 0.7);
    if (mat.grassy) for (let i = 0; i < U * V / 6; i++) {
      g.strokeStyle = css(lit(pick(["#5f8a3a", "#4c7a2c", "#7ea24a"]), f), 0.85); g.lineWidth = 0.35;
      const x = R() * U, y = R() * V;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(-0.6, 0.6), y + rr(0.8, 1.8)); g.stroke();
    }
  },

  plain(g, U, V, uv, f, mat) {
    speckle(g, U, V, U * V / 4, mat.col, f, 0.08, 0.5, 0.5);
  },

  gilt(g, U, V, uv, f, mat) {
    const gr = g.createLinearGradient(0, 0, U, V);
    gr.addColorStop(0, "rgba(255,250,210,0.45)"); gr.addColorStop(0.5, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(90,50,0,0.3)");
    g.fillStyle = gr; g.fillRect(0, 0, U, V);
  }
};

// Ready-made materials.
const M = {
  white: { col: COL.whitewash, tex: TEX.whitewash },
  lime: { col: COL.lime, tex: TEX.plain },
  laterite: { col: COL.laterite, tex: TEX.blocks, course: 3.6, blockLen: 7, pits: true },
  lateriteBig: { col: COL.laterite, tex: TEX.blocks, course: 5, blockLen: 10, pits: true, moss: true },
  granite: { col: COL.granite, tex: TEX.blocks, course: 4.5, blockLen: 11, speck: true, var: 0.08 },
  graniteSlab: { col: "#b1aa9b", tex: TEX.plain },
  timber: { col: COL.timber, tex: TEX.planks, plank: 2.6 },
  timberH: { col: COL.timber, tex: TEX.planks, plank: 2.4, horiz: true },
  darkTimber: { col: "#4a2f18", tex: TEX.planks, plank: 2.2 },
  tile: { col: COL.tile, tex: TEX.tiles, lichen: true },
  tileDark: { col: "#9a4426", tex: TEX.tiles, lichen: true },
  thatch: { col: COL.thatch, tex: TEX.thatch },
  thatchOld: { col: "#a88a52", tex: TEX.thatch },
  cadjan: { col: "#b7a36a", tex: TEX.palmleaf },
  mud: { col: COL.mud, tex: TEX.mudwall },
  ochre: { col: "#cf9f62", tex: TEX.mudwall },
  earth: { col: COL.earth, tex: TEX.earth },
  bund: { col: "#7a6a40", tex: TEX.earth, grassy: true },
  gold: { col: COL.gold, tex: TEX.gilt },
  door: { col: "#3a2614", tex: TEX.planks, plank: 1.6 },
  dark: { col: "#21160c" }
};
