# Automated playtest report

Generated 2026-11-04 11:47 by `node tools/playtest.mjs learn`. Two bots per level: a **novice** that follows the tutorial and advisor hints, and a **learned planner** whose dials have been tuned by trial and error (see `tools/playtest-brain.json`). Bots only use player actions. They show what is *possible* and where play *stalls*; they cannot judge fun or clarity — that still needs people.

| Level | Novice | Learned planner | Planner time | Citadel | Stars | Families lost (novice / planner) | Burned |
|---|---|---|---|---|---|---|---|
| 1. Dawn at Anuradhapura | won | won | 299s | 100% | ★★★ | 0 / 0 | 0 |
| 2. Elephants of Ruhuna | won | won | 313s | 99% | ★★★ | 0 / 0 | 0 |
| 3. The Dry Zone | won | won | 413s | 100% | ★★★ | 0 / 0 | 0 |
| 4. Lion Rock | won | won | 504s | 100% | ★★★ | 0 / 0 | 2 |
| 5. The Disawa's Dam | won | won | 427s | 98% | ★★★ | 0 / 0 | 0 |
| 6. Sea of Parakrama | won | won | 514s | 100% | ★★ | 0 / 0 | 0 |
| 7. Hill Kingdom | lost | won | 721s | 100% | ★★★ | 0 / 0 | 2 |

## Findings

- **L1 Dawn at Anuradhapura:** both bots won with the citadel almost untouched (100% / 100%). Raids may be too weak to create tension here.
- **L2 Elephants of Ruhuna:** both bots won with the citadel almost untouched (96% / 99%). Raids may be too weak to create tension here.
- **L2 Elephants of Ruhuna:** on average 47% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L4 Lion Rock:** gold piled up to 1258 with nothing worth buying. Gold needs more sinks (upgrades, decrees, elite units) or slower income.
- **L4 Lion Rock:** fire destroyed 2 buildings even for the planner. Check that water carriers can keep up.
- **L5 The Disawa's Dam:** on average 49% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L7 Hill Kingdom:** a hint-following novice lost — the defeat screen said: 🔥 Fire took 4 buildings. Keep wewas full so villagers can carry water, and keep archers near the thatch. 🧱 No walls stood on the east side, so the raiders walked straight in. 🧱 No walls stood on the south side, so the raiders walked straight in.. Unmet: 😊 Harmony 60+ 51/60, 🛡️ raids 6/7. Consider a clearer hint or a gentler first raid here.
- **L7 Hill Kingdom:** fire destroyed 2 buildings even for the planner. Check that water carriers can keep up.
- **Tribute:** the learner almost never pays it (dial 0.12). Either it is priced too high or fighting is too easy.
- **Defence the learner relies on:** 2.2 towers per raid edge, 6.1 wall tiles, an army of 8.1 + 4.0 per raid. 
- **Economy the learner prefers:** 1.06 paddies per house, at most 15 houses, 2.7 woodcutters.

## Bot limits (so findings aren't over-read)

- The bots never open sluices, never use forest ambush on purpose, never repair or upgrade except for harmony, and never call raids early. The planner does send its melee soldiers out against stone throwers.
- They place buildings by simple rules (near the citadel, near water or forest), not by reading the map like a person.
- Raids involve randomness; a single run per bot is a sample, not a verdict. Learning averages several runs per candidate.

## Learning history

- L1: 37 generations, best score 1385; recent 1385 → 1385 → 1385 → 1385 → 1385
- L2: 9 generations, best score 1384; recent 1383 → 1383 → 1383 → 1383 → 1384
- L3: 40 generations, best score 1379; recent 1380 → 1380 → 1379 → 1379 → 1379
- L4: 40 generations, best score 1375; recent 1375 → 1375 → 1375 → 1375 → 1375
- L5: 9 generations, best score 1376; recent 1375 → 1377 → 1376 → 1376 → 1376
- L6: 40 generations, best score 1275; recent 1274 → 1275 → 1275 → 1275 → 1275
- L7: 50 generations, best score 1364; recent 1363 → 1363 → 1364 → 1364 → 1364

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
![L6](L6-4min.jpg)
![L6](L6-end.jpg)
![L7](L7-4min.jpg)
![L7](L7-end.jpg)
