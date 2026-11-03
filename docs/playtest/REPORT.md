# Automated playtest report

Generated 2026-11-03 09:11 by `node tools/playtest.mjs`. Two bots per level: a **novice** that follows the tutorial and advisor hints, and a **learned planner** whose dials have been tuned by trial and error (see `tools/playtest-brain.json`). Bots only use player actions. They show what is *possible* and where play *stalls*; they cannot judge fun or clarity — that still needs people.

| Level | Novice | Learned planner | Planner time | Citadel | Stars | Families lost (novice / planner) | Burned |
|---|---|---|---|---|---|---|---|
| 1. Dawn at Anuradhapura | won | won | 299s | 100% | ★★★ | 0 / 0 | 0 |
| 2. The Dry Zone | won | won | 409s | 100% | ★★★ | 3 / 1 | 0 |
| 3. Lion Rock | won | won | 502s | 100% | ★★★ | 9 / 5 | 1 |
| 4. Sea of Parakrama | won | won | 494s | 100% | ★★ | 0 / 0 | 0 |
| 5. Hill Kingdom | lost | won | 730s | 97% | ★★★ | 3 / 0 | 4 |

## Findings

- **L1 Dawn at Anuradhapura:** both bots won with the citadel almost untouched (100% / 100%). Raids may be too weak to create tension here.
- **L1 Dawn at Anuradhapura:** on average 49% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L4 Sea of Parakrama:** on average 48% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L5 Hill Kingdom:** a hint-following novice lost — the defeat screen said: 🍚 The granary ran dry in the Maha monsoon and 3 families left. Keep about one watered paddy per house. 🏹 The north side had no archers or watchtowers to meet the last raid. 🏹 The east side had no archers or watchtowers to meet the last raid.. Unmet: 😊 Harmony 60+ 25/60, 👥 villagers 26/30, 🍚 rice 0/150, 🛡️ raids 4/7. Consider a clearer hint or a gentler first raid here.
- **L5 Hill Kingdom:** on average 52% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L5 Hill Kingdom:** fire destroyed 4 buildings even for the planner. Check that water carriers can keep up.
- **Tribute:** the learner pays it (dial 0.46), so it is a real option.
- **Defence the learner relies on:** 2.7 towers per raid edge, 4.8 wall tiles, an army of 7.0 + 4.1 per raid. 
- **Economy the learner prefers:** 1.54 paddies per house, at most 8 houses, 2.8 woodcutters.

## Bot limits (so findings aren't over-read)

- The bots never open sluices, never use forest ambush on purpose, never repair or upgrade except for harmony, and never call raids early. The planner does send its melee soldiers out against stone throwers.
- They place buildings by simple rules (near the citadel, near water or forest), not by reading the map like a person.
- Raids involve randomness; a single run per bot is a sample, not a verdict. Learning averages several runs per candidate.

## Learning history

- L1: 22 generations, best score 1385; recent 1385 → 1385 → 1385 → 1385 → 1385
- L2: 25 generations, best score 1380; recent 1379 → 1380 → 1380 → 1380 → 1380
- L3: 25 generations, best score 1375; recent 1375 → 1375 → 1375 → 1375 → 1375
- L4: 25 generations, best score 1275; recent 1274 → 1275 → 1275 → 1275 → 1275
- L5: 35 generations, best score 1363; recent 1358 → 1359 → 1361 → 1363 → 1363

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
