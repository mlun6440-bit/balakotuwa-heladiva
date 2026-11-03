# Automated playtest report

Generated 2026-11-03 19:50 by `node tools/playtest.mjs learn`. Two bots per level: a **novice** that follows the tutorial and advisor hints, and a **learned planner** whose dials have been tuned by trial and error (see `tools/playtest-brain.json`). Bots only use player actions. They show what is *possible* and where play *stalls*; they cannot judge fun or clarity — that still needs people.

| Level | Novice | Learned planner | Planner time | Citadel | Stars | Families lost (novice / planner) | Burned |
|---|---|---|---|---|---|---|---|
| 1. Dawn at Anuradhapura | won | won | 298s | 100% | ★★★ | 0 / 0 | 0 |
| 2. The Dry Zone | won | won | 410s | 100% | ★★★ | 2 / 0 | 0 |
| 3. Lion Rock | won | won | 503s | 100% | ★★★ | 6 / 8 | 1 |
| 4. Sea of Parakrama | won | won | 506s | 100% | ★★ | 0 / 0 | 0 |
| 5. Hill Kingdom | lost | won | 723s | 97% | ★★★ | 0 / 0 | 0 |

## Findings

- **L1 Dawn at Anuradhapura:** both bots won with the citadel almost untouched (100% / 100%). Raids may be too weak to create tension here.
- **L2 The Dry Zone:** both bots won with the citadel almost untouched (97% / 100%). Raids may be too weak to create tension here.
- **L5 Hill Kingdom:** a hint-following novice lost — the defeat screen said: 🏹 The south side had no archers or watchtowers to meet the last raid. 🏹 The north side had no archers or watchtowers to meet the last raid. 🪨 Stone throwers knocked down 10 buildings from beyond your towers' reach. Bolt towers and archers on the walls outrange them.. Unmet: 😊 Harmony 60+ 32/60, 👥 villagers 28/30, 🍚 rice 20/150, 🛡️ raids 5/7. Consider a clearer hint or a gentler first raid here.
- **Tribute:** the learner pays it (dial 0.37), so it is a real option.
- **Defence the learner relies on:** 2.5 towers per raid edge, 5.5 wall tiles, an army of 7.3 + 4.1 per raid. 
- **Economy the learner prefers:** 1.49 paddies per house, at most 6 houses, 2.3 woodcutters.

## Bot limits (so findings aren't over-read)

- The bots never open sluices, never use forest ambush on purpose, never repair or upgrade except for harmony, and never call raids early. The planner does send its melee soldiers out against stone throwers.
- They place buildings by simple rules (near the citadel, near water or forest), not by reading the map like a person.
- Raids involve randomness; a single run per bot is a sample, not a verdict. Learning averages several runs per candidate.

## Learning history

- L1: 25 generations, best score 1385; recent 1385 → 1385 → 1385 → 1385 → 1385
- L2: 28 generations, best score 1380; recent 1380 → 1380 → 1380 → 1380 → 1380
- L3: 28 generations, best score 1375; recent 1375 → 1375 → 1375 → 1375 → 1375
- L4: 28 generations, best score 1275; recent 1275 → 1275 → 1275 → 1275 → 1275
- L5: 38 generations, best score 1362; recent 1363 → 1363 → 1362 → 1362 → 1362

## Screens (learned planner)

![L1](L1-4min.jpg)
![L1](L1-end.jpg)
![L2](L2-4min.jpg)
![L2](L2-end.jpg)
![L3](L3-4min.jpg)
![L3](L3-end.jpg)
![L4](L4-4min.jpg)
![L4](L4-end.jpg)
![L5](L5-4min.jpg)
![L5](L5-end.jpg)
