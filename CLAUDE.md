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

Three classic scripts sharing globals, loaded in this order:

1. `data.js`: pure data tables (`BUILDINGS`, `TROOPS`, `FOES`, `LEVELS`, `TUTORIAL`, `SEASONS`).
2. `game.js`: state `S`, simulation, pathfinding, water, HUD, input, boot.
   Boot waits for `DOMContentLoaded` so `render.js` is present.
3. `render.js`: every pixel. Only cosmetic state (`S.fx`) is written here.

Key invariants:

- Any change to the building layout must go through `addBuilding`/`removeBuilding`
  followed by `refreshWorld()`. That rebuilds occupancy, the raider flow field,
  the water networks and staffing.
- Simulation time is `S.time` (seconds, scaled by game speed). Never use
  wall-clock time for gameplay, only for animation.
- The one-second economy runs in `tick()`. Per-frame movement runs in `step(dt)`.
- Workers exist only while there are villagers to staff them (`staff()`).
- Coordinates: grid `gx, gy` (floats for movers); `iso()` maps to world pixels
  at zoom 1; `view.zoom`/`view.dpr` are applied by canvas transform only.

## Extending

- **New building:** add a row to `BUILDINGS` (flags: `solid`, `ground`, `wall`,
  `water`, `worker`, `store`, `pop`, `harmony`, `tower`, `paint`, `needsRock`),
  unlock it in a level's `unlocks.buildings`, and add a `case` in
  `drawBuilding` (or let the generic `hall()` draw it). A new `worker` job also
  needs a branch in `planJob`/`updateWorker`.
- **New troop or raider:** add a row to `TROOPS`/`FOES`, and a look in `drawUnit`.
  Waves reference raider ids by key (`{ raider: 4, bowman: 1 }`).
- **New level:** append to `LEVELS`. Objective types: `res`, `build`, `water`,
  `harmony`, `pop`, `waves` (always include `waves`).
- **Painted art:** load an image into `SPRITES[key]` (see top of `render.js`).
  Procedural drawing is the fallback, so art can be swapped in piece by piece.

## Checking a change

There is no build. Serve the folder (`py -m http.server 8137`) and run the
browser console smoke test below. Every level should run to an end with `errs: []`.

```js
for (const lv of LEVELS.keys()) { startLevel(lv); document.getElementById('beginBtn').click(); S.paused = true;
  const errs = []; try { for (let i = 0; i < 18000 && S.mode === 'play'; i++) { step(0.05); if (i % 40 === 0) render(performance.now()); } }
  catch (e) { errs.push(e.stack); } console.log(lv + 1, S.mode, Math.round(S.time), errs); }
```

Then play level 1 by hand for a minute: build, paint canals, open a sluice,
train a soldier, zoom and pan.

## When a stronger model picks this up

Work from `ROADMAP.md` top-down. Before large changes, re-read this file and
keep the invariants. Prefer data rows over new branches, keep `game.js` free
of drawing code, and keep each commit to one roadmap item.
