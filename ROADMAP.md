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
- [ ] **Sound and music.** Replace the oscillator beeps with recorded effects
      (conch, rain, harvest songs, combat) and a quiet ambient loop per season.
- [ ] **Save mid-level.** Serialise `S` (minus derived fields) to localStorage
      so a level can be resumed after closing the tab.
- [ ] **Building upgrades.** Palisade → rampart in place; house → walawwa (+cap, +harmony).
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

## Later

- [ ] **Fire.** Raider fire arrows set thatch alight; villagers douse it from a wewa.
- [ ] **Siltation.** Wewas slowly lose capacity unless villagers desilt them in Yala.
- [ ] **Trade caravans** arriving by road with offers (timber for rice, etc.).
- [ ] **Skirmish mode** with a seeded random map and endless escalating raids.
- [ ] **Touch controls** for tablets (pinch zoom, long-press to cancel).
- [ ] **Accessibility.** Colour-blind-safe palette option; keyboard build cursor.
- [ ] **Localisation.** Sinhala and Tamil UI strings.

## Engineering

- [ ] Move `S` serialisation and the smoke test into a small `tests.html`.
- [ ] Profile the render loop on large late-game cities; batch static
      buildings into the terrain cache when nothing changes.
- [ ] Split `game.js` further (economy, combat, ui) once it passes ~1,500 lines.
