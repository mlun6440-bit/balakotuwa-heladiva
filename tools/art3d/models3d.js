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

// ---------- prototype unit: spearman in 8 directions ----------
// d = 0..7: facing angle d×45° measured from +gx toward +gy.
function spearman3d(g, d, pose) {
  const look = { skin: "#7d5032", upper: "#2d6fa8", lower: "#f2efe6", head: { kind: "turban", col: "#f2efe6" }, short: true, sash: "#e9b949", armour: "#c8a85a" };
  const f = figure(look, pose);
  const { root, arms, h } = f;
  // spear in the right hand, shield on the left arm
  const spear = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, h(26), 6), flat("#6b4a28"));
  shaft.position.y = h(4);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, h(4), 8), flat("#dfe3e6", { metalness: 0.6, roughness: 0.35 }));
  tip.position.y = h(19);
  spear.add(shaft, tip);
  spear.position.y = -h(6.4);
  spear.rotation.z = pose.act >= 0 ? -0.9 : -0.12;
  arms.R.add(spear);
  // round shield: painted rim and boss
  const shield = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.014, 24), flat("#b5892e", { roughness: 0.6 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.009, 6, 28), flat("#7c1d1d", { roughness: 0.6 }));
  rim.rotation.x = Math.PI / 2;
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), flat("#e9b949", { metalness: 0.6, roughness: 0.35 }));
  boss.position.y = 0.01;
  shield.add(face, rim, boss);
  shield.rotation.x = -Math.PI / 2;
  shield.position.set(0.03, -h(4.2), -0.035);
  arms.L.add(shield);
  root.rotation.y = -d * Math.PI / 4;
  // contact shadow under the feet
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.002; blob.scale.set(1.2, 0.8, 1);
  g.add(blob, root);
}
for (let d = 0; d < 8; d++) {
  for (let i = 0; i < 8; i++) ART3D(`u3d.spearman.d${d}.w${i}`, g => spearman3d(g, d, { walk: true, ph: (i / 8) * Math.PI * 2, act: -1 }), { k: 4, size: 50, shadow: false, reach: 1 });
  ART3D(`u3d.spearman.d${d}.i0`, g => spearman3d(g, d, { walk: false, ph: 0, act: -1 }), { k: 4, size: 50, shadow: false, reach: 1 });
  for (let i = 0; i < 3; i++) ART3D(`u3d.spearman.d${d}.a${i}`, g => spearman3d(g, d, { walk: false, ph: 0, act: (i + 0.5) / 3 }), { k: 4, size: 50, shadow: false, reach: 1 });
}
window.ART3D_READY = true;
