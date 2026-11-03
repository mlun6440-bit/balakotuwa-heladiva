# Automated playtest report

Generated 2026-11-03 21:39 by `node tools/playtest.mjs learn`. Two bots per level: a **novice** that follows the tutorial and advisor hints, and a **learned planner** whose dials have been tuned by trial and error (see `tools/playtest-brain.json`). Bots only use player actions. They show what is *possible* and where play *stalls*; they cannot judge fun or clarity — that still needs people.

| Level | Novice | Learned planner | Planner time | Citadel | Stars | Families lost (novice / planner) | Burned |
|---|---|---|---|---|---|---|---|
| 1. Dawn at Anuradhapura | won | won | 297s | 100% | ★★★ | 0 / 0 | 0 |
| 2. Elephants of Ruhuna | won | won | 319s | 97% | ★★★ | 0 / 0 | 0 |
| 3. The Dry Zone | won | won | 409s | 100% | ★★★ | 2 / 1 | 0 |
| 4. Lion Rock | won | won | 412s | 100% | ★★ | 0 / 0 | 0 |
| 5. The Disawa's Dam | won | won | 430s | 94% | ★★★ | 0 / 0 | 2 |
| 6. Sea of Parakrama | won | won | 495s | 100% | ★★ | 0 / 0 | 0 |
| 7. Hill Kingdom | unfinished | won | 724s | 99% | ★★★ | 3 / 0 | 1 |

## Findings

- **L1 Dawn at Anuradhapura:** both bots won with the citadel almost untouched (100% / 100%). Raids may be too weak to create tension here.
- **L2 Elephants of Ruhuna:** both bots won with the citadel almost untouched (98% / 97%). Raids may be too weak to create tension here.
- **L2 Elephants of Ruhuna:** on average 56% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L3 The Dry Zone:** both bots won with the citadel almost untouched (95% / 100%). Raids may be too weak to create tension here.
- **L4 Lion Rock:** both bots won with the citadel almost untouched (98% / 100%). Raids may be too weak to create tension here.
- **L4 Lion Rock:** on average 48% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L5 The Disawa's Dam:** on average 48% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L5 The Disawa's Dam:** fire destroyed 2 buildings even for the planner. Check that water carriers can keep up.
- **L7 Hill Kingdom:** a hint-following novice did not finish. Unmet: 😊 Harmony 60+ 58/60, 🍚 rice 36/150. Consider a clearer hint or a gentler first raid here.
- **Tribute:** the learner almost never pays it (dial 0.29). Either it is priced too high or fighting is too easy.
- **Defence the learner relies on:** 2.0 towers per raid edge, 4.6 wall tiles, an army of 6.7 + 3.3 per raid. 
- **Economy the learner prefers:** 1.23 paddies per house, at most 14 houses, 2.4 woodcutters.

## Bot limits (so findings aren't over-read)

- The bots never open sluices, never use forest ambush on purpose, never repair or upgrade except for harmony, and never call raids early. The planner does send its melee soldiers out against stone throwers.
- They place buildings by simple rules (near the citadel, near water or forest), not by reading the map like a person.
- Raids involve randomness; a single run per bot is a sample, not a verdict. Learning averages several runs per candidate.

## Learning history

- L1: 31 generations, best score 1385; recent 1385 → 1385 → 1385 → 1385 → 1385
- L2: 3 generations, best score 1383; recent 1383 → 1383 → 1383
- L3: 34 generations, best score 1380; recent 1380 → 1380 → 1380 → 1380 → 1380
- L4: 34 generations, best score 1279; recent 1279 → 1279 → 1279 → 1279 → 1279
- L5: 3 generations, best score 1376; recent 1376 → 1376 → 1376
- L6: 34 generations, best score 1275; recent 1275 → 1275 → 1275 → 1275 → 1275
- L7: 44 generations, best score 1364; recent 1362 → 1362 → 1362 → 1362 → 1364

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
