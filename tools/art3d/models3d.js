// 3D models, rendered by kit3d.js into ordinary atlas sprites.
// ART3D(key, build, opts): build(group) adds meshes in tile units (origin =
// footprint top corner for buildings, ground point for units).
import { THREE, Hpx, render3d, material, flat, box, cyl, hipRoof, figure } from "./kit3d.js";

function ART3D(key, build, opts = {}) {
  ART.add(key, null, { ...opts, render3d: p => render3d(build, { ...p, reach: opts.reach || 3 }) });
}

// ---------- prototype building: a Kandyan village house ----------
function house3d(g, v) {
  const plinth = material(M.laterite, 64, 12), floor = material(M.earth, 32, 32);
  const wall = material([M.ochre, M.white, M.mud][v], 48, 48);
  const roof = material([M.thatch, M.cadjan, M.thatchOld][v], 64, 64);
  const timber = material(M.timber, 16, 64), door = flat("#2a1a0e");
  box(g, 0.06, 0.06, 0.88, 0.88, 0, 2.2, [plinth, plinth, floor, floor, plinth, plinth]);
  const [w, d] = [[0.72, 0.56], [0.74, 0.58], [0.56, 0.72]][v];
  const x = 0.5 - w / 2, z = 0.5 - d / 2;
  box(g, x, z, w, d, 2.2, 13, wall);
  // door on the +Z face (toward the viewer's lower left), window on +X
  box(g, x + w * 0.42, z + d - 0.005, 0.15, 0.02, 2.2, 9.5, door);
  box(g, x + w * 0.38, z + d - 0.008, 0.23, 0.025, 11.7, 1.2, timber);
  box(g, x + w - 0.005, z + d * 0.4, 0.02, 0.12, 6.5, 4.5, flat("#20140a"));
  // posts of a front veranda
  for (const px of [0.1, 0.9]) cyl(g, px, 0.9, 0.02, 0.018, 2.2, 13, timber, 8);
  // thatched hipped roof with a deep overhang, and its eave thickness
  hipRoof(g, x - 0.17, z - 0.17, w + 0.34, d + 0.34, 15.2, 16, roof);
  const eave = new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, Hpx(1.6), d + 0.34), material(M.thatchOld, 64, 8));
  eave.position.set(0.5, Hpx(15.2 - 0.8), 0.5);
  g.add(eave);
  // clay pots by the door
  for (const [px, pz, sc] of [[0.84, 0.95, 1], [0.92, 0.86, 0.8]]) {
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.045 * sc, 14, 10), flat("#a0532c", { roughness: 0.7 }));
    pot.position.set(px, Hpx(2.6 * sc), pz); pot.scale.y = 1.1; g.add(pot);
  }
}
// Not baked: the 2D kit's buildings (planar faces lit by their normals, ridge
// caps, outlines) looked better than this plain 3D render in the R10 comparison.
// Kept as a reference for 3D buildings with curved parts.
// for (let v = 0; v < 3; v++) ART3D(`house3d.${v}`, g => house3d(g, v), { size: 140, k: 3, reach: 2 });

// ---------- units in 8 directions ----------
// d = 0..7: facing angle d×45° measured from +gx toward +gy.
const metal = () => flat("#dfe3e6", { metalness: 0.6, roughness: 0.35 });
const GEAR = {
  spear(f, pose) {
    const sp = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, f.h(26), 6), flat("#6b4a28"));
    shaft.position.y = f.h(4);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, f.h(4), 8), metal());
    tip.position.y = f.h(19);
    sp.add(shaft, tip);
    sp.position.y = -f.h(6.4);
    sp.rotation.z = pose.act >= 0 ? -0.9 : -0.12;
    f.arms.R.add(sp);
  },
  sword(f, pose) {
    const sw = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, f.h(8), 0.004), metal());
    blade.position.y = f.h(4.5);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.04, f.h(0.5), 0.012), flat("#c9a24a", { metalness: 0.5, roughness: 0.4 }));
    sw.add(blade, guard);
    sw.position.y = -f.h(6.4);
    sw.rotation.z = pose.act >= 0 ? -0.3 : -0.9;
    f.arms.R.add(sw);
  },
  shield(f, pose, col = "#b5892e", rimCol = "#7c1d1d", r = 0.085) {
    const sh = new THREE.Group();
    const face = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.014, 24), flat(col, { roughness: 0.6 }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.009, 6, 28), flat(rimCol, { roughness: 0.55, metalness: 0.2 }));
    rim.rotation.x = Math.PI / 2;
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), flat("#e9b949", { metalness: 0.6, roughness: 0.35 }));
    boss.position.y = 0.01;
    sh.add(face, rim, boss);
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(0.03, -f.h(4.2), -0.035);
    f.arms.L.add(sh);
  },
  bow(f, pose) {
    const bow = new THREE.Group();
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.006, 6, 24, Math.PI * 0.9), flat("#5a3418"));
    arc.rotation.z = Math.PI / 2 - Math.PI * 0.45;
    const drawn = pose.act >= 0 && pose.act < 0.67;
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.21, 4), flat("#efe6c8"));
    string.position.x = drawn ? -0.06 : -0.01;
    bow.add(arc, string);
    if (drawn) { const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 4), flat("#d9c9a0")); arrow.rotation.z = Math.PI / 2; arrow.position.x = 0.03; bow.add(arrow); }
    bow.rotation.y = Math.PI / 2;
    bow.position.y = -f.h(6.6);
    f.arms.L.add(bow);
  },
  quiver(f) {
    const q = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, f.h(7), 8), flat("#6b3a1e"));
    q.position.set(-0.06, f.h(13), 0.02);
    q.rotation.x = 0.35;
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, f.h(1.5), 8), flat("#e8e0c8"));
    fl.position.set(-0.06, f.h(16.8), 0.035);
    f.body.add(q, fl);
  },
  ram(f, pose) {
    // a heavy iron-capped log carried forward under the arm
    const jolt = pose.act >= 0 ? Math.sin(pose.act * Math.PI) * 0.12 : 0;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.62, 10), flat("#7a5530"));
    log.rotation.z = Math.PI / 2;
    log.position.set(0.12 + jolt, f.h(9.5), 0.06);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 10), flat("#3a3a3e", { metalness: 0.6, roughness: 0.4 }));
    cap.rotation.z = Math.PI / 2;
    cap.position.set(0.44 + jolt, f.h(9.5), 0.06);
    f.body.add(log, cap);
    // both hands down on the log
    f.arms.R.rotation.z = 0.5 + jolt; f.arms.L.rotation.z = 0.5 + jolt;
  },
  hood(f, col) {
    // open at the front (+X) so the face shows
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05 * f.s, 14, 10, Math.PI * 1.3, Math.PI * 1.4, 0, Math.PI * 0.62), flat(col, { side: THREE.DoubleSide }));
    hd.position.y = f.h(17.4);
    f.body.add(hd);
  },
  konde(f, col) {
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.022 * f.s, 10, 8), flat("#1a120c"));
    knot.position.set(-0.02, f.h(20.2), 0);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.041 * f.s, 0.007, 6, 16), flat(col));
    band.rotation.x = Math.PI / 2; band.position.y = f.h(18.4);
    f.body.add(knot, band);
  },
  beard(f, col) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.026 * f.s, 10, 8), flat(col));
    b.position.set(0.028 * f.s, f.h(16), 0); b.scale.set(0.8, 1, 1.2);
    f.body.add(b);
  },
  plume(f, col) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.012, f.h(4), 6), flat(col));
    p.position.y = f.h(21.5); p.rotation.z = 0.4;
    f.body.add(p);
  }
};

const UNITS3D = {
  spearman: { look: { skin: "#7d5032", upper: "#2d6fa8", lower: "#f2efe6", head: { kind: "turban", col: "#f2efe6" }, short: true, sash: "#e9b949", armour: "#c8a85a" },
    gear: (f, p) => { GEAR.spear(f, p); GEAR.shield(f, p); } },
  archer: { look: { skin: "#7d5032", upper: "#2f8f4e", lower: "#f2efe6", head: { kind: "turban", col: "#2f8f4e" }, short: true, sash: "#e9b949" }, act: "shoot",
    gear: (f, p) => { GEAR.bow(f, p); GEAR.quiver(f); } },
  angampora: { look: { skin: "#7d5032", bare: true, lower: "#d2902a", head: { kind: "none" }, short: true, sash: "#a8321e" },
    gear: (f, p) => { GEAR.sword(f, p); GEAR.konde(f, "#a8321e"); } },
  raider: { look: { skin: "#b38660", upper: "#4a2a2a", lower: "#2a2a2a", head: { kind: "helm", col: "#4d4944" }, short: true, boots: "#2a1d12", armour: "#77777c" },
    gear: (f, p) => { GEAR.sword(f, p); GEAR.shield(f, p, "#3a1d1d", "#8a8a8a", 0.075); GEAR.beard(f, "#3a2414"); GEAR.plume(f, "#7a1d1d"); } },
  bowman: { look: { skin: "#b38660", upper: "#3b3226", lower: "#2a2a2a", head: { kind: "none" }, short: true, boots: "#2a1d12" }, act: "shoot",
    gear: (f, p) => { GEAR.bow(f, p); GEAR.quiver(f); GEAR.hood(f, "#2f2a22"); GEAR.beard(f, "#3a2414"); } },
  brute: { look: { skin: "#b38660", bare: true, lower: "#3a1414", head: { kind: "helm", col: "#3a3632" }, short: true, scale: 1.3, boots: "#2a1d12", sash: "#7a1d1d" },
    gear: (f, p) => { GEAR.ram(f, p); GEAR.beard(f, "#2a1a10"); } }
};

const BLOB = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
BLOB.userData.cached = true;
function unit3d(g, type, d, pose) {
  const U = UNITS3D[type];
  const f = figure(U.look, { ...pose, actKind: pose.act >= 0 ? U.act : undefined });
  U.gear(f, pose);
  f.root.rotation.y = -d * Math.PI / 4;
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.09 * (U.look.scale || 1), 20), BLOB);
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.002; blob.scale.set(1.2, 0.8, 1);
  g.add(blob, f.root);
}
for (const type of Object.keys(UNITS3D)) for (let d = 0; d < 8; d++) {
  const o = { k: 4, size: type === "brute" ? 72 : 60, shadow: false, reach: 1 };
  for (let i = 0; i < 8; i++) ART3D(`u3d.${type}.d${d}.w${i}`, g => unit3d(g, type, d, { walk: true, ph: (i / 8) * Math.PI * 2, act: -1 }), o);
  ART3D(`u3d.${type}.d${d}.i0`, g => unit3d(g, type, d, { walk: false, ph: 0, act: -1 }), o);
  for (let i = 0; i < 3; i++) ART3D(`u3d.${type}.d${d}.a${i}`, g => unit3d(g, type, d, { walk: false, ph: 0, act: (i + 0.5) / 3 }), o);
}
// ---------- villagers: six jobs, tools, and carried loads ----------
const TOOL = {
  hoe(f, p) { const t = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, f.h(12), 6), flat("#8a6a40")); sh.position.y = f.h(1); const bl = new THREE.Mesh(new THREE.BoxGeometry(0.05, f.h(0.6), 0.03), metal()); bl.position.set(0.02, f.h(7), 0); t.add(sh, bl); t.position.y = -f.h(6.4); t.rotation.z = p.act >= 0 ? -0.4 : -0.5; f.arms.R.add(t); },
  axe(f, p) { const t = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, f.h(9), 6), flat("#7a5530")); sh.position.y = f.h(2.5); const hd = new THREE.Mesh(new THREE.BoxGeometry(0.035, f.h(2.2), 0.008), metal()); hd.position.set(0.02, f.h(6.4), 0); t.add(sh, hd); t.position.y = -f.h(6.4); t.rotation.z = p.act >= 0 ? -0.3 : -1.0; f.arms.R.add(t); },
  hammer(f, p) { const t = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, f.h(6), 6), flat("#7a5530")); sh.position.y = f.h(1.8); const hd = new THREE.Mesh(new THREE.BoxGeometry(0.02, f.h(1.5), 0.035), flat("#8a8e92", { metalness: 0.5, roughness: 0.45 })); hd.position.y = f.h(4.6); t.add(sh, hd); t.position.y = -f.h(6.4); t.rotation.z = p.act >= 0 ? -0.3 : -1.0; f.arms.R.add(t); },
  scales(f) { const t = new THREE.Group(); const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.09, 4), flat("#c9a24a", { metalness: 0.5 })); beam.rotation.x = Math.PI / 2; for (const zz of [-0.045, 0.045]) { const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 0.004, 10), flat("#c9a24a", { metalness: 0.5 })); pan.position.set(0, -f.h(2), zz); t.add(pan); } t.add(beam); t.position.y = -f.h(6.6); f.arms.R.add(t); f.arms.R.rotation.z = 0.9; },
  bowl(f, p) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), flat("#1e1a18", { roughness: 0.4, side: THREE.DoubleSide })); b.position.y = -f.h(6.8); f.arms.R.add(b); f.arms.R.rotation.z = p.act >= 0 ? 1.1 : 0.8; },
  talapata(f) { const t = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, f.h(13), 5), flat("#6b4426")); st.position.y = f.h(4); const fan = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16, 0, Math.PI), flat("#d8c48a", { side: THREE.DoubleSide })); fan.position.y = f.h(10); fan.rotation.y = Math.PI / 2; t.add(st, fan); t.position.y = -f.h(6.4); t.rotation.z = 0.5; f.arms.L.add(t); }
};
const LOAD = {
  rice(f) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, f.h(2.4), 12), flat("#c9a86a")); b.position.y = f.h(21.2); const r = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), flat("#efe2b0")); r.position.y = f.h(22.3); f.body.add(b, r); },
  stone(f) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, f.h(2), 12), flat("#8a6a3a")); b.position.y = f.h(21); f.body.add(b); for (const [x, z] of [[0.01, 0.01], [-0.015, -0.01], [0.012, -0.02]]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.024, f.h(1.5), 0.02), flat("#b8b2a6")); st.position.set(x, f.h(22.4), z); f.body.add(st); } },
  water(f) { const pot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), flat("#b05a32", { roughness: 0.7 })); pot.position.y = f.h(22); pot.scale.y = 0.85; const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, f.h(1.6), 10), flat("#8a4422")); neck.position.y = f.h(24.3); f.body.add(pot, neck); },
  timber(f) { for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 8), flat(i % 2 ? "#8c5828" : "#7a4c22")); l.rotation.z = Math.PI / 2 - 0.12; l.position.set(-0.02, f.h(15.6 + i * 1.3), 0.05 - i * 0.012); f.body.add(l); } },
  arms(f) { for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.32, 5), flat("#7a5530")); sp.rotation.z = Math.PI / 2 - 0.55; sp.position.set(-0.01, f.h(15 + i * 0.6), 0.05 - i * 0.01); f.body.add(sp); } }
};
const VILLAGERS = {
  farmer: { look: { skin: "#8a5a36", upper: "#f2efe6", lower: "#3d6fa8", head: { kind: "turban", col: "#f4f1e8" } }, tool: f => TOOL.hoe, loads: ["rice", "water", "stone"] },
  woodcutter: { look: { skin: "#8a5a36", bare: true, lower: "#a8321e", head: { kind: "none" }, short: true, sash: "#e9b949" }, tool: () => TOOL.axe, loads: ["timber"] },
  mason: { look: { skin: "#8a5a36", upper: "#e8e0d0", lower: "#6b4a2a", head: { kind: "turban", col: "#c9b48a" }, short: true }, tool: () => TOOL.hammer, loads: ["stone"] },
  trader: { look: { skin: "#8a5a36", upper: "#e9b949", lower: "#f2efe6", head: { kind: "turban", col: "#a8321e" }, sleeves: true, sash: "#a8321e" }, tool: () => TOOL.scales, loads: [] },
  monk: { look: { skin: "#8a5a36", upper: "#d9822b", lower: "#d9822b", head: { kind: "shaved" }, sleeves: true, sash: "#b8641c" }, tool: () => TOOL.bowl, extra: TOOL.talapata, loads: [] },
  smith: { look: { skin: "#8a5a36", bare: true, lower: "#3a3028", head: { kind: "turban", col: "#8a6a4a" }, short: true, sash: "#5a3a22" }, tool: () => TOOL.hammer, loads: ["timber", "arms"], beard: "#2a1a10" }
};
function villager3d(g, job, d, pose, load) {
  const V = VILLAGERS[job];
  const f = figure(V.look, pose);
  if (!(load && (load === "timber" || load === "arms"))) V.tool()(f, pose); // logs and spears are carried two-handed on the shoulder
  if (V.extra) V.extra(f, pose);
  if (V.beard) GEAR.beard(f, V.beard);
  if (load) LOAD[load](f);
  if (load && load !== "timber" && load !== "arms") { f.arms.R.rotation.z = 2.55; f.arms.R.rotation.x = -0.35; } // a hand steadying the load on the head
  f.root.rotation.y = -d * Math.PI / 4;
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.085, 20), BLOB);
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.002; blob.scale.set(1.2, 0.8, 1);
  g.add(blob, f.root);
}
for (const job of Object.keys(VILLAGERS)) for (let d = 0; d < 8; d++) {
  const o = { k: 4, size: 60, shadow: false, reach: 1 };
  for (let i = 0; i < 8; i++) ART3D(`u3d.v.${job}.d${d}.w${i}`, g => villager3d(g, job, d, { walk: true, ph: (i / 8) * Math.PI * 2, act: -1 }), o);
  ART3D(`u3d.v.${job}.d${d}.i0`, g => villager3d(g, job, d, { walk: false, ph: 0, act: -1 }), o);
  for (let i = 0; i < 3; i++) ART3D(`u3d.v.${job}.d${d}.a${i}`, g => villager3d(g, job, d, { walk: false, ph: 0, act: (i + 0.5) / 3 }), o);
  for (const load of VILLAGERS[job].loads) for (let i = 0; i < 8; i++) ART3D(`u3d.v.${job}+${load}.d${d}.w${i}`, g => villager3d(g, job, d, { walk: true, ph: (i / 8) * Math.PI * 2, act: -1 }, load), o);
}
window.ART3D_READY = true;
