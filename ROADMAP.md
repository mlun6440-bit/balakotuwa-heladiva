# Roadmap

Ordered by player impact. Each item should land as its own commit. Tick items
off here when they ship.

## Next

- [x] **Painted sprite art.** Original sprites are modelled in grid space and
      baked offline (`node tools/bake.mjs`, headless Chromium, no paid
      services) into `assets/atlas*.png` + `assets/atlas.js`, loaded through
      `SPRITES` in `render.js`; the procedural drawing remains the fallback.
      Notes: every face is lit from its normal and textured in face space
      (laterite courses, half-round tiles, thatch strokes, whitewash grime);
      shadows are the same geometry re-projected and blurred. Covers all
      buildings (house variants, joinable palisade/rampart pieces, two gate
      orientations, construction sites, scaffolding, rubble), water works
      (16 canal masks, wewa base/front, sluice states, paddy growth stages wet
      and dry), four tree kinds in both seasons, boulders, reeds, lotus,
      props, cattle, buffalo, egrets, villagers by job with carried loads, all
      troops and raiders (6-frame walk, idle, 3-frame action, front and back
      facings) and the war elephant. Terrain is generated per pixel (blended,
      hillshaded, smooth river banks with foam) and cross-faded between Maha
      and Yala. Art direction lives in `tools/art/ARTSTYLE.md`.
      Follow-ups: 8-direction units; a proper side/back view for elephants and
      cattle; true elevation (raised terrain) instead of shading only; WebP
      atlas to cut the 3.4 MB download.
- [x] **Sound and music.** `audio.js` synthesises every effect and a seasonal
      ambience live with WebAudio (conch, knocks, harvest notes, clashes, fire,
      splash; Maha rain/frogs/thunder, Yala wind/cicadas/koel; war and
      Perahera drums). Follow-up done in batch 9: a quiet melodic loop (R35).
- [x] **Save mid-level.** Autosave every 15s, on tab hide/close and at the
      menu; "Continue" on the menu (`saveRun`/`continueRun` in `game.js`).
- [x] **Building upgrades.** ⬆️ Upgrade tool; palisade → rampart, house →
      walawwa (+cap, +harmony). Rows declare `upgrade: { to, cost }`.
- [x] **Soldier stances.** Guard (default) and Hold (H) in batch 7 (R27). Archers
      already garrison a tower or wall by being moved onto it. Patrol not planned.

## Ideas from Sri Lankan history (gameplay)

Researched themes that fit the water loop; each stays a data row or a small
system, not a copy of any other game's mechanic.

- [x] **Rajakariya.** 👑 Decrees tab (`EDICTS` in `data.js`): for 30s villagers
      work 60% faster, fields grow 50% faster and buildings cost 30% less
      timber and stone; harmony −8; once per season (level 2+).
- [x] **"Not one drop to the sea."** Rain caught vs. lost to overflow is
      tracked; objective type `catch` on Sea of Parakrama; three stars there
      need 70% of the rain kept; shown on the end screen.
- [x] **Cascading tanks (ellangawa).** A full wewa spills into the emptiest
      wewas on its canal network instead of losing the rain.
      Follow-up: true uphill/downhill order once terrain has real elevation.
- [x] **Perahera.** Once per Maha (level 4+): rice and gold for 60s of
      harmony climbing towards +25, with a procession of tuskers, dancers and
      torch-bearers around the citadel.
- [x] **Hill-country ambush.** Raiders slow to 70% in thick jungle; soldiers in
      forest are hidden beyond 1.5 tiles and their first strike does double
      damage.
- [x] **Pansala and monks.** Monastery building with a monk worker (alms
      rounds); +5 harmony each (two count) and 25% cheaper soldiers.
      Follow-up: monks could also calm fear after a raid.

## Supply and siege

- [x] **Kammala smithy.** A staffed smithy makes soldiers 30% cheaper in gold
      (smiths still fetch timber and carry arms to the barracks).
- [x] **Genre notes steps 1–4** (`docs/GENRE-NOTES.md`): volley spread, raider
      morale, control groups, spatial hash, sandbox, thorn barriers, repair
      tool, market orders.
- [x] **Genre notes step 5 (siege pair):** stone thrower vs bolt tower.
- [ ] Hill tiles that block building; scorched ground.
- [x] **Tribute** (notes #14): from level 2, pay rice and gold in the 30s before
      a raid to turn it back; −5 harmony; +50% price each time.
- [x] **Defeat screen names the causes** (notes #19): `S.stats` tally; the end
      screen lists the 2–3 most telling reasons with what to do next time.
- [ ] Notes #15 (raiders strengthen while you wait), #16 (home-ground bonus),
      #17 (hidden forest paths), #18 (buried coin hoards).
- [x] Minimap arrows for incoming raids (notes #4, R18).
- [ ] Wall stairs (notes #7);
      merit currency for elite units (notes #10); sealed-citadel pathing test (notes #12).

## Simplify round 1 (cut or merged, per docs/ITERATION-GUARDRAILS.md)

Recorded so these are not re-added without a strong reason:

- **Cut: weapons as a fifth resource (🗡️ arms).** Broke the 4-resources
  budget. The smithy became a gold discount for soldiers instead.
- **Cut: the pansala's soldier discount.** Duplicated the smithy; the pansala
  is now a harmony building only.
- **Moved to one headline mechanic per level:** fire arrows from level 3
  (`fireArrows` level flag), thorn barriers and the smithy to level 3, royal
  decrees to level 5 (the home of the Perahera). Level 1 is back to the core
  economy. The 👑 tab only appears once it has something in it.
- **Polish:** every tooltip is one sentence; objective labels are short so
  the top bar stays one row; the market tooltip no longer claims a fixed 30.
- **Level 1 winnable:** a scripted player following only the tutorial hints
  never reached 80 rice (true on `main` before any of this work too). A new
  hint ("keep about one watered paddy for each house") fixes it; following it,
  the scripted player wins at ~350s.

## Loop batch 2 (R6–R9)

- [x] R6 Fields: warning before raiders reach them, half-crop trampling, Maha rations.
- [x] R7 Monsoon deadwood gathering by idle villagers (late timber fixed).
- [x] R8 Diya agala (moat) fed by the canal network.
- [x] R9 Simplify round 3 (below).

## Loop batch 10 (R38–R41)

- [x] R38 Drill masters: gold raises selected soldiers one rank (gold-glut finding).
- [x] R39 **Cut before shipping: village militia.** Idle villagers mustering
      when raiders reached the Maligawa. Measured on/off with everything else
      equal: it flattened the raid tension built in R28/R31 (novice citadel on
      the dam level 65–91% off, 100% on; Sea of Parakrama 68–88% off, 99% on),
      even as a last-ditch muster of 4, and did not move the idle share (militia
      exist only during raids). Not re-add without a cost that keeps raids sharp.
- [x] R40 A/B of R38 (drill masters on/off, two runs each): no flattening,
      kept. The A/B became a tool: `node tools/playtest.mjs ab <ref> --reps N`.

## Loop batch 9 (R34–R37): from the PC's indie-guide notes (docs/DEV-WORKFLOW.md)

- [x] R34 Every one-shot sound varies a little each time it plays.
- [x] R35 A quiet melodic loop (pentatonic, seasonal, rests during raids).
- [x] R36 One soft-light colour grade over the whole frame.
- [x] R37 Simplify round 10 (below).

## Simplify round 10 (R37)

- **Merged:** `hit` no longer randomises its own pitch; the shared per-play
  variation does it for every effect.
- **Check, not script:** the offline sound renders written by hand this batch
  are now `tools/review.mjs` section 5, with a self-test.

## Loop batch 8 (R30–R33): review, and the loop improves itself

- [x] R30 Review round: `tools/review.mjs` (save and continue on every level,
      tooltips, top bar, every building and decree) with a self-test.
- [x] R31 Final raids with teeth on The Dry Zone and The Disawa's Dam.
- [x] R32 Past hand investigations become permanent playtest detectors, each
      with a self-test; `docs/LOOP-LOG.md`; four new guardrail rules.
- [x] R33 Simplify round 9 (below).

## Simplify round 9 (R33)

- **Merged (code):** eleven once-only advisor tips with their own flags go
  through one `tip(key, text)`; a flag that was set but never read is gone.

## Loop batch 7 (R26–R29)

- [x] R26 Hena (chena): idle villagers clear jungle-edge plots for millet in Yala.
- [x] R27 Soldier stances: Hold position (H, or the Army tab card).
- [x] R28 Lion Rock's final assault: 10 raiders, 4 bowmen, 2 ram bearers.
- [x] R29 Simplify round 8 (below).

## Simplify round 8 (R29)

- **Merged (code):** every seasonal job's work and drop-off behaviour lives on
  its `SEASON_WORK` row (`done`, `again`) instead of branches in `updateWorker`.

## Loop batch 6 (R22–R25)

- [x] R22 Wild elephants and the pela; new level 2, Elephants of Ruhuna.
      Progress and the playtest brain are now keyed by level id.
- [x] R23 The disawa's dam; new level 5, The Disawa's Dam (break it or gift).
- [x] R24 Drought years in skirmish.
- [x] R25 Simplify round 7 (below).

## Simplify round 7 (R25)

- **Merged (code):** the season-change messages are one `SEASON_NEWS` table;
  decree proclamations are data (`said`) instead of a branch per decree.

## Loop batch 5 (R18–R21)

- [x] R18 Where the next raid comes from: the Next raid row names the edge;
      in the last minute that edge's entry stretch glows with arrows, and the
      minimap marks it (notes #4).
- [x] R19 The scouts (45s before a raid) name sides with no archers or towers.
- [x] R20 The market trader keeps two rice per villager (Lion Rock's required
      market was selling the harvest while families starved).
- [x] R21 Simplify round 6 (below).

## Simplify round 6 (R21)

- **Cut:** the mid-edge glow, flag and countdown of the old raid marker; the
  R18 band says where and the HUD says when.
- **Merged (code):** the defeat screen and the scouts share one `edgeDefence`.

## Loop batch 4 (R14–R17)

- [x] R14 Attam: in Maha, idle villagers join the farmer on watered paddies.
- [x] R15 Fire losses are counted only when fire brings a building down (the
      Hill Kingdom "fire" finding was mostly raiders finishing damaged buildings).
- [x] R16 Soldier ranks (asked for by the player): drill by the Angam Maduwa
      and fight to become ★ veteran / ★★ champion.
- [x] R17 Simplify round 5 (below).
- [x] Deferred to batch 5: show where the next raid comes from (R18).

## Simplify round 5 (R17)

- **Merged (code):** shramadana, deadwood gathering and attam are rows in one
  `SEASON_WORK` table with one dispatcher, instead of three assign functions
  that each did their own season cleanup.

## Loop batch 3 (R10–R13): pre-rendered 3D figures

- [x] R10 3D pipeline: three.js models rendered by the bake (orthographic
      camera matching `iso()`, one sun, soft shadows), spearman first. A 3D
      house was tried and dropped: the hand-modelled 2D houses read better.
- [x] R11 Every combat unit in 3D: 8 directions, 8-frame walk, 3-frame attack.
- [x] R12 Villagers in 3D with their job tools; carried rice, water, stone,
      timber and arms are baked into the walk frames.
- [x] R13 Simplify round 4 (below).

Before/after: `docs/screens/batch3-units.png`.

## Simplify round 4 (R13)

- **Cut:** the 2D villager, soldier and raider frames and the separate load
  overlays (about 300 sprites). Only the elephant and stone thrower stay 2D.
  The festival procession uses the 3D dancers and torch-bearers.
- **Cost:** the atlas is 6.1 MB in four pages (was 4.6 MB); 3D figures are
  most of it. Next lever if it matters: fewer attack frames, or k=3 figures.

## Simplify round 3 (R9)

- **Cut: the thorn barrier (katu wetiya).** It did the same job as the moat
  (a tile that slows raiders crossing it) without touching water, so it
  would work the same in any castle game. The moat stays. Old saves load:
  buildings of a removed type are dropped.
- **Polish:** the resource bar never wraps; moat water is one channel.

## Simplify round 2 (R5)

- **Merged:** the ⬆️ Upgrade and 🔧 Repair tools into one 🔨 Improve tool
  (repairs a damaged building, else upgrades it). One tab fewer.
- **Merged (code):** water carriers and shramadana parties now share one
  helper/dismiss pair instead of two hand-rolled copies (the R1 bug lived in
  that duplication).

## From the learning playtest (docs/PLAYTEST-FINDINGS.md)

- [x] Tribute could buy whole levels → final raid can't be bought, price doubles, max 2 stars.
- [x] Walls were worthless → archers on walls/towers are out of melee reach.
- [~] Idle villagers: siltation + shramadana work parties (R1). Helps in Yala;
      idle share only modestly lower (planner 42–59%). Still open: a job for
      idle people in Maha, or growth capped by land and water.
- [x] Early raids lack tension → raiders trample paddies and rob granaries (R2).
- [~] Hill Kingdom cliff: new-edge raid warning, later first raid, a granary
      sized for its army (R3). The weak novice bot still loses the finale;
      the learned planner wins at ~80%. Accepted as a hard finale for now.
- [x] Army upkeep: soldiers eat 0.06 rice/s (R3).
- [x] UI: cards no longer clip; "Rain kept" only on the rain-goal level (R3).
- [x] Siege pair (genre-notes step 5, R4): raider stone thrower vs bolt tower,
      in Hill Kingdom and skirmish. Budget note: the finale now has two
      headline mechanics (siege and decrees), a deliberate exception.

## Later

- [x] **Fire.** Bowmen loose fire arrows at `flammable` buildings; fire spreads
      in Yala, dies in Maha rain; idle villagers then workers carry water pots
      from wewas, canals or the river.
- [ ] **Siltation.** Wewas slowly lose capacity unless villagers desilt them in Yala.
- [ ] **Trade caravans** arriving by road with offers (timber for rice, etc.).
- [x] **Skirmish mode** with a seeded random map and endless escalating raids
      (best score saved), plus a **Sandbox** where you send raids yourself.
- [ ] **Touch controls** for tablets (pinch zoom, long-press to cancel).
- [ ] **Accessibility.** Colour-blind-safe palette option; keyboard build cursor.
- [ ] **Localisation.** Sinhala and Tamil UI strings.

## Engineering

- [ ] Move `S` serialisation and the smoke test into a small `tests.html`.
- [ ] Profile the render loop on large late-game cities; batch static
      buildings into the terrain cache when nothing changes.
- [ ] Split `game.js` further (economy, combat, ui) once it passes ~1,500 lines.
