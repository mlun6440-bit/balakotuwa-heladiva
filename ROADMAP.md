# Roadmap

Ordered by player impact. Each item should land as its own commit. Tick items
off here when they ship.

## Next

- [ ] **Painted sprite art.** Commission or generate original sprite sheets
      (buildings, villagers, soldiers, raiders, trees) and load them through
      `SPRITES` in `render.js`. Keep the procedural drawing as fallback.
- [ ] **Sound and music.** Replace the oscillator beeps with recorded effects
      (conch, rain, harvest songs, combat) and a quiet ambient loop per season.
- [ ] **Save mid-level.** Serialise `S` (minus derived fields) to localStorage
      so a level can be resumed after closing the tab.
- [ ] **Building upgrades.** Palisade → rampart in place; house → walawwa (+cap, +harmony).
- [ ] **Soldier stances.** Hold / guard / patrol; a "garrison this tower" command.

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
