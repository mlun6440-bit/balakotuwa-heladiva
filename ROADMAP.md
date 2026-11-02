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
      Perahera drums). Follow-up: a quiet melodic loop.
- [x] **Save mid-level.** Autosave every 15s, on tab hide/close and at the
      menu; "Continue" on the menu (`saveRun`/`continueRun` in `game.js`).
- [x] **Building upgrades.** ⬆️ Upgrade tool; palisade → rampart, house →
      walawwa (+cap, +harmony). Rows declare `upgrade: { to, cost }`.
- [ ] **Soldier stances.** Hold / guard / patrol; a "garrison this tower" command.

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
- [ ] **Genre notes step 5:** raider stone-thrower that outranges towers vs a
      player bolt tower; hill tiles that block building; scorched ground.
- [x] **Tribute** (notes #14): from level 2, pay rice and gold in the 30s before
      a raid to turn it back; −5 harmony; +50% price each time.
- [x] **Defeat screen names the causes** (notes #19): `S.stats` tally; the end
      screen lists the 2–3 most telling reasons with what to do next time.
- [ ] Notes #15 (raiders strengthen while you wait), #16 (home-ground bonus),
      #17 (hidden forest paths), #18 (buried coin hoards).
- [ ] Minimap arrows for incoming raids (notes #4); wall stairs (notes #7);
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

## From the learning playtest (docs/PLAYTEST-FINDINGS.md)

- [x] Tribute could buy whole levels → final raid can't be bought, price doubles, max 2 stars.
- [x] Walls were worthless → archers on walls/towers are out of melee reach.
- [ ] Idle villagers (50–70%): a water-loop job for them (desilting, bund repair).
- [ ] Early raids lack tension: raiders that threaten fields, bunds and granaries.
- [ ] Hill Kingdom difficulty cliff for novices.
- [ ] Army balloons without upkeep.
- [ ] UI: card text clips at three lines; "Rain kept" shown on levels without a rain goal.

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
