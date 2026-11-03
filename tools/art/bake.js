"use strict";
// Draws every registered sprite, trims it, bakes its cast shadow, and packs
// everything into atlas pages. tools/bake.mjs calls window.bakeAll().

function renderOne(item) {
  const k = item.opts.k || 3;
  const SZ = Math.max(200, Math.round((item.opts.size || 300) * 1.7)); // world px canvas, generous; trimmed after
  item.opts.oy = 0.5;
  let c;
  if (item.opts.render3d) {
    // 3D model (tools/art3d): rendered through the isometric camera
    c = item.opts.render3d({ k, SZ, oy: item.opts.oy });
  } else {
    c = document.createElement("canvas");
    c.width = c.height = SZ * k;
    g = c.getContext("2d");
    g.setTransform(k, 0, 0, k, (SZ * k) / 2, (SZ * k) * (item.opts.oy ?? 0.72));
    R = rng(item.key);
    MODE.shadow = false;
    item.draw(item.opts.arg);
  }
  if (item.opts.outline !== false) outline(c, item.opts.outlineK ?? 0.62);
  const out = trim(c, k, SZ, item.opts.oy ?? 0.72, item.key);
  out.key = item.key; out.k = k;
  let shadow = null;
  if (item.opts.shadow !== false) {
    let s;
    if (item.opts.render3d) s = item.opts.render3d({ k, SZ, oy: item.opts.oy, shadowOnly: true });
    else {
      s = document.createElement("canvas");
      s.width = s.height = SZ * k;
      g = s.getContext("2d");
      g.setTransform(k, 0, 0, k, (SZ * k) / 2, (SZ * k) * (item.opts.oy ?? 0.72));
      R = rng(item.key);
      MODE.shadow = true;
      item.draw(item.opts.arg);
      MODE.shadow = false;
    }
    // soften
    const b = document.createElement("canvas");
    b.width = b.height = SZ * k;
    const bg = b.getContext("2d");
    bg.filter = `blur(${(item.opts.blur ?? 1.6) * k}px)`;
    bg.drawImage(s, 0, 0);
    shadow = trim(b, k, SZ, item.opts.oy ?? 0.72, item.key + "#sh");
    // shadows are soft: store them at a third of the resolution
    const d = 3, h = document.createElement("canvas");
    h.width = Math.ceil(shadow.w / d); h.height = Math.ceil(shadow.h / d);
    h.getContext("2d").drawImage(shadow.canvas, 0, 0, h.width, h.height);
    shadow = { canvas: h, w: h.width, h: h.height, ax: shadow.ax / d, ay: shadow.ay / d, key: item.key + "#sh", k: k / d };
  }
  return shadow ? [out, shadow] : [out];
}

// Darken the outermost opaque pixels for a crisp painted edge.
function outline(c, kk) {
  const x = c.getContext("2d");
  const d = x.getImageData(0, 0, c.width, c.height), a = d.data, W = c.width, H = c.height;
  const al = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) al[i] = a[i * 4 + 3];
  for (let y = 1; y < H - 1; y++) for (let x2 = 1; x2 < W - 1; x2++) {
    const i = y * W + x2;
    if (al[i] < 128) continue;
    if (al[i - 1] < 60 || al[i + 1] < 60 || al[i - W] < 60 || al[i + W] < 60) {
      a[i * 4] *= kk; a[i * 4 + 1] *= kk; a[i * 4 + 2] *= kk;
    }
  }
  x.putImageData(d, 0, 0);
}

function trim(c, k, SZ, oy, key) {
  const x = c.getContext("2d");
  const d = x.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
    if (d[(y * W + i) * 4 + 3] > 2) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; }
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(W - 1, x1 + 1); y1 = Math.min(H - 1, y1 + 1);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const o = document.createElement("canvas"); o.width = w; o.height = h;
  o.getContext("2d").drawImage(c, x0, y0, w, h, 0, 0, w, h);
  if (x0 === 0 || y0 === 0 || x1 === W - 1 || y1 === H - 1) console.warn("sprite touches canvas edge: " + key);
  return { canvas: o, w, h, ax: W / 2 - x0, ay: H * oy - y0 };
}

// Shelf packer into pages of PAGE_W wide.
function pack(sprites, PAGE_W = 2048, PAGE_H = 2048) {
  sprites.sort((a, b) => b.h - a.h);
  const pages = [];
  let page = null, x = 0, y = 0, rowH = 0;
  const newPage = () => { page = { items: [] }; pages.push(page); x = 0; y = 0; rowH = 0; };
  newPage();
  for (const s of sprites) {
    if (x + s.w + 2 > PAGE_W) { x = 0; y += rowH + 2; rowH = 0; }
    if (y + s.h + 2 > PAGE_H) newPage();
    s.page = pages.length - 1; s.x = x; s.y = y;
    page.items.push(s);
    x += s.w + 2; rowH = Math.max(rowH, s.h);
  }
  return pages.map((p, i) => {
    const h = Math.max(...p.items.map(s => s.y + s.h)) + 1;
    const c = document.createElement("canvas"); c.width = PAGE_W; c.height = h;
    const cx = c.getContext("2d");
    for (const s of p.items) cx.drawImage(s.canvas, s.x, s.y);
    return c;
  });
}

window.bakeAll = function (filter) {
  const sprites = [];
  const t0 = performance.now();
  for (const item of ART.list) {
    if (filter && !item.key.startsWith(filter)) continue;
    try { sprites.push(...renderOne(item)); }
    catch (e) { throw new Error(item.key + ": " + e.stack); }
  }
  const pages = pack(sprites);
  const meta = {};
  for (const s of sprites) meta[s.key] = [s.page, s.x, s.y, s.w, s.h, +(s.ax / s.k).toFixed(2), +(s.ay / s.k).toFixed(2), s.k];
  return { meta, pages: pages.map(c => c.toDataURL("image/png")), ms: Math.round(performance.now() - t0), count: sprites.length };
};

// Contact sheet for eyeballing: bakePreview(prefix) draws sprites on a grid with their shadows.
window.bakePreview = function (filter, cols = 6, cell0 = 260, scale = 1) {
  const cell = cell0 * scale;
  const items = ART.list.filter(i => !filter || i.key.startsWith(filter));
  const rows = Math.ceil(items.length / cols);
  const c = document.createElement("canvas"); c.width = cols * cell; c.height = rows * cell;
  const cx = c.getContext("2d");
  cx.fillStyle = "#6f8f4a"; cx.fillRect(0, 0, c.width, c.height);
  items.forEach((it, i) => {
    const [spr, sh] = renderOne(it);
    const ox = (i % cols) * cell + cell / 2, oy = Math.floor(i / cols) * cell + cell * 0.62;
    const k = spr.k / scale;
    if (sh) { cx.globalAlpha = 0.35; cx.drawImage(sh.canvas, ox - sh.ax / k, oy - sh.ay / k, sh.w / k, sh.h / k); cx.globalAlpha = 1; }
    cx.drawImage(spr.canvas, ox - spr.ax / k, oy - spr.ay / k, spr.w / k, spr.h / k);
    cx.fillStyle = "#fff"; cx.font = "11px sans-serif"; cx.fillText(it.key, (i % cols) * cell + 4, Math.floor(i / cols) * cell + 12);
  });
  return c.toDataURL("image/png");
};
