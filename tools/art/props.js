"use strict";
// Ground props and ambient animals. Origin = ground point.

ART.add("prop.cart", () => {
  blob(0, 0, 12, 5, "rgba(20,15,5,0.3)");
  box(-0.22, -0.1, 4, 0.42, 0.22, 1.2, M.timberH, { edges: false });
  for (const s of [0, 1]) { box(-0.22, -0.1 + s * 0.2, 5.2, 0.42, 0.02, 3, M.timberH, { edges: false }); }
  // load of sacks
  for (let i = 0; i < 3; i++) lathe(-0.1 + i * 0.1, 0.0, [[0.06, 5.2], [0.07, 6.5], [0.05, 8.5], [0.0, 9]], { col: "#c9b48a" }, { seg: 10 });
  // wheels
  at(-0.02, 0.15, 3.5, c => {
    c.strokeStyle = "#4a2f18"; c.lineWidth = 1.1; c.beginPath(); c.ellipse(0, 0, 3.4, 3.6, -0.45, 0, 7); c.stroke();
    c.lineWidth = 0.5; for (let a = 0; a < 6; a++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 3.2, Math.sin(a) * 3.4); c.stroke(); }
  });
  gline([0.2, 0.0, 5], [0.55, 0.0, 1], "#6b4426", 0.9); gline([0.2, 0.1, 5], [0.55, 0.1, 1], "#6b4426", 0.9);
}, { size: 70 });
ART.add("prop.pots", () => {
  for (const [x, y, s, c] of [[0, 0, 1, "#a0532c"], [0.08, 0.06, 0.8, "#8a4a2a"], [-0.06, 0.08, 0.7, "#b8683a"]]) clayPot(x, y, s, c);
}, { size: 40 });
ART.add("prop.haystack", () => { blob(0, 0, 9, 4, "rgba(20,15,5,0.3)"); haystack(0, 0, 0.9); }, { size: 60 });
ART.add("prop.fence", () => {
  for (let i = 0; i < 4; i++) post(-0.3 + i * 0.2, 0, 0.015, 0, 7, M.timber, 6);
  gline([-0.32, 0, 5], [0.32, 0, 5], "#8a6a40", 0.7); gline([-0.32, 0, 2.5], [0.32, 0, 2.5], "#8a6a40", 0.7);
}, { size: 50, blur: 0.8 });
ART.add("prop.woodpile", () => logPile(0, -0.1, 3), { size: 40 });
ART.add("prop.stones", () => { box(-0.1, -0.08, 0, 0.2, 0.14, 3, M.granite); box(0.08, 0.02, 0, 0.14, 0.12, 2.4, M.granite); box(-0.05, -0.05, 3, 0.12, 0.1, 2.2, M.granite); }, { size: 40 });

// Cattle and water buffalo: graze (frames g0,g1) and walk (w0..w3), side view facing right.
function bovine(c, o, pose) {
  const ph = pose.ph || 0, sw = pose.walk ? Math.sin(ph) : 0;
  const head = pose.graze ? 1 : 0;
  c.fillStyle = "rgba(0,0,0,0.28)"; c.beginPath(); c.ellipse(0, 0.3, 8, 2.4, 0, 0, 7); c.fill();
  const leg = (x, d, far) => { c.strokeStyle = css(shadeC(o.col, far ? 0.6 : 0.85)); c.lineWidth = 1.3; c.lineCap = "round"; c.beginPath(); c.moveTo(x, -6); c.lineTo(x + d, -0.5); c.stroke(); };
  leg(-4.5, -sw * 1.5, true); leg(4, sw * 1.5, true);
  const gr = c.createLinearGradient(0, -12, 0, -4); gr.addColorStop(0, css(shadeC(o.col, 1.2))); gr.addColorStop(1, css(shadeC(o.col, 0.7)));
  c.fillStyle = gr; c.beginPath(); c.ellipse(0, -8, 7, 3.6, 0, 0, 7); c.fill();
  if (o.hump) { c.beginPath(); c.ellipse(3.4, -11.2, 2, 1.6, 0, 0, 7); c.fill(); }
  // head
  const hx = 7.5, hy = head ? -3.5 : -9.5;
  c.strokeStyle = css(shadeC(o.col, 0.9)); c.lineWidth = 2.6; c.beginPath(); c.moveTo(5, -9); c.lineTo(hx, hy); c.stroke();
  c.fillStyle = css(shadeC(o.col, 0.95)); c.beginPath(); c.ellipse(hx + 1, hy + 0.3, 2.2, 1.4, head ? 1.1 : 0.4, 0, 7); c.fill();
  c.strokeStyle = o.horn; c.lineWidth = 0.7;
  if (o.sweep) { c.beginPath(); c.moveTo(hx, hy - 1); c.quadraticCurveTo(hx - 4, hy - 2, hx - 3, hy - 4); c.stroke(); }
  else { c.beginPath(); c.moveTo(hx + 0.3, hy - 1); c.lineTo(hx + 0.8, hy - 3); c.stroke(); }
  c.strokeStyle = css(shadeC(o.col, 0.7)); c.lineWidth = 0.6; c.beginPath(); c.moveTo(-6.8, -9); c.quadraticCurveTo(-8, -6, -7.4, -4 + sw); c.stroke();
  leg(-3.5, sw * 1.5, false); leg(5, -sw * 1.5, false);
}
const BOVINES = { cow: { col: "#c9b8a0", horn: "#e8e0cc", hump: true }, buffalo: { col: "#3f3c3a", horn: "#6a6460", sweep: true } };
for (const [k, o] of Object.entries(BOVINES)) {
  for (let i = 0; i < 4; i++) ART.add(`animal.${k}.w${i}`, () => { if (!MODE.shadow) bovine(g, o, { walk: true, ph: (i / 4) * Math.PI * 2 }); }, { k: 4, size: 40, shadow: false });
  ART.add(`animal.${k}.g0`, () => { if (!MODE.shadow) bovine(g, o, { graze: true }); }, { k: 4, size: 40, shadow: false });
  ART.add(`animal.${k}.i0`, () => { if (!MODE.shadow) bovine(g, o, {}); }, { k: 4, size: 40, shadow: false });
}
// Egret: standing, pecking, flying (2 frames).
function egret(c, mode, f) {
  if (mode !== "fly") { c.fillStyle = "rgba(0,0,0,0.2)"; c.beginPath(); c.ellipse(0, 0.2, 2.2, 0.8, 0, 0, 7); c.fill(); }
  c.strokeStyle = "#3a3a2a"; c.lineWidth = 0.4;
  if (mode !== "fly") { c.beginPath(); c.moveTo(-0.4, 0); c.lineTo(0, -3.6); c.moveTo(0.6, 0); c.lineTo(0.3, -3.6); c.stroke(); }
  c.fillStyle = "#f6f4ee";
  const by = mode === "fly" ? -1 : -5;
  c.beginPath(); c.ellipse(0, by, 2.6, 1.3, -0.25, 0, 7); c.fill();
  if (mode === "peck") { c.strokeStyle = "#f6f4ee"; c.lineWidth = 0.9; c.beginPath(); c.moveTo(1.8, by - 0.3); c.quadraticCurveTo(3.4, by + 1, 3.2, by + 3); c.stroke(); c.strokeStyle = "#e0b030"; c.lineWidth = 0.5; c.beginPath(); c.moveTo(3.2, by + 3); c.lineTo(3.4, by + 4.4); c.stroke(); }
  else { c.strokeStyle = "#f6f4ee"; c.lineWidth = 0.9; c.beginPath(); c.moveTo(1.8, by - 0.4); c.quadraticCurveTo(1.6, by - 3.5, 2.6, by - 4); c.stroke(); c.strokeStyle = "#e0b030"; c.lineWidth = 0.5; c.beginPath(); c.moveTo(2.6, by - 4); c.lineTo(4.4, by - 3.8); c.stroke(); }
  if (mode === "fly") { c.fillStyle = "#ffffff"; const w = f ? -3 : 2.5; c.beginPath(); c.moveTo(-1, by); c.quadraticCurveTo(-1.5, by + w - 1, -4, by + w); c.lineTo(1, by); c.fill(); c.fillStyle = "#e8e6de"; c.beginPath(); c.moveTo(0, by); c.quadraticCurveTo(0.5, by + w - 1, 2.5, by + w * 0.8); c.lineTo(1.2, by); c.fill(); }
}
for (const [k, m, f] of [["egret.s", "stand", 0], ["egret.p", "peck", 0], ["egret.f0", "fly", 0], ["egret.f1", "fly", 1]]) ART.add(`animal.${k}`, () => { if (!MODE.shadow) egret(g, m, f); }, { k: 4, size: 24, shadow: false });
