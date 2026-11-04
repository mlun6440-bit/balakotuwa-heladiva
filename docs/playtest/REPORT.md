# Automated playtest report

Generated 2026-11-04 11:31 by `node tools/playtest.mjs learn`. Two bots per level: a **novice** that follows the tutorial and advisor hints, and a **learned planner** whose dials have been tuned by trial and error (see `tools/playtest-brain.json`). Bots only use player actions. They show what is *possible* and where play *stalls*; they cannot judge fun or clarity — that still needs people.

| Level | Novice | Learned planner | Planner time | Citadel | Stars | Families lost (novice / planner) | Burned |
|---|---|---|---|---|---|---|---|
| 1. Dawn at Anuradhapura | won | won | 298s | 100% | ★★★ | 0 / 0 | 0 |
| 2. Elephants of Ruhuna | won | won | 314s | 99% | ★★★ | 0 / 0 | 0 |
| 3. The Dry Zone | won | won | 408s | 100% | ★★★ | 0 / 0 | 0 |
| 4. Lion Rock | won | won | 510s | 100% | ★★★ | 0 / 0 | 1 |
| 5. The Disawa's Dam | won | won | 425s | 98% | ★★★ | 0 / 0 | 1 |
| 6. Sea of Parakrama | won | won | 511s | 100% | ★★ | 0 / 0 | 0 |
| 7. Hill Kingdom | won | won | 721s | 98% | ★★★ | 0 / 0 | 2 |

## Findings

- **L1 Dawn at Anuradhapura:** both bots won with the citadel almost untouched (100% / 100%). Raids may be too weak to create tension here.
- **L2 Elephants of Ruhuna:** both bots won with the citadel almost untouched (98% / 99%). Raids may be too weak to create tension here.
- **L2 Elephants of Ruhuna:** on average 51% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L3 The Dry Zone:** both bots won with the citadel almost untouched (95% / 100%). Raids may be too weak to create tension here.
- **L4 Lion Rock:** on average 58% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L5 The Disawa's Dam:** both bots won with the citadel almost untouched (97% / 98%). Raids may be too weak to create tension here.
- **L5 The Disawa's Dam:** on average 48% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L7 Hill Kingdom:** fire destroyed 2 buildings even for the planner. Check that water carriers can keep up.
- **Tribute:** the learner almost never pays it (dial 0.12). Either it is priced too high or fighting is too easy.
- **Defence the learner relies on:** 2.0 towers per raid edge, 5.4 wall tiles, an army of 6.1 + 3.8 per raid. 
- **Economy the learner prefers:** 0.95 paddies per house, at most 12 houses, 2.7 woodcutters.

## Bot limits (so findings aren't over-read)

- The bots never open sluices, never use forest ambush on purpose, never repair or upgrade except for harmony, and never call raids early. The planner does send its melee soldiers out against stone throwers.
- They place buildings by simple rules (near the citadel, near water or forest), not by reading the map like a person.
- Raids involve randomness; a single run per bot is a sample, not a verdict. Learning averages several runs per candidate.

## Learning history

- L1: 34 generations, best score 1385; recent 1385 → 1385 → 1385 → 1385 → 1385
- L2: 6 generations, best score 1383; recent 1383 → 1383 → 1383 → 1383 → 1383
- L3: 37 generations, best score 1380; recent 1380 → 1380 → 1380 → 1380 → 1380
- L4: 37 generations, best score 1375; recent 1279 → 1279 → 1374 → 1375 → 1375
- L5: 6 generations, best score 1377; recent 1376 → 1376 → 1375 → 1375 → 1377
- L6: 37 generations, best score 1275; recent 1275 → 1275 → 1274 → 1274 → 1275
- L7: 47 generations, best score 1363; recent 1362 → 1364 → 1363 → 1363 → 1363

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
