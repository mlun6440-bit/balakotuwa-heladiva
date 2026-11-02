# Automated playtest report

Generated 2026-11-02 11:59 by `node tools/playtest.mjs`. Two bots per level: a **novice** that follows the tutorial and advisor hints, and a **learned planner** whose dials have been tuned by trial and error (see `tools/playtest-brain.json`). Bots only use player actions. They show what is *possible* and where play *stalls*; they cannot judge fun or clarity — that still needs people.

| Level | Novice | Learned planner | Planner time | Citadel | Stars | Families lost (novice / planner) | Burned |
|---|---|---|---|---|---|---|---|
| 1. Dawn at Anuradhapura | won | won | 299s | 100% | ★★★ | 0 / 0 | 0 |
| 2. The Dry Zone | won | won | 411s | 100% | ★★★ | 3 / 1 | 0 |
| 3. Lion Rock | lost | won | 502s | 100% | ★★★ | 13 / 6 | 1 |
| 4. Sea of Parakrama | lost | won | 492s | 98% | ★★ | 0 / 0 | 0 |
| 5. Hill Kingdom | lost | won | 777s | 93% | ★★★ | 7 / 0 | 4 |

## Findings

- **L1 Dawn at Anuradhapura:** both bots won with the citadel almost untouched (100% / 100%). Raids may be too weak to create tension here.
- **L1 Dawn at Anuradhapura:** on average 59% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L2 The Dry Zone:** both bots won with the citadel almost untouched (95% / 100%). Raids may be too weak to create tension here.
- **L2 The Dry Zone:** on average 49% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L3 Lion Rock:** a hint-following novice lost — the defeat screen said: 🍚 The granary ran dry in the Yala dry season and 13 families left. Keep about one watered paddy per house. 🏹 The east side had no archers or watchtowers to meet the last raid. 🏹 The south side had no archers or watchtowers to meet the last raid.. Unmet: 🛡️ raids 3/4. Consider a clearer hint or a gentler first raid here.
- **L3 Lion Rock:** on average 49% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L4 Sea of Parakrama:** a hint-following novice lost — the defeat screen said: 🏹 The east side had no archers or watchtowers to meet the last raid. 🔥 Fire took 7 buildings. Keep wewas full so villagers can carry water, and keep archers near the thatch. 🌾 Raiders trampled 22 paddies and looted 0 goods on the way in. A tower or archers by the fields on the raid side protect the harvest.. Unmet: 🛡️ raids 4/5. Consider a clearer hint or a gentler first raid here.
- **L4 Sea of Parakrama:** on average 56% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L5 Hill Kingdom:** a hint-following novice lost — the defeat screen said: 🍚 The granary ran dry in the Maha monsoon and 7 families left. Keep about one watered paddy per house. 🏹 The north side had no archers or watchtowers to meet the last raid. 🏹 The east side had no archers or watchtowers to meet the last raid.. Unmet: 😊 Harmony 60+ 38/60, 🍚 rice 0/150, 🛡️ raids 4/7. Consider a clearer hint or a gentler first raid here.
- **L5 Hill Kingdom:** on average 52% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L5 Hill Kingdom:** gold piled up to 1106 with nothing worth buying. Gold needs more sinks (upgrades, decrees, elite units) or slower income.
- **L5 Hill Kingdom:** fire destroyed 4 buildings even for the planner. Check that water carriers can keep up.
- **Tribute:** the learner pays it (dial 0.37), so it is a real option.
- **Defence the learner relies on:** 2.3 towers per raid edge, 3.9 wall tiles, an army of 6.0 + 3.2 per raid. 
- **Economy the learner prefers:** 1.55 paddies per house, at most 12 houses, 2.3 woodcutters.

## Bot limits (so findings aren't over-read)

- The bots never open sluices, never use forest ambush on purpose, never repair or upgrade except for harmony, and never call raids early. The planner does send its melee soldiers out against stone throwers.
- They place buildings by simple rules (near the citadel, near water or forest), not by reading the map like a person.
- Raids involve randomness; a single run per bot is a sample, not a verdict. Learning averages several runs per candidate.

## Learning history

- L1: 20 generations, best score 1385; recent 1385 → 1385 → 1385 → 1385 → 1385
- L2: 20 generations, best score 1379; recent 1379 → 1379 → 1379 → 1379 → 1379
- L3: 20 generations, best score 1375; recent 1375 → 1375 → 1375 → 1375 → 1375
- L4: 20 generations, best score 1275; recent 1275 → 1275 → 1275 → 1275 → 1275
- L5: 30 generations, best score 1356; recent 903 → 1292 → 1302 → 1356 → 1356

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
