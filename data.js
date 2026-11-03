"use strict";
// ============================================================================
// BALAKOTUWA — content tables. Add buildings, troops, raiders and levels here.
// Loaded first; game.js and render.js read these globals. See CLAUDE.md.
// ============================================================================

const MAP = 28;
const TW = 64;
const TH = 32;
const WEWA_CAP = 100;
const SAVE_KEY = "balakotuwa.progress.v2";

const SEASONS = {
  maha: { len: 45, label: "🌧️ Maha monsoon", next: "yala" },
  yala: { len: 60, label: "☀️ Yala dry season", next: "maha" }
};

const RES = { timber: "🪵", stone: "🪨", rice: "🍚", gold: "🪙" };

// ==================== BUILDINGS ====================
// solid: blocks raiders (they must break it). ground: flat, walkable.
// flammable: thatch or timber that raider fire arrows can set alight.
// upgrade: { to, cost } lets the ⬆️ Upgrade tool rebuild it in place.
// moat: a canal tile that slows raiders to a crawl while its network holds water.
// worker: job type staffed by one villager. store: drop-off for those resources.
const BUILDINGS = {
  citadel:    { name: "Maligawa (Citadel)", cat: null, icon: "🏯", w: 2, h: 2, hp: 2500, solid: true, z: 40, store: ["timber", "stone", "rice"],
                tower: { range: 4.5, dmg: 8, cd: 1.3 } },

  wewa:       { name: "Wewa (Tank)", cat: "water", icon: "💧", w: 2, h: 2, hp: 700, cost: { timber: 10, stone: 6 }, solid: true, water: true, z: 5,
                desc: "Stores Maha rain; silt builds up, and idle villagers dig it out in Yala." },
  canal:      { name: "Ela (Canal)", cat: "water", icon: "〰️", w: 1, h: 1, hp: 150, cost: { stone: 1 }, ground: true, water: true, paint: true,
                desc: "Carries wewa water to paddies; drag to paint." },
  moat:       { name: "Diya Agala (Moat)", cat: "water", icon: "🌊", w: 1, h: 1, hp: 300, cost: { stone: 2, timber: 1 }, ground: true, water: true, moat: true, paint: true,
                desc: "Canal ditch: while it holds water, raiders wade at a crawl." },
  sluice:     { name: "Sorowwa (Sluice)", cat: "water", icon: "🚪", w: 1, h: 1, hp: 400, cost: { timber: 6, stone: 8 }, ground: true, water: true,
                desc: "Click to flood its canals, slowing and drowning raiders." },

  paddy:      { name: "Kumbura (Paddy)", cat: "food", icon: "🌾", w: 2, h: 2, hp: 150, cost: { timber: 6 }, ground: true, worker: "farmer",
                desc: "Grows rice; in Yala only beside a watered canal, wewa or river." },
  bissa:      { name: "Vee Bissa (Granary)", cat: "food", icon: "🏺", w: 1, h: 1, hp: 350, cost: { timber: 12 }, solid: true, flammable: true, z: 26, store: ["rice"],
                desc: "Farmers drop rice here instead of walking to the citadel." },
  pela:       { name: "Pela (Watch hut)", cat: "food", icon: "🛖", w: 1, h: 1, hp: 120, cost: { timber: 5 }, solid: true, flammable: true, z: 22, worker: "watchman",
                desc: "Its watchman scares wild elephants away from everything within 5 tiles." },
  market:     { name: "Pola (Market)", cat: "food", icon: "⚖️", w: 2, h: 2, hp: 320, cost: { timber: 14, stone: 4 }, solid: true, flammable: true, z: 16, worker: "trader",
                desc: "A trader sells spare rice for gold (set limits in the 👑 tab)." },

  woodcutter: { name: "Dara Maduwa (Woodcutter)", cat: "industry", icon: "🪓", w: 1, h: 1, hp: 200, cost: { timber: 4 }, solid: true, flammable: true, z: 18, worker: "woodcutter",
                desc: "Fells mature trees within 9 tiles." },
  quarry:     { name: "Gal Wala (Quarry)", cat: "industry", icon: "⛏️", w: 1, h: 1, hp: 260, cost: { timber: 10 }, solid: true, flammable: true, z: 16, worker: "mason", needsRock: true,
                desc: "Cuts stone; must stand within 2 tiles of rock." },
  kammala:    { name: "Kammala (Smithy)", cat: "industry", icon: "⚒️", w: 1, h: 1, hp: 260, cost: { timber: 10, stone: 4 }, solid: true, z: 20, worker: "smith",
                desc: "A smith forges timber into arms, making soldiers 30% cheaper in gold." },
  storehouse: { name: "Gabadawa (Storehouse)", cat: "industry", icon: "📦", w: 2, h: 2, hp: 400, cost: { timber: 12 }, solid: true, flammable: true, z: 18, store: ["timber", "stone"],
                desc: "Drop-off for timber and stone." },

  pansala:    { name: "Pansala (Monastery)", cat: "town", icon: "🪷", w: 2, h: 2, hp: 600, cost: { timber: 20, stone: 12, gold: 20 }, solid: true, z: 34, worker: "monk",
                desc: "A monk on alms rounds: +5 harmony (two count)." },
  house:      { name: "Gedara (House)", cat: "town", icon: "🏠", w: 1, h: 1, hp: 220, cost: { timber: 8 }, solid: true, flammable: true, z: 18, pop: 5, upgrade: { to: "walawwa", cost: { timber: 10, stone: 8, gold: 15 } },
                desc: "Room for 5 more villagers." },
  walawwa:    { name: "Walawwa (Manor)", cat: null, icon: "🏡", w: 1, h: 1, hp: 420, cost: { timber: 18, stone: 8, gold: 15 }, solid: true, z: 24, pop: 8, harmony: 1,
                desc: "An upgraded house: room for 8 and +1 harmony each (up to 6)." },
  dagoba:     { name: "Dagoba (Stupa)", cat: "town", icon: "🛕", w: 2, h: 2, hp: 1000, cost: { stone: 30, gold: 40 }, solid: true, z: 44, harmony: 12,
                desc: "+12 harmony (counts up to two)." },

  palisade:   { name: "Palisade", cat: "defence", icon: "🪵", w: 1, h: 1, hp: 320, cost: { timber: 3 }, solid: true, flammable: true, wall: true, z: 20, paint: true, upgrade: { to: "rampart", cost: { stone: 4 } },
                desc: "Cheap wall; archers on it are safe from swords." },
  rampart:    { name: "Gal Bamma (Rampart)", cat: "defence", icon: "🧱", w: 1, h: 1, hp: 950, cost: { stone: 5 }, solid: true, wall: true, z: 26, paint: true,
                desc: "Stone wall; archers on it are safe from swords and shoot farther." },
  gate:       { name: "Vahalkada (Gate)", cat: "defence", icon: "⛩️", w: 1, h: 1, hp: 900, cost: { timber: 8, stone: 6 }, solid: true, wall: true, z: 30,
                desc: "Your soldiers pass through; raiders must break it." },
  tower:      { name: "Atuwa (Watchtower)", cat: "defence", icon: "🗼", w: 1, h: 1, hp: 750, cost: { timber: 12, stone: 10 }, solid: true, z: 48,
                tower: { range: 5.5, dmg: 12, cd: 1.1 }, desc: "Shoots raiders within 5.5 tiles; archers on it shoot farther." },
  bolt:       { name: "Yantra Atuwa (Bolt tower)", cat: "defence", icon: "🎯", w: 1, h: 1, hp: 800, cost: { timber: 20, stone: 16, gold: 20 }, solid: true, z: 44,
                tower: { range: 8, dmg: 45, cd: 3.2, siege: true }, desc: "A great bolt-thrower that outranges stone throwers and hunts them first." },
  barracks:   { name: "Angam Maduwa (Barracks)", cat: "defence", icon: "⚔️", w: 2, h: 2, hp: 700, cost: { timber: 18, stone: 8 }, solid: true, z: 22,
                desc: "Trains soldiers; those resting nearby drill and rise to ★ veteran, then ★★ champion." }
};

// ==================== ROYAL DECREES ====================
// Proclaimed from the 👑 tab. once: "season" = once per season, "maha" = once
// per Maha. dur in simulation seconds. Effects are read by name in game.js.
const EDICTS = {
  rajakariya: { name: "Rajakariya (Royal service)", icon: "🛠️", cost: { rice: 15 }, once: "season", dur: 30, harmony: -8,
                work: 1.6, buildDiscount: 0.3,
                desc: "30s of faster work and 30% cheaper building, at −8 harmony." },
  perahera:   { name: "Perahera (Festival)", icon: "🐘", cost: { rice: 40, gold: 30 }, once: "maha", dur: 60, harmony: 6,
                harmonyTarget: 25,
                desc: "Once per Maha, a 60s procession lifts harmony towards +25." }
};

const CATS = [
  { id: "water", icon: "💧", label: "Water" },
  { id: "food", icon: "🌾", label: "Food" },
  { id: "industry", icon: "🪓", label: "Industry" },
  { id: "town", icon: "🛕", label: "Town" },
  { id: "defence", icon: "🏯", label: "Defence" },
  { id: "army", icon: "🐘", label: "Army" },
  { id: "realm", icon: "👑", label: "Decrees" }
];

// ==================== SOLDIERS & RAIDERS ====================
// Training a soldier costs one idle villager as well as the listed resources.
const TROOPS = {
  archer:    { name: "Dunuvaya (Archer)", icon: "🏹", cost: { gold: 15, rice: 5 }, hp: 70, dmg: 11, range: 5, speed: 1.8, ranged: true, color: "#2f8f4e",
               desc: "Ranged; on walls and towers they shoot farther and melee raiders can't reach them." },
  spearman:  { name: "Hella (Spearman)", icon: "🔱", cost: { gold: 10, rice: 5 }, hp: 130, dmg: 14, range: 0.9, speed: 2.0, color: "#2d6fa8",
               desc: "Sturdy melee guard." },
  angampora: { name: "Angampora Fighter", icon: "🥋", cost: { gold: 22, rice: 8 }, hp: 170, dmg: 24, range: 0.9, speed: 2.6, color: "#d2902a",
               desc: "Fast, hard-hitting martial artist." },
  elephant:  { name: "Kandula (War Elephant)", icon: "🐘", cost: { gold: 70, rice: 25 }, hp: 560, dmg: 38, range: 1.2, speed: 1.4, heavy: true, splash: 1.3, color: "#6e6e74",
               desc: "Tramples every raider near its target." }
};

// Ranks: soldiers resting within 3 tiles of a barracks drill (1 xp/s while no
// raider is near), and every raider killed close by teaches them (KILL_XP).
const RANKS = [
  { name: "Recruit", xp: 0, hp: 1, dmg: 1 },
  { name: "Veteran", xp: 90, hp: 1.25, dmg: 1.2 },
  { name: "Champion", xp: 300, hp: 1.5, dmg: 1.4 }
];
const KILL_XP = 6;

const FOES = {
  raider: { name: "Raider", hp: 90, dmg: 12, bdmg: 12, range: 0.9, speed: 1.5, gold: 6, morale: 0.35, loot: true },
  bowman: { name: "Raider bowman", hp: 60, dmg: 9, bdmg: 4, range: 4.2, speed: 1.5, ranged: true, gold: 6, fire: true, morale: 0.45 },
  brute:  { name: "Ram bearer", hp: 280, dmg: 10, bdmg: 48, range: 0.9, speed: 1.0, heavy: true, gold: 15, morale: 0 },
  thrower: { name: "Stone thrower", hp: 240, dmg: 0, bdmg: 70, range: 6.8, speed: 0.7, ranged: true, siege: true, cd: 4.5, heavy: true, gold: 25, morale: 0 },
  aliya: { name: "Wild elephant", hp: 900, dmg: 0, bdmg: 0, range: 0.6, speed: 0.9, heavy: true, gold: 0, morale: 0, wild: true }
};

// siege: stops at range and lobs stones at walls and towers (outranges watchtowers).
// fire: shoots fire arrows at flammable buildings when no soldier is in range
// (only on levels with fireArrows: true).
// loot: on the way in, breaks off to trample a ripening paddy or rob a granary.
// wild: not a raider (team "w"): comes out of the jungle for ripe rice on levels
// with `wild: { first, every }`, and turns back from a staffed pela. Nobody fights it.
// morale: when its raid party falls below this share of its strength, the
// raider flees back to its edge (0 = never). Fleeing raiders give no gold.

// ==================== CAMPAIGN ====================
// Rects are [x1, y1, x2, y2] inclusive; forests add a density. Waves split
// their troops round-robin across the `from` edges.
const LEVELS = [
  {
    id: "anuradhapura", name: "Dawn at Anuradhapura", era: "Early kingdom", seed: 11,
    intro: "A young settlement beside the river. Cut timber, dig your first wewa and fill the granary before raiders come out of the east.",
    citadel: [11, 12], season: "maha",
    start: { timber: 70, stone: 20, rice: 60, gold: 60, villagers: 8 },
    prebuilt: [["house", 9, 15]],
    army: { spearman: 2, archer: 1 },
    rivers: [{ edge: "west", at: 1, width: 2, wobble: 1.2 }],
    rocks: [[16, 3, 20, 6]],
    forests: [[3, 4, 9, 9, 0.55], [4, 18, 10, 24, 0.5], [19, 18, 24, 24, 0.45]],
    unlocks: { buildings: ["woodcutter", "quarry", "storehouse", "house", "wewa", "canal", "paddy", "bissa", "palisade", "barracks"], troops: ["spearman", "archer"] },
    waves: [{ t: 170, from: ["east"], raider: 3 }, { t: 290, from: ["east"], raider: 4, bowman: 1 }],
    hpScale: 1.0,
    objectives: [{ type: "res", key: "timber", n: 100 }, { type: "build", id: "wewa", n: 1 }, { type: "res", key: "rice", n: 80 }, { type: "waves" }],
    tutorial: true
  },
  {
    id: "ruhuna", name: "Elephants of Ruhuna", era: "Magama", seed: 29,
    intro: "In the southern kingdom of Ruhuna, wild elephants come out of the jungle when the rice ripens. Raise a pela (watch hut) beside your paddies: its watchman scares them away. Feed a growing village and hold off the raiders.",
    citadel: [12, 12], season: "maha",
    start: { timber: 90, stone: 30, rice: 60, gold: 70, villagers: 9 },
    army: { spearman: 2, archer: 2 },
    rivers: [{ edge: "south", at: 0, width: 2, wobble: 1.4 }],
    rocks: [[18, 4, 21, 7]],
    forests: [[2, 2, 10, 9, 0.6], [17, 13, 24, 20, 0.5], [2, 15, 7, 21, 0.45]],
    unlocks: { buildings: ["pela"] },
    wild: { first: 70, every: 65 },
    waves: [{ t: 180, from: ["east"], raider: 4 }, { t: 300, from: ["north"], raider: 4, bowman: 2 }],
    hpScale: 1.0,
    objectives: [{ type: "res", key: "rice", n: 120 }, { type: "pop", n: 20 }, { type: "waves" }]
  },
  {
    id: "dryzone", name: "The Dry Zone", era: "Rajarata", seed: 23,
    intro: "The rains here are short. Store every drop in wewas and canals. A sluice gate can flood those canals under the raiders' feet.",
    citadel: [13, 13], season: "yala",
    start: { timber: 110, stone: 40, rice: 70, gold: 90, villagers: 10 },
    army: { spearman: 3, archer: 2 },
    rivers: [{ edge: "north", at: 0, width: 1, wobble: 1 }],
    rocks: [[3, 18, 7, 23], [20, 4, 23, 7]],
    forests: [[3, 4, 8, 10, 0.4], [17, 18, 23, 24, 0.35]],
    unlocks: { buildings: ["sluice", "moat", "tower", "pansala"] },
    waves: [{ t: 160, from: ["east"], raider: 4, bowman: 1 }, { t: 280, from: ["south"], raider: 5, bowman: 2 }, { t: 400, from: ["east"], raider: 6, bowman: 2 }],
    hpScale: 1.1,
    objectives: [{ type: "water", n: 150 }, { type: "res", key: "rice", n: 120 }, { type: "waves" }]
  },
  {
    id: "lionrock", name: "Lion Rock", era: "Sigiriya", seed: 37,
    intro: "Your citadel sits beneath a great rock. Raider bowmen here shoot fire arrows at thatch: keep wewas full so villagers can carry water. Raise ramparts and open a market.",
    citadel: [12, 12], season: "maha",
    start: { timber: 120, stone: 60, rice: 80, gold: 120, villagers: 12 },
    army: { spearman: 3, archer: 3 },
    rivers: [{ edge: "west", at: 0, width: 2, wobble: 1.5 }],
    rocks: [[15, 6, 19, 9], [5, 16, 8, 19]],
    forests: [[3, 3, 10, 8, 0.45], [18, 17, 25, 24, 0.4], [3, 21, 8, 25, 0.4]],
    unlocks: { buildings: ["rampart", "gate", "market", "walawwa", "kammala"], troops: ["angampora"] }, fireArrows: true,
    waves: [
      { t: 150, from: ["east"], raider: 5, bowman: 2 },
      { t: 260, from: ["south"], raider: 6, bowman: 2 },
      { t: 370, from: ["east", "south"], raider: 7, bowman: 3 },
      { t: 480, from: ["east", "south"], raider: 8, bowman: 3, brute: 1 }
    ],
    hpScale: 1.2,
    objectives: [{ type: "build", id: "rampart", n: 10 }, { type: "build", id: "market", n: 1 }, { type: "res", key: "gold", n: 250 }, { type: "waves" }]
  },
  {
    id: "parakrama", name: "Sea of Parakrama", era: "Polonnaruwa", seed: 53,
    intro: "\"Let not one drop of rain reach the sea unused.\" Chain your wewas with canals so a full tank spills into the next, raise a dagoba, and beware the ram bearers.",
    citadel: [14, 11], season: "yala",
    start: { timber: 140, stone: 80, rice: 90, gold: 150, villagers: 14 },
    army: { spearman: 4, archer: 3, angampora: 1 },
    lakes: [[5, 6, 3]],
    rivers: [{ edge: "south", at: 0, width: 2, wobble: 1 }],
    rocks: [[19, 3, 23, 6]],
    forests: [[2, 14, 8, 20, 0.45], [18, 15, 24, 21, 0.4]],
    unlocks: { buildings: ["dagoba"], troops: ["elephant"] }, fireArrows: true,
    waves: [
      { t: 150, from: ["east"], raider: 5, bowman: 2 },
      { t: 250, from: ["north"], raider: 6, bowman: 3 },
      { t: 350, from: ["east"], raider: 6, bowman: 3, brute: 1 },
      { t: 450, from: ["north", "east"], raider: 8, bowman: 3, brute: 2 },
      { t: 560, from: ["east"], raider: 10, bowman: 4, brute: 2 }
    ],
    hpScale: 1.3,
    objectives: [{ type: "build", id: "wewa", n: 4 }, { type: "build", id: "dagoba", n: 1 }, { type: "catch", n: 400 }, { type: "waves" }]
  },
  {
    id: "senkadagala", name: "Hill Kingdom", era: "Senkadagala", seed: 71,
    intro: "The last free kingdom in the hills, and the home of the Perahera. Raiders come from three sides and bring stone throwers that outrange your towers: answer with bolt towers and archers on the walls, and use royal decrees to rally your people.",
    citadel: [13, 13], season: "maha",
    start: { timber: 160, stone: 100, rice: 190, gold: 180, villagers: 16 },
    army: { spearman: 4, archer: 4, angampora: 2 },
    rivers: [{ edge: "west", at: 1, width: 1, wobble: 2 }],
    rocks: [[3, 3, 7, 6], [20, 20, 24, 24], [19, 3, 22, 6]],
    forests: [[2, 9, 8, 16, 0.4], [9, 19, 16, 25, 0.4], [18, 8, 24, 13, 0.35]],
    unlocks: { buildings: ["bolt"], edicts: ["rajakariya", "perahera"] }, fireArrows: true,
    waves: [
      { t: 180, from: ["east"], raider: 5, bowman: 2 },
      { t: 230, from: ["south"], raider: 6, bowman: 3 },
      { t: 320, from: ["north"], raider: 7, bowman: 3, brute: 1 },
      { t: 410, from: ["east", "south"], raider: 8, bowman: 4, brute: 1 },
      { t: 500, from: ["north", "east"], raider: 9, bowman: 4, brute: 2, thrower: 1 },
      { t: 590, from: ["south", "north"], raider: 10, bowman: 5, brute: 2, thrower: 1 },
      { t: 690, from: ["east", "south", "north"], raider: 12, bowman: 6, brute: 3, thrower: 2 }
    ],
    hpScale: 1.45,
    objectives: [{ type: "harmony", n: 60 }, { type: "pop", n: 30 }, { type: "res", key: "rice", n: 150 }, { type: "waves" }]
  }
];

// Contextual advice for the tutorial level. Each fires once, in order.
const TUTORIAL = [
  { when: () => true, text: "Ayubowan! I keep the tanks. Timber first: build a Dara Maduwa beside the forest (Industry tab)." },
  { when: () => count("woodcutter") > 0, text: "Good. Now dig a Wewa (Water tab). In the Maha monsoon, rain fills it." },
  { when: () => count("wewa") > 0, text: "Lay Ela canals from the wewa and plant Kumbura paddies beside them. In the dry Yala season, only watered paddies grow." },
  { when: () => count("paddy") > 0, text: "Farmers carry rice to the citadel. Build Gedara houses so more villagers come to work." },
  { when: () => count("house") >= 3 || S.rice < 30 || nextWaveIn() <= 45, text: "Every new family eats rice. Keep about one watered paddy for each house, or the granary will empty." },
  { when: () => nextWaveIn() <= 30, text: "Raiders gather in the east! Train soldiers at the Angam Maduwa and close the gaps with palisades." }
];

