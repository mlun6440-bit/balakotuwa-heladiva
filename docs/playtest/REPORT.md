# Automated playtest report

Generated 2026-11-02 11:31 by `node tools/playtest.mjs`. Two bots per level: a **novice** that follows the tutorial and advisor hints, and a **learned planner** whose dials have been tuned by trial and error (see `tools/playtest-brain.json`). Bots only use player actions. They show what is *possible* and where play *stalls*; they cannot judge fun or clarity — that still needs people.

| Level | Novice | Learned planner | Planner time | Citadel | Stars | Families lost (novice / planner) | Burned |
|---|---|---|---|---|---|---|---|
| 1. Dawn at Anuradhapura | won | won | 302s | 100% | ★★★ | 0 / 0 | 0 |
| 2. The Dry Zone | won | won | 411s | 100% | ★★★ | 1 / 6 | 0 |
| 3. Lion Rock | won | won | 426s | 100% | ★★ | 6 / 0 | 1 |
| 4. Sea of Parakrama | won | won | 521s | 100% | ★★ | 0 / 0 | 0 |
| 5. Hill Kingdom | lost | won | 661s | 94% | ★★ | 1 / 0 | 2 |

## Findings

- **L1 Dawn at Anuradhapura:** both bots won with the citadel almost untouched (100% / 100%). Raids may be too weak to create tension here.
- **L1 Dawn at Anuradhapura:** on average 55% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L2 The Dry Zone:** both bots won with the citadel almost untouched (97% / 100%). Raids may be too weak to create tension here.
- **L2 The Dry Zone:** on average 50% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L3 Lion Rock:** on average 70% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L4 Sea of Parakrama:** on average 62% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L5 Hill Kingdom:** a hint-following novice lost — the defeat screen said: 🏹 The north side had no archers or watchtowers to meet the last raid. 🏹 The east side had no archers or watchtowers to meet the last raid. 🔥 Fire took 7 buildings. Keep wewas full so villagers can carry water, and keep archers near the thatch.. Unmet: 😊 Harmony 60+ 38/60, 🍚 rice 1/150, 🛡️ raids 4/7. Consider a clearer hint or a gentler first raid here.
- **L5 Hill Kingdom:** on average 62% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L5 Hill Kingdom:** fire destroyed 2 buildings even for the planner. Check that water carriers can keep up.
- **Tribute:** the learner pays it (dial 0.47), so it is a real option.
- **Defence the learner relies on:** 1.3 towers per raid edge, 2.9 wall tiles, an army of 7.0 + 3.8 per raid. 
- **Economy the learner prefers:** 1.38 paddies per house, at most 14 houses, 2.5 woodcutters.

## Bot limits (so findings aren't over-read)

- The bots never open sluices, never use forest ambush on purpose, never repair or upgrade except for harmony, and never call raids early.
- They place buildings by simple rules (near the citadel, near water or forest), not by reading the map like a person.
- Raids involve randomness; a single run per bot is a sample, not a verdict. Learning averages several runs per candidate.

## Learning history

- L1: 9 generations, best score 1385; recent 1385 → 1385 → 1385 → 1385 → 1385
- L2: 9 generations, best score 1379; recent 1376 → 1379 → 1379 → 1379 → 1379
- L3: 9 generations, best score 1279; recent 1278 → 1278 → 1278 → 1278 → 1279
- L4: 9 generations, best score 1274; recent 1273 → 1273 → 1274 → 1274 → 1274
- L5: 9 generations, best score 1267; recent 1264 → 1264 → 1264 → 1267 → 1267

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
