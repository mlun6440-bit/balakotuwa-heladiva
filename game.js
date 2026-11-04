"use strict";
// ============================================================================
// BALAKOTUWA — Keepers of the Wewa
// An isometric tank-kingdom builder. Store monsoon rain in wewas, carry it by
// canal to the paddies through the dry season, and hold the citadel against
// raiders across a five-level campaign.
//
// This file is the simulation and UI. Content tables live in data.js and all
// drawing lives in render.js. Extend content by adding rows, not branches.
// See CLAUDE.md for the extension rules and ROADMAP.md for the backlog.
// ============================================================================

// ==================== UTILITIES ====================
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const inb = (x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.gx - b.gx, a.gy - b.gy);
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(item) {
    const a = this.a; a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

function costText(cost) {
  return Object.entries(cost).map(([k, v]) => `${v}${RES[k]}`).join(" ");
}

// ==================== SAVE DATA ====================
function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (p && typeof p.unlocked === "number") {
      // unlocked is stored by id too, so inserting a level never shifts it; old saves used the first five levels' order
      const id = p.unlockedId || ["anuradhapura", "dryzone", "lionrock", "parakrama", "senkadagala"][p.unlocked];
      const i = LEVELS.findIndex(L => L.id === id);
      return { unlocked: i >= 0 ? i : p.unlocked, stars: p.stars || {}, skirmishBest: p.skirmishBest || 0 };
    }
  } catch (e) { /* storage blocked or corrupt: start fresh */ }
  return { unlocked: 0, stars: {}, skirmishBest: 0 };
}
function saveProgress() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...progress, unlockedId: LEVELS[progress.unlocked].id })); } catch (e) { /* ignore */ }
}

// ==================== SAVE A RUN ====================
// The level in progress is saved to localStorage (every 15s of play, when the
// tab is hidden or closed, and when the menu opens) and can be continued from
// the menu. Only primary state is stored; everything derived (occupancy, flow
// field, water networks, cover, staffing) is rebuilt by refreshWorld().
const RUN_KEY = "balakotuwa.run.v1";
const RUN_SKIP = new Set(["L", "tiles", "trees", "unlocked", "buildings", "occ", "workers", "units", "shots", "floats", "nets",
  "netOf", "flooded", "flow", "citadel", "cover", "fx", "tool", "demolish", "improve", "mode", "paused"]);
const plain = v => v === null || typeof v !== "object" || Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype;

function saveRun() {
  if (!S || (S.mode !== "play" && S.mode !== "menu")) return;
  const st = {};
  for (const [k, v] of Object.entries(S)) if (!RUN_SKIP.has(k) && plain(v)) st[k] = v;
  const r3 = v => Math.round(v * 1000) / 1000;
  const data = {
    v: 1, idx: S.idx, saved: Date.now(), name: levelTitle(),
    L: S.L.skirmish ? { ...S.L, all: undefined } : null, st,
    trees: S.trees.map(t => [r3(t.gx), r3(t.gy), r3(t.stage)]),
    buildings: S.buildings.map(b => ({ uid: b.uid, id: b.id, gx: b.gx, gy: b.gy, hp: b.hp, maxHp: b.maxHp, water: b.water, growth: b.growth,
      open: b.open, next: b.next, at: b.at, fire: b.fire, silt: b.silt, irrigated: b.irrigated })),
    units: S.units.map(u => ({ uid: u.uid, team: u.team, type: u.type, gx: r3(u.gx), gy: r3(u.gy), tx: u.tx, ty: u.ty, hp: u.hp, maxHp: u.maxHp,
      last: u.last, z: u.z, ordered: u.ordered, lastFire: u.lastFire, party: u.party, hx: u.hx, hy: u.hy, flee: u.flee, looted: u.looted, rank: u.rank, xp: u.xp, hold: u.hold }))
  };
  try { localStorage.setItem(RUN_KEY, JSON.stringify(data)); } catch (e) { /* storage full or blocked */ }
  S.lastSave = S.time;
}

function savedRun() {
  try { const d = JSON.parse(localStorage.getItem(RUN_KEY)); return d && d.v === 1 ? d : null; } catch (e) { return null; }
}
function clearRun() { try { localStorage.removeItem(RUN_KEY); } catch (e) { /* ignore */ } }

function continueRun() {
  const d = savedRun();
  if (!d) return false;
  const custom = d.L ? { ...d.L, all: unlockedFor(LEVELS.length - 1) } : null;
  startLevel(d.idx, "idle", custom);
  Object.assign(S, d.st);
  S.trees = d.trees.map(([gx, gy, stage]) => ({ gx, gy, stage, reserved: false }));
  S.buildings = d.buildings.filter(o => BUILDINGS[o.id]).map(o => {
    const def = BUILDINGS[o.id];
    return { ...o, def, w: def.w, h: def.h, maxHp: o.maxHp || def.hp, worker: null, fire: o.fire || 0 };
  });
  S.citadel = S.buildings.find(b => b.id === "citadel");
  S.units = d.units.map(o => ({ ...o, def: o.team === "p" ? TROOPS[o.type] : FOES[o.type], sel: false, lastFire: o.lastFire ?? -9 }));
  S.workers = []; S.shots = []; S.floats = []; S.fx = [];
  refreshWorld();
  updateCover();
  staff();
  S.mode = "play"; S.paused = true;
  overlay.classList.add("hidden");
  buildTabs(); renderPalette(); syncHud(); centerCamera();
  say("Welcome back. The kingdom waits, paused: press Space or ▶ Resume.");
  return true;
}

// ==================== GLOBAL STATE ====================
let S = null; // current level state
let progress = loadProgress();
// camX/camY are in world pixels at zoom 1; w/h are the viewport in CSS pixels.
const view = { camX: 0, camY: 0, zoom: 0.9, w: 0, h: 0, dpr: 1 };
const input = { hover: { gx: -1, gy: -1, x: 0, y: 0 }, panning: false, panFrom: null, drag: null, painting: false, lastPaint: "" };
const audio = { on: false, ctx: null };

const canvas = document.getElementById("world");
let ctx = canvas.getContext("2d"); // render.js swaps this while baking the terrain cache
const mini = document.getElementById("minimap");
const mctx = mini.getContext("2d");

// ==================== MAP GENERATION ====================
function genMap(L) {
  const rnd = mulberry32(L.seed);
  const tiles = Array.from({ length: MAP }, () => Array.from({ length: MAP }, () => ({ t: "grass", v: rnd() })));

  for (const r of L.rivers || []) {
    const phase = rnd() * 6;
    for (let i = 0; i < MAP; i++) {
      const off = Math.round(Math.sin(i * 0.35 + phase) * r.wobble);
      for (let k = 0; k < r.width; k++) {
        const d = Math.max(0, r.at + off + k);
        let x, y;
        if (r.edge === "west") { x = d; y = i; }
        else if (r.edge === "east") { x = MAP - 1 - d; y = i; }
        else if (r.edge === "north") { x = i; y = d; }
        else { x = i; y = MAP - 1 - d; }
        if (inb(x, y)) tiles[y][x].t = "river";
      }
    }
  }
  for (const [cx, cy, rad] of L.lakes || []) {
    for (let y = cy - rad; y <= cy + rad; y++) {
      for (let x = cx - rad; x <= cx + rad; x++) {
        if (inb(x, y) && Math.hypot(x - cx, y - cy) <= rad + 0.3) tiles[y][x].t = "river";
      }
    }
  }
  for (const [x1, y1, x2, y2] of L.rocks || []) {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
      if (inb(x, y) && tiles[y][x].t === "grass" && rnd() < 0.85) tiles[y][x].t = "rock";
    }
  }
  const trees = [];
  for (const [x1, y1, x2, y2, dens] of L.forests || []) {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
      if (inb(x, y) && tiles[y][x].t === "grass" && rnd() < dens) {
        trees.push({ gx: x + 0.3 + rnd() * 0.4, gy: y + 0.3 + rnd() * 0.4, stage: 100, reserved: false });
      }
    }
  }
  // Keep the citadel's surroundings open.
  const [cx, cy] = L.citadel;
  for (let y = cy - 2; y <= cy + 3; y++) for (let x = cx - 2; x <= cx + 3; x++) {
    if (inb(x, y)) tiles[y][x].t = "grass";
  }
  return { tiles, trees: trees.filter(t => !(t.gx >= cx - 2 && t.gx < cx + 4 && t.gy >= cy - 2 && t.gy < cy + 4)) };
}

// ==================== LEVEL SETUP ====================
function unlockedFor(idx) {
  const b = new Set(), t = new Set(), e = new Set();
  for (let i = 0; i <= idx; i++) {
    (LEVELS[i].unlocks.buildings || []).forEach(x => b.add(x));
    (LEVELS[i].unlocks.troops || []).forEach(x => t.add(x));
    (LEVELS[i].unlocks.edicts || []).forEach(x => e.add(x));
  }
  return { buildings: b, troops: t, edicts: e };
}

// ==================== SKIRMISH ====================
// A seeded random map with every building unlocked and endless raids that
// grow each time. Survive as many raids as you can.
function makeSkirmish(seed, sandbox = false) {
  const r = mulberry32(seed), ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const edges = ["west", "north", "south", "east"];
  const riverEdge = edges[ri(0, 2)];
  const cx = ri(11, 14), cy = ri(11, 14);
  const away = (x, y) => Math.hypot(x - cx, y - cy) > 6;
  const rect = (w, h) => { for (;;) { const x = ri(2, MAP - 3 - w), y = ri(2, MAP - 3 - h); if (away(x + w / 2, y + h / 2)) return [x, y, x + w, y + h]; } };
  const all = unlockedFor(LEVELS.length - 1);
  return {
    id: `skirmish-${seed}`, name: "Skirmish", era: `Random map · seed ${seed}`, seed, skirmish: true, endless: true, fireArrows: true,
    intro: "A fresh valley and no end to the raiders. Each raid is larger than the last. How long can the Maligawa stand?",
    citadel: [cx, cy], season: r() < 0.5 ? "maha" : "yala",
    start: { timber: 150, stone: 80, rice: 100, gold: 150, villagers: 12 },
    army: { spearman: 3, archer: 2 },
    rivers: [{ edge: riverEdge, at: ri(0, 2), width: ri(1, 2), wobble: 0.8 + r() * 1.4 }],
    rocks: Array.from({ length: ri(2, 3) }, () => rect(ri(2, 4), ri(2, 4))),
    forests: Array.from({ length: ri(3, 5) }, () => [...rect(ri(4, 7), ri(4, 7)), 0.35 + r() * 0.2]),
    unlocks: {}, all,
    waves: sandbox ? [] : [0, 1, 2].map(k => skirmishWave(k, seed, riverEdge)),
    hpScale: 1, objectives: [{ type: sandbox ? "sandbox" : "endless" }], wild: { first: 150, every: 110 },
    ...(sandbox ? {
      id: `sandbox-${seed}`, name: "Sandbox", sandbox: true, endless: false, era: `Royal sandbox · seed ${seed}`,
      intro: "A peaceful valley with full stores. Build anything; open 👑 Decrees to send raids of any size from any edge and test your defences.",
      start: { timber: 999, stone: 999, rice: 600, gold: 999, villagers: 30 }
    } : {})
  };
}
function skirmishWave(k, seed, riverEdge) {
  const r = mulberry32(seed * 31 + k * 977);
  const edges = ["east", "south", "north", "west"].filter(e => e !== riverEdge);
  const n = Math.min(edges.length, 1 + Math.floor(k / 3));
  const from = [...edges].sort(() => r() - 0.5).slice(0, n);
  return { t: 150 + k * 95, from, raider: 3 + 2 * k, bowman: 1 + Math.floor(k * 0.8), brute: Math.floor(k / 2), thrower: k >= 4 ? Math.floor((k - 2) / 2) : 0 };
}
const newSeed = () => (Date.now() % 900000) + 1;
const startSkirmish = seed => startLevel(LEVELS.length, "brief", makeSkirmish(seed ?? newSeed()));
const startSandbox = seed => startLevel(LEVELS.length, "brief", makeSkirmish(seed ?? newSeed(), true));
const restartLevel = () => (S.L.sandbox ? startSandbox(S.L.seed) : S.L.skirmish ? startSkirmish(S.L.seed) : startLevel(S.idx));
const levelTitle = () => (S.L.sandbox ? "Sandbox" : S.L.skirmish ? "Skirmish" : `${S.idx + 1}. ${S.L.name}`);

// Sandbox: send a raid of a chosen size from a chosen edge (also a balance harness).
const RAID_SIZES = { small: 6, medium: 14, large: 30, extreme: 60 };
function sendRaid(size, edge) {
  const n = RAID_SIZES[size];
  const list = [];
  for (let i = 0; i < n; i++) list.push(i % 15 === 14 ? "thrower" : i % 10 === 9 ? "brute" : i % 3 === 2 ? "bowman" : "raider");
  const party = 1000 + (S.raidsSent = (S.raidsSent || 0) + 1);
  S.parties = S.parties || {};
  S.parties[party] = { total: list.length, spawned: 0, fled: false };
  list.forEach((type, i) => S.spawnQueue.push({ at: S.time + i * 0.35, type, edge, party }));
  say(`A ${size} raid of ${n} sets out from the ${edge}.`, true);
  sfx("conch");
}

function startLevel(idx, mode = "brief", custom = null) {
  const L = custom || LEVELS[idx];
  const { tiles, trees } = genMap(L);
  S = {
    idx, L, tiles, trees,
    unlocked: custom ? custom.all : unlockedFor(idx),
    buildings: [], occ: [], workers: [], units: [], shots: [], floats: [], spawnQueue: [],
    timber: L.start.timber, stone: L.start.stone, rice: L.start.rice, gold: L.start.gold,
    villagers: L.start.villagers, cap: 0, harmony: 60, fear: 0,
    season: L.season, seasonLeft: SEASONS[L.season].len,
    time: 0, tickAcc: 0, waveClock: 0, nextWave: 0,
    nets: [], netOf: null, flooded: new Set(), flow: null,
    tool: null, demolish: false, cat: "water",
    paused: true, speed: 1, mode, growAcc: 0, starveAcc: 0, tutorialStep: 0, warnedWave: -1, uid: 0,
    seasonNo: 0, edictEnd: {}, edictUsed: {}, rain: { caught: 0, lost: 0, spilled: 0 },
    stats: { starved: 0, starveSeason: null, lost: {}, burned: 0, trained: 0, tributes: 0, lastFrom: [], lastSize: 0, hungry: 0 },
    dam: L.rival ? makeDam(tiles, L.rivers[0]) : null
  };
  const [cx, cy] = L.citadel;
  S.citadel = addBuilding("citadel", cx, cy);
  for (const [id, x, y] of L.prebuilt || []) addBuilding(id, x, y);
  let n = 0;
  for (const [type, qty] of Object.entries(L.army || {})) {
    for (let i = 0; i < qty; i++, n++) {
      spawnSoldier(type, cx + 2.6 + (n % 3) * 0.6, cy + 0.4 + Math.floor(n / 3) * 0.6);
    }
  }
  refreshWorld();
  updateCover();
  centerCamera();
  buildTabs();
  renderPalette();
  syncHud();
  if (mode === "brief") showBriefing();
}

// ==================== BUILDINGS ====================
function addBuilding(id, gx, gy) {
  const def = BUILDINGS[id];
  const b = { uid: ++S.uid, id, def, gx, gy, w: def.w, h: def.h, hp: def.hp, maxHp: def.hp, worker: null, water: 0, growth: 0, open: false, next: 0, at: S.time, fire: 0, silt: 0 };
  S.buildings.push(b);
  S.trees = S.trees.filter(t => !(t.gx >= gx && t.gx < gx + def.w && t.gy >= gy && t.gy < gy + def.h));
  return b;
}

function removeBuilding(b) {
  S.buildings = S.buildings.filter(x => x !== b);
  for (const w of S.workers.filter(w => w.b === b)) releaseWorker(w);
  S.workers = S.workers.filter(w => w.b !== b);
  refreshWorld();
}

// Rebuild everything derived from the building layout.
function refreshWorld() {
  S.occ = Array.from({ length: MAP }, () => Array(MAP).fill(null));
  for (const b of S.buildings) {
    for (let y = b.gy; y < b.gy + b.h; y++) for (let x = b.gx; x < b.gx + b.w; x++) S.occ[y][x] = b;
  }
  S.cap = 6 + S.buildings.reduce((n, b) => n + (b.def.pop || 0), 0);
  computeFlow();
  computeNets();
  staff();
}

const count = id => S ? S.buildings.filter(b => b.id === id).length : 0;
const buildingAt = (x, y) => (inb(x, y) ? S.occ[y][x] : null);

function canPlace(def, gx, gy) {
  if (gx < 0 || gy < 0 || gx + def.w > MAP || gy + def.h > MAP) return "Outside the kingdom.";
  for (let y = gy; y < gy + def.h; y++) for (let x = gx; x < gx + def.w; x++) {
    const t = S.tiles[y][x].t;
    if (t === "river") return "Can't build on the river.";
    if (t === "rock") return "Rock is in the way.";
    if (S.occ[y][x]) return "Something is already there.";
  }
  if (def.needsRock && !rockNear(gx, gy, def.w, def.h, 2)) return "A quarry must stand within 2 tiles of rock.";
  return null;
}

// Rajakariya makes timber and stone work cheaper while it lasts.
function buildCost(def) {
  const d = edictOn("rajakariya") ? EDICTS.rajakariya.buildDiscount : 0;
  if (!d) return def.cost;
  const out = {};
  for (const [k, v] of Object.entries(def.cost)) out[k] = k === "timber" || k === "stone" ? Math.ceil(v * (1 - d)) : v;
  return out;
}

function rockNear(gx, gy, w, h, r) {
  for (let y = gy - r; y < gy + h + r; y++) for (let x = gx - r; x < gx + w + r; x++) {
    if (inb(x, y) && S.tiles[y][x].t === "rock") return true;
  }
  return false;
}

function tryBuild(gx, gy, quiet = false) {
  const def = BUILDINGS[S.tool];
  const why = canPlace(def, gx, gy);
  if (why) { if (!quiet) say(why, true); return false; }
  const cost = buildCost(def);
  for (const [k, v] of Object.entries(cost)) {
    if (S[k] < v) { if (!quiet) say(`We need ${v} ${k} for the ${def.name}, and have ${Math.floor(S[k])}.`, true); return false; }
  }
  for (const [k, v] of Object.entries(cost)) S[k] -= v;
  addBuilding(S.tool, gx, gy);
  puff(gx + def.w / 2, gy + def.h / 2, 6, "#b8a07a");
  refreshWorld();
  sfx("build");
  syncHud();
  return true;
}

// ==================== UPGRADES ====================
// Why building b can't be upgraded now, or null.
function upgradeBlocked(b) {
  const up = b && b.def.upgrade;
  if (!up) return b ? `The ${b.def.name} has no upgrade.` : "Nothing to upgrade here.";
  if (!S.unlocked.buildings.has(up.to)) return `${BUILDINGS[up.to].name} is not known in this region yet.`;
  if (b.fire > 0) return "Put the fire out first.";
  if (!affordable(up.cost)) return `Upgrading to ${BUILDINGS[up.to].name} needs ${costText(up.cost)}.`;
  return null;
}

// Rebuild in place: same tile, same uid, health kept in proportion.
function upgradeAt(gx, gy, quiet = false) {
  const b = buildingAt(gx, gy);
  const why = upgradeBlocked(b);
  if (why) { if (!quiet) say(why, true); return false; }
  const up = b.def.upgrade, def = BUILDINGS[up.to];
  for (const [k, v] of Object.entries(up.cost)) S[k] -= v;
  const k = b.hp / b.maxHp;
  b.id = up.to; b.def = def; b.maxHp = def.hp; b.hp = Math.max(1, Math.round(def.hp * k)); b.at = S.time;
  puff(b.gx + 0.5, b.gy + 0.5, 6, "#b8a07a");
  refreshWorld();
  sfx("build");
  syncHud();
  return true;
}

// ==================== REPAIR ====================
// Restoring a building costs 60% of its build cost × the share of health lost.
const REPAIR_CITADEL = { timber: 40, stone: 40 };
function repairCost(b) {
  const base = b === S.citadel ? REPAIR_CITADEL : b.def.cost || {};
  const lost = 1 - b.hp / b.maxHp, out = {};
  for (const [k, v] of Object.entries(base)) { const c = Math.ceil(v * 0.6 * lost); if (c > 0) out[k] = c; }
  return out;
}
function repairAt(gx, gy, quiet = false) {
  const b = buildingAt(gx, gy);
  if (!b || b.hp >= b.maxHp) { if (!quiet) say(b ? `The ${b.def.name} is not damaged.` : "Nothing to repair here.", !!b); return false; }
  if (b.fire > 0) { if (!quiet) say("Put the fire out first.", true); return false; }
  const cost = repairCost(b);
  if (!affordable(cost)) { if (!quiet) say(`Repairing the ${b.def.name} needs ${costText(cost)}.`, true); return false; }
  for (const [k, v] of Object.entries(cost)) S[k] -= v;
  b.hp = b.maxHp;
  puff(b.gx + b.w / 2, b.gy + b.h / 2, 5, "#cbbd9a");
  spawnFloat("🔧", b.gx + b.w / 2, b.gy + b.h / 2, "#bff0a8");
  sfx("build");
  syncHud();
  return true;
}

// One tool for both: a damaged building is repaired, a sound one upgraded.
function improveAt(gx, gy, quiet = false) {
  const b = buildingAt(gx, gy);
  return b && b.hp < b.maxHp ? repairAt(gx, gy, quiet) : upgradeAt(gx, gy, quiet);
}
const canImprove = b => !!b && (b.hp < b.maxHp ? !(b.fire > 0) && affordable(repairCost(b)) : !upgradeBlocked(b));

function demolishAt(gx, gy) {
  const b = buildingAt(gx, gy);
  if (!b) return;
  if (b.id === "citadel") { say("The Maligawa cannot be torn down.", true); return; }
  for (const [k, v] of Object.entries(b.def.cost || {})) S[k] += Math.floor(v / 2);
  removeBuilding(b);
  spawnFloat("Cleared (half refunded)", b.gx + b.w / 2, b.gy + b.h / 2, "#e9b949");
  syncHud();
}

function damageBuilding(b, amt, byFire = false) {
  if (!S.buildings.includes(b)) return;
  b.hp -= amt;
  if (b.hp > 0) return;
  if (b === S.citadel) { endLevel(false); return; }
  S.stats.lost[b.id] = (S.stats.lost[b.id] || 0) + 1;
  if (byFire) S.stats.burned++; // only when the fire itself brought it down
  puff(b.gx + b.w / 2, b.gy + b.h / 2, 14, "#7a6a58");
  spawnFloat(`${b.def.name} destroyed!`, b.gx + b.w / 2, b.gy + b.h / 2, "#ff6b5b");
  S.fear = Math.min(30, S.fear + 6);
  removeBuilding(b);
}

// ==================== RAIDER PATHFINDING ====================
// Dijkstra flow field from the citadel. Solid buildings cost more the
// tougher they are, so raiders walk around walls when a gap exists and
// break through when it doesn't.
function enterCost(x, y) {
  const t = S.tiles[y][x].t;
  let c = t === "river" ? 6 : t === "rock" ? 1.6 : 1;
  const b = S.occ[y][x];
  if (b && b !== S.citadel) c += b.def.solid ? 3 + b.maxHp / 90 : b.def.moat ? 4 : 0.3;
  return c;
}

function cornerBlocked(x, y, dx, dy) {
  if (!dx || !dy) return false;
  const a = buildingAt(x + dx, y), b = buildingAt(x, y + dy);
  return (a && a.def.solid) || (b && b.def.solid);
}

function computeFlow() {
  const flow = new Float32Array(MAP * MAP).fill(Infinity);
  const heap = new MinHeap();
  const c = S.citadel;
  for (let y = c.gy; y < c.gy + c.h; y++) for (let x = c.gx; x < c.gx + c.w; x++) {
    flow[y * MAP + x] = 0; heap.push([0, y * MAP + x]);
  }
  while (heap.size) {
    const [d, i] = heap.pop();
    if (d > flow[i]) continue;
    const x = i % MAP, y = (i / MAP) | 0;
    const ce = enterCost(x, y);
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy;
      if (!inb(nx, ny) || cornerBlocked(nx, ny, -dx, -dy)) continue;
      const nd = d + ce * (dx && dy ? 1.414 : 1);
      const ni = ny * MAP + nx;
      if (nd < flow[ni]) { flow[ni] = nd; heap.push([nd, ni]); }
    }
  }
  S.flow = flow;
}

function nextFlowTile(cx, cy) {
  let best = null, bd = S.flow[cy * MAP + cx];
  for (const [dx, dy] of DIRS8) {
    const nx = cx + dx, ny = cy + dy;
    if (!inb(nx, ny) || cornerBlocked(cx, cy, dx, dy)) continue;
    const d = S.flow[ny * MAP + nx];
    if (d < bd) { bd = d; best = { x: nx, y: ny }; }
  }
  return best;
}

// ==================== WATER NETWORK ====================
function computeNets() {
  const netOf = Array.from({ length: MAP }, () => Array(MAP).fill(-1));
  const nets = [];
  for (const b of S.buildings) {
    if (!b.def.water || netOf[b.gy][b.gx] !== -1) continue;
    const net = { id: nets.length, tiles: [], wewas: new Set(), sluices: new Set(), water: 0 };
    const queue = [[b.gx, b.gy]];
    netOf[b.gy][b.gx] = net.id;
    while (queue.length) {
      const [x, y] = queue.pop();
      const tb = S.occ[y][x];
      net.tiles.push([x, y]);
      if (tb.id === "wewa") net.wewas.add(tb);
      if (tb.id === "sluice") net.sluices.add(tb);
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx, ny = y + dy;
        const nb = buildingAt(nx, ny);
        if (nb && nb.def.water && netOf[ny][nx] === -1) { netOf[ny][nx] = net.id; queue.push([nx, ny]); }
      }
    }
    nets.push(net);
  }
  S.nets = nets;
  S.netOf = netOf;
  updateNetWater();
}

function updateNetWater() {
  S.flooded = new Set();
  for (const net of S.nets) {
    net.water = [...net.wewas].reduce((n, w) => n + w.water, 0);
    if (net.water > 0 && [...net.sluices].some(s => s.open)) {
      for (const [x, y] of net.tiles) if (S.occ[y][x].id !== "wewa") S.flooded.add(y * MAP + x);
    }
  }
}

const moatWet = b => { const id = S.netOf[b.gy][b.gx]; return id !== -1 && S.nets[id].water >= 1; };

function drainNet(net, amt) {
  const ws = [...net.wewas].sort((a, b) => b.water - a.water);
  for (const w of ws) {
    const take = Math.min(w.water, amt);
    w.water -= take; amt -= take;
    if (amt <= 0) break;
  }
}

function edgeTiles(b) {
  const out = [];
  for (let x = b.gx; x < b.gx + b.w; x++) out.push([x, b.gy - 1], [x, b.gy + b.h]);
  for (let y = b.gy; y < b.gy + b.h; y++) out.push([b.gx - 1, y], [b.gx + b.w, y]);
  return out.filter(([x, y]) => inb(x, y));
}

const riverBeside = b => !riverDry() && edgeTiles(b).some(([x, y]) => S.tiles[y][x].t === "river");

// ==================== THE DISAWA'S DAM ====================
// On levels with `rival`, a rival lord's dam stands where the river enters the
// map. Every Yala he shuts it and the river runs dry, unless the dam is broken
// (soldiers standing at it hack it down, and his raid comes early and stronger)
// or a 🎁 gift decree is in force. He rebuilds it every Maha.
const DAM_HP = 900, REVENGE = ["raider", "raider", "raider", "raider", "brute"];
function makeDam(tiles, r) {
  const along = r.edge === "west" || r.edge === "east"; // the river runs along y; upstream is its y = 1 end
  const cells = [];
  for (let k = 0; k < MAP; k++) { const [x, y] = along ? [k, 1] : [1, k]; if (tiles[y][x].t === "river") cells.push(k); }
  const a = Math.min(...cells), b = Math.max(...cells);
  return along ? { gx: a, gy: 1, w: b - a + 1, h: 1, hp: DAM_HP, maxHp: DAM_HP } : { gx: 1, gy: a, w: 1, h: b - a + 1, hp: DAM_HP, maxHp: DAM_HP };
}
const riverDry = () => !!(S.dam && S.dam.hp > 0 && S.season === "yala" && !edictOn("gift"));
function hitDam(u) {
  if (S.time - u.last < 1.2) return;
  u.last = S.time;
  const d = S.dam;
  d.hp -= u.def.dmg * (u.rank ? RANKS[u.rank].dmg : 1);
  puff(d.gx + d.w / 2, d.gy + d.h / 2, 3, "#9a9080");
  if (d.hp > 0) return;
  d.hp = 0;
  S.stats.damBroken = true;
  const w = S.L.waves[S.nextWave];
  if (w) S.waveClock = Math.max(S.waveClock, w.t - 20);
  S.revenge = true;
  say("The disawa's dam is broken and the river runs free! His men are coming for revenge, in 20 seconds, and in strength.", true);
  sfx("conch");
}

// Returns "river", a network object, or null.
function waterSource(b) {
  if (riverBeside(b)) return "river";
  for (const [x, y] of edgeTiles(b)) {
    const id = S.netOf[y][x];
    if (id !== -1 && S.nets[id].water >= 1) return S.nets[id];
  }
  return null;
}

const RAIN = 2.4; // water each wewa catches per second of Maha
const SILT_RATE = 0.25, SILT_MAX = 60; // Maha rain washes silt in; it eats capacity
const wewaCap = w => WEWA_CAP - (w.silt || 0);

function tickWater() {
  const maha = S.season === "maha";
  const spill = new Map(); // network id -> rain a full wewa could not hold
  for (const w of S.buildings) {
    if (w.id !== "wewa") continue;
    if (maha) {
      w.silt = Math.min(SILT_MAX, (w.silt || 0) + SILT_RATE);
      const add = Math.max(0, Math.min(RAIN, wewaCap(w) - w.water));
      w.water += add; S.rain.caught += add;
      if (add < RAIN) { const id = S.netOf[w.gy][w.gx]; spill.set(id, (spill.get(id) || 0) + RAIN - add); }
    } else w.water = Math.max(0, w.water - 0.3);
    if (riverBeside(w)) w.water = Math.min(wewaCap(w), w.water + 1.2);
    w.water = Math.min(w.water, wewaCap(w));
  }
  // Ellangawa (cascading tanks): a full wewa spills into the emptiest wewas
  // on its canal network. Whatever no tank can hold runs off to the sea.
  for (const [id, amt0] of spill) {
    let amt = amt0;
    const ws = id === -1 ? [] : [...S.nets[id].wewas].filter(w => w.water < wewaCap(w)).sort((a, b) => a.water - b.water);
    for (const w of ws) {
      const add = Math.min(amt, wewaCap(w) - w.water);
      w.water += add; amt -= add; S.rain.caught += add; S.rain.spilled += add;
      if (amt <= 0) break;
    }
    S.rain.lost += amt;
  }
  if (S.rain.spilled > 0 && !S.warnedCascade) { S.warnedCascade = true; say("A full wewa spills down the canal into the next tank. That is ellangawa: no rain wasted."); }
  if (S.rain.lost > 20 && !S.warnedSpill && S.L.objectives.some(o => o.type === "catch")) {
    S.warnedSpill = true;
    say("Rain is spilling from full wewas to the sea! Link another wewa to them with a canal.", true);
  }
  updateNetWater();
  for (const p of S.buildings) {
    if (p.id !== "paddy") continue;
    const src = waterSource(p);
    p.irrigated = !!src;
    if (!p.worker || p.growth >= 100) continue;
    const rate = (src ? 4 : maha ? 2 : 0) * (edictOn("rajakariya") ? 1.5 : 1);
    p.growth = Math.min(100, p.growth + rate);
    if (src && src !== "river") drainNet(src, 0.4);
  }
  for (const net of S.nets) {
    if ([...net.sluices].some(s => s.open) && net.water > 0) drainNet(net, 2.5);
  }
  updateNetWater();
}

// ==================== SEASONAL WORK (idle villagers) ====================
// Idle villagers join seasonal work parties as temporary helpers. A real job
// always takes them first (staff), and a fire can borrow them. Each row says
// when the work runs, where it wants hands, and how a helper sets out.
//   shramadana (Yala): dig silt out of the wewas and carry it to the paddies as manure.
//   gatherer (Maha): fetch fallen deadwood from the forest edge (never felling trees).
//   attam (Maha): exchange labour beside the farmer on watered paddies; rice grows faster.
//   hena (Yala): clear and burn a plot at the jungle edge for millet (counted as rice);
//     the tree is felled and regrows, so the jungle shrinks for a while.
// again(w): what a helper does after dropping its load at a store (default: go home).
const GATHERERS = 4, GATHER_CAP = 150;
const ATTAM_HANDS = 2, ATTAM_GROWTH = 4, ATTAM_TIME = 5;
const HENA_HANDS = 4, HENA_RICE = 2, HENA_TIME = 8;
const SEASON_WORK = [
  { job: "shramadana", season: "yala", spots: () => S.buildings.filter(b => b.id === "wewa" && (b.silt || 0) >= 8)
      .map(b => ({ n: 3, mine: w => w.siltTarget === b, send: w => { w.siltTarget = b; goTo(w, b.gx + 1, b.gy + 2.25, "toSilt"); } })) },
  { job: "gatherer", season: "maha", tip: "In the monsoon, idle villagers gather fallen wood from the forest for the stores.",
    spots: () => S.timber >= GATHER_CAP ? [] : [{ n: GATHERERS, mine: () => true, send: sendGatherer }],
    again: w => (S.season === "maha" && S.timber < GATHER_CAP ? sendGatherer(w) : endParty(w)) },
  { job: "hena", season: "yala", tip: "In Yala, idle villagers clear hena plots at the jungle edge and bring back millet, but each plot costs a tree.",
    spots: () => [{ n: HENA_HANDS, mine: () => true, send: sendHena }],
    again: w => (S.season === "yala" ? sendHena(w) : endParty(w)) },
  { job: "attam", season: "maha", tip: "In the monsoon, idle neighbours join attam work on watered paddies, and the rice grows faster.",
    spots: () => S.buildings.filter(p => p.id === "paddy" && p.irrigated && p.worker)
      .map(p => ({ n: ATTAM_HANDS, mine: w => w.field === p, send: (w, i) => { w.field = p; goTo(w, p.gx + 0.6 + i * 0.8, p.gy + 1.3 + i * 0.3, "toPaddy"); } })) }
];
function assignSeasonWork() {
  for (const row of SEASON_WORK) {
    if (S.season !== row.season) { S.workers.filter(w => w.job === row.job && !w.fireTarget).forEach(endParty); continue; }
    const crew = S.workers.filter(w => w.job === row.job);
    for (const spot of row.spots()) {
      for (let have = crew.filter(spot.mine).length; have < spot.n && idleVillagers() > 0; have++) spot.send(helper(row.job, {}), have);
    }
    S.warnedWork = S.warnedWork || {};
    if (row.tip && !S.warnedWork[row.job] && S.workers.some(w => w.job === row.job)) { S.warnedWork[row.job] = true; say(row.tip); }
  }
  if (!S.warnedSilt && S.buildings.some(b => b.id === "wewa" && b.silt >= 20)) {
    S.warnedSilt = true;
    say("Monsoon rain washes silt into the wewas, and they hold less. In Yala, idle villagers gather for shramadana to dig it out and manure the paddies.");
  }
}
const endParty = w => { if (w.target && w.target.reserved) w.target.reserved = false; S.workers = S.workers.filter(x => x !== w); };
// A temporary helper drawn from the idle villagers (water carrier or work party).
function helper(job, extra) {
  const w = { b: S.citadel, job, temp: true, gx: S.citadel.gx + 1, gy: S.citadel.gy + 2.2, tx: 0, ty: 0, phase: "plan", timer: 0, carry: null, target: null, ...extra };
  S.workers.push(w);
  return w;
}
function woodSpot(w) {
  let best = null, bd = Infinity;
  for (const t of S.trees) {
    if (t.stage < 100) continue;
    const d = Math.hypot(t.gx - w.gx, t.gy - w.gy);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
// Hena: the nearest mature tree nobody has claimed, felled for the plot.
function sendHena(w) {
  let best = null, bd = Infinity;
  for (const t of S.trees) {
    if (t.stage < 100 || t.reserved) continue;
    const d = Math.hypot(t.gx - w.gx, t.gy - w.gy);
    if (d < bd) { bd = d; best = t; }
  }
  if (!best) { endParty(w); return; }
  best.reserved = true; w.target = best;
  goTo(w, best.gx + 0.35, best.gy + 0.35, "toWood");
}
function sendGatherer(w) {
  const t = woodSpot(w);
  if (!t) { endParty(w); return; }
  goTo(w, t.gx + 0.35, t.gy + 0.35, "toWood");
}

// Send a helper (or a worker borrowed for a fire) home: helpers leave, workers go back to their job.
function dismiss(w) { if (w.temp) endParty(w); else planJob(w); }

// ==================== VILLAGERS & JOBS ====================
function staff() {
  while (S.workers.length > S.villagers) releaseWorker(S.workers.pop());
  for (const b of S.buildings) {
    if (!b.def.worker || b.worker) continue;
    if (S.workers.length >= S.villagers) {
      const party = S.workers.findIndex(w => w.temp && w.job !== "bucket" && !w.fireTarget);
      if (party < 0) break;
      endParty(S.workers[party]); // a real job beats a work party
    }
    const w = { b, job: b.def.worker, gx: S.citadel.gx + 1, gy: S.citadel.gy + 2.2, tx: 0, ty: 0, phase: "plan", timer: 0, carry: null, target: null };
    b.worker = w;
    S.workers.push(w);
    planJob(w);
  }
}

function releaseWorker(w) {
  if (w.target && w.target.reserved) w.target.reserved = false;
  if (w.b.worker === w) w.b.worker = null;
}

const idleVillagers = () => S.villagers - S.workers.length;

function goTo(w, x, y, phase) { w.tx = x; w.ty = y; w.phase = phase; }

function planJob(w) {
  const b = w.b;
  const hx = b.gx + b.w / 2, hy = b.gy + b.h / 2;
  if (w.job === "woodcutter") {
    let best = null, bd = 9;
    for (const t of S.trees) {
      if (t.stage < 100 || t.reserved) continue;
      const d = Math.hypot(t.gx - hx, t.gy - hy);
      if (d < bd) { bd = d; best = t; }
    }
    if (!best) { goTo(w, hx, hy + 0.6, "wait"); w.timer = 3; return; }
    best.reserved = true;
    w.target = best;
    goTo(w, best.gx, best.gy + 0.3, "toSite");
  } else if (w.job === "mason") {
    let best = null, bd = 99;
    for (let y = b.gy - 3; y <= b.gy + 3; y++) for (let x = b.gx - 3; x <= b.gx + 3; x++) {
      if (!inb(x, y) || S.tiles[y][x].t !== "rock") continue;
      const d = Math.hypot(x + 0.5 - hx, y + 0.5 - hy);
      if (d < bd) { bd = d; best = [x, y]; }
    }
    if (!best) { goTo(w, hx, hy + 0.6, "wait"); w.timer = 3; return; }
    goTo(w, best[0] + 0.5, best[1] + 0.9, "toSite");
  } else if (w.job === "smith") {
    // Fetch timber from a store, then forge it into a weapon at the kammala.
    if (S.timber < 3) { goTo(w, hx, hy + 0.7, "wait"); w.timer = 4; return; }
    const st = nearestStore(w, "timber");
    goTo(w, st.gx + st.w / 2, st.gy + st.h + 0.2, "fetch");
  } else if (w.job === "monk") {
    // Alternate between the alms round (a house) and meditation at the pansala.
    const houses = S.buildings.filter(h => h.id === "house");
    w.alms = !w.alms && houses.length > 0;
    if (w.alms) {
      const h = houses[Math.floor(Math.random() * houses.length)];
      goTo(w, h.gx + 0.5, h.gy + 1.25, "wait"); w.timer = 9;
    } else goTo(w, hx + 0.3, hy + 1.1, "toSite");
  } else {
    goTo(w, hx + 0.2, hy + 0.3, "toSite");
  }
}

function nearestStore(w, key) {
  let best = S.citadel, bd = Infinity;
  for (const b of S.buildings) {
    if (!(b.def.store || []).includes(key)) continue;
    const d = Math.hypot(b.gx + b.w / 2 - w.gx, b.gy + b.h / 2 - w.gy);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

function carryHome(w, key, n) {
  w.carry = { key, n };
  const s = nearestStore(w, key);
  goTo(w, s.gx + s.w / 2, s.gy + s.h + 0.2, "toStore");
}

function walk(w, dt) {
  const dx = w.tx - w.gx, dy = w.ty - w.gy, d = Math.hypot(dx, dy);
  if (d < 0.08) return true;
  const step = Math.min(d, 2.0 * terrainMult(w) * workMult() * dt);
  w.gx += (dx / d) * step; w.gy += (dy / d) * step;
  return false;
}

function updateWorker(w, dt) {
  switch (w.phase) {
    case "plan": planJob(w); break;
    case "wait":
      walk(w, dt);
      w.timer -= dt * workMult();
      if (w.timer <= 0) planJob(w);
      break;
    case "toWood":
      if (walk(w, dt)) { w.phase = "work"; w.timer = w.job === "hena" ? HENA_TIME : 6; }
      break;
    case "toPaddy":
      if (walk(w, dt)) { w.phase = "work"; w.timer = ATTAM_TIME; }
      break;
    case "toSilt":
      if (walk(w, dt)) {
        const b = w.siltTarget;
        if (!b || !S.buildings.includes(b) || b.silt < 2 || S.season === "maha") { endParty(w); break; }
        w.phase = "work"; w.timer = 5;
      }
      break;
    case "toField":
      if (walk(w, dt)) {
        if (w.field && S.buildings.includes(w.field)) { w.field.growth = Math.min(100, w.field.growth + 12); spawnFloat("🌱", w.gx, w.gy, "#bff0a8"); }
        w.carry = null;
        const b = w.siltTarget;
        if (b && S.buildings.includes(b) && b.silt >= 4 && S.season !== "maha") goTo(w, b.gx + 1, b.gy + 2.25, "toSilt");
        else endParty(w);
      }
      break;
    case "toWater":
      if (walk(w, dt)) {
        const src = w.waterSrc || {};
        if (src.wewa) src.wewa.water = Math.max(0, src.wewa.water - 2);
        else if (src.net) drainNet(src.net, 2);
        w.carry = { key: "water", n: 1 };
        const b = w.fireTarget;
        if (!b) { dismiss(w); break; }
        goTo(w, b.gx + b.w / 2, b.gy + b.h + 0.3, "toFire");
      }
      break;
    case "toFire":
      if (walk(w, dt)) {
        const b = w.fireTarget;
        w.carry = null;
        if (b && S.buildings.includes(b) && b.fire > 0) {
          b.fire = Math.max(0, b.fire - 1);
          spawnFloat("💧", w.gx, w.gy, "#9fd8ff");
          sfx("splash");
        }
        if (b && b.fire > 0 && S.buildings.includes(b)) seekWater(w);
        else { w.fireTarget = null; dismiss(w); }
      }
      break;
    case "fetch":
      if (walk(w, dt)) {
        if (S.timber < 3) { planJob(w); break; }
        S.timber -= 3;
        w.carry = { key: "timber", n: 3 };
        goTo(w, w.b.gx + 0.5, w.b.gy + 1.2, "toSite");
      }
      break;
    case "toSite":
      if (walk(w, dt)) {
        if (w.job === "smith") { w.carry = null; w.phase = "work"; w.timer = 7; }
        else if (w.job === "woodcutter" || w.job === "mason") { w.phase = "work"; w.timer = w.job === "mason" ? 4.5 : 3.5; }
        else { w.phase = "tend"; w.timer = 6; }
      }
      break;
    case "work":
      w.timer -= dt * workMult();
      if (w.timer > 0) break;
      if (w.job === "gatherer") { carryHome(w, "timber", 2); break; }
      if (w.job === "hena") {
        const t = w.target; w.target = null;
        if (t && S.trees.includes(t)) { t.stage = 0; t.reserved = false; puff(t.gx, t.gy, 5, "#8a8378"); }
        carryHome(w, "rice", HENA_RICE);
        break;
      }
      if (w.job === "attam") {
        const p = w.field;
        if (!p || !S.buildings.includes(p) || !p.irrigated || !p.worker || S.season !== "maha") { endParty(w); break; }
        if (p.growth < 100) p.growth = Math.min(100, p.growth + ATTAM_GROWTH);
        w.timer = ATTAM_TIME;
        break;
      }
      if (w.job === "shramadana") {
        const b = w.siltTarget;
        if (b && S.buildings.includes(b)) b.silt = Math.max(0, b.silt - 6);
        w.carry = { key: "silt", n: 1 };
        let best = null, bd = 8;
        for (const p of S.buildings) if (p.id === "paddy") { const d = Math.hypot(p.gx + 1 - w.gx, p.gy + 1 - w.gy); if (d < bd) { bd = d; best = p; } }
        w.field = best;
        if (best) goTo(w, best.gx + 1, best.gy + 2.2, "toField");
        else goTo(w, w.gx + 1, w.gy + 0.8, "toField");
        break;
      }
      if (w.job === "woodcutter") {
        const t = w.target;
        w.target = null;
        if (!t || !S.trees.includes(t)) { planJob(w); break; }
        t.stage = 0; t.reserved = false;
        carryHome(w, "timber", 5);
      } else if (w.job === "smith") {
        // carry the forged arms to the barracks (or citadel); no stockpile
        const dest = S.buildings.find(b => b.id === "barracks") || S.citadel;
        w.carry = { key: "arms", n: 1 };
        goTo(w, dest.gx + dest.w / 2, dest.gy + dest.h + 0.2, "toStore");
      } else {
        carryHome(w, "stone", 4);
      }
      break;
    case "tend":
      if (w.job === "farmer") {
        if (w.b.growth >= 100) { w.b.growth = 0; carryHome(w, "rice", 12); }
      } else if (w.job === "monk") {
        w.timer -= dt;
        if (w.timer <= 0) planJob(w);
      } else if (w.job === "trader") {
        w.timer -= dt * workMult();
        if (w.timer <= 0) {
          w.timer = 6;
          // Pola orders (👑 tab): sell rice above a level, buy timber/stone below one at a markup
          const m = S.market || (S.market = { sell: 30, buy: 0 });
          if (S.rice > sellAbove() + 5) { S.rice -= 5; S.gold += 8; spawnFloat("-5🍚 +8🪙", w.gx, w.gy, "#e9b949"); sfx("coin"); }
          else if (S.gold >= 12 && (S.timber < m.buy || S.stone < m.buy)) {
            const k = S.timber <= S.stone ? "timber" : "stone";
            S.gold -= 12; S[k] += 5; spawnFloat(`-12🪙 +5${RES[k]}`, w.gx, w.gy, "#e9b949"); sfx("coin");
          }
        }
      }
      break;
    case "toStore":
      if (walk(w, dt)) {
        if (w.carry.key in RES) {
          S[w.carry.key] += w.carry.n;
          spawnFloat(`+${w.carry.n} ${RES[w.carry.key]}`, w.gx, w.gy, "#bff0a8");
        }
        if (w.carry.key === "rice") sfx("harvest");
        w.carry = null;
        const row = w.temp && SEASON_WORK.find(r => r.job === w.job);
        if (row) (row.again || endParty)(w);
        else planJob(w);
      }
      break;
  }
}

// ==================== SOLDIERS & RAIDERS ====================
function spawnSoldier(type, gx, gy) {
  const d = TROOPS[type];
  S.units.push({ uid: ++S.uid, team: "p", type, def: d, gx, gy, tx: gx, ty: gy, hp: d.hp, maxHp: d.hp, last: -9, z: 0, sel: false, ordered: false });
}

// Drill and battle make veterans (RANKS in data.js): tougher and harder-hitting.
function gainXp(u, n) {
  u.xp = (u.xp || 0) + n;
  const r = u.rank || 0, next = RANKS[r + 1];
  if (!next || u.xp < next.xp) return;
  u.rank = r + 1;
  const hp = Math.round(u.def.hp * next.hp);
  u.hp += hp - u.maxHp; u.maxHp = hp;
  spawnFloat(`${"★".repeat(u.rank)} ${next.name}!`, u.gx, u.gy, "#ffd27a");
  if (!S.warnedRank) { S.warnedRank = true; say("A soldier has risen in rank. Soldiers resting by the Angam Maduwa drill between raids, and every fight teaches them."); }
}
function drillSoldiers() {
  const halls = S.buildings.filter(b => b.id === "barracks");
  if (!halls.length) return;
  for (const u of S.units) {
    if (u.team !== "p" || nearestFoe(u, 6)) continue;
    if (halls.some(b => rectDist(u, b) <= 3)) gainXp(u, 1);
  }
}

// ==================== WILD ELEPHANTS ====================
// On levels with `wild`, an elephant leaves a far stretch of jungle whenever a
// paddy is ripening, walks to it and eats the crop, then goes home. A staffed
// pela within PELA_RANGE turns it back. Nobody fights it (team "w").
const PELA_RANGE = 5;
function spawnWild() {
  const W = S.L.wild;
  if (!W) return;
  if (S.nextWild == null) S.nextWild = W.first;
  if (S.time < S.nextWild) return;
  if (!S.buildings.some(b => b.id === "paddy" && b.growth >= 50)) { S.nextWild = S.time + 10; return; }
  S.nextWild = S.time + W.every;
  const c = S.citadel, far = S.trees.filter(t => t.stage >= 100 && Math.hypot(t.gx - c.gx, t.gy - c.gy) > 9);
  const t = far.length ? far[Math.floor(Math.random() * far.length)] : null;
  const [x, y] = t ? [t.gx, t.gy] : edgeSpawn(["east", "west", "north", "south"][Math.floor(Math.random() * 4)]);
  const d = FOES.aliya;
  S.units.push({ uid: ++S.uid, team: "w", type: "aliya", def: d, gx: x, gy: y, tx: x, ty: y, hp: d.hp, maxHp: d.hp, last: -9, z: 0, hx: x, hy: y });
  if (!S.warnedWild) {
    S.warnedWild = true;
    say(`A wild elephant is coming out of the jungle for your ripening rice!${S.unlocked.buildings.has("pela") ? " A pela (watch hut) by the paddies scares elephants away." : ""}`, true);
  }
}
function updateWild(u, dt) {
  if (u.flee) {
    moveToward(u, u.hx, u.hy, dt);
    if (Math.hypot(u.hx - u.gx, u.hy - u.gy) < 0.4) u.gone = true;
    return;
  }
  const pela = S.buildings.find(b => b.id === "pela" && b.worker && rectDist(u, b) <= PELA_RANGE);
  if (pela) {
    u.flee = true;
    S.stats.scared = (S.stats.scared || 0) + 1;
    spawnFloat("Hoo! Hoo! 🔥", pela.gx + 0.5, pela.gy + 0.5, "#ffd27a");
    return;
  }
  let p = u.lootTarget;
  if (!p || !S.buildings.includes(p) || p.growth < 30) {
    p = null; let bd = Infinity;
    for (const b of S.buildings) if (b.id === "paddy" && b.growth >= 50) { const d = rectDist(u, b); if (d < bd) { bd = d; p = b; } }
    u.lootTarget = p;
    if (!p) { u.flee = true; return; }
  }
  if (rectDist(u, p) > 0.3) { moveToward(u, p.gx + 1, p.gy + 1, dt); return; }
  u.eat = (u.eat || 0) + dt;
  if (S.time - u.last >= 1) u.last = S.time; // eating: the trunk works
  if (u.eat < 3) return;
  p.growth = 0;
  S.stats.eaten = (S.stats.eaten || 0) + 1;
  spawnFloat("🐘 The rice is eaten!", p.gx + 1, p.gy + 1, "#ff9a7a");
  u.flee = true;
}

function spawnFoe(type, edge, party = null) {
  const d = FOES[type];
  const hp = Math.round(d.hp * S.L.hpScale);
  const [x, y] = edgeSpawn(edge);
  S.units.push({ uid: ++S.uid, team: "e", type, def: d, gx: x, gy: y, hp, maxHp: hp, last: -9, z: 0, party, hx: x, hy: y });
  if (party !== null && S.parties && S.parties[party]) S.parties[party].spawned++;
}

function edgeSpawn(edge) {
  for (let tries = 0; tries < 30; tries++) {
    const i = 6 + Math.floor(Math.random() * (MAP - 12));
    let x, y;
    if (edge === "east") { x = MAP - 1; y = i; }
    else if (edge === "west") { x = 0; y = i; }
    else if (edge === "north") { x = i; y = 0; }
    else { x = i; y = MAP - 1; }
    if (S.tiles[y][x].t !== "river" || tries === 29) return [x + 0.5, y + 0.5];
  }
}

// ==================== FOREST COVER ====================
// Kandyan hill warfare: raiders struggle through thick jungle, and soldiers
// hidden among trees are invisible from range and strike first.
// S.cover[y*MAP+x] = mature trees in the 3×3 block around the tile.
function updateCover() {
  const own = new Uint8Array(MAP * MAP), cover = new Uint8Array(MAP * MAP);
  for (const t of S.trees) if (t.stage >= 60) { const x = Math.floor(t.gx), y = Math.floor(t.gy); if (inb(x, y)) own[y * MAP + x]++; }
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy)) n += own[(y + dy) * MAP + x + dx];
    cover[y * MAP + x] = Math.min(255, n);
  }
  S.cover = cover;
}
const coverAt = (gx, gy) => { const x = Math.floor(gx), y = Math.floor(gy); return S.cover && inb(x, y) && !S.occ[y][x] ? S.cover[y * MAP + x] : 0; };
const inCover = u => !u.z && coverAt(u.gx, u.gy) >= 2;
const AMBUSH_RESET = 4; // seconds without attacking before the next first strike

function terrainMult(u) {
  const x = Math.floor(u.gx), y = Math.floor(u.gy);
  if (!inb(x, y)) return 1;
  if (u.team === "e" && S.flooded.has(y * MAP + x)) return 0.4;
  if (u.team === "e" && S.occ[y][x] && S.occ[y][x].def.moat) return moatWet(S.occ[y][x]) ? 0.3 : 0.75; // wading a moat
  if (u.team === "e" && coverAt(u.gx, u.gy) >= 3) return 0.7; // thick jungle
  const t = S.tiles[y][x].t;
  return t === "river" ? 0.55 : t === "rock" ? 0.85 : 1;
}

function moveToward(u, tx, ty, dt) {
  const dx = tx - u.gx, dy = ty - u.gy, d = Math.hypot(dx, dy);
  if (d < 0.05) return;
  const step = Math.min(d, u.def.speed * terrainMult(u) * dt);
  u.gx += (dx / d) * step; u.gy += (dy / d) * step;
}

// ==================== SPATIAL HASH ====================
// Units are bucketed into 2×2-tile cells once per combat step, so neighbour
// queries (targeting, volleys, separation) stay fast with hundreds of units.
const CELL = 2, CELLS = Math.ceil(MAP / CELL) + 2;
function buildUnitGrid() {
  const grid = new Map();
  for (const u of S.units) {
    const k = (Math.floor(u.gx / CELL) + 1) * CELLS + Math.floor(u.gy / CELL) + 1;
    let a = grid.get(k);
    if (!a) grid.set(k, (a = []));
    a.push(u);
  }
  S.ugrid = grid;
}
// Every unit whose cell overlaps the square of radius r around (x, y).
function unitsNear(x, y, r) {
  if (!S.ugrid) buildUnitGrid();
  const out = [];
  const x0 = Math.floor((x - r) / CELL) + 1, x1 = Math.floor((x + r) / CELL) + 1, y0 = Math.floor((y - r) / CELL) + 1, y1 = Math.floor((y + r) / CELL) + 1;
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const a = S.ugrid.get(cx * CELLS + cy);
    if (a) for (const u of a) out.push(u);
  }
  return out;
}

function nearestFoe(u, radius, from = u) {
  let best = null, bd = radius;
  for (const v of unitsNear(from.gx, from.gy, radius)) {
    if (v.team === u.team || v.team === "w" || v.hp <= 0) continue; // nobody fights wild elephants
    const d = Math.hypot(v.gx - from.gx, v.gy - from.gy);
    if (u.team === "e" && d > 1.5 && inCover(v)) continue; // hidden in the forest
    if (u.team === "e" && !u.def.ranged && v.z > 0) continue; // out of reach up on a wall or tower
    if (d <= bd) { bd = d; best = v; }
  }
  return best;
}

// Ranged volleys spread over the crowd: pick at random among the nearest few
// enemies in range instead of everyone shooting the same one.
function volleyTarget(u, range, from = u) {
  const near = [];
  for (const v of unitsNear(from.gx, from.gy, range)) {
    if (v.team === u.team || v.team === "w" || v.hp <= 0 || v.flee) continue;
    const d = Math.hypot(v.gx - from.gx, v.gy - from.gy);
    if (d <= range && !(u.team === "e" && d > 1.5 && inCover(v))) near.push([d, v]);
  }
  if (!near.length) return null;
  near.sort((a, b) => a[0] - b[0]);
  return near[Math.floor(Math.random() * Math.min(4, near.length))][1];
}

function attack(u, target, dmg) {
  if (S.time - u.last < 1.0) return;
  if (u.team === "p" && inCover(u) && S.time - u.last > AMBUSH_RESET) {
    dmg *= 2;
    spawnFloat("Ambush!", u.gx, u.gy, "#bff0a8");
    if (!S.warnedAmbush) { S.warnedAmbush = true; say("Ambush! Soldiers hidden in the forest strike first for double damage, and raiders can't see them from afar."); }
  }
  if (u.rank) dmg *= RANKS[u.rank].dmg;
  u.last = S.time;
  if (u.def.ranged) fireShot(u.gx, u.gy, u.z + 12, target, dmg);
  else hitUnit(target, dmg, u.def.splash);
}

function hitUnit(target, dmg, splash) {
  target.hp -= dmg;
  if (!splash) return;
  for (const v of S.units) {
    if (v !== target && v.team === target.team && dist(v, target) <= splash) v.hp -= dmg * 0.6;
  }
}

function fireShot(gx, gy, z, target, dmg, kind = null) {
  const d = Math.hypot(target.gx - gx, target.gy - gy);
  // ox/oy: a little landing scatter so a volley reads as a volley (cosmetic)
  S.shots.push({ sx: gx, sy: gy, sz: z, target, dmg, t: 0, dur: Math.max(0.25, d / (kind === "bolt" ? 14 : 9)) * (0.9 + Math.random() * 0.2), ox: (Math.random() - 0.5) * 0.35, oy: (Math.random() - 0.5) * 0.35, kind });
}

// ==================== SIEGE ====================
// Stone throwers stop at range and lob stones at the nearest wall or tower
// (else any solid building). Bolt towers outrange them and hunt them first.
function siegeTarget(u, range) {
  let best = null, bd = Infinity;
  for (const b of S.buildings) {
    if (!b.def.solid) continue;
    const d = rectDist(u, b);
    if (d > range) continue;
    const k = d - (b.def.wall || b.def.tower ? 3 : 0); // prefer defences
    if (k < bd) { bd = k; best = b; }
  }
  return best;
}
function lobStone(u, b) {
  const tx = b.gx + b.w / 2, ty = b.gy + b.h / 2, d = Math.hypot(tx - u.gx, ty - u.gy);
  S.shots.push({ sx: u.gx, sy: u.gy, sz: 14, target: { gx: tx, gy: ty, hp: 0 }, dmg: 0, t: 0, dur: Math.max(0.6, d / 5), stone: b, bdmg: u.def.bdmg, kind: "stone" });
  if (!S.warnedSiege) { S.warnedSiege = true; say("A stone thrower! It outranges watchtowers. Bolt towers and archers on the walls can reach it, or send soldiers out to cut down its crew.", true); }
}
const nearestSiege = (c, range) => { let best = null, bd = range; for (const v of unitsNear(c.gx, c.gy, range)) { if (v.team === "e" && v.def.siege && v.hp > 0) { const d = Math.hypot(v.gx - c.gx, v.gy - c.gy); if (d <= bd) { bd = d; best = v; } } } return best; };

function rectDist(u, b) {
  const dx = Math.max(b.gx - u.gx, 0, u.gx - (b.gx + b.w));
  const dy = Math.max(b.gy - u.gy, 0, u.gy - (b.gy + b.h));
  return Math.hypot(dx, dy);
}

function hitBuilding(u, b) {
  if (S.time - u.last < 1.0) return;
  u.last = S.time;
  damageBuilding(b, u.def.bdmg);
  sfx("hit");
}

// Looting: a raider passing within 3 tiles of a ripening paddy, a granary or a
// storehouse breaks off to trample or rob it once, then marches on. Early
// raids threaten the food, so guarding the fields matters.
const LOOTABLE = b => (b.id === "paddy" && b.growth >= 30) || b.id === "bissa" || b.id === "storehouse";
function lootRaid(u, dt) {
  if (!u.lootTarget || !S.buildings.includes(u.lootTarget) || !LOOTABLE(u.lootTarget)) {
    u.lootTarget = null;
    let best = null, bd = 3;
    for (const b of S.buildings) if (LOOTABLE(b)) { const d = rectDist(u, b); if (d < bd) { bd = d; best = b; } }
    if (!best) return false;
    u.lootTarget = best;
    if ((S.lootWarnAt ?? -99) < S.time - 30) {
      S.lootWarnAt = S.time;
      spawnFloat("⚠ Raiders!", best.gx + best.w / 2, best.gy + best.h / 2, "#ffb04a");
      say(`Raiders are turning toward the ${best.id === "paddy" ? "paddies" : best.def.name.split(" (")[0]}! Send soldiers there, or post archers by the fields next time.`, true);
    }
  }
  const b = u.lootTarget;
  if (rectDist(u, b) > 0.35) { moveToward(u, b.gx + b.w / 2, b.gy + b.h / 2, dt); return true; }
  u.looted = true; u.lootTarget = null;
  if (b.id === "paddy") {
    S.stats.trampled = (S.stats.trampled || 0) + 1;
    b.growth = Math.floor(b.growth / 2); // half the crop is lost, not all of it
    spawnFloat("Trampled!", b.gx + 1, b.gy + 1, "#ff9a7a");
  } else {
    const key = b.id === "bissa" ? "rice" : S.timber >= S.stone ? "timber" : "stone";
    const n = Math.min(Math.floor(S[key]), 20);
    S[key] -= n;
    S.stats.looted = (S.stats.looted || 0) + n;
    spawnFloat(`−${n}${RES[key]} looted`, b.gx + b.w / 2, b.gy + b.h / 2, "#ff9a7a");
  }
  S.warnedLoot = true;
  return true;
}

// Morale: once a whole raid party has landed, if fewer than morale × its
// strength still stand, the faint-hearted run back to their edge.
function checkMorale() {
  for (const [id, p] of Object.entries(S.parties || {})) {
    if (p.fled || p.spawned < p.total) continue;
    const alive = S.units.filter(u => u.team === "e" && u.party === Number(id) && u.hp > 0 && !u.flee);
    if (!alive.length) { p.fled = true; continue; }
    const fleeing = alive.filter(u => alive.length / p.total < u.def.morale);
    if (!fleeing.length) continue;
    p.fled = true;
    for (const u of fleeing) u.flee = true;
    spawnFloat("Retreat!", fleeing[0].gx, fleeing[0].gy, "#ffd27a");
    say(`The raiders' nerve breaks: ${fleeing.length} flee back the way they came.`);
  }
}

function updateFoe(u, dt) {
  const d = u.def;
  if (d.siege && !u.flee) {
    const tb = siegeTarget(u, d.range);
    if (tb) {
      if (S.time - u.last >= d.cd) { u.last = S.time; lobStone(u, tb); }
      return;
    }
  }
  if (u.flee) {
    moveToward(u, u.hx ?? u.gx, u.hy ?? u.gy, dt * 1.2);
    if (Math.hypot((u.hx ?? u.gx) - u.gx, (u.hy ?? u.gy) - u.gy) < 0.3) u.gone = true;
    return;
  }
  const foe = nearestFoe(u, d.ranged ? d.range : 2.2);
  if (foe) {
    if (dist(u, foe) <= d.range) attack(u, foe, d.dmg);
    else moveToward(u, foe.gx, foe.gy, dt);
    return;
  }
  const cx = clamp(Math.floor(u.gx), 0, MAP - 1), cy = clamp(Math.floor(u.gy), 0, MAP - 1);
  if (S.occ[cy][cx] === S.citadel || rectDist(u, S.citadel) < 0.45) { hitBuilding(u, S.citadel); return; }
  if (d.loot && !u.looted && lootRaid(u, dt)) return;
  if (d.fire && S.time - (u.lastFire ?? -9) > 3.5) {
    const tb = nearestFlammable(u, d.range);
    if (tb) { u.lastFire = S.time; u.last = S.time; fireArrow(u, tb); return; }
  }
  const nxt = nextFlowTile(cx, cy);
  if (!nxt) { moveToward(u, S.citadel.gx + 1, S.citadel.gy + 1, dt); return; }
  const b = S.occ[nxt.y][nxt.x];
  if (b && b.def.solid && rectDist(u, b) <= 0.45) { hitBuilding(u, b); return; }
  moveToward(u, nxt.x + 0.5, nxt.y + 0.5, dt);
}

function updateSoldier(u, dt) {
  const d = u.def;
  const under = buildingAt(Math.floor(u.gx), Math.floor(u.gy));
  const high = d.ranged && under && (under.def.wall || under.def.tower);
  u.z = high ? (under.def.tower ? 40 : 20) : 0;
  const range = d.range * (high ? 1.4 : 1);
  const toPost = Math.hypot(u.tx - u.gx, u.ty - u.gy);
  if (u.ordered && toPost < 0.15) u.ordered = false;

  const foe = nearestFoe(u, u.ordered || d.ranged || u.hold ? range : 4);
  if (foe && dist(u, foe) <= range) {
    attack(u, d.ranged ? volleyTarget(u, range) || foe : foe, d.dmg);
    if (!u.ordered) return;
  } else if (foe && !u.ordered && !u.hold && Math.hypot(foe.gx - u.tx, foe.gy - u.ty) < 5) {
    moveToward(u, foe.gx, foe.gy, dt);
    return;
  }
  if (S.dam && S.dam.hp > 0 && rectDist(u, S.dam) <= 1) hitDam(u);
  if (toPost > 0.15) moveToward(u, u.tx, u.ty, dt);
}

function separate() {
  for (const a of S.units) {
    for (const b of unitsNear(a.gx, a.gy, 0.32)) {
      if (b.uid <= a.uid) continue; // each pair once
      const dx = b.gx - a.gx, dy = b.gy - a.gy, d = Math.hypot(dx, dy);
      if (d > 0.001 && d < 0.32) {
        const push = (0.32 - d) * 0.25;
        a.gx -= (dx / d) * push; a.gy -= (dy / d) * push;
        b.gx += (dx / d) * push; b.gy += (dy / d) * push;
      }
    }
  }
}

function updateCombat(dt) {
  buildUnitGrid();
  for (const u of S.units) {
    if (u.hp <= 0) continue;
    if (u.team === "p") updateSoldier(u, dt); else if (u.team === "w") updateWild(u, dt); else updateFoe(u, dt);
  }
  buildUnitGrid();
  separate();

  for (const b of S.buildings) {
    const tw = b.def.tower;
    if (!tw || S.time < b.next) continue;
    const c = { gx: b.gx + b.w / 2, gy: b.gy + b.h / 2, team: "p" };
    const foe = (tw.siege && nearestSiege(c, tw.range)) || volleyTarget(c, tw.range);
    if (foe) { fireShot(c.gx, c.gy, 48, foe, tw.dmg, tw.siege ? "bolt" : null); b.next = S.time + tw.cd; }
  }

  for (let i = S.shots.length - 1; i >= 0; i--) {
    const s = S.shots[i];
    s.t += dt;
    if (s.t >= s.dur) {
      if (s.fire) ignite(s.fire);
      else if (s.stone) { if (S.buildings.includes(s.stone)) { const was = s.stone; damageBuilding(was, s.bdmg); if (!S.buildings.includes(was)) S.stats.stoned = (S.stats.stoned || 0) + 1; } puff(s.target.gx, s.target.gy, 6, "#9a9080"); }
      else if (s.target.hp > 0) { s.target.hp -= s.dmg; puff(s.target.gx + (s.ox || 0) * 0.5, s.target.gy + (s.oy || 0) * 0.5, 2, "#c8b48a"); }
      S.shots.splice(i, 1);
    }
  }

  checkMorale();
  for (let i = S.units.length - 1; i >= 0; i--) {
    const u = S.units[i];
    if (u.gone) { S.units.splice(i, 1); continue; } // fled off the map: no gold
    if (u.hp > 0) continue;
    if (u.team === "e") {
      for (const v of unitsNear(u.gx, u.gy, 4)) if (v.team === "p" && v.hp > 0) gainXp(v, KILL_XP);
      S.gold += u.def.gold;
      spawnFloat(`+${u.def.gold}🪙`, u.gx, u.gy, "#e9b949");
    }
    S.units.splice(i, 1);
  }
}

// ==================== FIRE ====================
// Raider bowmen loose fire arrows at thatch and timber. Fire grows in the dry
// season, is beaten down by monsoon rain, spreads to flammable neighbours,
// and villagers run with water pots from the nearest wewa, canal or river.
function nearestFlammable(u, range) {
  if (!S.L.fireArrows) return null; // fire arrows arrive from Lion Rock on
  let best = null, bd = range;
  for (const b of S.buildings) {
    if (!b.def.flammable || b.fire >= 1) continue;
    const d = rectDist(u, b);
    if (d <= bd) { bd = d; best = b; }
  }
  return best;
}

function fireArrow(u, b) {
  const tx = b.gx + b.w / 2, ty = b.gy + b.h / 2;
  S.shots.push({ sx: u.gx, sy: u.gy, sz: 12, target: { gx: tx, gy: ty, hp: 0 }, dmg: 0, t: 0, dur: Math.max(0.3, Math.hypot(tx - u.gx, ty - u.gy) / 8), fire: b });
}

function ignite(b) {
  if (!S.buildings.includes(b) || !b.def.flammable) return;
  if (!(b.fire > 0)) spawnFloat("🔥 Fire!", b.gx + b.w / 2, b.gy + b.h / 2, "#ffb04a");
  b.fire = Math.max(b.fire, 1);
  sfx("fire");
  if (!S.warnedFire) {
    S.warnedFire = true;
    say(S.season === "maha"
      ? "Fire arrows! The monsoon rain will help, but villagers are running with water pots."
      : "Fire arrows on the thatch! In Yala it spreads fast. Villagers fetch water from the wewas: keep them full.", true);
  }
}

function tickFire() {
  const maha = S.season === "maha";
  for (const b of [...S.buildings]) {
    if (!(b.fire > 0)) continue;
    b.fire = Math.min(3, b.fire + (maha ? -0.35 : 0.12));
    if (b.fire <= 0) { b.fire = 0; continue; }
    if (b.fire >= 1.5) {
      for (const [x, y] of edgeTiles(b)) {
        const nb = S.occ[y][x];
        if (nb && nb !== b && nb.def.flammable && !(nb.fire > 0) && Math.random() < 0.05 * b.fire) ignite(nb);
      }
    }
    damageBuilding(b, 6 * b.fire, true);
  }
  assignFirefighters();
}

// Three water carriers per fire: idle villagers come out of the citadel
// first (temporary "bucket" workers), then nearby workers drop their jobs.
function assignFirefighters() {
  for (const w of S.workers) {
    if (w.fireTarget && !(w.fireTarget.fire > 0 && S.buildings.includes(w.fireTarget))) {
      w.fireTarget = null; w.carry = null;
      if (w.job === "shramadana" && w.siltTarget) goTo(w, w.siltTarget.gx + 1, w.siltTarget.gy + 2.25, "toSilt");
      else if (!w.temp) planJob(w);
    }
  }
  S.workers = S.workers.filter(w => w.job !== "bucket" || w.fireTarget); // water carriers go home when the fire is out
  for (const b of S.buildings) {
    if (!(b.fire > 0)) continue;
    let have = S.workers.filter(w => w.fireTarget === b).length;
    const cx = b.gx + b.w / 2, cy = b.gy + b.h / 2;
    while (have < 3 && idleVillagers() > 0) {
      seekWater(helper("bucket", { fireTarget: b }));
      have++;
    }
    const free = S.workers.filter(w => !w.fireTarget && w.b !== b && Math.hypot(w.gx - cx, w.gy - cy) < 11)
      .sort((p, q) => Math.hypot(p.gx - cx, p.gy - cy) - Math.hypot(q.gx - cx, q.gy - cy));
    for (const w of free) {
      if (have >= 3) break;
      if (w.target && w.target.reserved) w.target.reserved = false;
      w.target = null; w.carry = null; w.fireTarget = b; have++;
      seekWater(w);
    }
  }
}

function nearestWater(w) {
  let best = null, bd = Infinity;
  const consider = (x, y, src) => { const d = Math.hypot(x - w.gx, y - w.gy); if (d < bd) { bd = d; best = { x, y, ...src }; } };
  for (const b of S.buildings) {
    if (b.id === "wewa" && b.water >= 2) consider(b.gx + 1, b.gy + 2.25, { wewa: b });
    else if (b.def.water && b.id !== "wewa") { const id = S.netOf[b.gy][b.gx]; if (id !== -1 && S.nets[id].water >= 2) consider(b.gx + 0.5, b.gy + 0.5, { net: S.nets[id] }); }
  }
  if (!riverDry()) for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    if (S.tiles[y][x].t !== "river") continue;
    for (const [dx, dy] of DIRS4) if (inb(x + dx, y + dy) && S.tiles[y + dy][x + dx].t !== "river") { consider(x + 0.5 + dx * 0.45, y + 0.5 + dy * 0.45, {}); break; }
  }
  return best;
}

function seekWater(w) {
  const src = nearestWater(w);
  if (!src) { w.fireTarget = null; dismiss(w); return; }
  w.waterSrc = src;
  goTo(w, src.x, src.y, "toWater");
}

// ==================== RAIDS ====================
const nextWaveIn = () => (S.nextWave < S.L.waves.length ? S.L.waves[S.nextWave].t - S.waveClock : Infinity);
const foesAlive = () => S.units.some(u => u.team === "e");

function launchWave() {
  const w = S.L.waves[S.nextWave++];
  if (S.L.endless) {
    // keep one raid queued ahead, and harden each raid a little
    while (S.L.waves.length <= S.nextWave + 1) S.L.waves.push(skirmishWave(S.L.waves.length, S.L.seed, S.L.rivers[0].edge));
    S.L.hpScale = 1 + 0.07 * S.nextWave;
  }
  const list = [];
  for (const type of Object.keys(FOES)) for (let i = 0; i < (w[type] || 0); i++) list.push(type);
  if (S.revenge) { list.push(...REVENGE); S.revenge = false; } // the disawa's men, after his dam was broken
  S.stats.lastFrom = w.from;
  S.stats.lastSize = 0;
  const party = S.nextWave;
  S.parties = S.parties || {};
  S.parties[party] = { total: list.length, spawned: 0, fled: false };
  S.stats.lastSize = list.length;
  list.forEach((type, i) => S.spawnQueue.push({ at: S.time + i * 0.7, type, edge: w.from[i % w.from.length], party }));
  say(`Raid ${S.nextWave} of ${S.L.waves.length}: ${list.length} raiders from the ${w.from.join(" and ")}!`, true);
  sfx("conch");
}

// ==================== TRIBUTE ====================
// While a raid gathers (from level 2), rice and gold can turn it back. The
// raid counts as survived; the price grows each time and the shame costs harmony.
const TRIBUTE_WINDOW = 30;
function tributeCost() {
  const w = S.L.waves[S.nextWave];
  if (!w) return null;
  const n = Object.keys(FOES).reduce((a, k) => a + (w[k] || 0), 0);
  const k = Math.pow(2, S.tributes || 0); // doubles each time
  return { gold: Math.round(6 * n * k), rice: Math.round(4 * n * k) };
}
// The final assault of a campaign level can't be bought off.
const tributeOpen = () => S.mode === "play" && (S.idx >= 1 || S.L.skirmish) && !S.L.sandbox && nextWaveIn() <= TRIBUTE_WINDOW &&
  S.nextWave < S.L.waves.length - (S.L.endless ? 0 : 1);

function payTribute() {
  if (!tributeOpen()) return;
  const cost = tributeCost();
  if (!affordable(cost)) { say(`The raiders want ${costText(cost)} to turn back.`, true); return; }
  for (const [k, v] of Object.entries(cost)) S[k] -= v;
  const w = S.L.waves[S.nextWave++];
  S.waveClock = Math.max(S.waveClock, w.t);
  if (S.L.endless) while (S.L.waves.length <= S.nextWave + 1) S.L.waves.push(skirmishWave(S.L.waves.length, S.L.seed, S.L.rivers[0].edge));
  S.tributes = (S.tributes || 0) + 1;
  S.harmony = clamp(S.harmony - 5, 0, 100);
  S.stats.tributes++;
  spawnFloat(`-${costText(cost)}`, S.citadel.gx + 1, S.citadel.gy, "#e9b949");
  say(`The raiders take the tribute and turn back from the ${w.from.join(" and ")}. They will ask twice as much next time, and the final assault cannot be bought off.`);
  sfx("coin");
  checkVictory();
  syncHud();
}

// "north", or "N+E" when a raid comes from several sides (keeps the HUD row short).
const raidFromText = from => from.length === 1 ? from[0] : from.map(e => e[0].toUpperCase()).join("+");
// Where raiders from an edge can enter, in grid space: the strip edgeSpawn draws from.
function edgeStrip(edge) {
  const a = 6, b = MAP - 6;
  return edge === "east" ? [[MAP - 1, a], [MAP, a], [MAP, b], [MAP - 1, b]]
    : edge === "west" ? [[0, a], [1, a], [1, b], [0, b]]
    : edge === "north" ? [[a, 0], [b, 0], [b, 1], [a, 1]]
    : [[a, MAP - 1], [b, MAP - 1], [b, MAP], [a, MAP]];
}

function callRaidEarly() {
  if (!S || S.mode !== "play" || S.nextWave >= S.L.waves.length) return;
  S.waveClock = S.L.waves[S.nextWave].t;
  S.gold += 15;
  spawnFloat("+15🪙 for courage", S.citadel.gx + 1, S.citadel.gy, "#e9b949");
  launchWave();
}

const DROUGHT_CHANCE = 1 / 3;
// What the advisor says when the season turns: the first row that applies.
const SEASON_NEWS = [
  [rebuilt => rebuilt, "Over the monsoon the disawa has rebuilt his dam. He will shut it again in Yala.", false],
  [() => S.drought, () => `A drought year: the monsoon is late, and this Yala will last ${S.seasonLeft} seconds. Make the wewas last.`, true],
  [() => riverDry(), "Yala, and the disawa upstream has shut his dam: the river runs dry. Live on your wewas, send soldiers to break the dam, or send him a 🎁 gift (👑 tab).", true],
  [() => S.season === "maha", "The Maha monsoon breaks! The wewas fill and every paddy drinks.", false],
  [() => true, "Yala, the dry season. Only paddies beside water will grow now.", false]
];

// Soldiers eat more than villagers: a standing army has a real cost.
// Rations are dearer in the dry season, when the granary is under pressure.
const SOLDIER_RICE = { maha: 0.03, yala: 0.06 };

// ==================== ONE-SECOND TICK ====================
function tick() {
  S.seasonLeft--;
  if (S.seasonLeft <= 0) {
    S.season = SEASONS[S.season].next;
    S.seasonLeft = SEASONS[S.season].len;
    S.seasonNo++;
    // Skirmish: one Yala in three (seeded by the map) is a drought year, half as long again.
    S.drought = S.season === "yala" && !!S.L.skirmish && mulberry32(S.L.seed * 31 + S.seasonNo)() < DROUGHT_CHANCE;
    if (S.drought) S.seasonLeft = Math.round(S.seasonLeft * 1.5);
    const rebuilt = S.dam && S.season === "maha" && S.dam.hp < S.dam.maxHp;
    if (rebuilt) S.dam.hp = S.dam.maxHp;
    const [text, warn] = SEASON_NEWS.find(([when]) => when(rebuilt)).slice(1);
    say(typeof text === "function" ? text() : text, warn);
  }

  S.waveClock++;
  while (nextWaveIn() <= 0) launchWave();
  if (nextWaveIn() === SCOUT_AT && S.warnedWave !== S.nextWave) {
    S.warnedWave = S.nextWave;
    const from = S.L.waves[S.nextWave].from;
    const open = from.filter(e => { const d = edgeDefence(e); return !d.towers && !d.archers; });
    S.scoutOpen = open; // read by the playtest novice, which follows hints
    const fix = S.unlocked.buildings.has("tower") ? "Post archers there or raise a watchtower." : "Post archers there (select them, right-click).";
    say(open.length
      ? `Scouts report raiders from the ${from.join(" and ")} in ${SCOUT_AT} seconds, and the ${open.join(" and ")} side${open.length > 1 ? "s have" : " has"} no archers or towers! ${fix}`
      : `Scouts report raiders from the ${from.join(" and ")} in ${SCOUT_AT} seconds.`, true);
  }

  tickWater();
  tickFire();
  assignSeasonWork();
  drillSoldiers();
  spawnWild();
  updateCover();

  for (const u of S.units) {
    if (u.team !== "e") continue;
    if (S.flooded.has(Math.floor(u.gy) * MAP + Math.floor(u.gx))) u.hp -= 4;
  }

  // Economy & harmony
  const soldiers = S.units.filter(u => u.team === "p").length;
  S.rice = Math.max(0, S.rice - S.villagers * 0.04 - soldiers * SOLDIER_RICE[S.season]);
  S.gold += S.villagers * 0.02 * (S.harmony / 60);
  S.fear = Math.max(0, S.fear - 0.5);

  let target = 55 + Math.min(2, count("dagoba")) * BUILDINGS.dagoba.harmony - S.fear + (S.season === "maha" ? 3 : 0);
  if (edictOn("perahera")) target += EDICTS.perahera.harmonyTarget;
  target += Math.min(2, staffedPansalas()) * 5;
  target += Math.min(6, count("walawwa")) * BUILDINGS.walawwa.harmony;
  if (S.rice <= 0) target -= 35;
  else if (S.rice >= S.villagers * 3) target += 8;
  target = clamp(target, 5, 100);
  S.harmony += clamp(target - S.harmony, -1, 1);

  if (S.rice <= 0) {
    S.stats.hungry++;
    S.starveAcc += 0.25;
    if (S.starveAcc >= 1 && S.villagers > 0) {
      S.starveAcc = 0;
      S.villagers--;
      S.stats.starved++;
      if (!S.stats.starveSeason) S.stats.starveSeason = S.season;
      spawnFloat("A family left — no rice!", S.citadel.gx + 1, S.citadel.gy + 1, "#ff6b5b");
      say("The granary is empty and families are leaving. Plant paddies beside water!", true);
    }
  } else {
    S.starveAcc = 0;
    if (S.harmony >= 45 && S.villagers < S.cap && S.rice > S.villagers) {
      S.growAcc += 0.12 + S.harmony / 400;
      if (S.growAcc >= 1) {
        S.growAcc = 0;
        S.villagers++;
        spawnFloat("+1 villager", S.citadel.gx + 1, S.citadel.gy + 2, "#bff0a8");
      }
    }
  }
  staff();

  if (S.L.tutorial && S.tutorialStep < TUTORIAL.length && TUTORIAL[S.tutorialStep].when()) {
    say(TUTORIAL[S.tutorialStep++].text);
  }

  checkVictory();
  if (S.mode === "play" && S.time - (S.lastSave || 0) >= 15) saveRun();
  syncHud();
}

// ==================== OBJECTIVES & ENDINGS ====================
function objective(o) {
  const L = S.L;
  switch (o.type) {
    case "res": return { label: `${RES[o.key]} ${o.key}`, cur: Math.floor(S[o.key]), n: o.n };
    case "build": return { label: `${BUILDINGS[o.id].icon} ${BUILDINGS[o.id].name.split(" (")[0]}`, cur: count(o.id), n: o.n };
    case "water": return { label: "💧 water held", cur: Math.floor(totalWater()), n: o.n };
    case "harmony": return { label: `😊 Harmony ${o.n}+`, cur: Math.floor(S.harmony), n: o.n };
    case "pop": return { label: "👥 villagers", cur: S.villagers, n: o.n };
    case "catch": return { label: `🌧️ rain (${rainKept()}% kept)`, cur: Math.floor(S.rain.caught), n: o.n };
    case "sandbox": return { label: `🏗️ Sandbox · ${S.raidsSent || 0} raids sent from 👑`, cur: 0, n: Infinity };
    case "endless": {
      const busy = foesAlive() || S.spawnQueue.length > 0;
      return { label: `🛡️ ${Math.max(0, S.nextWave - (busy ? 1 : 0))} raids survived (best ${progress.skirmishBest || 0})`, cur: 0, n: Infinity };
    }
    case "waves": {
      const busy = foesAlive() || S.spawnQueue.length > 0;
      return { label: "🛡️ raids", cur: Math.max(0, S.nextWave - (busy ? 1 : 0)), n: L.waves.length };
    }
  }
  return { label: "?", cur: 0, n: 1 };
}

// Share of the rain that fell on your wewas that was kept (Parakramabahu's maxim).
const rainKept = () => { const t = S.rain.caught + S.rain.lost; return t > 0 ? Math.round((100 * S.rain.caught) / t) : 100; };
const totalWater = () => S.buildings.reduce((n, b) => n + (b.id === "wewa" ? b.water : 0), 0);

function checkVictory() {
  if (S.mode !== "play") return;
  if (S.L.objectives.every(o => { const r = objective(o); return r.cur >= r.n; })) endLevel(true);
}

// Which side of the citadel a tile is on, and what stands guard there.
// Shared by the scouts' warning and the defeat screen.
const SCOUT_AT = 45;
function sideTest(edge) {
  const c = S.citadel, cx = c.gx + 1, cy = c.gy + 1;
  return { east: (x, y) => x > cx + 1, west: (x, y) => x < cx - 1, north: (x, y) => y < cy - 1, south: (x, y) => y > cy + 1 }[edge] || (() => false);
}
function edgeDefence(edge) {
  const inSide = sideTest(edge);
  return {
    towers: S.buildings.filter(b => b.def.tower && b !== S.citadel && inSide(b.gx, b.gy)).length,
    archers: S.units.filter(u => u.team === "p" && u.def.ranged && inSide(u.gx, u.gy)).length,
    walls: S.buildings.filter(b => b.def.wall && inSide(b.gx, b.gy)).length
  };
}

// ==================== WHY THE CITADEL FELL ====================
// Hard but fair: the defeat screen names the likely causes, most telling first.
function defeatCauses() {
  const st = S.stats, out = [];
  if (st.starved >= 2) out.push([5, `🍚 The granary ran dry${st.starveSeason ? ` in ${st.starveSeason === "yala" ? "the Yala dry season" : "the Maha monsoon"}` : ""} and ${st.starved} famil${st.starved === 1 ? "y" : "ies"} left. Keep about one watered paddy per house.`]);
  else if (st.hungry >= 20) out.push([3, "🍚 The granary was empty for long stretches, so few new families came to work and fight."]);
  if (S.dam && S.dam.hp > 0 && st.starved >= 2) out.push([4, "🌊 The disawa's dam kept the river dry every Yala. Fill wewas in Maha, break the dam with soldiers, or send him a gift."]);
  if ((st.eaten || 0) >= 3) out.push([3, `🐘 Wild elephants ate ${st.eaten} paddies. A staffed pela by the fields keeps them off.`]);
  for (const e of st.lastFrom || []) {
    const { towers, archers, walls } = edgeDefence(e);
    if (!towers && !archers) out.push([4, `🏹 The ${e} side had no archers or watchtowers to meet the last raid.`]);
    else if (!walls && (st.lastSize || 0) >= 6) out.push([2, `🧱 No walls stood on the ${e} side, so the raiders walked straight in.`]);
  }
  const wallsLost = Object.entries(st.lost).filter(([id]) => BUILDINGS[id] && BUILDINGS[id].wall).reduce((a, [, n]) => a + n, 0);
  if (wallsLost >= 3) out.push([2, `🧱 Raiders broke through ${wallsLost} wall sections. Stone ramparts hold far longer than palisades.`]);
  if ((st.stoned || 0) >= 2) out.push([3, `🪨 Stone throwers knocked down ${st.stoned} buildings from beyond your towers' reach. Bolt towers and archers on the walls outrange them.`]);
  if ((st.trampled || 0) + (st.looted || 0) / 20 >= 3) out.push([2, `🌾 Raiders trampled ${st.trampled || 0} paddies and looted ${st.looted || 0} goods on the way in. A tower or archers by the fields on the raid side protect the harvest.`]);
  if (st.burned >= 2) out.push([3, `🔥 Fire took ${st.burned} buildings. Keep wewas full so villagers can carry water, and keep archers near the thatch.`]);
  const army = S.units.filter(u => u.team === "p").length;
  if (st.trained <= 2 && army <= 2) out.push([3, `⚔️ ${st.trained ? `Only ${st.trained} soldier${st.trained === 1 ? " was" : "s were"}` : "No soldiers were"} trained. A barracks and a few spearmen go a long way.`]);
  if (!out.length) out.push([1, `⚔️ The last raid (${st.lastSize || "many"} raiders from the ${(st.lastFrom || []).join(" and ") || "edges"}) was stronger than the defence. Flood a sluice or wall the approach.`]);
  return out.sort((a, b) => b[0] - a[0]).slice(0, 3).map(r => r[1]);
}

function endLevel(won) {
  if (S.mode !== "play") return;
  clearRun();
  S.mode = "end";
  S.paused = true;
  const pct = Math.max(0, S.citadel.hp) / S.citadel.maxHp;
  let stars = won ? (pct >= 0.9 ? 3 : pct >= 0.5 ? 2 : 1) : 0;
  // "Let not one drop of rain reach the sea unused": three stars need 70% kept.
  if (S.L.objectives.some(o => o.type === "catch") && rainKept() < 70) stars = Math.min(stars, 2);
  // a kingdom that buys peace is not sung about: tribute caps a level at two stars
  if (!S.L.endless && (S.stats.tributes || 0) > 0) stars = Math.min(stars, 2);
  S.starsEarned = stars;
  if (!won) S.causes = defeatCauses();
  if (S.L.endless) {
    S.survived = Math.max(0, S.nextWave - 1);
    S.newBest = S.survived > (progress.skirmishBest || 0);
    progress.skirmishBest = Math.max(progress.skirmishBest || 0, S.survived);
    saveProgress();
  } else if (won) {
    progress.stars[S.L.id] = Math.max(progress.stars[S.L.id] || 0, stars);
    progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length - 1, S.idx + 1));
    saveProgress();
  }
  sfx(won ? "win" : "lose");
  syncHud();
  showEnd(won, stars);
}

// ==================== MAIN LOOP ====================
function step(dt) {
  S.time += dt;
  S.tickAcc += dt;
  while (S.tickAcc >= 1 && S.mode === "play") { S.tickAcc -= 1; tick(); }
  while (S.spawnQueue.length && S.time >= S.spawnQueue[0].at) {
    const q = S.spawnQueue.shift();
    spawnFoe(q.type, q.edge, q.party);
  }
  for (const t of S.trees) if (t.stage < 100) t.stage = Math.min(100, t.stage + 0.6 * dt);
  for (const w of S.workers) updateWorker(w, dt);
  updateCombat(dt);
  updateFx(dt);
  for (let i = S.floats.length - 1; i >= 0; i--) {
    const f = S.floats[i];
    f.z += 22 * dt; f.life -= dt;
    if (f.life <= 0) S.floats.splice(i, 1);
  }
}

let lastTs = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const realDt = Math.min(0.05, (now - lastTs) / 1000);
  lastTs = now;
  if (S && S.mode === "play" && !S.paused) {
    // Sub-step so fast speeds don't let units skip tiles or shots resolve early.
    for (let sim = realDt * S.speed; sim > 0 && S.mode === "play"; sim -= 0.1) step(Math.min(0.1, sim));
  }
  if (S) { render(now); renderMinimap(); }
  if (typeof SOUND !== "undefined") SOUND.update();
}

// Rendering lives in render.js.

// ==================== CAMERA ====================
function resizeCanvas() {
  const vp = document.getElementById("viewport");
  const oldW = view.w, oldH = view.h;
  view.dpr = window.devicePixelRatio || 1;
  view.w = vp.clientWidth;
  view.h = vp.clientHeight;
  canvas.width = Math.round(view.w * view.dpr);
  canvas.height = Math.round(view.h * view.dpr);
  if (oldW) { view.camX += (view.w - oldW) / 2 / view.zoom; view.camY += (view.h - oldH) / 2 / view.zoom; }
}

function centerCamera(gx, gy) {
  if (gx === undefined) { gx = S.citadel.gx + 1; gy = S.citadel.gy + 1; }
  view.camX = view.w / 2 / view.zoom - (gx - gy) * (TW / 2);
  view.camY = view.h / 2 / view.zoom - (gx + gy) * (TH / 2);
}

// Zoom about a screen point (CSS pixels) so the world under the cursor stays put.
function zoomAt(factor, sx = view.w / 2, sy = view.h / 2) {
  const z0 = view.zoom, z1 = clamp(z0 * factor, 0.45, 2.6);
  view.camX += sx / z1 - sx / z0;
  view.camY += sy / z1 - sy / z0;
  view.zoom = z1;
}

// ==================== HUD ====================
// The 👑 tab appears once there is something in it: a decree, a market's orders, or the sandbox.
const realmTabUseful = () => !!(S.L.sandbox || S.unlocked.edicts.size || count("market"));

function buildTabs() {
  const nav = document.getElementById("tabs");
  nav.innerHTML = "";
  S.realmTab = realmTabUseful();
  for (const c of CATS) {
    if (c.id === "realm" && !S.realmTab) continue;
    const btn = document.createElement("button");
    btn.className = `tab ${S.cat === c.id && !S.demolish && !S.improve ? "active" : ""}`;
    btn.innerHTML = `<span>${c.icon}</span><span>${c.label}</span>`;
    btn.addEventListener("click", () => { S.cat = c.id; S.tool = null; S.demolish = false; S.improve = false; buildTabs(); renderPalette(); });
    nav.appendChild(btn);
  }
  const clear = document.createElement("button");
  clear.className = `tab clear ${S.demolish ? "active" : ""}`;
  clear.title = "Demolish (half refund)";
  clear.innerHTML = "<span>⛏️</span><span>Clear</span>";
  clear.addEventListener("click", () => { S.demolish = !S.demolish; S.improve = false; S.tool = null; buildTabs(); renderPalette(); });
  nav.appendChild(clear);
  const imp = document.createElement("button");
  imp.className = `tab clear ${S.improve ? "active" : ""}`;
  imp.title = "Improve: repair a damaged building, or upgrade it (palisade → rampart, house → walawwa); drag along walls";
  imp.innerHTML = "<span>🔨</span><span>Improve</span>";
  imp.addEventListener("click", () => { S.improve = !S.improve; S.demolish = false; S.tool = null; buildTabs(); renderPalette(); });
  nav.appendChild(imp);
}

function affordable(cost) {
  return Object.entries(cost).every(([k, v]) => S[k] >= v);
}

// The trader never sells the families' food: two rice per villager stay in
// store whatever the 👑 sell limit says.
const RICE_RESERVE = 2;
const sellAbove = () => Math.max((S.market || { sell: 30 }).sell, S.villagers * RICE_RESERVE);

// Pola orders: two thresholds the market's trader follows.
function marketCard(pal) {
  const m = S.market || (S.market = { sell: 30, buy: 0 });
  const c = document.createElement("div");
  c.className = "card wide";
  c.title = `The trader sells 5 rice for 8 gold above the first level (never below ${RICE_RESERVE} per villager, now ${sellAbove()}), and buys 5 timber or stone for 12 gold below the second.`;
  c.innerHTML = `<div class="card-head">⚖️ Pola orders</div><div class="card-desc">
    <span>Sell 🍚 above</span><button class="btn" data-m="sell,-10">−</button><b>${m.sell}</b><button class="btn" data-m="sell,10">+</button>
    <span>Buy 🪵🪨 below</span><button class="btn" data-m="buy,-10">−</button><b>${m.buy}</b><button class="btn" data-m="buy,10">+</button></div>`;
  c.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => {
    const [k, d] = b.dataset.m.split(",");
    m[k] = clamp(m[k] + Number(d), 0, k === "sell" ? 500 : 300);
    renderPalette();
  }));
  pal.appendChild(c);
}

function renderPalette() {
  const pal = document.getElementById("palette");
  pal.innerHTML = "";
  if (S.cat === "realm" && S.L.sandbox) {
    if (count("market")) marketCard(pal);
    S.raidEdge = S.raidEdge || "east";
    const card = (html, onClick) => { const c = document.createElement("div"); c.className = "card wide"; c.innerHTML = html; pal.appendChild(c); onClick(c); };
    card(`<div class="card-head">🚩 Raid edge</div><div class="card-desc">${["north", "east", "south", "west"].map(e => `<button class="btn ${S.raidEdge === e ? "primary" : ""}" data-edge="${e}">${e}</button>`).join(" ")}</div>`,
      c => c.querySelectorAll("[data-edge]").forEach(b => b.addEventListener("click", () => { S.raidEdge = b.dataset.edge; renderPalette(); })));
    card(`<div class="card-head">⚔️ Send a raid</div><div class="card-desc">${Object.entries(RAID_SIZES).map(([k, n]) => `<button class="btn" data-size="${k}">${k} (${n})</button>`).join(" ")}</div>`,
      c => c.querySelectorAll("[data-size]").forEach(b => b.addEventListener("click", () => { sendRaid(b.dataset.size, S.raidEdge); syncHud(); })));
    card(`<div class="card-head">🏺 Royal stores</div><div class="card-desc"><button class="btn" id="sbFill">+500 of everything</button> <button class="btn" id="sbSeason">Change season</button></div>`, c => {
      c.querySelector("#sbFill").addEventListener("click", () => { for (const k of Object.keys(RES)) S[k] += 500; syncHud(); });
      c.querySelector("#sbSeason").addEventListener("click", () => { S.seasonLeft = 1; tick(); });
    });
  } else if (S.cat === "realm") {
    if (count("market")) marketCard(pal);
    for (const [id, e] of Object.entries(EDICTS)) {
      if (!S.unlocked.edicts.has(id)) continue;
      const why = edictBlocked(id);
      const card = document.createElement("button");
      card.className = `card ${edictOn(id) ? "selected" : ""}`;
      card.dataset.edict = id;
      card.innerHTML = `<div class="card-head">${e.icon} ${e.name}</div><div class="card-desc">${e.desc}</div><div class="card-cost">${costText(e.cost)}${why ? ` · <em>${why}</em>` : ""}</div>`;
      card.addEventListener("click", () => proclaim(id));
      pal.appendChild(card);
    }
  } else if (S.cat === "army") {
    const sel = S.units.filter(u => u.team === "p" && u.sel), held = sel.length && sel.every(u => u.hold);
    const stance = document.createElement("button");
    stance.className = `card ${held ? "selected" : ""}`;
    stance.innerHTML = `<div class="card-head">${held ? "⚔️ Back on guard" : "✋ Hold position"} (H)</div><div class="card-desc">Selected soldiers stay on their post and only strike what reaches them.</div><div class="card-cost">${sel.length ? `${sel.length} selected` : "select soldiers first"}</div>`;
    stance.addEventListener("click", toggleHold);
    pal.appendChild(stance);
    for (const [id, t] of Object.entries(TROOPS)) {
      if (!S.unlocked.troops.has(id)) continue;
      const card = document.createElement("button");
      card.className = "card";
      card.dataset.troop = id;
      card.innerHTML = `<div class="card-head">${t.icon} ${t.name}</div><div class="card-desc">${t.desc}</div><div class="card-cost">${costText(troopCost(id))} + 1 👥</div>`;
      card.addEventListener("click", () => recruit(id));
      pal.appendChild(card);
    }
  } else {
    for (const [id, b] of Object.entries(BUILDINGS)) {
      if (b.cat !== S.cat || !S.unlocked.buildings.has(id)) continue;
      const card = document.createElement("button");
      card.className = `card ${S.tool === id ? "selected" : ""}`;
      card.dataset.build = id;
      card.title = b.desc;
      card.innerHTML = `<div class="card-head">${b.icon} ${b.name}</div><div class="card-desc">${b.desc}</div><div class="card-cost">${costText(buildCost(b))}</div>`;
      card.addEventListener("click", () => { S.tool = S.tool === id ? null : id; S.demolish = false; S.improve = false; buildTabs(); renderPalette(); });
      pal.appendChild(card);
    }
  }
  if (!pal.children.length) pal.innerHTML = `<div class="card-desc">Nothing unlocked here yet. Later levels add more.</div>`;
  updateAffordability();
}

function updateAffordability() {
  for (const card of document.querySelectorAll("#palette .card")) {
    if (!card.dataset.edict && !card.dataset.troop && !card.dataset.build) continue; // sandbox controls
    if (card.dataset.edict) { card.classList.toggle("poor", !!edictBlocked(card.dataset.edict) && !edictOn(card.dataset.edict)); continue; }
    const cost = card.dataset.troop ? troopCost(card.dataset.troop) : buildCost(BUILDINGS[card.dataset.build]);
    card.classList.toggle("poor", !affordable(cost));
  }
}

// ==================== ROYAL DECREES ====================
const edictOn = id => (S.edictEnd[id] || 0) > S.time;
const workMult = () => (edictOn("rajakariya") ? EDICTS.rajakariya.work : 1);

// Why a decree can't be proclaimed right now, or null.
function edictBlocked(id) {
  const e = EDICTS[id];
  if (edictOn(id)) return `In force for ${Math.ceil(S.edictEnd[id] - S.time)}s`;
  if (e.once === "maha" && S.season !== "maha") return "Only in the Maha monsoon";
  if (e.once === "yala" && S.season !== "yala") return "Only in the Yala dry season";
  if (S.edictUsed[id] === S.seasonNo) return "Already proclaimed this season";
  if (!affordable(e.cost)) return `Needs ${costText(e.cost)}`;
  return null;
}

function proclaim(id) {
  const e = EDICTS[id];
  const why = edictBlocked(id);
  if (why) { say(`${e.name}: ${why.toLowerCase()}.`, true); return; }
  for (const [k, v] of Object.entries(e.cost)) S[k] -= v;
  S.edictEnd[id] = S.time + e.dur;
  S.edictUsed[id] = S.seasonNo;
  S.harmony = clamp(S.harmony + e.harmony, 0, 100);
  say(e.said);
  spawnFloat(`${e.icon} ${e.name.split(" (")[0]}`, S.citadel.gx + 1, S.citadel.gy, "#e9b949");
  sfx("conch");
  renderPalette();
  syncHud();
}

// Soldiers' price: a staffed kammala (smithy) forges their arms, 30% off the gold.
const staffedPansalas = () => S.buildings.filter(b => b.id === "pansala" && b.worker).length;
function troopCost(id) {
  const c = TROOPS[id].cost;
  if (!S.buildings.some(b => b.id === "kammala" && b.worker)) return c;
  return { ...c, gold: Math.ceil(c.gold * 0.7) };
}

function recruit(id) {
  const t = TROOPS[id];
  const cost = troopCost(id);
  const barracks = S.buildings.filter(b => b.id === "barracks");
  if (!barracks.length) { say("Build an Angam Maduwa (Defence tab) first.", true); return; }
  if (!affordable(cost)) { say(`A ${t.name} needs ${costText(cost)}.`, true); return; }
  if (idleVillagers() < 1 && S.villagers < 1) { say("No villagers left to take up arms.", true); return; }
  if (idleVillagers() < 1) {
    // Pull the most recently staffed worker off their job.
    releaseWorker(S.workers.pop());
  }
  for (const [k, v] of Object.entries(cost)) S[k] -= v;
  S.villagers--;
  S.stats.trained++;
  const b = barracks[0];
  spawnSoldier(id, b.gx + 1 + Math.random() * 0.5, b.gy + b.h + 0.3 + Math.random() * 0.4);
  staff();
  sfx("build");
  syncHud();
}

function syncHud() {
  document.getElementById("levelName").textContent = levelTitle();
  document.getElementById("seasonBadge").textContent = `${S.drought ? "☀️ Drought year" : SEASONS[S.season].label} · ${S.seasonLeft}s`;
  document.getElementById("objectives").innerHTML = S.L.objectives.map(o => {
    const r = objective(o);
    return `<li class="${r.cur >= r.n ? "done" : ""}">${r.label}${r.n === Infinity ? "" : ` ${Math.min(r.cur, r.n)}/${r.n}`}</li>`;
  }).join("");
  document.getElementById("resources").innerHTML = Object.entries(RES)
    .map(([k, ic]) => `<span title="${k}">${ic} <strong>${Math.floor(S[k])}</strong></span>`).join("") +
    `<span title="water held in wewas">💧 <strong>${Math.floor(totalWater())}</strong></span>`;
  const hv = Math.round(S.harmony);
  document.getElementById("harmonyVal").textContent = hv;
  const fill = document.getElementById("harmonyFill");
  fill.style.width = `${hv}%`;
  fill.style.background = hv >= 60 ? "#6cc070" : hv >= 40 ? "#e9b949" : "#d9473a";
  document.getElementById("popVal").textContent = `${S.villagers}/${S.cap} (${Math.max(0, idleVillagers())} idle)`;
  document.getElementById("armyVal").textContent = S.units.filter(u => u.team === "p").length;
  document.getElementById("citadelVal").textContent = `${Math.max(0, Math.round(100 * S.citadel.hp / S.citadel.maxHp))}%`;
  const n = nextWaveIn();
  document.getElementById("raidVal").textContent = n === Infinity
    ? (foesAlive() || S.spawnQueue.length ? "Under attack!" : "None left")
    : `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")} · ${raidFromText(S.L.waves[S.nextWave].from)}`;
  document.getElementById("conchBtn").disabled = n === Infinity || S.mode !== "play";
  const tb = document.getElementById("tributeBtn"), open = tributeOpen();
  tb.hidden = !open;
  if (open) {
    const c = tributeCost();
    tb.textContent = `🪙 Pay ${costText(c)}`;
    tb.disabled = !affordable(c);
    tb.title = "Pay to turn this raid back: the price doubles each time, −5 harmony, and the level can earn at most two stars.";
  }
  document.getElementById("pauseBtn").textContent = S.paused ? "▶" : "⏸";
  document.getElementById("pauseBtn").disabled = S.mode !== "play";
  document.getElementById("speedBtn").textContent = `⏩ ${S.speed}×`;
  if (S.realmTab !== realmTabUseful()) buildTabs();
  // decree cards show live timers; building costs change while rajakariya runs
  if ((S.cat === "realm" && !S.L.sandbox) || (S.cat !== "army" && S.cat !== "realm" && S.lastDiscount !== edictOn("rajakariya"))) { S.lastDiscount = edictOn("rajakariya"); renderPalette(); }
  else updateAffordability();
}

let advisorTimer = null;
function say(text, warn = false) {
  const el = document.getElementById("advisor");
  document.getElementById("advisorText").textContent = text;
  el.classList.toggle("warn", warn);
  el.classList.remove("hidden");
  clearTimeout(advisorTimer);
  advisorTimer = setTimeout(() => el.classList.add("hidden"), 6500);
}

function spawnFloat(text, gx, gy, color) {
  S.floats.push({ text, gx, gy, z: 24, color, life: 1.6 });
}

function describe(b) {
  const lines = [`<b>${b.def.icon} ${b.def.name}</b>`, `HP ${Math.ceil(b.hp)}/${b.maxHp}`];
  if (S.improve) lines.push(b.hp < b.maxHp ? `🔨 Repair: ${costText(repairCost(b)) || "free"}` : b.def.upgrade ? `🔨 Upgrade to ${BUILDINGS[b.def.upgrade.to].name}: ${costText(b.def.upgrade.cost)}` : "Nothing to improve");
  if (b.fire > 0) lines.push(`🔥 On fire (${b.fire >= 2 ? "raging" : "burning"}). Villagers are carrying water.`);
  if (b.def.worker) lines.push(b.worker ? (b.id === "pansala" ? (b.worker.alms ? "The monk is on his alms round" : "The monk is in meditation") : "Staffed") : "💤 No villager free. Build houses.");
  if (b.id === "wewa") {
    lines.push(`Water ${Math.round(b.water)}/${Math.round(wewaCap(b))}${riverBeside(b) ? " · river-fed" : ""}${b.silt >= 1 ? ` · silt ${Math.round(b.silt)} (idle villagers dig it out in Yala)` : ""}`);
    const id = S.netOf[b.gy][b.gx], linked = id !== -1 ? S.nets[id].wewas.size - 1 : 0;
    lines.push(linked ? `Spills into ${linked} linked wewa${linked > 1 ? "s" : ""} when full` : "When full, rain runs off. Link another wewa by canal.");
  }
  if (b.id === "paddy") lines.push(`Growth ${Math.round(b.growth)}% · ${b.irrigated ? "irrigated" : "dry"}`);
  if (b.id === "sluice") lines.push(b.open ? "Open: flooding canals. Click to close." : "Closed. Click to flood the canals.");
  if (b.def.moat) lines.push(moatWet(b) ? "🌊 Holding water: raiders wade at a crawl" : "Dry ditch: link it to a wewa with water");
  if (b.def.water && b.id !== "wewa") {
    const id = S.netOf[b.gy][b.gx];
    lines.push(id !== -1 && S.nets[id].wewas.size ? `Network water ${Math.round(S.nets[id].water)}` : "Not connected to a wewa");
  }
  return lines.join("<br>");
}

function updateTooltip() {
  const tip = document.getElementById("tooltip");
  const h = input.hover;
  const b = !S.tool && S.mode === "play" ? buildingAt(h.gx, h.gy) : null;
  if (!b) { tip.classList.add("hidden"); return; }
  tip.innerHTML = describe(b);
  tip.style.left = `${Math.min(h.x + 16, view.w - 270)}px`;
  tip.style.top = `${Math.max(4, h.y - 20)}px`;
  tip.classList.remove("hidden");
}

// ==================== OVERLAYS ====================
const overlay = document.getElementById("overlay");

function stars(n) { return "★".repeat(n) + "☆".repeat(3 - n); }

function showMenu() {
  if (S) { S.paused = true; if (S.mode === "play") S.mode = "menu"; saveRun(); }
  const run = savedRun();
  const canContinue = run && !(S && S.mode === "menu");
  overlay.classList.remove("hidden");
  overlay.innerHTML = `
    <div class="card-screen">
      <h1>Balakotuwa — Keepers of the Wewa</h1>
      <div class="tagline">Catch the monsoon, feed the kingdom, hold the citadel.</div>
      ${canContinue ? `<div class="actions"><button class="btn primary" id="continueBtn">▶ Continue ${run.name} · ${Math.floor(run.st.time / 60)} min in</button></div>` : ""}
      <div class="level-list">
        ${LEVELS.map((L, i) => `
          <button class="level-card" data-level="${i}" ${i > progress.unlocked ? "disabled" : ""}>
            <div class="lc-num">Level ${i + 1}${i > progress.unlocked ? " · 🔒" : ""}</div>
            <div class="lc-name">${L.name}</div>
            <div class="lc-era">${L.era}</div>
            <div class="lc-stars">${stars(progress.stars[L.id] || 0)}</div>
          </button>`).join("")}
        <button class="level-card" id="skirmishCard">
          <div class="lc-num">Skirmish</div>
          <div class="lc-name">Endless raids</div>
          <div class="lc-era">Random map, everything unlocked</div>
          <div class="lc-stars">Best: ${progress.skirmishBest || 0} raids</div>
        </button>
        <button class="level-card" id="sandboxCard">
          <div class="lc-num">Sandbox</div>
          <div class="lc-name">Royal sandbox</div>
          <div class="lc-era">Full stores; send raids yourself</div>
          <div class="lc-stars">🏗️</div>
        </button>
      </div>
      <details class="how">
        <summary>How to play</summary>
        <ul>
          <li><b>Two seasons.</b> In the 🌧️ Maha monsoon, rain fills every wewa and all paddies grow. In the ☀️ Yala dry season, paddies grow only beside water.</li>
          <li><b>Water.</b> Wewas store rain. Canals carry it to paddies; each watered paddy drinks from the network. Wewas beside the river fill all year.</li>
          <li><b>Villagers</b> staff farms, woodcutters, quarries and markets. Each soldier you train is one villager fewer. Houses raise the cap.</li>
          <li><b>Harmony</b> rises with full granaries and dagobas, and falls with hunger and destruction. People only settle when it is 45 or more.</li>
          <li><b>Raiders</b> follow the cheapest path to the citadel and break through walls only when there's no way round. Open a <b>sluice</b> to flood canals under them.</li>
          <li>Finish every objective and survive every raid to win. Stars depend on how much of the citadel is left standing.</li>
        </ul>
      </details>
      ${S && S.mode === "menu" ? `<div class="actions"><button class="btn primary" id="resumeBtn">▶ Resume ${S.L.sandbox ? "sandbox" : S.L.skirmish ? "skirmish" : `level ${S.idx + 1}`}</button></div>` : ""}
    </div>`;
  overlay.querySelectorAll(".level-card[data-level]").forEach(btn => btn.addEventListener("click", () => startLevel(Number(btn.dataset.level))));
  document.getElementById("skirmishCard").addEventListener("click", () => startSkirmish());
  document.getElementById("sandboxCard").addEventListener("click", () => startSandbox());
  const cont = document.getElementById("continueBtn");
  if (cont) cont.addEventListener("click", continueRun);
  const resume = document.getElementById("resumeBtn");
  if (resume) resume.addEventListener("click", () => { S.mode = "play"; S.paused = false; overlay.classList.add("hidden"); syncHud(); });
}

function showBriefing() {
  const L = S.L;
  overlay.classList.remove("hidden");
  const unlocks = [...(L.unlocks.buildings || []).map(id => BUILDINGS[id].name), ...(L.unlocks.troops || []).map(id => TROOPS[id].name)];
  overlay.innerHTML = `
    <div class="card-screen">
      <div class="lc-num">${L.sandbox ? "Sandbox" : L.skirmish ? "Skirmish" : `Level ${S.idx + 1}`} · ${L.era}</div>
      <h2>${L.name}</h2>
      <p>${L.intro}</p>
      <b>Objectives</b>
      <ul>${L.objectives.map(o => { const r = objective(o); return `<li>${r.label}${r.n === Infinity ? "" : `: ${r.n}`}</li>`; }).join("")}</ul>
      ${unlocks.length ? `<b>New this level</b><ul><li>${unlocks.join("</li><li>")}</li></ul>` : ""}
      <div class="actions">
        <button class="btn primary" id="beginBtn">Begin</button>
        <button class="btn" id="backBtn">Back to campaign</button>
      </div>
    </div>`;
  document.getElementById("beginBtn").addEventListener("click", () => {
    overlay.classList.add("hidden");
    S.mode = "play";
    S.paused = false;
    unlockAudio();
    tick();
  });
  document.getElementById("backBtn").addEventListener("click", showMenu);
}

function showEnd(won, starCount) {
  overlay.classList.remove("hidden");
  if (S.L.endless) {
    overlay.innerHTML = `
      <div class="card-screen">
        <h2>The Maligawa has fallen</h2>
        <p>You held the valley through <b>${S.survived}</b> raid${S.survived === 1 ? "" : "s"}.${S.newBest ? " A new best!" : ` Best: ${progress.skirmishBest}.`}</p>
        ${S.causes ? `<div class="causes"><b>Why it fell</b><ul>${S.causes.map(c => `<li>${c}</li>`).join("")}</ul></div>` : ""}
        <div class="actions">
          <button class="btn primary" id="newMapBtn">New map ▶</button>
          <button class="btn" id="retryBtn">↻ Same map</button>
          <button class="btn" id="toMenuBtn">Campaign</button>
        </div>
      </div>`;
    document.getElementById("newMapBtn").addEventListener("click", () => startSkirmish());
    document.getElementById("retryBtn").addEventListener("click", restartLevel);
    document.getElementById("toMenuBtn").addEventListener("click", showMenu);
    return;
  }
  const hasNext = won && S.idx + 1 < LEVELS.length;
  overlay.innerHTML = `
    <div class="card-screen">
      <h2>${won ? "Victory!" : "The citadel has fallen"}</h2>
      ${won ? `<div class="lc-stars" style="font-size:28px">${stars(starCount)}</div>` : ""}
      <p>${won
        ? (S.idx + 1 === LEVELS.length ? "The hill kingdom endures. You have completed the campaign." : "The kingdom is fed and the walls still stand. A new region awaits.")
        : "Raiders breached the Maligawa."}</p>
      ${!won && S.causes ? `<div class="causes"><b>Why it fell</b><ul>${S.causes.map(c => `<li>${c}</li>`).join("")}</ul></div>` : ""}
      ${S.L.objectives.some(o => o.type === "catch") && S.rain.caught + S.rain.lost > 0 ? `<p>🌧️ Rain kept: <b>${rainKept()}%</b>${S.L.objectives.some(o => o.type === "catch") ? (rainKept() >= 70 ? " · Parakramabahu would be pleased." : " · Below 70%: too much rain reached the sea for three stars.") : ""}</p>` : ""}
      ${won && !S.L.endless && S.stats.tributes ? `<p>🪙 Tribute paid ${S.stats.tributes} time${S.stats.tributes > 1 ? "s" : ""}: a kingdom that buys peace earns at most two stars.</p>` : ""}
      <div class="actions">
        ${hasNext ? `<button class="btn primary" id="nextBtn">Next level ▶</button>` : ""}
        <button class="btn" id="retryBtn">↻ Replay</button>
        <button class="btn" id="toMenuBtn">Campaign</button>
      </div>
    </div>`;
  if (hasNext) document.getElementById("nextBtn").addEventListener("click", () => startLevel(S.idx + 1));
  document.getElementById("retryBtn").addEventListener("click", restartLevel);
  document.getElementById("toMenuBtn").addEventListener("click", showMenu);
}

// ==================== AUDIO ====================
function unlockAudio() {
  if (!audio.on) return;
  try { audio.ctx = audio.ctx || new AudioContext(); audio.ctx.resume(); } catch (e) { audio.on = false; return; }
  if (typeof SOUND !== "undefined") SOUND.init();
}
// Effects are synthesised in audio.js.
function sfx(kind) {
  if (audio.on && typeof SOUND !== "undefined") SOUND.play(kind);
}

// ==================== INPUT ====================
// x/y are unzoomed world-screen pixels (what iso() returns); sx/sy are CSS pixels.
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  return { x: sx / view.zoom, y: sy / view.zoom, sx, sy };
}

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const { sx, sy } = canvasPoint(e);
  zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, sx, sy);
}, { passive: false });

canvas.addEventListener("mousemove", e => {
  if (!S) return;
  const { x, y, sx, sy } = canvasPoint(e);
  if (input.panning) {
    view.camX += x - input.panFrom.x;
    view.camY += y - input.panFrom.y;
    input.panFrom = { x, y };
    return;
  }
  const g = screenToGrid(x, y);
  input.hover = { gx: g.gx, gy: g.gy, x: sx, y: sy };
  if (input.painting && (S.tool || S.improve)) paintTo(g.gx, g.gy);
  if (input.drag) { input.drag.x2 = x; input.drag.y2 = y; }
  updateTooltip();
});

// Fill every tile between the last painted tile and this one, so fast drags leave no gaps.
function paintTo(gx, gy) {
  let [x, y] = input.lastPaint.split(",").map(Number);
  while (x !== gx || y !== gy) {
    if (Math.abs(gx - x) >= Math.abs(gy - y)) x += Math.sign(gx - x); else y += Math.sign(gy - y);
    if (S.improve) improveAt(x, y, true); else tryBuild(x, y, true);
  }
  input.lastPaint = `${gx},${gy}`;
}

canvas.addEventListener("mouseleave", () => {
  input.hover = { gx: -1, gy: -1, x: 0, y: 0 };
  document.getElementById("tooltip").classList.add("hidden");
});

canvas.addEventListener("mousedown", e => {
  if (!S || S.mode !== "play") return;
  const { x, y } = canvasPoint(e);
  const g = screenToGrid(x, y);
  if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
    e.preventDefault();
    input.panning = true;
    input.panFrom = { x, y };
    return;
  }
  if (e.button === 0) {
    if (S.tool) {
      if (tryBuild(g.gx, g.gy) && BUILDINGS[S.tool].paint) { input.painting = true; input.lastPaint = `${g.gx},${g.gy}`; }
      return;
    }
    if (S.demolish) { demolishAt(g.gx, g.gy); return; }
    if (S.improve) {
      improveAt(g.gx, g.gy);
      input.painting = true; input.lastPaint = `${g.gx},${g.gy}`;
      return;
    }
    const b = buildingAt(g.gx, g.gy);
    if (b && b.id === "sluice") {
      b.open = !b.open;
      updateNetWater();
      say(b.open ? "Sluice open! The canals flood." : "Sluice closed. Water is held in the wewas.");
      return;
    }
    input.drag = { x1: x, y1: y, x2: x, y2: y };
  } else if (e.button === 2) {
    if (S.tool || S.demolish || S.improve) {
      S.tool = null; S.demolish = false; S.improve = false;
      buildTabs(); renderPalette();
      return;
    }
    const sel = S.units.filter(u => u.team === "p" && u.sel);
    const cols = Math.ceil(Math.sqrt(sel.length));
    sel.forEach((u, i) => {
      u.tx = clamp(g.ex + (i % cols) * 0.45 - (cols - 1) * 0.22, 0.2, MAP - 0.2);
      u.ty = clamp(g.ey + Math.floor(i / cols) * 0.45, 0.2, MAP - 0.2);
      u.ordered = true;
    });
    if (sel.length) spawnFloat("🚩", g.ex, g.ey, "#6cc070");
  }
});

window.addEventListener("mouseup", () => {
  input.panning = false;
  input.painting = false;
  if (!input.drag || !S) return;
  const { x1, y1, x2, y2 } = input.drag;
  input.drag = null;
  const single = Math.abs(x2 - x1) < 8 && Math.abs(y2 - y1) < 8;
  let best = null, bd = 22;
  for (const u of S.units) {
    if (u.team !== "p") continue;
    const p = iso(u.gx, u.gy, u.z);
    if (single) {
      u.sel = false;
      const d = Math.hypot(p.x - x1, p.y - 8 - y1);
      if (d < bd) { bd = d; best = u; }
    } else {
      u.sel = p.x >= Math.min(x1, x2) && p.x <= Math.max(x1, x2) && p.y >= Math.min(y1, y2) && p.y <= Math.max(y1, y2);
    }
  }
  if (best) best.sel = true;
  if (S.cat === "army") renderPalette(); // the stance card counts the selection
});

canvas.addEventListener("contextmenu", e => e.preventDefault());

const PAN_KEYS = { arrowleft: [1, 0], a: [1, 0], arrowright: [-1, 0], d: [-1, 0], arrowup: [0, 1], w: [0, 1], arrowdown: [0, -1], s: [0, -1] };
window.addEventListener("keydown", e => {
  if (!S) return;
  const k = e.key.toLowerCase();
  if (PAN_KEYS[k]) {
    e.preventDefault();
    view.camX += PAN_KEYS[k][0] * 32;
    view.camY += PAN_KEYS[k][1] * 32;
  } else if (k === " " && S.mode === "play") {
    e.preventDefault();
    togglePause();
  } else if (k === "escape") {
    S.tool = null; S.demolish = false; S.improve = false;
    for (const u of S.units) u.sel = false;
    buildTabs(); renderPalette();
  } else if (k === "c") {
    centerCamera();
  } else if (k === "h" && S.mode === "play") {
    toggleHold();
  } else if (/^Digit[1-9]$/.test(e.code)) {
    controlGroup(Number(e.code.slice(5)), e.ctrlKey || e.metaKey || e.shiftKey);
    e.preventDefault();
  }
});

// Stances. Guard (the default): melee soldiers step out to meet raiders near
// their post. Hold (H): they stay on the post and only strike what reaches them.
function toggleHold() {
  const sel = S.units.filter(u => u.team === "p" && u.sel);
  if (!sel.length) { say("Select soldiers first, then press H to hold them on their post."); return; }
  const hold = !sel.every(u => u.hold);
  for (const u of sel) u.hold = hold;
  const gx = sel.reduce((a, u) => a + u.gx, 0) / sel.length, gy = sel.reduce((a, u) => a + u.gy, 0) / sel.length;
  spawnFloat(hold ? `✋ ${sel.length} holding` : `⚔️ ${sel.length} on guard`, gx, gy, "#9fc8ff");
  if (S.cat === "army") renderPalette();
}

// Control groups: Ctrl/Shift+1..9 stores the selected soldiers, 1..9 selects
// them again, pressing the same number twice centres the camera on them.
const lastGroupKey = { n: 0, at: 0 };
function controlGroup(n, assign) {
  S.groups = S.groups || {};
  if (assign) {
    const sel = S.units.filter(u => u.team === "p" && u.sel).map(u => u.uid);
    S.groups[n] = sel;
    spawnFloat(`Group ${n}: ${sel.length}`, S.citadel.gx + 1, S.citadel.gy, "#bff0a8");
    return;
  }
  const ids = new Set(S.groups[n] || []);
  const members = S.units.filter(u => u.team === "p" && ids.has(u.uid));
  if (!members.length) return;
  for (const u of S.units) u.sel = ids.has(u.uid) && u.team === "p";
  if (S.cat === "army") renderPalette();
  const now = performance.now();
  if (lastGroupKey.n === n && now - lastGroupKey.at < 400) {
    centerCamera(members.reduce((a, u) => a + u.gx, 0) / members.length, members.reduce((a, u) => a + u.gy, 0) / members.length);
  }
  lastGroupKey.n = n; lastGroupKey.at = now;
}

function togglePause() {
  if (!S || S.mode !== "play") return;
  S.paused = !S.paused;
  syncHud();
}

mini.addEventListener("mousedown", e => {
  if (!S) return;
  const r = mini.getBoundingClientRect();
  const s = mini.width / (MAP * 2);
  const mx = (e.clientX - r.left) - mini.width / 2, my = (e.clientY - r.top) - 2;
  const a = mx / s, b = (my / s) * 2; // a = gx - gy, b = gx + gy
  centerCamera((a + b) / 2, (b - a) / 2);
});

document.getElementById("conchBtn").addEventListener("click", callRaidEarly);
document.getElementById("tributeBtn").addEventListener("click", payTribute);
document.getElementById("pauseBtn").addEventListener("click", togglePause);
document.getElementById("speedBtn").addEventListener("click", () => {
  if (!S) return;
  const speeds = [1, 2, 4, 8];
  S.speed = speeds[(speeds.indexOf(S.speed) + 1) % speeds.length];
  syncHud();
});
document.getElementById("centerBtn").addEventListener("click", () => S && centerCamera());
document.getElementById("audioBtn").addEventListener("click", e => {
  audio.on = !audio.on;
  e.currentTarget.textContent = audio.on ? "🔊" : "🔇";
  unlockAudio();
});
document.getElementById("menuBtn").addEventListener("click", showMenu);

new ResizeObserver(resizeCanvas).observe(document.getElementById("viewport"));
document.addEventListener("visibilitychange", () => { if (document.hidden) saveRun(); });
window.addEventListener("pagehide", saveRun);

// ==================== BOOT ====================
// Wait until render.js (loaded after this file) is in place.
window.addEventListener("DOMContentLoaded", () => {
  resizeCanvas();
  startLevel(Math.min(progress.unlocked, LEVELS.length - 1), "idle");
  showMenu();
  requestAnimationFrame(frame);
});
