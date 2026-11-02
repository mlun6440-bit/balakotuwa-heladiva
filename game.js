// ============================================================================
// BALAKOTUWA: CITADEL OF HELADIVA — TRUE 2.5D ISOMETRIC CASTLE SIM & RTS ENGINE
// Historical Sri Lankan Rajarata (Sigiriya/Polonnaruwa) & Kandyan Kingdom Eras
// ============================================================================

const MAP_SIZE = 26;
const ISO_W = 64;
const ISO_H = 32;

// ==================== HISTORICAL ERA DICTIONARY (RAJARATA vs KANDYAN ERA) ====================
const THEMES = {
  srilanka: {
    label: "🦁 Era: Rajarata (Polonnaruwa)",
    scribeTitle: "Maha Adigar (Purohita)",
    keep: "Raja Maligawa (Citadel)",
    stockpile: "Badagara (Treasury Yard)",
    granary: "Vee Bissa (Paddy Granary)",
    woodcutter: "Dara Maduwa (Kumbuk Logger)",
    hunter: "Veddah Hunter Post",
    quarry: "Kalugal Granite Quarry",
    ox_tether: "Mee Harak Buffalo Cart",
    iron_mine: "Samanalawewa Wootz Furnace",
    paddy: "Samba Paddy Field",
    orchard: "Kos & Pol Orchard",
    hovel: "Govi Gedara (Homestead)",
    stupa: "Dagoba Stupa Shrine",
    wood_wall: "Kumbuk Palisade Wall",
    stone_wall: "Kalugal Granite Rampart",
    gatehouse: "Simhadvara Lion Gate",
    tower: "Mura Atuwa Watchtower",
    barracks: "Angam Maduwa Barracks",
    armoury: "Ayudhagaraya Armoury",
    fletcher: "Dunu Bowyer Workshop",
    poleturner: "Hella Spear Smithy",
    blacksmith: "Kastane Wootz Smithy",
    mill: "Vee Mola Rice Mill",
    bakery: "Bath Maduwa Royal Kitchen",
    brewery: "Ra Salawa Toddy Tavern",
    archer: "Dunuvaya Longbowman",
    spearman: "Hella Spearman",
    maceman: "Angampora Sooraya",
    elephant: "Kandula War Elephant"
  },
  classic: {
    label: "⚔️ Era: Kandyan Kingdom (Senkadagala)",
    scribeTitle: "Maha Nilame (Adigar)",
    keep: "Senkadagala Wasala (Palace)",
    stockpile: "Maha Gabadawa (Storehouse)",
    granary: "Atuwa (Royal Granary)",
    woodcutter: "Halamba Timber Camp",
    hunter: "Dada Maduwa (Royal Hunter)",
    quarry: "Balana Rock Quarry",
    ox_tether: "Tavalam Pack Bullocks",
    iron_mine: "Kotmale Steel Furnace",
    paddy: "Helmalu Terraced Paddy",
    orchard: "Jak & Spice Garden",
    hovel: "Gamarala Walawwa",
    stupa: "Vihara Tampita Shrine",
    wood_wall: "Kadawatha Thorn Stockade",
    stone_wall: "Balana Stone Rampart",
    gatehouse: "Wahalkada Gatehouse",
    tower: "Kodituwakku Bastion",
    barracks: "Ilangam Maduwa (Barracks)",
    armoury: "Ayudha Gabadawa",
    fletcher: "Dunu Wada Workshop",
    poleturner: "Patisthana Pike Smithy",
    blacksmith: "Kastane & Urumi Smithy",
    mill: "Diya Mola Water Mill",
    bakery: "Muluthenge Royal Kitchen",
    brewery: "Kithul Ra Ambalama",
    archer: "Hevaya Bowmen",
    spearman: "Patisthana Pikeman",
    maceman: "Maru-Kala Angam Master",
    elephant: "Gajanayake Tusker"
  }
};

// ==================== BUILDING CATALOG ====================
const CATALOG = {
  // Castle Category
  wood_wall:  { id: "wood_wall",  cat: "castle", icon: "🪵", w: 1, h: 1, hp: 300, cost: { wood: 3 }, isWall: true, zHeight: 22, sub: "Blocks enemy raiders" },
  stone_wall: { id: "stone_wall", cat: "castle", icon: "🧱", w: 1, h: 1, hp: 850, cost: { stone: 6 }, isWall: true, zHeight: 28, sub: "Heavy fortification wall" },
  gatehouse:  { id: "gatehouse",  cat: "castle", icon: "⛩️", w: 1, h: 1, hp: 950, cost: { wood: 10, stone: 8 }, isGate: true, zHeight: 34, sub: "Lets your villagers & troops pass" },
  tower:      { id: "tower",      cat: "castle", icon: "🗼", w: 1, h: 1, hp: 900, cost: { wood: 12, stone: 10 }, isTower: true, zHeight: 44, sub: "Archers climb top for +45% range" },
  barracks:   { id: "barracks",   cat: "castle", icon: "⚔️", w: 2, h: 2, hp: 800, cost: { wood: 15, stone: 10 }, zHeight: 24, sub: "Recruit Archers & Infantry" },
  armoury:    { id: "armoury",    cat: "castle", icon: "🛡️", w: 1, h: 1, hp: 600, cost: { wood: 12 }, zHeight: 22, sub: "Stores crafted bows, spears & swords" },

  // Industry Category
  stockpile:  { id: "stockpile",  cat: "industry", icon: "📦", w: 2, h: 2, hp: 500, cost: { wood: 5 }, zHeight: 4, sub: "Visual yard for Wood, Stone & Iron" },
  woodcutter: { id: "woodcutter", cat: "industry", icon: "🪓", w: 1, h: 1, hp: 220, cost: { wood: 3 }, workers: 1, zHeight: 18, sub: "Chops forest trees into timber" },
  quarry:     { id: "quarry",     cat: "industry", icon: "⛏️", w: 2, h: 2, hp: 350, cost: { wood: 15 }, workers: 1, zHeight: 22, sub: "Carves stone from northern boulders" },
  ox_tether:  { id: "ox_tether",  cat: "industry", icon: "🐃", w: 1, h: 1, hp: 200, cost: { wood: 6 }, workers: 1, zHeight: 12, sub: "Hauls stone blocks to Stockpile" },
  iron_mine:  { id: "iron_mine",  cat: "industry", icon: "🌋", w: 1, h: 1, hp: 350, cost: { wood: 20 }, workers: 1, zHeight: 26, sub: "Smelts iron/Wootz on rocky hills" },

  // Farm Category
  granary:    { id: "granary",    cat: "farm", icon: "🏺", w: 2, h: 2, hp: 500, cost: { wood: 10 }, zHeight: 24, sub: "Stores Meat, Fruit & Grain rations" },
  hunter:     { id: "hunter",     cat: "farm", icon: "🦌", w: 1, h: 1, hp: 200, cost: { wood: 5 }, workers: 1, zHeight: 16, sub: "Hunts roaming deer for meat" },
  orchard:    { id: "orchard",    cat: "farm", icon: "🌴", w: 2, h: 2, hp: 220, cost: { wood: 6 }, workers: 1, zHeight: 14, sub: "Harvests fruit directly to Granary" },
  paddy:      { id: "paddy",      cat: "farm", icon: "🌾", w: 2, h: 2, hp: 200, cost: { wood: 8 }, workers: 1, zHeight: 6, sub: "Grows grain near the river water" },

  // Town Category
  hovel:      { id: "hovel",      cat: "town", icon: "🏡", w: 1, h: 1, hp: 240, cost: { wood: 6 }, popCap: 6, zHeight: 20, sub: "+6 peasant housing capacity" },
  stupa:      { id: "stupa",      cat: "town", icon: "🛕", w: 2, h: 2, hp: 900, cost: { stone: 20, gold: 40 }, popBonus: 6, zHeight: 38, sub: "+6 Popularity & blessing" },

  // Weapons Category
  fletcher:   { id: "fletcher",   cat: "weapons", icon: "🏹", w: 1, h: 1, hp: 280, cost: { wood: 12, gold: 20 }, workers: 1, zHeight: 20, weaponOut: "bows", sub: "Turns 2 Wood into 1 Bow" },
  poleturner: { id: "poleturner", cat: "weapons", icon: "🔱", w: 1, h: 1, hp: 280, cost: { wood: 10, gold: 15 }, workers: 1, zHeight: 20, weaponOut: "spears", sub: "Turns 2 Wood into 1 Spear" },
  blacksmith: { id: "blacksmith", cat: "weapons", icon: "🗡️", w: 1, h: 1, hp: 320, cost: { wood: 15, gold: 35 }, workers: 1, zHeight: 22, weaponOut: "swords", sub: "Forges Iron into Swords" },

  // Food Processing Category
  mill:       { id: "mill",       cat: "foodproc", icon: "⚙️", w: 1, h: 1, hp: 300, cost: { wood: 15 }, workers: 1, zHeight: 34, sub: "Mills grain into flour" },
  bakery:     { id: "bakery",     cat: "foodproc", icon: "🍞", w: 1, h: 1, hp: 280, cost: { wood: 12 }, workers: 1, zHeight: 20, sub: "Bakes large food batches (+12)" },
  brewery:    { id: "brewery",    cat: "foodproc", icon: "🍺", w: 1, h: 1, hp: 280, cost: { wood: 12, gold: 15 }, workers: 1, popBonus: 4, zHeight: 20, sub: "Brews Ale/Ra (+4 Popularity)" }
};

const TROOP_DEFS = {
  archer:   { id: "archer",   icon: "🏹", gold: 12, req: { bows: 1 },   hp: 85,  dmg: 14, range: 5.5, speed: 0.032, isRanged: true, canClimb: true, sub: "Climbs towers & walls" },
  spearman: { id: "spearman", icon: "🔱", gold: 8,  req: { spears: 1 }, hp: 120, dmg: 16, range: 0.9, speed: 0.038, isRanged: false, canClimb: false, sub: "Fast melee defender" },
  maceman:  { id: "maceman",  icon: "⚡", gold: 20, req: { swords: 1 }, hp: 175, dmg: 28, range: 0.9, speed: 0.045, isRanged: false, canClimb: false, sub: "High-speed shock infantry" },
  elephant: { id: "elephant", icon: "🐘", gold: 65, req: { swords: 1, spears: 1 }, hp: 520, dmg: 48, range: 1.1, speed: 0.028, isRanged: false, isHeavy: true, sub: "Crushes raiders & walls" }
};

// ==================== GAME STATE ====================
const state = {
  theme: "srilanka",
  paused: false,
  audioOn: false,

  // Camera pan offset in screen pixels
  camX: 0,
  camY: 90,
  isPanning: false,
  panStart: { x: 0, y: 0 },

  // Economy & Popularity
  wood: 80,
  stone: 40,
  iron: 10,
  wheat: 10,
  food: 90,
  ale: 10,
  gold: 250,
  weapons: { bows: 4, spears: 4, swords: 2 },
  popularity: 85,
  taxLevel: 0,
  rationLevel: 2,
  peasantsTotal: 10,
  peasantsCap: 14,

  // Active UI Tool
  activeCat: "castle",
  selectedBuildId: null,
  demolishMode: false,

  // Wave timer
  waveTimer: 80,
  waveNum: 0,

  // World Map Data
  tiles: [],      // [gy][gx] = { type: 'grass'|'water'|'road'|'stone'|'iron', elev: 0|1 }
  trees: [],      // { gx, gy, stage: 1..100, falling: 0 }
  deer: [],       // { gx, gy, tx, ty }
  buildings: [],  // { uid, id, gx, gy, w, h, hp, maxHp }
  workers: [],    // Autonomous villagers with real tasks (woodcutter, hunter, quarryman, farmer, baker)
  units: [],      // Military units (Lord, Archers, Spearmen, Raiders)
  arrows: [],     // Projectiles in flight
  floats: [],     // Floating +Wood / +Meat labels

  // Mouse & Selection
  hoverTile: { gx: -1, gy: -1 },
  dragSelect: { active: false, x1: 0, y1: 0, x2: 0, y2: 0 }
};

// ==================== ISOMETRIC PROJECTION MATH ====================
const canvas = document.getElementById("isoCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const vp = document.getElementById("isoViewport");
  canvas.width = vp.clientWidth;
  canvas.height = vp.clientHeight;
  if (state.camX === 0) {
    state.camX = canvas.width / 2;
    state.camY = 85;
  }
}
window.addEventListener("resize", resizeCanvas);

function gridToIso(gx, gy, z = 0) {
  const sx = state.camX + (gx - gy) * (ISO_W / 2);
  const sy = state.camY + (gx + gy) * (ISO_H / 2) - z;
  return { x: sx, y: sy };
}

function isoToGrid(sx, sy) {
  const dx = sx - state.camX;
  const dy = sy - state.camY;
  const gx = (dx / (ISO_W / 2) + dy / (ISO_H / 2)) / 2;
  const gy = (dy / (ISO_H / 2) - dx / (ISO_W / 2)) / 2;
  return { gx: Math.floor(gx), gy: Math.floor(gy), exactX: gx, exactY: gy };
}

// ==================== INITIALIZE MISSION 1 & 2 MAP ====================
function initWorld() {
  state.tiles = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    const row = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      let type = "grass";
      let elev = 0;
      // Western River / Wewa
      if (x <= 2) type = "water";
      // Northern Stone & Iron Ridge
      else if (y <= 3 && x >= 5 && x <= 11) { type = "stone"; elev = 1; }
      else if (y <= 3 && x >= 13 && x <= 17) { type = "iron"; elev = 1; }
      // Dirt Road leading from the Southern Enemy Signpost (gx=23, gy=12) to Keep (gx=11, gy=12)
      else if (y === 12 && x >= 11 && x <= 25) type = "road";

      row.push({ type, elev, shade: ((x * 7 + y * 13) % 5) * 0.015 });
    }
    state.tiles.push(row);
  }

  // Dense Forests (Like Stronghold HD Mission 1)
  const forestZones = [
    { x1: 4, y1: 5, x2: 8, y2: 10 },
    { x1: 4, y1: 15, x2: 9, y2: 21 },
    { x1: 15, y1: 16, x2: 20, y2: 22 }
  ];
  for (const z of forestZones) {
    for (let y = z.y1; y <= z.y2; y++) {
      for (let x = z.x1; x <= z.x2; x++) {
        if ((x + y) % 2 === 0 || Math.random() < 0.45) {
          state.trees.push({ gx: x + 0.5, gy: y + 0.5, stage: 100 });
        }
      }
    }
  }

  // Roaming Wild Deer Herd in the Eastern Meadow (Mission 1)
  for (let i = 0; i < 8; i++) {
    const dx = 15 + Math.random() * 5;
    const dy = 5 + Math.random() * 5;
    state.deer.push({ gx: dx, gy: dy, tx: dx, ty: dy, hp: 40 });
  }

  // Place Starting Saxon Hall / Raja Maligawa Keep, Campfire, Stockpile & Granary
  addBuildingInternal("keep", 10, 10, 2, 2, 2000);
  addBuildingInternal("campfire", 10, 13, 1, 1, 500);
  addBuildingInternal("stockpile", 7, 10, 2, 2, 600);
  addBuildingInternal("granary", 13, 10, 2, 2, 600);
  addBuildingInternal("woodcutter", 8, 9, 1, 1, 220);
  addBuildingInternal("hunter", 14, 8, 1, 1, 200);
  addBuildingInternal("hovel", 8, 13, 1, 1, 240);
  addBuildingInternal("barracks", 11, 14, 2, 2, 800);

  // Initial Eastern Palisade & Lookout Tower facing the Enemy Signpost Road
  for (let wy = 9; wy <= 15; wy++) {
    if (wy === 12) addBuildingInternal("gatehouse", 16, wy, 1, 1, 950);
    else if (wy === 11) addBuildingInternal("tower", 16, wy, 1, 1, 900);
    else addBuildingInternal("wood_wall", 16, wy, 1, 1, 300);
  }

  // Spawn The Lord atop the Keep Roof
  state.units.push({
    uid: "lord", id: "lord", team: "player", isLord: true,
    gx: 11.0, gy: 11.0, tx: 11.0, ty: 11.0, z: 42,
    hp: 800, maxHp: 800, dmg: 30, range: 1.2, speed: 0, lastAttack: 0, selected: false
  });

  // Spawn 3 Starting Archers on/near the Lookout Tower & 2 Spearmen by the Gatehouse
  spawnUnit("archer", 16.5, 11.5, "player");
  spawnUnit("archer", 15.5, 10.5, "player");
  spawnUnit("spearman", 15.3, 12.2, "player");
  spawnUnit("spearman", 15.3, 13.0, "player");
}

function addBuildingInternal(id, gx, gy, w, h, hp) {
  const b = {
    uid: "b_" + Math.random().toString(36).slice(2, 8),
    id, gx, gy, w, h, hp, maxHp: hp
  };
  state.buildings.push(b);

  const def = CATALOG[id];
  if (def && def.workers) {
    state.workers.push({
      bUid: b.uid,
      job: id,
      gx: 10.5,
      gy: 13.5,
      tx: gx + 0.5,
      ty: gy + 0.5,
      phase: "to_hut", // 'to_hut' -> 'to_resource' -> 'working' -> 'to_hut_back' -> 'to_storage'
      workTimer: 0,
      carryType: null
    });
  }
}

function spawnUnit(typeId, gx, gy, team = "player") {
  const def = TROOP_DEFS[typeId] || { hp: 100, dmg: 14, range: 1.0, speed: 0.032, isRanged: false };
  state.units.push({
    uid: "u_" + Math.random().toString(36).slice(2, 9),
    id: typeId,
    team,
    gx, gy, tx: gx, ty: gy, z: 0,
    hp: def.hp, maxHp: def.hp,
    dmg: def.dmg, range: def.range, speed: def.speed,
    isRanged: def.isRanged || false,
    canClimb: def.canClimb || false,
    isHeavy: def.isHeavy || false,
    lastAttack: 0,
    selected: false
  });
}

// ==================== AUTONOMOUS VILLAGER AI (CHOP TREES, HUNT DEER, QUARRY STONE) ====================
function updateWorkersAndWildlife(dt) {
  // 1. Roaming Deer Herd
  for (const d of state.deer) {
    if (Math.hypot(d.tx - d.gx, d.ty - d.gy) < 0.2) {
      if (Math.random() < 0.02) {
        d.tx = Math.max(4, Math.min(22, d.gx + (Math.random() * 4 - 2)));
        d.ty = Math.max(4, Math.min(22, d.gy + (Math.random() * 4 - 2)));
      }
    } else {
      const ang = Math.atan2(d.ty - d.gy, d.tx - d.gx);
      d.gx += Math.cos(ang) * 0.012 * dt;
      d.gy += Math.sin(ang) * 0.012 * dt;
    }
  }
  // Respawn deer if herd gets low
  if (state.deer.length < 5 && Math.random() < 0.005) {
    state.deer.push({ gx: 17 + Math.random() * 4, gy: 5 + Math.random() * 4, tx: 18, ty: 7, hp: 40 });
  }

  // Regrow chopped trees slowly
  for (const tr of state.trees) {
    if (tr.stage < 100) tr.stage = Math.min(100, tr.stage + 0.04 * dt);
  }

  const stockpile = state.buildings.find(b => b.id === "stockpile") || state.buildings[0];
  const granary = state.buildings.find(b => b.id === "granary") || stockpile;
  const armoury = state.buildings.find(b => b.id === "armoury") || stockpile;

  // 2. Update Each Worker's Physical Routine
  for (const w of state.workers) {
    const hut = state.buildings.find(b => b.uid === w.bUid);
    if (!hut) continue;

    const dx = w.tx - w.gx;
    const dy = w.ty - w.gy;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.15) {
      w.gx += (dx / dist) * 0.028 * dt;
      w.gy += (dy / dist) * 0.028 * dt;
      continue;
    }

    // Reached target waypoint
    if (w.phase === "to_hut") {
      w.phase = "to_resource";
      if (w.job === "woodcutter") {
        // Find nearest standing tree
        let bestTree = null, bestD = 999;
        for (const tr of state.trees) {
          if (tr.stage >= 60) {
            const td = Math.hypot(tr.gx - hut.gx, tr.gy - hut.gy);
            if (td < bestD) { bestD = td; bestTree = tr; }
          }
        }
        w.targetRef = bestTree;
        w.tx = bestTree ? bestTree.gx : hut.gx - 1;
        w.ty = bestTree ? bestTree.gy : hut.gy - 1;
      } else if (w.job === "hunter") {
        const deer = state.deer[0];
        w.targetRef = deer;
        w.tx = deer ? deer.gx : hut.gx + 2;
        w.ty = deer ? deer.gy : hut.gy - 1;
      } else if (w.job === "quarry" || w.job === "ox_tether") {
        w.tx = 8; w.ty = 2.5;
      } else if (w.job === "iron_mine") {
        w.tx = 15; w.ty = 2.5;
      } else {
        w.tx = hut.gx + 0.8; w.ty = hut.gy + 0.8;
      }
    } else if (w.phase === "to_resource") {
      w.phase = "working";
      w.workTimer = 45;
    } else if (w.phase === "working") {
      w.workTimer -= dt;
      if (w.workTimer <= 0) {
        if (w.job === "woodcutter" && w.targetRef) {
          w.targetRef.stage = 10; // Chopped into stump!
          w.carryType = "wood";
        } else if (w.job === "hunter") {
          w.carryType = "meat";
        } else if (w.job === "quarry" || w.job === "ox_tether") {
          w.carryType = "stone";
        } else if (w.job === "iron_mine") {
          w.carryType = "iron";
        } else if (w.job === "paddy") {
          w.carryType = "wheat";
        } else if (w.job === "orchard" || w.job === "bakery" || w.job === "mill") {
          w.carryType = "food";
        } else if (w.job === "brewery") {
          w.carryType = "ale";
        } else if (CATALOG[w.job]?.weaponOut) {
          w.carryType = CATALOG[w.job].weaponOut;
        }

        // Choose drop-off building
        let dropB = stockpile;
        if (w.carryType === "meat" || w.carryType === "food") dropB = granary;
        else if (w.carryType === "bows" || w.carryType === "spears" || w.carryType === "swords") dropB = armoury;

        w.phase = "to_storage";
        w.tx = dropB.gx + 0.8;
        w.ty = dropB.gy + 0.8;
      }
    } else if (w.phase === "to_storage") {
      // Deliver goods to Stockpile / Granary / Armoury!
      if (w.carryType === "wood") { state.wood += 6; spawnFloat("+6 Wood", w.gx, w.gy, "#a8e673"); }
      else if (w.carryType === "stone") { state.stone += 6; spawnFloat("+6 Stone", w.gx, w.gy, "#d9d9d9"); }
      else if (w.carryType === "iron") { state.iron += 3; spawnFloat("+3 Iron", w.gx, w.gy, "#f5b042"); }
      else if (w.carryType === "wheat") { state.wheat += 5; spawnFloat("+5 Grain", w.gx, w.gy, "#f5d742"); }
      else if (w.carryType === "meat" || w.carryType === "food") { state.food += 8; spawnFloat("+8 Food", w.gx, w.gy, "#7ce87c"); }
      else if (w.carryType === "ale") { state.ale += 4; spawnFloat("+4 Ale", w.gx, w.gy, "#f5c342"); }
      else if (w.carryType === "bows" || w.carryType === "spears" || w.carryType === "swords") {
        if (state.wood >= 2) {
          state.wood -= 2;
          state.weapons[w.carryType] = (state.weapons[w.carryType] || 0) + 1;
          spawnFloat(`+1 ${w.carryType}`, w.gx, w.gy, "#f5c342");
        }
      }
      w.carryType = null;
      w.phase = "to_hut";
      w.tx = hut.gx + 0.5;
      w.ty = hut.gy + 0.5;
      syncUI();
    }
  }
}

// ==================== MILITARY COMBAT & TOWER ELEVATION ====================
function updateUnitsAndProjectiles(now, dt) {
  for (let i = state.units.length - 1; i >= 0; i--) {
    const u = state.units[i];
    if (u.hp <= 0) {
      if (u.isLord) {
        u.hp = u.maxHp;
        showScribeBanner("The Lord was wounded defending the Keep! Royal guards rally!");
      } else {
        if (u.team === "enemy") {
          state.gold += 10;
          spawnFloat("+10 Gold", u.gx, u.gy, "#f5c342");
        }
        state.units.splice(i, 1);
      }
      continue;
    }

    // Check if unit is standing on a Tower or Wall for 3D Z-elevation & range bonus
    const underB = state.buildings.find(b =>
      Math.floor(u.gx) >= b.gx && Math.floor(u.gx) < b.gx + b.w &&
      Math.floor(u.gy) >= b.gy && Math.floor(u.gy) < b.gy + b.h
    );
    let rangeBonus = 1.0;
    if (u.isLord) {
      u.z = 42;
    } else if (underB && CATALOG[underB.id]?.isTower && u.canClimb) {
      u.z = 38;
      rangeBonus = 1.45;
    } else if (underB && CATALOG[underB.id]?.isWall && u.canClimb) {
      u.z = 22;
      rangeBonus = 1.2;
    } else {
      u.z = 0;
    }

    // Find closest enemy unit
    let closestFoe = null, minDist = 999;
    for (const other of state.units) {
      if (other.team !== u.team && other.hp > 0) {
        const d = Math.hypot(other.gx - u.gx, other.gy - u.gy);
        if (d < minDist) { minDist = d; closestFoe = other; }
      }
    }

    // Check if an enemy raider is blocked by a Wall/Gate
    let blockingWall = null;
    if (u.team === "enemy") {
      for (const b of state.buildings) {
        const def = CATALOG[b.id];
        if ((def && (def.isWall || def.isGate || def.isTower)) || b.id === "keep") {
          const d = Math.hypot((b.gx + b.w / 2) - u.gx, (b.gy + b.h / 2) - u.gy);
          if (d < 1.15) { blockingWall = b; break; }
        }
      }
    }

    const effRange = u.range * rangeBonus;
    if (closestFoe && minDist <= effRange) {
      if (now - u.lastAttack > 950) {
        u.lastAttack = now;
        if (u.isRanged) {
          state.arrows.push({
            gx: u.gx, gy: u.gy, z: u.z + 12,
            tx: closestFoe.gx, ty: closestFoe.gy, tz: closestFoe.z + 8,
            target: closestFoe, dmg: u.dmg, progress: 0
          });
        } else {
          closestFoe.hp -= u.dmg;
        }
      }
    } else if (u.team === "enemy" && blockingWall) {
      if (now - u.lastAttack > 950) {
        u.lastAttack = now;
        blockingWall.hp -= u.dmg;
        if (blockingWall.hp <= 0) {
          state.buildings = state.buildings.filter(b => b !== blockingWall);
          spawnFloat("Wall Breached!", u.gx, u.gy, "#ff5555");
        }
      }
    } else if (!u.isLord) {
      let destX = u.tx, destY = u.ty;
      if (u.team === "enemy" && closestFoe) {
        destX = closestFoe.gx;
        destY = closestFoe.gy;
      } else if (u.team === "player" && !u.isRanged && closestFoe && minDist < 4.5) {
        destX = closestFoe.gx;
        destY = closestFoe.gy;
      }
      const dx = destX - u.gx, dy = destY - u.gy, d = Math.hypot(dx, dy);
      if (d > 0.12) {
        u.gx += (dx / d) * u.speed * dt;
        u.gy += (dy / d) * u.speed * dt;
      }
    }
  }

  // Update Parabolic 3D Arrows
  for (let i = state.arrows.length - 1; i >= 0; i--) {
    const a = state.arrows[i];
    a.progress += 0.065 * dt;
    if (a.progress >= 1) {
      if (a.target && a.target.hp > 0) a.target.hp -= a.dmg;
      state.arrows.splice(i, 1);
    }
  }

  // Update Floating Labels
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const f = state.floats[i];
    f.z += 0.6 * dt;
    f.life -= dt;
    if (f.life <= 0) state.floats.splice(i, 1);
  }
}

function spawnFloat(text, gx, gy, color = "#fff") {
  state.floats.push({ text, gx, gy, z: 24, color, life: 42 });
}

// ==================== TRUE 2.5D ISOMETRIC RENDERER ====================
function drawIsoDiamond(gx, gy, w, h, z, fillStyle, strokeStyle) {
  const p0 = gridToIso(gx, gy, z);
  const p1 = gridToIso(gx + w, gy, z);
  const p2 = gridToIso(gx + w, gy + h, z);
  const p3 = gridToIso(gx, gy + h, z);

  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.closePath();
  if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); }
  if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = 1; ctx.stroke(); }
}

// Draw an extruded 3D Isometric Prism (Left Wall, Right Wall, Top Roof)
function drawIsoBlock(gx, gy, w, h, zBase, zHeight, topCol, leftCol, rightCol) {
  const b0 = gridToIso(gx, gy, zBase);
  const b1 = gridToIso(gx + w, gy, zBase);
  const b2 = gridToIso(gx + w, gy + h, zBase);
  const b3 = gridToIso(gx, gy + h, zBase);

  const t0 = gridToIso(gx, gy, zBase + zHeight);
  const t1 = gridToIso(gx + w, gy, zBase + zHeight);
  const t2 = gridToIso(gx + w, gy + h, zBase + zHeight);
  const t3 = gridToIso(gx, gy + h, zBase + zHeight);

  // Left Face (South-West)
  ctx.beginPath();
  ctx.moveTo(b3.x, b3.y);
  ctx.lineTo(b2.x, b2.y);
  ctx.lineTo(t2.x, t2.y);
  ctx.lineTo(t3.x, t3.y);
  ctx.closePath();
  ctx.fillStyle = leftCol;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.stroke();

  // Right Face (South-East)
  ctx.beginPath();
  ctx.moveTo(b1.x, b1.y);
  ctx.lineTo(b2.x, b2.y);
  ctx.lineTo(t2.x, t2.y);
  ctx.lineTo(t1.x, t1.y);
  ctx.closePath();
  ctx.fillStyle = rightCol;
  ctx.fill();
  ctx.stroke();

  // Top Face (Roof)
  ctx.beginPath();
  ctx.moveTo(t0.x, t0.y);
  ctx.lineTo(t1.x, t1.y);
  ctx.lineTo(t2.x, t2.y);
  ctx.lineTo(t3.x, t3.y);
  ctx.closePath();
  ctx.fillStyle = topCol;
  ctx.fill();
  ctx.stroke();
}

function renderIsoWorld(now) {
  ctx.fillStyle = "#111c0d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 1. Render Terrain Diamond Tiles
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const tile = state.tiles[y][x];
      const z = tile.elev * 10;

      let col = "#3b6628";
      if (tile.type === "grass") {
        col = (x + y) % 2 === 0 ? "#3f6b2b" : "#396126";
      } else if (tile.type === "road") {
        col = (x + y) % 2 === 0 ? "#8c7248" : "#80663e";
      } else if (tile.type === "water") {
        const wave = Math.sin(now * 0.003 + x + y) * 8;
        col = `rgb(${25 + wave}, ${95 + wave}, ${145 + wave})`;
      } else if (tile.type === "stone") {
        col = "#7a7a80";
      } else if (tile.type === "iron") {
        col = "#734830";
      }

      if (tile.elev > 0) {
        drawIsoBlock(x, y, 1, 1, 0, z, col, "#524e4a", "#3d3a37");
      } else {
        drawIsoDiamond(x, y, 1, 1, 0, col, "rgba(0,0,0,0.12)");
      }
    }
  }

  // Draw the Iconic Stronghold HD "Enemy Signpost" at the end of the dirt road (gx=24.5, gy=12.5)
  const sp = gridToIso(24.5, 12.5, 0);
  ctx.fillStyle = "#4a3219";
  ctx.fillRect(sp.x - 2, sp.y - 22, 4, 22);
  ctx.fillStyle = "#c9ab75";
  ctx.fillRect(sp.x - 16, sp.y - 22, 32, 9);
  ctx.fillStyle = "#5c140e";
  ctx.font = "bold 8px Georgia";
  ctx.textAlign = "center";
  ctx.fillText("☠️ RAIDERS", sp.x, sp.y - 15);

  // Build Ghost Preview
  const ht = state.hoverTile;
  if (ht.gx >= 0 && ht.gx < MAP_SIZE && ht.gy >= 0 && ht.gy < MAP_SIZE && state.selectedBuildId) {
    const def = CATALOG[state.selectedBuildId];
    const ok = canPlaceAt(def, ht.gx, ht.gy);
    drawIsoBlock(
      ht.gx, ht.gy, def.w, def.h, 0, def.zHeight || 16,
      ok ? "rgba(110, 240, 110, 0.55)" : "rgba(245, 75, 75, 0.55)",
      ok ? "rgba(70, 180, 70, 0.45)" : "rgba(190, 45, 45, 0.45)",
      ok ? "rgba(50, 150, 50, 0.45)" : "rgba(150, 35, 35, 0.45)"
    );
  }

  // 2. Collect Depth-Sorted Renderables (Trees, Deer, Buildings, Workers, Military Units)
  const renderList = [];

  for (const tr of state.trees) {
    renderList.push({ depth: tr.gx + tr.gy, kind: "tree", obj: tr });
  }
  for (const d of state.deer) {
    renderList.push({ depth: d.gx + d.gy, kind: "deer", obj: d });
  }
  for (const b of state.buildings) {
    renderList.push({ depth: b.gx + b.gy + (b.w + b.h) * 0.5, kind: "building", obj: b });
  }
  for (const w of state.workers) {
    renderList.push({ depth: w.gx + w.gy, kind: "worker", obj: w });
  }
  for (const u of state.units) {
    renderList.push({ depth: u.gx + u.gy + (u.z > 0 ? 0.8 : 0), kind: "unit", obj: u });
  }

  renderList.sort((a, b) => a.depth - b.depth);

  // 3. Draw Sorted Isometric Entities
  for (const item of renderList) {
    if (item.kind === "tree") drawIsoTree(item.obj, now);
    else if (item.kind === "deer") drawIsoDeer(item.obj);
    else if (item.kind === "building") drawIsoBuilding(item.obj, now);
    else if (item.kind === "worker") drawIsoWorker(item.obj);
    else if (item.kind === "unit") drawIsoUnit(item.obj);
  }

  // 4. Draw Parabolic Arrows in Flight
  for (const a of state.arrows) {
    const curGx = a.gx + (a.tx - a.gx) * a.progress;
    const curGy = a.gy + (a.ty - a.gy) * a.progress;
    const arcZ = a.z + (a.tz - a.z) * a.progress + Math.sin(a.progress * Math.PI) * 28;
    const pt = gridToIso(curGx, curGy, arcZ);

    ctx.strokeStyle = "#f5e4a8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pt.x - 4, pt.y - 2);
    ctx.lineTo(pt.x + 4, pt.y + 2);
    ctx.stroke();
  }

  // 5. Draw Floating Resource / Combat Texts
  for (const f of state.floats) {
    const pt = gridToIso(f.gx, f.gy, f.z);
    ctx.fillStyle = f.color;
    ctx.font = "bold 11px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(f.text, pt.x, pt.y);
  }

  // 6. Drag Selection Box
  if (state.dragSelect.active) {
    const { x1, y1, x2, y2 } = state.dragSelect;
    ctx.fillStyle = "rgba(120, 245, 120, 0.16)";
    ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    ctx.strokeStyle = "#7ce87c";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  }
}

function drawIsoTree(tr, now) {
  const pt = gridToIso(tr.gx, tr.gy, 0);
  if (tr.stage < 40) {
    // Chopped Tree Stump!
    ctx.fillStyle = "#5c3d1e";
    ctx.fillRect(pt.x - 3, pt.y - 5, 6, 5);
    return;
  }
  const sway = Math.sin(now * 0.002 + tr.gx) * 1.5;
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(pt.x + 5, pt.y + 2, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  ctx.fillStyle = "#4f3317";
  ctx.fillRect(pt.x - 2, pt.y - 16, 4, 16);

  // Layered 3D Conifer / Kumbuk Canopy
  ctx.fillStyle = "#1e4714";
  ctx.beginPath();
  ctx.arc(pt.x + sway, pt.y - 20, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b611d";
  ctx.beginPath();
  ctx.arc(pt.x - 2 + sway, pt.y - 25, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawIsoDeer(d) {
  const pt = gridToIso(d.gx, d.gy, 0);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(pt.x, pt.y + 2, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9e6330";
  ctx.fillRect(pt.x - 5, pt.y - 8, 10, 5);
  ctx.fillRect(pt.x + 2, pt.y - 13, 4, 6);
}

function drawIsoBuilding(b, now) {
  const id = b.id;

  if (id === "keep") {
    // 3D Isometric Keep / Raja Maligawa
    drawIsoBlock(b.gx, b.gy, b.w, b.h, 0, 32, "#c2a878", "#8f754d", "#6e5838");
    drawIsoBlock(b.gx + 0.25, b.gy + 0.25, 1.5, 1.5, 32, 14, "#8c2419", "#6b4f2c", "#4f391d");
    const roofPt = gridToIso(b.gx + 1, b.gy + 1, 48);
    ctx.fillStyle = "#f5c342";
    ctx.font = "bold 11px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(state.theme === "srilanka" ? "🦁 MALIGAWA" : "🏰 KEEP", roofPt.x, roofPt.y - 18);
  } else if (id === "campfire") {
    drawIsoDiamond(b.gx, b.gy, 1, 1, 0, "#5e4930");
    const pt = gridToIso(b.gx + 0.5, b.gy + 0.5, 0);
    // Flickering fire
    ctx.fillStyle = Math.sin(now * 0.02) > 0 ? "#ff7722" : "#ffcc22";
    ctx.beginPath();
    ctx.arc(pt.x, pt.y - 5, 6, 0, Math.PI * 2);
    ctx.fill();
    // Idle peasants sitting around the campfire
    const idleCount = Math.min(6, Math.max(1, state.peasantsTotal - state.workers.length));
    for (let i = 0; i < idleCount; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const px = pt.x + Math.cos(ang) * 16;
      const py = pt.y + Math.sin(ang) * 8;
      ctx.fillStyle = "#d99b52";
      ctx.fillRect(px - 2, py - 8, 4, 8);
    }
  } else if (id === "stockpile") {
    // Authentic Stronghold Stockpile with visible 3D piles of Wood, Stone & Iron!
    drawIsoBlock(b.gx, b.gy, b.w, b.h, 0, 3, "#8a6d43", "#634c2c", "#4a381f");
    const woodStacks = Math.min(4, Math.ceil(state.wood / 35));
    for (let i = 0; i < woodStacks; i++) {
      drawIsoBlock(b.gx + 0.15 + i * 0.35, b.gy + 0.2, 0.3, 0.6, 3, 7, "#a66f38", "#7d5125", "#5c3b19");
    }
    const stoneStacks = Math.min(4, Math.ceil(state.stone / 25));
    for (let i = 0; i < stoneStacks; i++) {
      drawIsoBlock(b.gx + 0.15 + i * 0.35, b.gy + 1.1, 0.3, 0.6, 3, 8, "#b5b5bd", "#888891", "#64646b");
    }
  } else if (id === "granary") {
    // 3D Raised Timber Granary / Vee Bissa with visible food crates
    drawIsoBlock(b.gx, b.gy, b.w, b.h, 0, 18, "#9e3b24", "#7d5935", "#5c4024");
    const pt = gridToIso(b.gx + 1, b.gy + 1, 22);
    ctx.fillStyle = "#fae6b1";
    ctx.font = "bold 9px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(`🍖 ${state.food}`, pt.x, pt.y);
  } else if (id === "wood_wall") {
    drawIsoBlock(b.gx, b.gy, 1, 1, 0, 22, "#875a2c", "#69441f", "#4d3115");
  } else if (id === "stone_wall") {
    drawIsoBlock(b.gx, b.gy, 1, 1, 0, 28, "#9e9c96", "#7a7873", "#595854");
  } else if (id === "gatehouse") {
    drawIsoBlock(b.gx, b.gy, 1, 1, 0, 32, "#8f281e", "#696660", "#4d4a46");
  } else if (id === "tower") {
    drawIsoBlock(b.gx, b.gy, 1, 1, 0, 40, "#a8a59e", "#78756e", "#57544f");
  } else if (id === "paddy" || id === "orchard") {
    drawIsoBlock(b.gx, b.gy, b.w, b.h, 0, 3, id === "paddy" ? "#6da832" : "#387523", "#466b20", "#324d16");
  } else {
    const def = CATALOG[id] || { zHeight: 18, icon: "🏠" };
    drawIsoBlock(b.gx, b.gy, b.w, b.h, 0, def.zHeight || 18, "#944526", "#80623e", "#5e472b");
    const topPt = gridToIso(b.gx + b.w / 2, b.gy + b.h / 2, (def.zHeight || 18) + 4);
    ctx.font = "14px serif";
    ctx.textAlign = "center";
    ctx.fillText(def.icon, topPt.x, topPt.y);
  }

  // Damaged Building HP Bar
  if (b.hp < b.maxHp) {
    const pt = gridToIso(b.gx + b.w / 2, b.gy + b.h / 2, 34);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(pt.x - 16, pt.y - 6, 32, 4);
    ctx.fillStyle = "#5ce65c";
    ctx.fillRect(pt.x - 16, pt.y - 6, 32 * Math.max(0, b.hp / b.maxHp), 4);
  }
}

function drawIsoWorker(w) {
  const pt = gridToIso(w.gx, w.gy, 0);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(pt.x, pt.y + 1, 5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Peasant Body & Head
  ctx.fillStyle = "#c98b42";
  ctx.fillRect(pt.x - 3, pt.y - 11, 6, 10);
  ctx.fillStyle = "#f2c99d";
  ctx.beginPath();
  ctx.arc(pt.x, pt.y - 13, 3, 0, Math.PI * 2);
  ctx.fill();

  // Carried Resource Bundle above shoulder
  if (w.carryType) {
    ctx.fillStyle = w.carryType === "wood" ? "#8c5828" : w.carryType === "stone" ? "#ccc" : "#6be06b";
    ctx.fillRect(pt.x - 4, pt.y - 18, 8, 4);
  }
}

function drawIsoUnit(u) {
  const pt = gridToIso(u.gx, u.gy, u.z || 0);
  const rad = u.isHeavy ? 10 : 6;

  if (u.selected) {
    ctx.strokeStyle = "#5ce65c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y + 1, rad + 4, (rad + 4) * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Unit Body
  if (u.isHeavy && state.theme === "srilanka") {
    // 3D War Elephant Body
    ctx.fillStyle = "#59595e";
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y - 9, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b8251e";
    ctx.fillRect(pt.x - 6, pt.y - 18, 12, 6);
  } else {
    ctx.fillStyle = u.team === "player" ? (u.isLord ? "#f5c342" : "#1f7a31") : "#a82019";
    ctx.fillRect(pt.x - 3.5, pt.y - 13, 7, 12);
    ctx.fillStyle = "#f5d0a9";
    ctx.beginPath();
    ctx.arc(pt.x, pt.y - 15, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Health Bar
  const hpPct = Math.max(0, u.hp / u.maxHp);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(pt.x - 10, pt.y - 23, 20, 3);
  ctx.fillStyle = u.team === "player" ? "#63eb63" : "#ff5252";
  ctx.fillRect(pt.x - 10, pt.y - 23, 20 * hpPct, 3);
}

// ==================== SCRIBE FACE & DIAMOND RADAR RENDERERS ====================
function renderScribeFace() {
  const fc = document.getElementById("scribeFaceCanvas");
  const fctx = fc.getContext("2d");
  fctx.clearRect(0, 0, fc.width, fc.height);

  const pop = state.popularity;
  fctx.fillStyle = pop >= 65 ? "#46a842" : pop >= 45 ? "#d4a82a" : "#b82c21";
  fctx.beginPath();
  fctx.arc(27, 27, 23, 0, Math.PI * 2);
  fctx.fill();
  fctx.strokeStyle = "#4a3319";
  fctx.lineWidth = 2.5;
  fctx.stroke();

  // Eyes
  fctx.fillStyle = "#1c1208";
  fctx.beginPath();
  fctx.arc(19, 21, 3, 0, Math.PI * 2);
  fctx.arc(35, 21, 3, 0, Math.PI * 2);
  fctx.fill();

  // Smile / Scowl
  fctx.beginPath();
  if (pop >= 60) {
    fctx.arc(27, 28, 10, 0.15 * Math.PI, 0.85 * Math.PI);
  } else if (pop >= 45) {
    fctx.moveTo(18, 34);
    fctx.lineTo(36, 34);
  } else {
    fctx.arc(27, 39, 10, 1.15 * Math.PI, 1.85 * Math.PI);
  }
  fctx.stroke();
}

function renderDiamondRadar() {
  const rc = document.getElementById("radarCanvas");
  const rctx = rc.getContext("2d");
  rctx.fillStyle = "#172411";
  rctx.fillRect(0, 0, rc.width, rc.height);

  const cx = rc.width / 2;
  const cy = 12;
  const scale = 2.4;

  for (const tr of state.trees) {
    if (tr.stage >= 50) {
      rctx.fillStyle = "#2b6e1b";
      rctx.fillRect(cx + (tr.gx - tr.gy) * scale, cy + (tr.gx + tr.gy) * (scale * 0.5), 2, 2);
    }
  }
  for (const b of state.buildings) {
    rctx.fillStyle = b.id === "keep" ? "#f5c342" : "#c7b28f";
    rctx.fillRect(cx + (b.gx - b.gy) * scale, cy + (b.gx + b.gy) * (scale * 0.5), 3.5, 3.5);
  }
  for (const u of state.units) {
    rctx.fillStyle = u.team === "player" ? "#63eb63" : "#ff4444";
    rctx.fillRect(cx + (u.gx - u.gy) * scale, cy + (u.gx + u.gy) * (scale * 0.5), 3, 3);
  }
}

// ==================== BUILDING PLACEMENT & PATROL RAIDS ====================
function canPlaceAt(def, gx, gy) {
  if (gx < 0 || gy < 0 || gx + def.w > MAP_SIZE || gy + def.h > MAP_SIZE) return false;
  for (let y = gy; y < gy + def.h; y++) {
    for (let x = gx; x < gx + def.w; x++) {
      if (state.tiles[y][x].type === "water") return false;
      if (state.buildings.some(b => x >= b.gx && x < b.gx + b.w && y >= b.gy && y < b.gy + b.h)) return false;
    }
  }
  return true;
}

function tryPlaceOrDemolish(gx, gy) {
  if (state.demolishMode) {
    const idx = state.buildings.findIndex(b => gx >= b.gx && gx < b.gx + b.w && gy >= b.gy && gy < b.gy + b.h);
    if (idx !== -1) {
      const b = state.buildings[idx];
      if (b.id === "keep" || b.id === "campfire") return;
      state.buildings.splice(idx, 1);
      state.workers = state.workers.filter(w => w.bUid !== b.uid);
      recalcHousing();
      syncUI();
    }
    return;
  }

  if (!state.selectedBuildId) return;
  const def = CATALOG[state.selectedBuildId];
  if (!canPlaceAt(def, gx, gy)) {
    showScribeBanner("Can't place that there, M'Lord! The ground is blocked.");
    return;
  }

  for (const [k, amt] of Object.entries(def.cost)) {
    if ((state[k] || 0) < amt) {
      showScribeBanner(`More ${k} needed in the Stockpile, Sire!`);
      return;
    }
  }
  for (const [k, amt] of Object.entries(def.cost)) state[k] -= amt;

  // Clear trees under building footprint
  state.trees = state.trees.filter(tr => !(tr.gx >= gx && tr.gx <= gx + def.w && tr.gy >= gy && tr.gy <= gy + def.h));

  addBuildingInternal(def.id, gx, gy, def.w, def.h, def.hp);
  recalcHousing();
  syncUI();
}

function recalcHousing() {
  let cap = 8;
  for (const b of state.buildings) {
    if (CATALOG[b.id]?.popCap) cap += CATALOG[b.id].popCap;
  }
  state.peasantsCap = cap;
}

function triggerEnemyRaid() {
  state.waveNum++;
  state.waveTimer = 85;
  const count = 4 + Math.min(6, state.waveNum * 2);

  showScribeBanner(
    state.theme === "srilanka"
      ? "Sound the Hakgediya conch! Invader vanguards march down the border road toward our Simhadvara gate!"
      : "Maha Nilame Warning: 'Enemy columns are ascending the Balana pass toward Senkadagala!'"
  );

  for (let i = 0; i < count; i++) {
    const isBow = i % 3 === 2;
    state.units.push({
      uid: "raider_" + Math.random().toString(36).slice(2, 9),
      id: isBow ? "archer" : "spearman",
      team: "enemy",
      gx: 24.2 - (i % 2) * 0.6,
      gy: 11.2 + (i * 0.45) % 2.5,
      tx: 11.0,
      ty: 11.0,
      z: 0,
      hp: isBow ? 70 : 110,
      maxHp: isBow ? 70 : 110,
      dmg: isBow ? 10 : 15,
      range: isBow ? 4.5 : 0.9,
      speed: 0.026,
      isRanged: isBow,
      lastAttack: 0,
      selected: false
    });
  }
}

function showScribeBanner(msg) {
  document.getElementById("sbQuoteText").textContent = `"${msg}"`;
  const alertEl = document.getElementById("scribeAlert");
  document.getElementById("saText").textContent = `"${msg}"`;
  alertEl.classList.remove("hidden");
  clearTimeout(window._alertTimer);
  window._alertTimer = setTimeout(() => alertEl.classList.add("hidden"), 5500);
}

// ==================== UI PALETTE & HUD SYNC ====================
function renderPalette() {
  const strip = document.getElementById("shPaletteStrip");
  strip.innerHTML = "";
  const tDict = THEMES[state.theme];

  if (state.activeCat === "troops") {
    for (const td of Object.values(TROOP_DEFS)) {
      const reqStr = Object.entries(td.req).map(([k, v]) => `${v} ${k}`).join(" + ");
      const card = document.createElement("div");
      card.className = "iso-card";
      card.innerHTML = `
        <div class="ic-head"><span>${td.icon}</span> <span>${tDict[td.id] || td.id}</span></div>
        <div class="ic-sub">${td.sub}</div>
        <div class="ic-cost">🪙${td.gold} • ${reqStr}</div>
      `;
      card.addEventListener("click", () => recruitMilitaryUnit(td));
      strip.appendChild(card);
    }
    return;
  }

  const items = Object.values(CATALOG).filter(b => b.cat === state.activeCat);
  for (const b of items) {
    const costStr = Object.entries(b.cost).map(([k, v]) => `${v}${k === "wood" ? "🪵" : k === "stone" ? "🪨" : "🪙"}`).join(" ");
    const card = document.createElement("div");
    card.className = `iso-card ${state.selectedBuildId === b.id ? "selected" : ""}`;
    card.innerHTML = `
      <div class="ic-head"><span>${b.icon}</span> <span>${tDict[b.id] || b.id}</span></div>
      <div class="ic-sub">${b.sub}</div>
      <div class="ic-cost">${costStr}</div>
    `;
    card.addEventListener("click", () => {
      state.demolishMode = false;
      document.getElementById("demolishBtn").classList.remove("active");
      state.selectedBuildId = state.selectedBuildId === b.id ? null : b.id;
      renderPalette();
    });
    strip.appendChild(card);
  }
}

function recruitMilitaryUnit(td) {
  if (state.gold < td.gold) {
    showScribeBanner("Not enough Gold in the treasury, Sire!");
    return;
  }
  for (const [wk, qty] of Object.entries(td.req)) {
    if ((state.weapons[wk] || 0) < qty) {
      showScribeBanner(`Weapons needed! Craft more ${wk} in your weapons workshops!`);
      return;
    }
  }
  state.gold -= td.gold;
  for (const [wk, qty] of Object.entries(td.req)) state.weapons[wk] -= qty;

  const barracks = state.buildings.find(b => b.id === "barracks") || state.buildings[0];
  spawnUnit(td.id, barracks.gx + 1.2 + Math.random() * 0.6, barracks.gy + 2.2 + Math.random() * 0.6, "player");
  syncUI();
}

function syncUI() {
  document.getElementById("stWood").textContent = state.wood;
  document.getElementById("stStone").textContent = state.stone;
  document.getElementById("stIron").textContent = state.iron;
  document.getElementById("stWheat").textContent = state.wheat;
  document.getElementById("stFood").textContent = state.food;
  document.getElementById("stAle").textContent = state.ale;
  document.getElementById("stBows").textContent = state.weapons.bows;
  document.getElementById("stSpears").textContent = state.weapons.spears;
  document.getElementById("stSwords").textContent = state.weapons.swords;

  document.getElementById("sbPop").textContent = state.popularity;
  document.getElementById("sbPop").className = `sb-val ${state.popularity >= 50 ? "pos" : "neg"}`;
  document.getElementById("sbGold").textContent = state.gold;
  document.getElementById("sbPeasants").textContent = `${state.peasantsTotal}/${state.peasantsCap}`;

  const m = String(Math.floor(state.waveTimer / 60)).padStart(2, "0");
  const s = String(state.waveTimer % 60).padStart(2, "0");
  document.getElementById("sbWaveTimer").textContent = `${m}:${s}`;

  renderScribeFace();
}

// ==================== INPUT & CAMERA CONTROLS ====================
canvas.addEventListener("mousemove", e => {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left;
  const sy = e.clientY - r.top;

  if (state.isPanning) {
    state.camX += sx - state.panStart.x;
    state.camY += sy - state.panStart.y;
    state.panStart = { x: sx, y: sy };
    return;
  }

  state.hoverTile = isoToGrid(sx, sy);
  if (state.dragSelect.active) {
    state.dragSelect.x2 = sx;
    state.dragSelect.y2 = sy;
  }
});

canvas.addEventListener("mousedown", e => {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left;
  const sy = e.clientY - r.top;
  const g = isoToGrid(sx, sy);

  if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
    state.isPanning = true;
    state.panStart = { x: sx, y: sy };
    return;
  }

  if (e.button === 0) {
    if (state.selectedBuildId || state.demolishMode) {
      tryPlaceOrDemolish(g.gx, g.gy);
      return;
    }
    state.dragSelect = { active: true, x1: sx, y1: sy, x2: sx, y2: sy };
  } else if (e.button === 2) {
    if (state.selectedBuildId || state.demolishMode) {
      state.selectedBuildId = null;
      state.demolishMode = false;
      document.getElementById("demolishBtn").classList.remove("active");
      renderPalette();
      return;
    }
    // Command selected units to march to clicked isometric coordinate
    const selected = state.units.filter(u => u.team === "player" && u.selected);
    selected.forEach((u, idx) => {
      u.tx = g.exactX + (idx % 3) * 0.4;
      u.ty = g.exactY + Math.floor(idx / 3) * 0.4;
    });
    if (selected.length > 0) spawnFloat("🚩 Moving!", g.exactX, g.exactY, "#7ce87c");
  }
});

window.addEventListener("mouseup", () => {
  state.isPanning = false;
  if (!state.dragSelect.active) return;
  state.dragSelect.active = false;

  const { x1, y1, x2, y2 } = state.dragSelect;
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  const singleClick = (maxX - minX < 8 && maxY - minY < 8);

  for (const u of state.units) {
    if (u.team !== "player" || u.isLord) continue;
    const pt = gridToIso(u.gx, u.gy, u.z || 0);
    if (singleClick) {
      u.selected = Math.hypot(pt.x - x1, pt.y - y1) < 22;
    } else {
      u.selected = pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
    }
  }
});

canvas.addEventListener("contextmenu", e => e.preventDefault());

window.addEventListener("keydown", e => {
  const step = 28;
  if (e.key === "ArrowLeft" || e.key === "a") state.camX += step;
  if (e.key === "ArrowRight" || e.key === "d") state.camX -= step;
  if (e.key === "ArrowUp" || e.key === "w") state.camY += step;
  if (e.key === "ArrowDown" || e.key === "s") state.camY -= step;
});

// ==================== UI BUTTON LISTENERS ====================
document.querySelectorAll(".sh-shield[data-cat]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sh-shield").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.activeCat = btn.dataset.cat;
    state.selectedBuildId = null;
    state.demolishMode = false;
    renderPalette();
  });
});

document.getElementById("demolishBtn").addEventListener("click", () => {
  state.selectedBuildId = null;
  state.demolishMode = !state.demolishMode;
  document.getElementById("demolishBtn").classList.toggle("active", state.demolishMode);
  renderPalette();
});

document.getElementById("themeToggleBtn").addEventListener("click", e => {
  state.theme = state.theme === "srilanka" ? "classic" : "srilanka";
  const tDict = THEMES[state.theme];
  e.target.textContent = tDict.label;
  document.getElementById("scribeTitleLabel").textContent = tDict.scribeTitle;
  renderPalette();
});

document.getElementById("triggerRaidBtn").addEventListener("click", triggerEnemyRaid);

document.getElementById("pauseGameBtn").addEventListener("click", e => {
  state.paused = !state.paused;
  e.target.textContent = state.paused ? "▶️ Resume" : "⏸️ Pause";
});

document.getElementById("centerCameraBtn").addEventListener("click", () => {
  state.camX = canvas.width / 2;
  state.camY = 85;
});

document.getElementById("soundToggleBtn").addEventListener("click", e => {
  state.audioOn = !state.audioOn;
  e.target.textContent = state.audioOn ? "🔊 Audio: ON" : "🔇 Audio: OFF";
});

document.getElementById("openTaxModalBtn").addEventListener("click", () => {
  const modal = document.getElementById("shInspector");
  const body = document.getElementById("shiBody");
  modal.classList.remove("hidden");
  body.innerHTML = `
    <div style="margin-bottom:8px;">
      <label style="display:flex;justify-content:space-between;font-weight:bold;">
        <span>🪙 Tax Rate:</span> <span id="txLbl">Level ${state.taxLevel}</span>
      </label>
      <input type="range" id="txRng" min="-2" max="4" value="${state.taxLevel}" style="width:100%;" />
    </div>
    <div>
      <label style="display:flex;justify-content:space-between;font-weight:bold;">
        <span>🍖 Granary Rations:</span> <span id="rtLbl">${state.rationLevel}x Rations</span>
      </label>
      <input type="range" id="rtRng" min="0" max="4" value="${state.rationLevel}" style="width:100%;" />
    </div>
  `;
  document.getElementById("txRng").addEventListener("input", ev => {
    state.taxLevel = Number(ev.target.value);
    document.getElementById("txLbl").textContent = `Level ${state.taxLevel}`;
  });
  document.getElementById("rtRng").addEventListener("input", ev => {
    state.rationLevel = Number(ev.target.value);
    document.getElementById("rtLbl").textContent = `${state.rationLevel}x Rations`;
  });
});

document.getElementById("shiCloseBtn").addEventListener("click", () => {
  document.getElementById("shInspector").classList.add("hidden");
});

// ==================== 1-SECOND GOVERNANCE & WAVE TIMER ====================
setInterval(() => {
  if (state.paused) return;
  state.waveTimer--;
  if (state.waveTimer <= 0) triggerEnemyRaid();

  // Food & Tax calculation
  const foodUse = Math.max(0, Math.round(state.peasantsTotal * state.rationLevel * 0.1));
  state.food = Math.max(0, state.food - foodUse);
  state.gold = Math.max(0, state.gold + Math.round(state.peasantsTotal * state.taxLevel * 0.4));

  const targetPop = Math.max(10, Math.min(100, 68 + (state.rationLevel - 2) * 8 - state.taxLevel * 5 + (state.ale > 0 ? 6 : 0)));
  state.popularity += Math.sign(targetPop - state.popularity);

  if (state.popularity >= 55 && state.peasantsTotal < state.peasantsCap && Math.random() < 0.35) {
    state.peasantsTotal++;
  }
  syncUI();
}, 1000);

// ==================== MAIN 60FPS LOOP ====================
let lastTs = performance.now();
function loop(now) {
  const dt = Math.min(50, now - lastTs) / 16.667;
  lastTs = now;

  if (!state.paused) {
    updateWorkersAndWildlife(dt);
    updateUnitsAndProjectiles(now, dt);
  }
  renderIsoWorld(now);
  renderDiamondRadar();

  requestAnimationFrame(loop);
}

resizeCanvas();
initWorld();
recalcHousing();
renderPalette();
syncUI();
requestAnimationFrame(loop);
