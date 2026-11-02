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

Researched themes that fit the water loop; each should stay a data row or a
small system, not a copy of any other game's mechanic.

- [ ] **Rajakariya.** Villagers owe the king days of labour: a seasonal
      "call-up" that speeds wewa and wall building at a harmony cost.
- [ ] **"Not one drop to the sea."** Parakramabahu's maxim as a scored goal:
      bonus stars for water stored versus rain that ran off.
- [ ] **Cascading tanks (ellangawa).** Wewas linked uphill to downhill share
      overflow, so building order along a valley matters.
- [ ] **Perahera.** A festival you can hold once per Maha for a large harmony
      boost, paid in rice and gold, with an elephant procession.
- [ ] **Hill-country ambush.** Kandyan forest defence: soldiers hidden in
      forest tiles strike first; raiders slow down in thick jungle.
- [ ] **Dagoba relic and monks.** A monastery building whose monks raise
      harmony and teach (faster soldier training).

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
