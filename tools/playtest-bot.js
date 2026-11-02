"use strict";
// ============================================================================
// Playtest bots. Injected into the page by tools/playtest.mjs. They play
// through the same actions a person has (tryBuild with real costs, recruit,
// moving soldiers, payTribute, proclaim, upgradeAt), never by editing state.
//
// Styles:
//   novice  follows the tutorial and advisor hints, places things loosely,
//           builds houses eagerly, trains soldiers only when raiders gather
//   planner plays by a parameter set P (see DEFAULTS). tools/playtest.mjs
//           evolves P per level and keeps the best in tools/playtest-brain.json
// ============================================================================
const BOT = (() => {
  // The dials a learning run tunes. [default, min, max]
  const DIALS = {
    paddyPerHouse: [1.1, 0.5, 2],     // watered paddies kept per house
    houseRice: [2, 0.5, 5],           // build a house only if rice > villagers × this
    maxHouses: [14, 3, 40],           // stop building houses here
    woodcutters: [2, 1, 4],
    barracksAt: [50, 0, 300],         // seconds before building a barracks
    armyBase: [3, 0, 10],             // soldiers kept ...
    armyPerRaid: [2, 0, 5],           // ... plus this many per raid already launched
    towersPerEdge: [1, 0, 3],         // watchtowers facing the next raid
    towerAt: [60, 0, 400],
    walls: [0, 0, 12],                // wall tiles facing the next raid
    tribute: [0, 0, 3],               // pay tribute if gold > cost × this (0 = never)
    reserve: [1, 0, 1],               // hold back resources a "store N" objective needs
    decrees: [1, 0, 1]
  };
  const DEFAULTS = Object.fromEntries(Object.entries(DIALS).map(([k, v]) => [k, v[0]]));
  const log = [];
  const note = t => log.push(`${Math.round(S.time)}s ${t}`);
  const C = () => ({ x: S.citadel.gx + 1, y: S.citadel.gy + 1 });
  const EDGE = { east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] };

  function place(id, x, y, why = "") {
    if (!S.unlocked.buildings.has(id) && id !== "house") return false;
    S.tool = id;
    const ok = tryBuild(x, y, true);
    S.tool = null;
    if (ok) note(`built ${id} @${x},${y}${why ? " (" + why + ")" : ""}`);
    return ok;
  }
  let reserveNow = {};
  const canAfford = id => {
    const c = buildCost(BUILDINGS[id]);
    if (!affordable(c)) return false;
    const def = BUILDINGS[id];
    if (def.cat === "defence" || def.cat === "water" && count("wewa") === 0) return true;
    return Object.entries(c).every(([k, v]) => !reserveNow[k] || S[k] - v >= reserveNow[k] || objectiveMet("res", k));
  };
  const objectiveMet = (type, key) => S.L.objectives.some(o => o.type === type && o.key === key && objective(o).cur >= o.n);
  const free = (id, x, y) => !canPlace(BUILDINGS[id], x, y);

  // Candidate tiles ordered by a score (lower is better).
  function best(id, score, maxR = 12) {
    const c = C();
    let bestT = null, bs = Infinity;
    for (let y = Math.max(0, c.y - maxR); y < Math.min(MAP, c.y + maxR); y++) for (let x = Math.max(0, c.x - maxR); x < Math.min(MAP, c.x + maxR); x++) {
      if (!free(id, x, y)) continue;
      const s = score(x, y);
      if (s < bs) { bs = s; bestT = [x, y]; }
    }
    return bestT;
  }
  const d2c = (x, y) => Math.hypot(x + 0.5 - C().x, y + 0.5 - C().y);
  // keep a ring of open ground around the citadel so it isn't boxed in
  const tooClose = (x, y, w = 1, h = 1) => x + w > S.citadel.gx - 1 && x < S.citadel.gx + 3 && y + h > S.citadel.gy - 1 && y < S.citadel.gy + 4;
  const treesNear = (x, y, r) => S.trees.filter(t => t.stage >= 100 && Math.hypot(t.gx - x, t.gy - y) < r).length;

  // ---------- economy ----------
  function woodcutter(max) {
    if (count("woodcutter") >= max || !canAfford("woodcutter")) return false;
    const t = best("woodcutter", (x, y) => tooClose(x, y) ? 1e9 : -treesNear(x + 0.5, y + 0.5, 6) * 3 + d2c(x, y));
    return t && treesNear(t[0] + 0.5, t[1] + 0.5, 6) >= 4 && place("woodcutter", t[0], t[1], "near forest");
  }
  function quarry() {
    if (count("quarry") || !canAfford("quarry") || !S.unlocked.buildings.has("quarry")) return false;
    const t = best("quarry", (x, y) => rockNear(x, y, 1, 1, 2) ? d2c(x, y) : 1e9);
    return t && rockNear(t[0], t[1], 1, 1, 2) && place("quarry", t[0], t[1], "near rock");
  }
  const waterTiles = () => S.buildings.filter(b => b.def.water);
  const touchesWater = (x, y, w, h) => edgeTiles({ gx: x, gy: y, w, h }).some(([ex, ey]) => { const b = S.occ[ey][ex]; return (b && b.def.water) || S.tiles[ey][ex].t === "river"; });
  function wewa(why, mustLink = false) {
    if (!canAfford("wewa")) return false;
    const hasNet = waterTiles().length > 0;
    const t = best("wewa", (x, y) => {
      if (tooClose(x, y, 2, 2)) return 1e9;
      const river = edgeTiles({ gx: x, gy: y, w: 2, h: 2 }).some(([ex, ey]) => S.tiles[ey][ex].t === "river");
      const link = touchesWater(x, y, 2, 2);
      if (mustLink && hasNet && !link) return 1e9;
      return d2c(x, y) - (river ? 4 : 0) - (link ? 3 : 0);
    }, 10);
    return t && place("wewa", t[0], t[1], why);
  }
  // a paddy touching water; if none fits, extend a canal from the network
  function paddy(loose = false) {
    if (!canAfford("paddy")) return false;
    const t = best("paddy", (x, y) => (tooClose(x, y, 2, 2) ? 1e9 : 0) + (touchesWater(x, y, 2, 2) ? 0 : loose ? 6 : 1e9) + d2c(x, y), 11);
    if (t) return place("paddy", t[0], t[1], loose && !touchesWater(t[0], t[1], 2, 2) ? "dry" : "watered");
    if (loose || !canAfford("canal")) return false;
    // extend: a free tile beside the network with room for a paddy beside it
    let pick = null, ps = Infinity;
    for (const b of waterTiles()) for (const [dx, dy] of DIRS4) {
      for (let k = 0; k < b.w * b.h; k++) {
        const x = b.gx + (k % b.w) + dx, y = b.gy + Math.floor(k / b.w) + dy;
        if (!inb(x, y) || !free("canal", x, y) || tooClose(x, y)) continue;
        let room = 0;
        for (const [px, py] of [[x + 1, y], [x - 2, y], [x, y + 1], [x, y - 2], [x - 1, y + 1], [x - 1, y - 2], [x + 1, y - 1], [x - 2, y - 1]]) if (free("paddy", px, py)) room++;
        const s = d2c(x, y) - room;
        if (room && s < ps) { ps = s; pick = [x, y]; }
      }
    }
    return pick && place("canal", pick[0], pick[1], "to reach a paddy");
  }
  function house(why) {
    if (!canAfford("house")) return false;
    const t = best("house", (x, y) => (tooClose(x, y) ? 1e9 : 0) + Math.abs(d2c(x, y) - 3.5) + (touchesWater(x, y, 1, 1) ? 3 : 0), 8);
    return t && place("house", t[0], t[1], why);
  }
  function near(id, why, distWant = 3.5, maxR = 9) {
    if (!S.unlocked.buildings.has(id) || !canAfford(id)) return false;
    const d = BUILDINGS[id];
    const t = best(id, (x, y) => (tooClose(x, y, d.w, d.h) ? 1e9 : 0) + Math.abs(d2c(x, y) - distWant), maxR);
    return t && place(id, t[0], t[1], why);
  }

  // ---------- defence ----------
  const nextFrom = () => (S.L.waves[S.nextWave] || S.L.waves[S.L.waves.length - 1] || { from: ["east"] }).from;
  function towerFacing(edge, k = 0) {
    if (!S.unlocked.buildings.has("tower") || !canAfford("tower")) return false;
    const [ex, ey] = EDGE[edge], c = C();
    const side = k === 0 ? 0 : k % 2 ? 2.5 : -2.5;
    const tx = c.x + ex * 4 + (ey ? side : 0), ty = c.y + ey * 4 + (ex ? side : 0);
    const have = S.buildings.some(b => b.id === "tower" && Math.hypot(b.gx - tx, b.gy - ty) < 3.5);
    if (have) return false;
    const t = best("tower", (x, y) => Math.hypot(x - tx, y - ty), 9);
    return t && place("tower", t[0], t[1], `facing ${edge}`);
  }
  // a short wall (rampart if known, else palisade) across the approach
  function wallFacing(edge, n) {
    const id = S.unlocked.buildings.has("rampart") ? "rampart" : "palisade";
    const [ex, ey] = EDGE[edge], c = C();
    let have = 0;
    for (let k = -6; k <= 6; k++) {
      const x = Math.round(c.x + ex * 5 + (ey ? k : 0)), y = Math.round(c.y + ey * 5 + (ex ? k : 0));
      if (inb(x, y) && buildingAt(x, y) && buildingAt(x, y).def.wall) have++;
    }
    for (let k = 0, i = 0; i < 13 && have < n; i++) {
      k = i % 2 ? -Math.ceil(i / 2) : Math.ceil(i / 2);
      const x = Math.round(c.x + ex * 5 + (ey ? k : 0)), y = Math.round(c.y + ey * 5 + (ex ? k : 0));
      if (inb(x, y) && free(id, x, y) && canAfford(id) && place(id, x, y, `wall facing ${edge}`)) have++;
    }
  }
  function rampartLine(edge, n) {
    if (!S.unlocked.buildings.has("rampart")) return 0;
    const [ex, ey] = EDGE[edge], c = C();
    let built = 0;
    for (let k = -4; k <= 4 && built < n; k++) {
      const x = Math.round(c.x + ex * 6 + (ey ? k : 0)), y = Math.round(c.y + ey * 6 + (ex ? k : 0));
      if (inb(x, y) && free("rampart", x, y) && canAfford("rampart") && place("rampart", x, y, `wall facing ${edge}`)) built++;
    }
    return built;
  }
  function army(target, style) {
    const novice = style === "novice";
    if (!S.buildings.some(b => b.id === "barracks")) return;
    const mine = S.units.filter(u => u.team === "p");
    for (let i = mine.length; i < target; i++) {
      const prefer = style === "novice" ? ["spearman", "archer"] : i % 2 ? ["spearman", "archer"] : ["archer", "spearman"];
      if (S.unlocked.troops.has("elephant") && S.gold > 200 && !novice) prefer.unshift("elephant");
      if (S.unlocked.troops.has("angampora") && i % 3 === 2 && !novice) prefer.unshift("angampora");
      const id = prefer.find(t => S.unlocked.troops.has(t) && affordable(troopCost(t)));
      if (!id || S.villagers < 3) return;
      const n0 = S.units.length;
      recruit(id);
      if (S.units.length > n0) note(`trained ${id}`); else return;
    }
  }
  function rally(edge) {
    const [ex, ey] = EDGE[edge], c = C();
    const towers = S.buildings.filter(b => b.id === "tower");
    S.units.filter(u => u.team === "p").forEach((u, i) => {
      const tw = u.def.ranged && towers[i % Math.max(1, towers.length)];
      const [x, y] = tw ? [tw.gx + 0.5, tw.gy + 0.5] : [c.x + ex * 2.6 + (ey ? (i % 5) * 0.5 - 1 : 0), c.y + ey * 2.6 + (ex ? (i % 5) * 0.5 - 1 : 0)];
      u.tx = clamp(x, 0.3, MAP - 0.3); u.ty = clamp(y, 0.3, MAP - 0.3); u.ordered = true;
    });
  }

  // ---------- one decision ----------
  // resources a "store N" objective needs, so building doesn't eat them
  function reserved(P) {
    const out = {};
    if (!P || P.reserve < 0.5) return out;
    for (const o of S.L.objectives) if (o.type === "res") out[o.key] = o.n;
    return out;
  }
  function think(style, P = DEFAULTS) {
    const L = S.L, raidSoon = nextWaveIn() <= 35, under = foesAlive();
    const novice = style === "novice";
    if (!novice) {
      // spend only what isn't promised to a storage objective (defence is exempt)
      const res = reserved(P);
      reserveNow = res;
    } else reserveNow = {};
    const houses = count("house") + count("walawwa"), paddies = count("paddy");
    if (!novice && P.tribute > 0 && tributeOpen()) {
      const c = tributeCost();
      if (S.gold >= c.gold * P.tribute && S.rice >= c.rice * P.tribute) { payTribute(); note(`paid tribute ${costText(c)}`); }
    }

    // food and water first
    if (!count("woodcutter")) woodcutter(1);
    if (!count("wewa")) wewa("first tank");
    const wantPaddies = novice ? (S.tutorialStep >= 5 || S.idx > 0 ? houses : 2) : Math.max(2, Math.ceil(houses * P.paddyPerHouse));
    if (count("wewa") && paddies < wantPaddies) paddy(novice);
    const wc = novice ? 2 : Math.round(P.woodcutters);
    if (count("woodcutter") < wc && S.time > 40) woodcutter(wc);
    if (S.stone < 30) quarry();
    // houses: the novice builds when it can; steady waits for food to keep up
    const roomy = S.villagers < S.cap - 1;
    if (novice ? S.timber > 25 && houses < 8 : !roomy && houses < P.maxHouses && S.rice > S.villagers * P.houseRice && paddies >= houses * P.paddyPerHouse * 0.9) house("more families");

    // objectives
    for (const o of L.objectives) {
      const r = objective(o);
      if (r.cur >= r.n) continue;
      if (o.type === "build" && o.id === "rampart" && !novice) rampartLine(nextFrom()[0], 3);
      else if (o.type === "build" && o.id === "wewa") wewa("objective", true);
      else if (o.type === "build") near(o.id, "objective", o.id === "dagoba" ? 4 : 3.5);
      else if ((o.type === "water" || o.type === "catch") && count("wewa") < (o.type === "catch" ? 4 : Math.ceil(o.n / 70))) wewa(o.type, o.type === "catch");
      else if (o.type === "harmony" && !novice) { near("dagoba", "harmony", 4) || near("pansala", "harmony", 4); for (const b of S.buildings) if (b.id === "house") upgradeAt(b.gx, b.gy, true); }
      else if (o.type === "pop" && roomy === false) house("population goal");
      else if (o.type === "res" && o.key === "gold" && !count("market")) near("market", "gold goal");
    }
    if (!novice && count("paddy") >= 3 && !count("bissa")) near("bissa", "granary", 3);
    if (!novice && S.unlocked.buildings.has("pansala") && !count("pansala") && S.gold > 60) near("pansala", "harmony");
    if (!novice && S.unlocked.buildings.has("kammala") && !count("kammala") && count("barracks")) near("kammala", "cheaper soldiers");

    // defence
    const wantBarracks = novice ? S.tutorialStep >= 5 || (S.idx > 0 && nextWaveIn() <= 35) : S.time >= P.barracksAt;
    if (!count("barracks") && wantBarracks) near("barracks", "train soldiers", 3.5);
    if (!novice && S.time >= P.towerAt) for (const e of nextFrom()) for (let k = 0; k < Math.round(P.towersPerEdge); k++) towerFacing(e, k);
    if (!novice && P.walls >= 1 && S.time > 30) wallFacing(nextFrom()[0], Math.round(P.walls));
    const target = novice ? (raidSoon || under ? 3 : 0) : Math.round(P.armyBase + S.nextWave * P.armyPerRaid);
    army(target, style);
    if (raidSoon || under) rally(nextFrom()[0]);

    // decrees
    if (!novice && P.decrees >= 0.5 && S.unlocked.edicts.has("perahera") && !edictBlocked("perahera") && S.harmony < 65) { proclaim("perahera"); note("perahera"); }
    if (!novice && P.decrees >= 0.5 && S.unlocked.edicts.has("rajakariya") && !edictBlocked("rajakariya") && S.timber > 60 && S.harmony > 55) { proclaim("rajakariya"); note("rajakariya"); }
  }

  return { think, log, DIALS, DEFAULTS };
})();
