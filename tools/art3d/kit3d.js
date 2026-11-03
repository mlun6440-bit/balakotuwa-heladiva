// ============================================================================
// BALAKOTUWA 3D art kit — models are built in three.js and rendered offline
// through an orthographic camera at the game's exact isometric angle, so the
// result is an ordinary sprite: same pixels per tile, same anchor convention
// as tools/art/kit.js. Textures are painted by the 2D material painters
// (tools/art/materials.js), so 3D models keep the hand-made look while gaining
// true lighting, self-shadowing and soft cast shadows.
//
// World axes: X = gx, Z = gy (the ground), Y = up. One grid tile = 1 unit.
// Heights are given in game pixels and converted with Hpx().
// ============================================================================
import * as THREE from "../node_modules/three/build/three.module.js";

export { THREE };
const ELEV = Math.PI / 6;                  // 30°: a tile edge projects to 32×16 px
const PX_PER_UNIT = 32 * Math.SQRT2;       // camera-space unit → screen px at zoom 1
export const Hpx = px => px / (PX_PER_UNIT * Math.cos(ELEV)); // game z px → world Y

let renderer = null;
function getRenderer(w, h) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
  }
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  return renderer;
}

// Light from the upper left of the screen, as in the 2D kit: lit left faces,
// shaded right faces, shadows falling to the right.
function lights(scene, reach) {
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x6f7a48, 1.15));
  const fill = new THREE.DirectionalLight(0xbfd2ff, 0.35);
  fill.position.set(6, 3, 2);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
  sun.position.set(-0.45 * 30, 0.77 * 30, 0.45 * 30);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const r = reach + 2;
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 80 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
}

// Render `build(group)` into a 2D canvas of SZ×SZ world px at scale k, with the
// local origin (0,0,0) at (SZ/2, SZ*oy). shadowOnly: only the cast shadow on
// the ground, as black alpha (for the baked "#sh" sprite).
export function render3d(build, { k, SZ, oy, reach = 3, shadowOnly = false }) {
  oy = oy ?? 0.5;
  const W = SZ * k;
  const r = getRenderer(W, W);
  const scene = new THREE.Scene();
  lights(scene, reach);
  const group = new THREE.Group();
  build(group);
  const hide = m => { const c = m.clone(); c.colorWrite = false; c.depthWrite = false; return c; };
  group.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = !o.material.transparent; o.receiveShadow = !shadowOnly;
    if (shadowOnly) o.material = Array.isArray(o.material) ? o.material.map(hide) : hide(o.material);
  });
  scene.add(group);
  if (shadowOnly) {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ color: 0x000000, opacity: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.001;
    ground.receiveShadow = true;
    scene.add(ground);
  }
  const u = 1 / PX_PER_UNIT;
  const cam = new THREE.OrthographicCamera(-SZ / 2 * u, SZ / 2 * u, SZ * oy * u, -SZ * (1 - oy) * u, -100, 100);
  const d = 20;
  cam.position.set(Math.cos(ELEV) * d / Math.SQRT2, Math.sin(ELEV) * d, Math.cos(ELEV) * d / Math.SQRT2);
  cam.up.set(0, 1, 0);
  cam.lookAt(0, 0, 0);
  r.render(scene, cam);
  const out = document.createElement("canvas");
  out.width = out.height = W;
  out.getContext("2d").drawImage(r.domElement, 0, 0);
  // free GPU memory: hundreds of models are rendered in one bake
  const cached = new Set([...texCache.values()]);
  scene.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m.userData.cached) continue;
      for (const t of Object.values(m)) if (t && t.isTexture && !cached.has(t)) t.dispose();
      m.dispose();
    }
  });
  r.renderLists.dispose();
  return out;
}

// ---------- painted textures (cached) ----------
const texCache = new Map();
// A canvas texture painted by a 2D material painter over U×V face units.
export function paintedTexture(mat, U = 64, V = 64, key = "") {
  const id = `${key}|${mat.col}|${U}|${V}`;
  if (texCache.has(id)) return texCache.get(id);
  const s = 6, c = document.createElement("canvas");
  c.width = U * s; c.height = V * s;
  const x = c.getContext("2d");
  x.scale(s, s);
  x.fillStyle = css(mat.col); x.fillRect(0, 0, U, V);
  R = rng(id);
  // painters draw with v pointing up the face; flip so v=0 is the bottom edge
  x.translate(0, V); x.scale(1, -1);
  if (mat.tex) mat.tex(x, U, V, [[0, 0], [U, 0], [U, V], [0, V]], 1, mat, {});
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  texCache.set(id, t);
  return t;
}
export function material(mat, U, V, extra = {}) {
  const id = `${mat.col}|${U}|${V}|${JSON.stringify(extra)}`;
  if (matCache.has(id)) return matCache.get(id);
  const made = new THREE.MeshStandardMaterial({ map: mat.tex ? paintedTexture(mat, U, V) : null, color: mat.tex ? 0xffffff : new THREE.Color(css(mat.col)), roughness: 0.92, metalness: 0, ...extra });
  made.userData.cached = true;
  matCache.set(id, made);
  return made;
}
// Materials are cached and shared, so shader programs compile once per bake.
const matCache = new Map();
export const flat = (hex, extra = {}) => {
  const id = hex + JSON.stringify(extra);
  if (!matCache.has(id)) { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.85, metalness: 0, ...extra }); m.userData.cached = true; matCache.set(id, m); }
  return matCache.get(id);
};

// ---------- geometry helpers ----------
// A box from (x0, y0px, z0) with size (w, hpx, d), texture repeats per tile.
export function box(g, x, z, w, d, y0px, hpx, mats) {
  const geo = new THREE.BoxGeometry(w, Hpx(hpx), d);
  // scale UVs so painted texture keeps its physical size on every face
  const uv = geo.attributes.uv, pos = geo.attributes.position, nor = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    const px = pos.getX(i) + w / 2, py = pos.getY(i) + Hpx(hpx) / 2, pz = pos.getZ(i) + d / 2;
    if (ny > 0.5) uv.setXY(i, px, pz);
    else if (nx > 0.5) uv.setXY(i, pz, py * PX_PER_UNIT * Math.cos(ELEV) / 64);
    else uv.setXY(i, px, py * PX_PER_UNIT * Math.cos(ELEV) / 64);
  }
  const m = new THREE.Mesh(geo, Array.isArray(mats) ? mats : mats);
  m.position.set(x + w / 2, Hpx(y0px) + Hpx(hpx) / 2, z + d / 2);
  g.add(m);
  return m;
}
export function cyl(g, x, z, r0, r1, y0px, hpx, mat, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, Hpx(hpx), seg), mat);
  m.position.set(x, Hpx(y0px) + Hpx(hpx) / 2, z);
  g.add(m);
  return m;
}
// Hipped roof over an eave rectangle, UVs running along the eave (u) and up the slope (v).
export function hipRoof(g, x, z, w, d, y0px, risePx, mat) {
  const y0 = Hpx(y0px), y1 = Hpx(y0px + risePx);
  const m = Math.min(w, d) / 2;
  const A = [x, y0, z], B = [x + w, y0, z], C = [x + w, y0, z + d], D = [x, y0, z + d];
  const along = w >= d;
  const r1 = along ? [x + m, y1, z + d / 2] : [x + w / 2, y1, z + m];
  const r2 = along ? [x + w - m, y1, z + d / 2] : [x + w / 2, y1, z + d - m];
  const faces = along
    ? [[A, B, r2, r1], [B, C, r2], [C, D, r1, r2], [D, A, r1]]
    : [[A, B, r1], [B, C, r2, r1], [C, D, r2], [D, A, r1, r2]];
  const pos = [], uvs = [];
  const slope = Math.hypot(Math.min(w, d) / 2, y1 - y0) * 1.6;
  for (const f of faces) {
    const [p0, p1] = f, ex = [p1[0] - p0[0], p1[2] - p0[2]], el = Math.hypot(...ex);
    const uvOf = p => { const dx = p[0] - p0[0], dz = p[2] - p0[2]; return [(dx * ex[0] + dz * ex[1]) / el * 1.6, (p[1] - y0) / (y1 - y0) * slope]; };
    const tri = f.length === 3 ? [[0, 1, 2]] : [[0, 1, 2], [0, 2, 3]];
    for (const t of tri) for (const i of t) { pos.push(...f[i]); uvs.push(...uvOf(f[i])); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.material.side = THREE.DoubleSide;
  g.add(mesh);
  return mesh;
}

// ---------- a simple rigged figure ----------
// Parts hang from pivots so poses are joint angles: { walk phase, arm swing, ... }.
export function figure(look, pose) {
  const s = look.scale || 1;
  const root = new THREE.Group();
  const skin = flat(look.skin), cloth = flat(look.upper || look.skin), lower = flat(look.lower), dark = flat("#1a120c");
  const h = v => Hpx(v * s);
  const ph = pose.walk ? pose.ph : 0, sw = Math.sin(ph);
  const bob = pose.walk ? -Math.abs(Math.cos(ph)) * 0.6 : 0;
  const body = new THREE.Group();
  body.position.y = h(bob);
  root.add(body);
  // legs: hip pivots swing forward/back along +X (the figure faces +X)
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0, h(8), side * 0.035 * s);
    hip.rotation.z = -side * sw * 0.55;
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.026 * s, 0.02 * s, h(8), 8), skin);
    thigh.position.y = -h(4);
    hip.add(thigh);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, h(0.8), 0.03 * s), flat(look.boots || "#5a3a22"));
    foot.position.set(0.012 * s, -h(8), 0);
    hip.add(foot);
    body.add(hip);
  }
  // sarong / short cloth as a flared cylinder
  const skirtH = look.short ? 4.5 : 7;
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.065 * s, h(skirtH), 14), lower);
  skirt.position.y = h(8.6 - skirtH / 2 + 0.6);
  body.add(skirt);
  // torso and head
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.062 * s, 0.05 * s, h(6.5), 14), look.bare ? skin : cloth);
  torso.position.y = h(11.8);
  body.add(torso);
  if (look.armour) for (let i = 0; i < 3; i++) { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.064 * s - i * 0.003, 0.064 * s - i * 0.003, h(0.8), 14, 1, true), flat(look.armour, { metalness: 0.35, roughness: 0.5, side: THREE.DoubleSide })); band.position.y = h(10.2 + i * 1.6); body.add(band); }
  if (look.sash) { const sash = new THREE.Mesh(new THREE.TorusGeometry(0.05 * s, 0.008 * s, 6, 16), flat(look.sash)); sash.rotation.x = Math.PI / 2; sash.position.y = h(9.2); body.add(sash); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.04 * s, 14, 10), skin);
  head.position.y = h(17.4);
  body.add(head);
  const H = look.head || {};
  if (H.kind === "turban") { const t = new THREE.Mesh(new THREE.TorusGeometry(0.03 * s, 0.017 * s, 8, 16), flat(H.col || "#f2efe6")); t.rotation.x = Math.PI / 2; t.position.y = h(19.2); body.add(t); const top = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 10, 8), flat(H.col || "#f2efe6")); top.position.y = h(19.6); top.scale.y = 0.6; body.add(top); }
  else if (H.kind === "helm") { const t = new THREE.Mesh(new THREE.SphereGeometry(0.044 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), flat(H.col || "#55504a", { metalness: 0.5, roughness: 0.45 })); t.position.y = h(18); body.add(t); }
  else { const hair = new THREE.Mesh(new THREE.SphereGeometry(0.041 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), dark); hair.position.y = h(17.8); body.add(hair); }
  // arms: shoulder pivots; the right arm can raise a weapon for the attack
  const arms = {};
  for (const side of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(0, h(14.6), side * 0.062 * s);
    sh.rotation.z = side * sw * 0.45;
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.019 * s, 0.016 * s, h(6.5), 8), look.sleeves ? cloth : skin);
    upper.position.y = -h(3.2);
    sh.add(upper);
    body.add(sh);
    arms[side > 0 ? "R" : "L"] = sh;
  }
  if (pose.act >= 0 && pose.actKind === "shoot") {
    // bow arm straight out in front, string hand drawn back to the chest, then released
    arms.L.rotation.z = 1.45;
    arms.R.rotation.z = pose.act < 0.67 ? 1.2 : 0.6;
  } else if (pose.act >= 0) {
    const a = pose.act < 0.5 ? -1.9 + pose.act * 0.8 : -1.5 + (pose.act - 0.5) * 3.2; // raise then strike
    arms.R.rotation.z = a;
  }
  return { root, body, arms, h, s };
}
