# Automated playtest report

Generated 2026-11-03 20:05 by `node tools/playtest.mjs learn`. Two bots per level: a **novice** that follows the tutorial and advisor hints, and a **learned planner** whose dials have been tuned by trial and error (see `tools/playtest-brain.json`). Bots only use player actions. They show what is *possible* and where play *stalls*; they cannot judge fun or clarity — that still needs people.

| Level | Novice | Learned planner | Planner time | Citadel | Stars | Families lost (novice / planner) | Burned |
|---|---|---|---|---|---|---|---|
| 1. Dawn at Anuradhapura | won | won | 299s | 100% | ★★★ | 0 / 0 | 0 |
| 2. The Dry Zone | won | won | 410s | 100% | ★★★ | 2 / 0 | 0 |
| 3. Lion Rock | won | won | 414s | 100% | ★★ | 0 / 0 | 1 |
| 4. Sea of Parakrama | won | won | 491s | 100% | ★★ | 0 / 0 | 0 |
| 5. Hill Kingdom | lost | won | 731s | 97% | ★★★ | 0 / 0 | 2 |

## Findings

- **L1 Dawn at Anuradhapura:** both bots won with the citadel almost untouched (100% / 100%). Raids may be too weak to create tension here.
- **L3 Lion Rock:** both bots won with the citadel almost untouched (99% / 100%). Raids may be too weak to create tension here.
- **L3 Lion Rock:** on average 49% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L5 Hill Kingdom:** a hint-following novice lost — the defeat screen said: 🏹 The east side had no archers or watchtowers to meet the last raid. 🔥 Fire took 3 buildings. Keep wewas full so villagers can carry water, and keep archers near the thatch. 🧱 No walls stood on the south side, so the raiders walked straight in.. Unmet: 😊 Harmony 60+ 33/60, 🍚 rice 33/150, 🛡️ raids 6/7. Consider a clearer hint or a gentler first raid here.
- **L5 Hill Kingdom:** on average 45% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.
- **L5 Hill Kingdom:** fire destroyed 2 buildings even for the planner. Check that water carriers can keep up.
- **Tribute:** the learner pays it (dial 0.41), so it is a real option.
- **Defence the learner relies on:** 2.4 towers per raid edge, 6.4 wall tiles, an army of 7.3 + 3.6 per raid. 
- **Economy the learner prefers:** 1.49 paddies per house, at most 13 houses, 2.6 woodcutters.

## Bot limits (so findings aren't over-read)

- The bots never open sluices, never use forest ambush on purpose, never repair or upgrade except for harmony, and never call raids early. The planner does send its melee soldiers out against stone throwers.
- They place buildings by simple rules (near the citadel, near water or forest), not by reading the map like a person.
- Raids involve randomness; a single run per bot is a sample, not a verdict. Learning averages several runs per candidate.

## Learning history

- L1: 28 generations, best score 1385; recent 1385 → 1385 → 1385 → 1385 → 1385
- L2: 31 generations, best score 1380; recent 1380 → 1380 → 1380 → 1380 → 1380
- L3: 31 generations, best score 1279; recent 1375 → 1375 → 1279 → 1279 → 1279
- L4: 31 generations, best score 1275; recent 1275 → 1275 → 1275 → 1275 → 1275
- L5: 41 generations, best score 1362; recent 1362 → 1362 → 1362 → 1362 → 1362

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
