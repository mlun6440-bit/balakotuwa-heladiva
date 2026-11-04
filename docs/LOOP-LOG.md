# Loop log: what the improvement loop learned about itself

Each batch changes the game, and also shows where the *process* is weak:
a finding that was wrong, a check that could not fail, a problem only found
by hand. This log keeps those lessons. Each lesson ends as a tool, a check
or a rule, so the next batch does not depend on someone remembering it.
The resulting rules are in `docs/ITERATION-GUARDRAILS.md`
("The loop improves itself").

| Batch | Process lesson | Now built in |
|---|---|---|
| 2 | A playtest run without `--out` overwrote the committed report. | Use a scratch `--out` for checks; only the end-of-batch `learn` run writes `docs/playtest`. |
| 3 | Over 1000 3D renders, the headless WebGL context was lost and sprites came out blank, silently. | The bake warns on every empty sprite (`tools/art/bake.js`); a clean bake has zero warnings. |
| 4 | The report said "fire took 4 buildings". An instrumented run showed raiders had done the damage, and the defeat screen was giving the wrong advice. | Measure before fixing: confirm a finding's cause with an instrumented run. Fire is credited only for the final blow. |
| 5 | Lion Rock's rice never rose above its starting 79. Only a hand-built script found that the market sold the harvest during a famine. | Detector: "the market sold N rice while families starved". |
| 5 | Hill Kingdom hit the time limit with three stone throwers grinding forever; found by hand. | Detector: **stall** (every raid launched, raiders still standing at the limit). |
| 5 | The hint-following novice ignored the advisor's siege hint, so the stall looked like a game bug. | Rule: every new advisor hint gets a matching novice rule. |
| 6 | The planner broke the disawa's dam 17s in and won untouched. The first design had a free option. | Detectors: "broke the dam early and still won untouched"; a choice check when a two-way dial settles at an extreme. |
| 6 | Inserting levels would have shifted saved progress and the learned dials, which were keyed by position. | Progress and `tools/playtest-brain.json` are keyed by level id. |
| 7 | Hena helpers claim trees. Sending a helper home by filtering the list would have left trees claimed forever. | All helper removal goes through `endParty`, which releases claims. |
| 8 | After seven batches nobody had checked that saves still restore everything new. | `node tools/review.mjs` (save and continue on every level, tooltips, top bar, every building and decree). |
| 8 | A checker that has never failed proves nothing. | `node tools/review.mjs --selftest` and `node tools/playtest.mjs detectors` replay known faults and must catch them. |
| 9 | Sound changes were checked by hand-written offline renders (a headless browser can't listen). | `tools/review.mjs` section 5 renders every effect three times and the music; `--selftest` switches variation off and must be caught. |
| 10 | A thematic idea (village militia) looked right for the core identity, but measured on/off it erased the raid tension two earlier rounds had built, and did nothing for the finding it was meant for. | Every addition gets an on/off A/B with everything else equal before it ships; cuts are recorded in `ROADMAP.md` so they aren't re-added. |
| 10 | Single runs misled twice in one batch: Lion Rock "untouched" with drill masters was noise (on/off gave the same spread), and Hill Kingdom swings 0–91% run to run. | `node tools/playtest.mjs ab <ref> --reps N`: the same bots on this checkout and an earlier commit, averaged side by side. |
| 11 | "Raids may be too weak" sent two rounds (R28, R43) after Lion Rock. Six-run A/Bs showed more and tougher raiders change nothing: the level's own rampart goal walls everyone in, and raiders trample 16–19 paddies instead. | The detector counts field damage; it only calls raids weak when they hurt neither the citadel nor the fields. Two new self-test cases. |
