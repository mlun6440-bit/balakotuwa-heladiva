"use strict";
// People and animals. Origin = the ground point between the feet. Drawn
// facing screen-right ("f" = towards the viewer, "b" = away); render.js
// mirrors for the other two directions. Frames: w0..w5 walk, i0 idle,
// a0..a2 action (work swing or attack).

const SKIN = { soldier: "#7d5032", raider: "#b38660" };
const WALK = 6, ACT = 3;

function shadeFill(c, x0, x1, col, f = 1) {
  const gr = c.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, css(lit(col, 1.08 * f))); gr.addColorStop(0.55, css(lit(col, 0.92 * f))); gr.addColorStop(1, css(lit(col, 0.62 * f)));
  return gr;
}
function limb(c, x0, y0, x1, y1, w, col) {
  c.lineCap = "round";
  c.strokeStyle = css(lit(col, 0.7)); c.lineWidth = w;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = css(lit(col, 1.05)); c.lineWidth = w * 0.45;
  c.beginPath(); c.moveTo(x0 - w * 0.15, y0); c.lineTo(x1 - w * 0.15, y1); c.stroke();
}

// o: { skin, upper, lower, sash, head:{kind,col}, short (knee-length cloth), bare (bare chest), scale,
//      item(c, hand, pose, o), offItem(c, hand, pose, o), shield }
// pose: { ph (walk phase radians), walk (bool), act (-1 or 0..1), back (bool), actKind }
function person(c, o, pose) {
  const s = o.scale || 1;
  c.save(); c.scale(s, s);
  const ph = pose.walk ? pose.ph : 0;
  const sw = Math.sin(ph), bob = pose.walk ? -Math.abs(Math.cos(ph)) * 0.7 : 0;
  const back = pose.back;
  // feet swing along the walking direction (screen down-right for f, up-right for b)
  const dirY = back ? -0.45 : 0.45;
  const legA = { x: sw * 2.3, y: sw * 2.3 * dirY }, legB = { x: -sw * 2.3, y: -sw * 2.3 * dirY };
  const hipY = -8 + bob, shY = -14.8 + bob, headY = -17.6 + bob;
  const act = pose.act;
  // body lean when working
  const lean = act >= 0 && pose.actKind === "work" ? Math.sin(act * Math.PI) * 1.5 : 0;

  // contact shadow
  c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.ellipse(0.5, 0.3, 4.4, 1.7, 0, 0, Math.PI * 2); c.fill();

  const handR = { x: 3.4 + lean - sw * 1.6, y: -8.6 + bob }, handL = { x: -3.2 + lean + sw * 1.6, y: -8.8 + bob };
  if (act >= 0) {
    if (pose.actKind === "work" || pose.actKind === "melee") {
      const a = act < 0.5 ? -2.4 + act * 1.2 : -1.8 + (act - 0.5) * 4.6; // raise then strike
      handR.x = 2.5 + lean + Math.cos(a) * 5; handR.y = shY + 1 + Math.sin(a) * 5;
    } else if (pose.actKind === "shoot") {
      handL.x = 6.5; handL.y = shY + 2.2; handR.x = 1.5 - act * 2.5; handR.y = shY + 2.2;
    }
  }

  // back-side item (drawn behind the body)
  if (back && o.item) o.item(c, handR, pose, o, true);
  if (!back && o.offItem) o.offItem(c, handL, pose, o, false);
  if (back && o.quiver) o.quiver(c, { x: 0, y: shY }, true);

  // legs (far leg first)
  const legCol = o.skin;
  const far = sw > 0 ? legB : legA, near = sw > 0 ? legA : legB;
  for (const L of [far, near]) {
    const knee = { x: L.x * 0.5 + 0.2, y: hipY * 0.5 + L.y * 0.5 - (pose.walk ? 0.3 : 0) };
    const hip = { x: L === legA ? 0.9 : -0.9, y: hipY };
    limb(c, hip.x + lean * 0.5, hip.y, knee.x, knee.y, 1.9, legCol);
    limb(c, knee.x, knee.y, L.x + (L === legA ? 0.8 : -0.6), L.y - 0.3, 1.6, legCol);
    c.fillStyle = css(shadeC(legCol, 0.7)); c.beginPath(); c.ellipse(L.x + (L === legA ? 1.2 : -0.2), L.y - 0.1, 1.2, 0.55, 0, 0, 7); c.fill();
    if (o.boots) { c.fillStyle = o.boots; c.fillRect(L.x - 0.6 + (L === legA ? 0.8 : -0.6), L.y - 2.2, 1.6, 2); }
  }

  // lower garment (sarong / cloth)
  const hemY = o.short ? -4.6 + bob : -1.6 + bob;
  const flare = pose.walk ? Math.abs(sw) * 0.8 : 0;
  c.fillStyle = shadeFill(c, -3.3, 3.5, o.lower);
  c.beginPath();
  c.moveTo(-2.9 + lean * 0.5, hipY - 1.6); c.lineTo(2.9 + lean * 0.5, hipY - 1.6);
  c.lineTo(3.3 + flare, hemY); c.quadraticCurveTo(0, hemY + 0.8, -3.3 - flare, hemY); c.closePath(); c.fill();
  // folds and pattern
  c.strokeStyle = css(shadeC(o.lower, 0.7), 0.6); c.lineWidth = 0.3;
  for (const fx of [-1.4, 0.4, 2]) { c.beginPath(); c.moveTo(fx * 0.8 + lean * 0.5, hipY - 1); c.lineTo(fx + flare * Math.sign(fx), hemY); c.stroke(); }
  if (o.lowerBand) { c.strokeStyle = o.lowerBand; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-3.2 - flare, hemY - 0.6); c.quadraticCurveTo(0, hemY + 0.2, 3.2 + flare, hemY - 0.6); c.stroke(); }

  // torso
  const tx = lean;
  c.fillStyle = shadeFill(c, -3.2 + tx, 3.4 + tx, o.bare ? o.skin : o.upper);
  c.beginPath();
  c.moveTo(-2.7 + tx, hipY - 1.4); c.lineTo(2.7 + tx, hipY - 1.4);
  c.lineTo(3.3 + tx, shY + 0.6); c.quadraticCurveTo(0 + tx, shY - 0.9, -3.3 + tx, shY + 0.6);
  c.closePath(); c.fill();
  if (o.bare) { // chest shading
    c.fillStyle = "rgba(60,30,10,0.25)"; c.fillRect(-0.2 + tx, shY + 2.2, 0.4, 3);
  }
  if (o.vest) { c.fillStyle = shadeFill(c, -3 + tx, 3 + tx, o.vest); c.fillRect(-2.6 + tx, shY + 0.6, 5.2, 4.8); }
  if (o.sash) { c.strokeStyle = o.sash; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-2.8 + tx, hipY - 1.6); c.lineTo(2.8 + tx, hipY - 1.6); c.stroke(); c.lineWidth = 0.8; c.beginPath(); c.moveTo(-2.4 + tx, shY + 0.8); c.lineTo(2.4 + tx, hipY - 2); c.stroke(); }
  if (o.armour) { c.fillStyle = o.armour; for (let i = 0; i < 3; i++) c.fillRect(-2.6 + tx, shY + 1.4 + i * 1.6, 5.4, 1.1); c.fillStyle = "rgba(255,255,255,0.25)"; for (let i = 0; i < 3; i++) c.fillRect(-2.4 + tx, shY + 1.4 + i * 1.6, 2, 0.4); }

  // arms
  const shL = { x: -2.9 + tx, y: shY + 0.9 }, shR = { x: 2.9 + tx, y: shY + 0.9 };
  const armCol = o.sleeves && !o.bare ? o.upper : o.skin;
  limb(c, shL.x, shL.y, (shL.x + handL.x) / 2 - 0.4, (shL.y + handL.y) / 2, 1.5, armCol);
  limb(c, (shL.x + handL.x) / 2 - 0.4, (shL.y + handL.y) / 2, handL.x, handL.y, 1.3, o.skin);
  // head
  const hx = tx + (back ? 0 : 0.5);
  c.fillStyle = shadeFill(c, hx - 2.6, hx + 2.6, o.skin);
  c.beginPath(); c.ellipse(hx, headY, 2.4, 2.7, 0, 0, Math.PI * 2); c.fill();
  c.fillRect(hx - 0.8, headY + 2, 1.6, 1.4);
  if (!back) {
    c.fillStyle = "#1a100a"; c.fillRect(hx + 0.8, headY - 0.5, 0.6, 0.6); c.fillRect(hx - 0.6, headY - 0.5, 0.5, 0.6);
    if (o.beard) { c.fillStyle = o.beard; c.beginPath(); c.ellipse(hx + 0.4, headY + 1.6, 1.8, 1.3, 0, 0, Math.PI); c.fill(); }
    if (o.paint) { c.fillStyle = o.paint; c.fillRect(hx - 1.6, headY - 1.4, 3.8, 0.6); }
  }
  const H = o.head || {};
  if (H.kind === "turban") {
    c.fillStyle = shadeFill(c, hx - 2.8, hx + 2.8, H.col || "#f2efe6");
    c.beginPath(); c.ellipse(hx, headY - 1.7, 2.8, 1.9, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = css(shadeC(H.col || "#f2efe6", 0.7)); c.lineWidth = 0.3;
    c.beginPath(); c.ellipse(hx, headY - 1.4, 2.6, 1.2, -0.25, 0.2, 2.8); c.stroke();
  } else if (H.kind === "helm") {
    c.fillStyle = shadeFill(c, hx - 2.8, hx + 2.8, H.col || "#55504a");
    c.beginPath(); c.ellipse(hx, headY - 0.9, 2.8, 2.6, 0, Math.PI, 0); c.fill();
    c.fillRect(hx - 2.9, headY - 1, 5.8, 0.8);
    c.fillStyle = "rgba(255,255,255,0.4)"; c.fillRect(hx - 1.6, headY - 3, 0.7, 1.6);
    c.fillStyle = H.col || "#55504a"; c.fillRect(hx - 0.3, headY - 5.4, 0.6, 2);
    if (H.plume) { c.fillStyle = H.plume; c.beginPath(); c.ellipse(hx - 0.8, headY - 5.6, 1.6, 0.8, -0.4, 0, 7); c.fill(); }
  } else if (H.kind === "hood") {
    c.fillStyle = shadeFill(c, hx - 3, hx + 3, H.col);
    c.beginPath(); c.moveTo(hx - 3, headY + 2.4); c.quadraticCurveTo(hx - 3.2, headY - 3.6, hx + 0.4, headY - 3.4); c.quadraticCurveTo(hx + 3.2, headY - 3, hx + 2.8, headY + 2.4); c.lineTo(hx + 1.8, headY + 1); c.lineTo(hx + 1.8, headY - 1.2); c.lineTo(hx - 1, headY - 1.2); c.lineTo(hx - 1, headY + 1.5); c.closePath(); c.fill();
  } else if (H.kind === "shaved") { // monk: shaved head, faint stubble
    c.fillStyle = "rgba(60,40,25,0.22)"; c.beginPath(); c.ellipse(hx, headY - 1.0, 2.4, 1.7, 0, Math.PI, 0); c.fill();
    c.fillStyle = "rgba(255,230,200,0.25)"; c.beginPath(); c.ellipse(hx - 0.9, headY - 1.6, 0.8, 0.5, -0.4, 0, 7); c.fill();
  } else if (H.kind === "konde") { // hair knot with a cloth band (Angampora)
    c.fillStyle = "#1a120c"; c.beginPath(); c.ellipse(hx, headY - 1.2, 2.5, 1.8, 0, Math.PI, 0); c.fill();
    c.beginPath(); c.arc(hx - 1.2, headY - 3, 1.2, 0, 7); c.fill();
    c.fillStyle = H.col; c.fillRect(hx - 2.5, headY - 1.8, 5, 0.8);
  } else {
    c.fillStyle = "#1a120c"; c.beginPath(); c.ellipse(hx, headY - 1.0, 2.5, 1.9, 0, Math.PI * 1.02, Math.PI * 1.98); c.fill();
    if (back) { c.beginPath(); c.ellipse(hx, headY - 0.2, 2.4, 2.4, 0, 0, 7); c.fill(); }
  }
  if (back && H.kind === "turban") { c.fillStyle = shadeFill(c, hx - 2.8, hx + 2.8, H.col || "#f2efe6"); c.beginPath(); c.ellipse(hx, headY - 0.8, 2.6, 2.6, 0, 0, 7); c.fill(); }

  // near arm and held item
  if (!back && o.quiver) o.quiver(c, { x: tx, y: shY }, false);
  limb(c, shR.x, shR.y, (shR.x + handR.x) / 2 + 0.3, (shR.y + handR.y) / 2, 1.6, armCol);
  limb(c, (shR.x + handR.x) / 2 + 0.3, (shR.y + handR.y) / 2, handR.x, handR.y, 1.4, o.skin);
  if (!back && o.item) o.item(c, handR, pose, o, false);
  if (back && o.offItem) o.offItem(c, handL, pose, o, true);
  if (o.shield) {
    const sx = back ? 3.2 + tx : -3.4 + tx, sy = shY + 4.6;
    c.fillStyle = shadeFill(c, sx - 2.8, sx + 2.8, o.shield);
    c.beginPath(); c.ellipse(sx, sy, 2.6, 3.3, 0, 0, 7); c.fill();
    c.strokeStyle = o.shieldRim || "#e9b949"; c.lineWidth = 0.5; c.stroke();
    c.fillStyle = o.shieldRim || "#e9b949"; c.beginPath(); c.arc(sx, sy, 0.7, 0, 7); c.fill();
  }
  c.restore();
}

// ----- held items -----
const ITEMS = {
  sword(c, h, pose) {
    const a = pose.act >= 0 ? -2.2 + pose.act * 2.6 : -1.1;
    c.strokeStyle = "#e9eef0"; c.lineWidth = 1.1; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(h.x + Math.cos(a) * 8, h.y + Math.sin(a) * 8); c.stroke();
    c.strokeStyle = "#9aa3a8"; c.lineWidth = 0.35; c.beginPath(); c.moveTo(h.x + 0.3, h.y + 0.3); c.lineTo(h.x + Math.cos(a) * 7.6 + 0.3, h.y + Math.sin(a) * 7.6 + 0.3); c.stroke();
    c.fillStyle = "#c9a24a"; c.fillRect(h.x - 1, h.y - 0.5, 2, 1);
  }
};

// The mahout and the thrower crew are the only 2D figures left: soldiers,
// raiders and villagers are pre-rendered from 3D models (tools/art3d/models3d.js).
const CREW = { skin: SKIN.raider, upper: "#4a2a2a", lower: "#2a2a2a", head: { kind: "helm", col: "#4d4944", plume: "#7a1d1d" }, item: ITEMS.sword, shield: "#3a1d1d", shieldRim: "#8a8a8a", short: true, attack: "melee", boots: "#2a1d12", beard: "#3a2414", armour: "rgba(120,120,125,0.7)" };

// ----- war elephant (side view, mirrored at runtime) -----
function elephant(c, pose) {
  c.save(); c.scale(0.8, 0.8);
  const ph = pose.walk ? pose.ph : 0;
  const sw = Math.sin(ph);
  const bob = pose.walk ? -Math.abs(Math.cos(ph)) * 0.8 : 0;
  const act = pose.act;
  const rear = act >= 0 ? Math.sin(act * Math.PI) * 3 : 0;
  c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.ellipse(1, 0.5, 17, 5, 0, 0, 7); c.fill();
  const skin = "#6e6e74";
  const leg = (x, o, far) => {
    const col = far ? shadeC(skin, 0.72) : skin;
    c.fillStyle = shadeFill(c, x - 2.6, x + 2.6, col);
    c.beginPath(); c.moveTo(x - 2.4, -12 + bob); c.lineTo(x + 2.4, -12 + bob); c.lineTo(x + 2.2 + o, -0.6); c.lineTo(x - 2.2 + o, -0.6); c.closePath(); c.fill();
    c.fillStyle = "#e8e2d4"; for (let t = -1; t <= 1; t++) c.fillRect(x + o + t * 1.2 - 0.4, -1.2, 0.8, 0.6);
  };
  // far legs
  leg(-8, -sw * 2.4, true); leg(7, sw * 2.4, true);
  // body
  c.save(); c.translate(0, bob - rear * 0.3); c.rotate(-rear * 0.02);
  const gr = c.createRadialGradient(-5, -22, 3, 0, -16, 18);
  gr.addColorStop(0, "#9a9aa2"); gr.addColorStop(0.6, skin); gr.addColorStop(1, "#4a4a50");
  c.fillStyle = gr;
  c.beginPath(); c.ellipse(-1, -17, 14, 9.5, 0, 0, 7); c.fill();
  // skin wrinkles
  c.strokeStyle = "rgba(40,40,45,0.35)"; c.lineWidth = 0.35;
  for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(-10 + i * 2.6, -12, 5, -1.9, -1.2); c.stroke(); }
  // head
  c.fillStyle = gr; c.beginPath(); c.ellipse(12, -20, 6.5, 7, 0.2, 0, 7); c.fill();
  // ear
  c.fillStyle = shadeFill(c, 6, 13, "#7a7a82");
  c.beginPath(); c.ellipse(9.4, -19, 4, 5.6, -0.25, 0, 7); c.fill();
  c.strokeStyle = "rgba(40,40,45,0.4)"; c.stroke();
  // trunk
  const tr = act >= 0 ? -act * 8 : Math.sin(ph * 0.5) * 1.5;
  c.strokeStyle = "#626268"; c.lineWidth = 3.6; c.lineCap = "round";
  c.beginPath(); c.moveTo(17, -18); c.quadraticCurveTo(21, -9 + tr * 0.5, 19 + tr * 0.2, -2 + tr); c.stroke();
  c.strokeStyle = "rgba(255,255,255,0.15)"; c.lineWidth = 1; c.beginPath(); c.moveTo(16.4, -18); c.quadraticCurveTo(20, -9 + tr * 0.5, 18.4 + tr * 0.2, -2.5 + tr); c.stroke();
  for (let i = 0; i < 6; i++) { c.strokeStyle = "rgba(40,40,45,0.4)"; c.lineWidth = 0.3; const y = -15 + i * 2.2; c.beginPath(); c.moveTo(18.5, y + tr * i * 0.08); c.lineTo(20.5, y + 0.5 + tr * i * 0.08); c.stroke(); }
  // tusk with brass cap
  c.strokeStyle = "#f4efe2"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(16, -14); c.quadraticCurveTo(20, -12, 23, -15); c.stroke();
  c.fillStyle = "#c9a24a"; c.fillRect(21.8, -16.2, 1.6, 1.6);
  c.fillStyle = "#1a1a1a"; c.beginPath(); c.arc(14.2, -22, 0.6, 0, 7); c.fill();
  // caparison (headdress plate and body cloth)
  c.fillStyle = "#a8321e";
  c.beginPath(); c.moveTo(-11, -24); c.quadraticCurveTo(-1, -29, 8, -24); c.lineTo(9, -12); c.quadraticCurveTo(-1, -9, -12, -12); c.closePath(); c.fill();
  c.strokeStyle = "#e9b949"; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(-12, -12.5); c.quadraticCurveTo(-1, -9.5, 9, -12.5); c.stroke();
  for (let i = 0; i < 7; i++) { c.fillStyle = "#e9b949"; c.beginPath(); c.arc(-10 + i * 3, -11, 0.7, 0, 7); c.fill(); }
  c.fillStyle = "#e9b949"; c.beginPath(); c.moveTo(13, -27); c.lineTo(18, -24); c.lineTo(16, -15); c.lineTo(12, -18); c.closePath(); c.fill();
  c.fillStyle = "rgba(160,40,20,0.9)"; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(14.5 + i * 0.6, -24 + i * 3, 0.8, 0, 7); c.fill(); }
  // howdah
  c.fillStyle = shadeFill(c, -8, 6, "#6b4426"); c.fillRect(-8, -31, 13, 5);
  c.fillStyle = "#c9a24a"; c.fillRect(-8, -31.6, 13, 0.8);
  c.strokeStyle = "#4a2f18"; c.lineWidth = 0.7; for (const x of [-7.5, 4.5]) { c.beginPath(); c.moveTo(x, -31); c.lineTo(x, -38); c.stroke(); }
  c.fillStyle = "#7c1d1d"; c.beginPath(); c.moveTo(-9, -38); c.quadraticCurveTo(-1.5, -42, 6, -38); c.lineTo(-9, -38); c.fill();
  c.restore();
  // mahout on the neck
  c.save(); c.translate(9, -26 + bob); c.scale(0.7, 0.7);
  person(c, { skin: SKIN.soldier, upper: "#f2efe6", lower: "#a8321e", head: { kind: "turban", col: "#e9b949" } }, { walk: false, ph: 0, act: -1 });
  c.restore();
  // near legs
  leg(-6, sw * 2.4, false); leg(9, -sw * 2.4, false);
  c.restore();
}
for (let i = 0; i < WALK; i++) ART.add(`u.elephant.f.w${i}`, () => { if (!MODE.shadow) elephant(g, { walk: true, ph: (i / WALK) * Math.PI * 2, act: -1 }); }, { k: 4, size: 70, shadow: false });
ART.add("u.elephant.f.i0", () => { if (!MODE.shadow) elephant(g, { walk: false, ph: 0, act: -1 }); }, { k: 4, size: 70, shadow: false });
for (let i = 0; i < ACT; i++) ART.add(`u.elephant.f.a${i}`, () => { if (!MODE.shadow) elephant(g, { walk: false, ph: 0, act: (i + 0.5) / ACT }); }, { k: 4, size: 70, shadow: false });

// ----- raider stone thrower (side view, mirrored at runtime) -----
function thrower(c, pose) {
  const ph = pose.walk ? pose.ph : 0;
  const act = pose.act;
  c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.ellipse(0, 0.6, 16, 4.5, 0, 0, 7); c.fill();
  // crew pushing from behind
  c.save(); c.translate(-13, 0); c.scale(0.8, 0.8);
  person(c, CREW, { walk: pose.walk, ph: ph + 1, act: -1 });
  c.restore();
  const wood = "#7a5530", dark = "#4e3218";
  const wheel = (x, far) => {
    c.save(); c.translate(x, -3.6);
    c.strokeStyle = far ? dark : wood; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, 3.4, 0, 7); c.stroke();
    c.rotate(ph * 0.7);
    c.lineWidth = 0.6; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(i * 1.57) * 3.2, Math.sin(i * 1.57) * 3.2); c.stroke(); }
    c.restore();
  };
  wheel(-7, true); wheel(7, true);
  // base frame
  const gr = c.createLinearGradient(0, -9, 0, -5); gr.addColorStop(0, "#9a7046"); gr.addColorStop(1, dark);
  c.fillStyle = gr; c.fillRect(-11, -8.5, 22, 3);
  // A-frame uprights
  c.strokeStyle = wood; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(-6, -7); c.lineTo(0, -19); c.lineTo(6, -7); c.stroke();
  c.strokeStyle = dark; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-3.5, -12); c.lineTo(3.5, -12); c.stroke();
  // throwing arm: cocked back when idle, swings forward through the attack frames
  const ang = act >= 0 ? -2.6 + act * 2.3 : -2.6;
  const ax = Math.cos(ang), ay = Math.sin(ang);
  c.strokeStyle = "#8a6038"; c.lineWidth = 1.8; c.lineCap = "round";
  c.beginPath(); c.moveTo(-ax * 5, -19 - ay * 5); c.lineTo(ax * 15, -19 + ay * 15); c.stroke();
  // counterweight box
  c.fillStyle = "#5a5652"; c.fillRect(-ax * 5 - 2.4, -19 - ay * 5 - 1, 4.8, 4.2);
  // sling and stone
  const ex = ax * 15, ey = -19 + ay * 15;
  c.strokeStyle = "#c9b48a"; c.lineWidth = 0.5;
  const sx = ex + (act >= 0 ? 3 : -1), sy = ey + (act >= 0 ? -2 : 4);
  c.beginPath(); c.moveTo(ex, ey); c.lineTo(sx, sy); c.stroke();
  if (act < 0.6) { c.fillStyle = "#8f897c"; c.beginPath(); c.arc(sx, sy + 1.5, 1.8, 0, 7); c.fill(); }
  // pivot pin
  c.fillStyle = "#3a3a3e"; c.beginPath(); c.arc(0, -19, 0.9, 0, 7); c.fill();
  wheel(-6, false); wheel(8, false);
  // second crewman beside the wheel
  c.save(); c.translate(11, 1); c.scale(0.75, 0.75);
  person(c, CREW, { walk: pose.walk, ph, act: -1 });
  c.restore();
}
for (let i = 0; i < WALK; i++) ART.add(`u.thrower.f.w${i}`, () => { if (!MODE.shadow) thrower(g, { walk: true, ph: (i / WALK) * Math.PI * 2, act: -1 }); }, { k: 4, size: 70, shadow: false });
ART.add("u.thrower.f.i0", () => { if (!MODE.shadow) thrower(g, { walk: false, ph: 0, act: -1 }); }, { k: 4, size: 70, shadow: false });
for (let i = 0; i < ACT; i++) ART.add(`u.thrower.f.a${i}`, () => { if (!MODE.shadow) thrower(g, { walk: false, ph: 0, act: (i + 0.5) / ACT }); }, { k: 4, size: 70, shadow: false });
