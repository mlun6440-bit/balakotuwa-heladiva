# Balakotuwa — working rules

Read this before changing the game. It is written so that any future model
(or person) can extend it safely without re-deriving the design.

## Identity — non-negotiable

- This is an **original** game. Its core is the monsoon/water loop: wewas,
  canals, sluice flooding, Maha/Yala seasons, villagers who become soldiers.
- Do not copy or recreate any existing commercial game: no borrowed maps,
  mission layouts, UI layouts, unit rosters, mechanics or art. Inspiration
  from the city-builder / castle-defence *genre* is fine; cloning a title is not.
- Art direction: Sri Lankan architecture (Kandyan hipped clay-tile roofs,
  whitewash on laterite plinths, thatched huts, dagobas, terraced paddies).

## Architecture

Four classic scripts sharing globals, loaded in this order:

1. `data.js`: pure data tables (`BUILDINGS`, `TROOPS`, `RANKS`, `FOES`, `EDICTS`, `LEVELS`, `TUTORIAL`, `SEASONS`).
2. `game.js`: state `S`, simulation, pathfinding, water, HUD, input, boot.
   Boot waits for `DOMContentLoaded` so `render.js` is present.
3. `audio.js`: synthesised sound (`SOUND.play(kind)`, `SOUND.update()`); reads `S`, never writes it.
4. `render.js`: every pixel. Only cosmetic state is written here: `S.fx`
   particles plus render-local caches (terrain, shadow layer, footpaths,
   ruins, gait/facing, ambient animals). The simulation never reads them.

Art is baked offline: `tools/art/*.js` model every sprite in grid space and
`node tools/bake.mjs` writes `assets/atlas*.png` + `assets/atlas.js` (loaded
by `index.html` before `render.js`). Each `draw*` function tries the sprite
first and falls back to procedural drawing, so the game runs without the
atlas. Re-run the bake after changing anything under `tools/art/`.
Soldiers, raiders and villagers are 3D models in `tools/art3d/` (three.js,
a pinned dev dependency: run `cd tools && npm install` once), pre-rendered by
the same bake in 8 directions with one fixed sun. Buildings stay 2D.

Key invariants:

- Any change to the building layout must go through `addBuilding`/`removeBuilding`
  followed by `refreshWorld()`. That rebuilds occupancy, the raider flow field,
  the water networks and staffing.
- Simulation time is `S.time` (seconds, scaled by game speed). Never use
  wall-clock time for gameplay, only for animation.
- The one-second economy runs in `tick()`. Per-frame movement runs in `step(dt)`.
- Workers exist only while there are villagers to staff them (`staff()`).
- Water: Maha rain fills each wewa (`RAIN`/s); overflow cascades to other
  wewas on the same canal network, and only what none can hold is counted in
  `S.rain.lost`.
- `S.cover` (forest cover per tile) is refreshed in `tick()`; use `inCover(u)`
  rather than counting trees.
- Save: `saveRun()` stores primary state only (`RUN_SKIP` lists what is
  derived or transient). A new field on `S`, a building or a unit must be
  plain data and, for buildings/units, added to the lists in `saveRun`.
- Unit queries go through the spatial hash (`unitsNear`), rebuilt each
  combat step; don't loop over every unit for neighbour checks.
- Raid parties (`S.parties`) drive morale; spawn raiders with a party id.
- `b.at` is the simulation time a building was placed; the renderer uses it
  for the cosmetic construction animation only.
- Coordinates: grid `gx, gy` (floats for movers); `iso()` maps to world pixels
  at zoom 1; `view.zoom`/`view.dpr` are applied by canvas transform only.

## Extending

- **New building:** add a row to `BUILDINGS` (flags: `solid`, `ground`, `wall`,
  `water`, `worker`, `store`, `pop`, `harmony`, `tower`, `paint`, `needsRock`,
  `flammable`, `moat`, `upgrade: { to, cost }`),
  unlock it in a level's `unlocks.buildings`, and add a `case` in
  `drawBuilding` (or let the generic `hall()` draw it). A new `worker` job also
  needs a branch in `planJob`/`updateWorker`.
- **New troop or raider:** add a row to `TROOPS`/`FOES` (`FOES` take `morale`,
  `fire`, `loot`, `siege`, `wild`; wild animals are team `"w"`, which nobody fights), and a `UNITS3D` entry in `tools/art3d/models3d.js` (look + gear).
  Waves reference raider ids by key (`{ raider: 4, bowman: 1 }`).
- **New seasonal work for idle villagers:** add a row to `SEASON_WORK` in
  `game.js` (season, where hands are wanted, how a helper sets out) and the
  helper's phases in `updateWorker`; map its job to a look in `drawWorkerSprite`.
- **New level:** add to `LEVELS` (inserting is safe: progress and the playtest
  brain are keyed by level id). Objective types: `res`, `build`, `water`,
  `catch` (rain caught; three stars then need 70% kept), `harmony`, `pop`,
  `waves` (always include `waves`). Unlock decrees with `unlocks.edicts`.
  Level flags: `fireArrows`, `wild: { first, every }` (wild elephants),
  `rival: true` (the disawa's dam on the first river), `tutorial`.
- **New decree:** add a row to `EDICTS` (`cost`, `once: "season" | "maha" | "yala"`,
  `dur`, `harmony`, `said`), unlock it in a level, and read its effect where it
  applies with `edictOn(id)` (see `workMult`, `buildCost`, the harmony target).
- **Painted art:** add an `ART.add(key, draw, opts)` model in `tools/art/`
  (origin = footprint top corner for buildings, ground point for units and
  props), run `node tools/bake.mjs`, and draw it with `drawSprite(key, gx, gy)`.
  Key conventions: building id (`house.0..2`, `gate.a|b`, `palisade.c|px|nx|py|ny`),
  `canal.<mask>`, `paddy.<w|d><0..4>`, `tree.<kind>.<season>.<v>`,
  `u3d.<type>.d<0..7>.<w0..w7|i0|a0..a2>` (d0 = heading +gx, counted
  toward +gy), villagers `u3d.v.<job>[+<load>].d<0..7>.<frame>`,
  `u.<elephant|thrower>.f.<frame>` (2D, mirrored), `<key>#sh` for the baked shadow. Preview a model with
  `node tools/bake.mjs --preview <keyPrefix> out.png 6 240 3`.
  Follow `tools/art/ARTSTYLE.md` (palette, light, originality).
- A hand-made image can still go straight into `SPRITES[key] = { img, ax, ay, scale }`.

## Checking a change

There is no build. Serve the folder (`py -m http.server 8137`) and run the
browser console smoke test below. Every level should run to an end with `errs: []`.

```js
for (const lv of LEVELS.keys()) { startLevel(lv); document.getElementById('beginBtn').click(); S.paused = true;
  const errs = []; try { for (let i = 0; i < 18000 && S.mode === 'play'; i++) { step(0.05); if (i % 40 === 0) render(performance.now()); } }
  catch (e) { errs.push(e.stack); } console.log(lv + 1, S.mode, Math.round(S.time), errs); }
```

`node tools/shoot.mjs docs/screens/check --smoke` runs the same smoke test in
headless Chromium and saves screenshots of a sample town in both seasons.

For balance changes, run `node tools/playtest.mjs learn` (learning bots,
a few minutes) and read `docs/playtest/REPORT.md`: it catches exploits and
stalls a single hand-played minute won't. The learned dials live in
`tools/playtest-brain.json`; commit it so learning continues next time.

`node tools/playtest.mjs detectors` checks that every report detector still
fires on the fault it was written for. After a batch of rounds, run `node tools/review.mjs`: save and continue on
every level, one-sentence tooltips, a one-row top bar, every building and
decree still usable, and every sound effect and the music render (offline, measured).
`--selftest` plants faults on purpose (a broken save, unvaried sounds) to prove it fails.

Then play level 1 by hand for a minute: build, paint canals, open a sluice,
train a soldier, zoom and pan.

## When a stronger model picks this up

Read `docs/ITERATION-GUARDRAILS.md` before any improvement pass and `docs/DEV-WORKFLOW.md` for how to build new content. Work from `ROADMAP.md` top-down, using `docs/GENRE-NOTES.md` for genre expectations (ideas only, never copied content). Before large changes, re-read this file and
keep the invariants. Prefer data rows over new branches, keep `game.js` free
of drawing code, and keep each commit to one roadmap item.
