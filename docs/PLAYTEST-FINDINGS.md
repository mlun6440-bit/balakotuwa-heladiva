# Playtest findings and the road to a "Stronghold-class" game

How this was made: `node tools/playtest.mjs learn` (learning bots) plus a
review of the numbers and screenshots in `docs/playtest/REPORT.md`. The
bots measure what is *possible* and where play *stalls*; they can't judge
fun or clarity. Read this alongside a human playtest, not instead of one.

"Stronghold-class" here means the **depth and polish** of the best castle
builders: meaningful walls, sieges with counterplay, an economy with choices,
and tension that builds. Never their content (see `CLAUDE.md`).

## Fixed in this pass (proved by retraining)

| Finding | Evidence | Fix | After |
|---|---|---|---|
| Tribute bought whole levels | Learner paid off 4/4 raids on Lion Rock, 3 stars, citadel untouched | Final assault can't be bought; price doubles; any tribute caps at 2 stars | Learner pays 0 on L1–2, 2–3 raids on L3–5 and accepts 2 stars |
| Walls were worthless | Learner built 0 wall tiles on every level | Melee raiders can't reach soldiers on walls/towers | Learner builds 2–5 wall tiles on L1–4 |

## Loop batch 1 (R1–R5)

| Round | Change | Bot evidence |
|---|---|---|
| R1 | Siltation + shramadana work parties | Parties form and dig on every level; idle share only modestly lower |
| R2 | Raiders trample paddies, rob granaries | Novice loses 3 paddies on L1, 10–13 on L2; the planner learns to protect fields |
| R3 | Soldier upkeep, new-edge warning, cards fit, Hill Kingdom granary | No card clips; finale still hard for the novice |
| R4 | Stone thrower vs bolt tower (+ the bot learned to sally out) | Thrower flattens a lone watchtower from 7.3 tiles; a bolt tower kills it in ~26s; the planner wins the finale with 3 stars once it sallies |
| R5 | One 🔨 Improve tool; one helper path for temporary workers | No regressions |

Current curve (latest evaluation plus reruns): the planner wins every level
(L1–L3 three stars, L4 two, L5 three). The novice wins L1–L2 comfortably,
**scrapes L3–L4** (won 3 of 4 each, citadel 2–50%, L3 losing 12–15 families
to hunger), and loses the finale.

## Loop batch 2 (R6–R9)

| Round | Change | Bot evidence |
|---|---|---|
| R6 | Warn before raiders reach fields; half-crop trampling; Maha rations | Hill Kingdom novice starvation 6–13 → 2–4 families; planner unaffected |
| R7 | Monsoon deadwood gathering | Planner's late-game timber 168–228 (was ~5); idle share unchanged |
| R8 | Diya agala (canal-fed moat) | Wet moat 0.3× raider speed, dry 0.75×; learner digs it on Hill Kingdom only |
| R9 | Cut the thorn barrier; one-line resource bar | No regressions |

Curve now: the planner wins every level (three stars on 1, 2, 3 and 5; two on
4). The novice wins 1–4 (3–4 only just) and loses the finale.

## Loop batch 4 (R14–R17)

| Round | Change | Bot evidence |
|---|---|---|
| R14 | Attam: idle villagers join the farmer on watered paddies in Maha | Planner idle share 39–52% → 30–42%, novice 61–72% → 52–66%; no level reports the idle finding any more |
| R15 | A building counts as burnt only if fire brings it down | Instrumented Hill Kingdom: buildings caught fire at 11–134 hp and fell within seconds, with all three carriers already on the fire; raiders did the damage. Planner fire losses 4 → 0–2 |
| R16 | Soldier ranks from drill by the barracks and from battle | Soldiers by the hall reach veteran at 90s and champion at 300s; the one posted away does not. No regressions |
| R17 | One `SEASON_WORK` table for the three seasonal work parties | Same numbers as R16 |

Curve after retraining: the planner wins every level (three stars on 1, 2, 3
and 5; two on 4). The novice wins 1–4 and loses the finale, now to stone
throwers and undefended north and south edges rather than hunger.

## Loop batch 11 (R42–R45): an eight-level campaign

| Round | Change | Evidence |
|---|---|---|
| R42 | Siege mission: new level 7, The Stair of Yapahuwa | Both bots win; first calibration two stars each with the citadel at 82–90%; after retraining the novice scrapes it (45%, one star) |
| R43 | Lion Rock measured, report fixed instead | Six-run A/Bs: tougher or bigger raids moved the novice's citadel by ±3%; raiders trample 16–20 paddies. The report now says "pressure lands on the fields" there |
| R44 | Floods in skirmish | Scenario: a lone brimming wewa bursts at 24s; one with an open sluice holds |
| R45 | Hazards as level flags; hand tests as review scenarios | Review clean; self-test catches all three planted faults |

Curve after retraining: the planner wins all eight levels; the novice wins
1–7 and lost Hill Kingdom this run (it swings). New: fire takes 4 buildings
inside Yapahuwa's walls even for the planner (thatch inside the fortress,
bowmen shooting over the wall). Still open: idle ~50% on the dam level;
tribute unused.

## Loop batch 10 (R38–R41)

| Round | Change | Evidence |
|---|---|---|
| R38 | Drill masters: gold raises selected soldiers one rank (25 / 50) | Gold-glut finding gone (peak 678, was 1258). A/B on/off, two runs each: same citadel spread on levels 3–7 |
| R39 | Village militia: **cut before shipping** | A/B: flattened raid tension (dam level 65–91% → 100%, Sea of Parakrama 68–88% → 99%) and didn't move idle |
| R40 | `playtest.mjs ab <ref> --reps N` | Same bots on two commits, averaged side by side |
| R41 | One Army card for orders to selected soldiers | Hold and drill tested from the card; review clean |

Curve after retraining: **both bots win all seven levels** (novice Hill
Kingdom at 67%, two stars). The learner set its drill threshold to the
minimum on Lion Rock and Sea of Parakrama, so it spends gold on ranks there.
Open: Lion Rock's citadel untouched again in this run (the A/B said drill
masters don't flatten it; check with `ab --reps 3` before tuning); idle near
50% on Ruhuna and the dam level; tribute unused (dial 0.05).

## Loop batch 8 (R30–R33): review, and the loop improves itself

| Round | Change | Evidence |
|---|---|---|
| R30 | `tools/review.mjs`: save/continue on every level, tooltips, top bar, every building and decree | Clean on all 8 round trips; `--selftest` catches a deliberately broken save |
| R31 | Final raids with teeth on The Dry Zone and The Disawa's Dam | Novice still wins (3 of 3 each) with the citadel at 84–94% and 84–87% (was 95–97%) |
| R32 | Past hand investigations become report detectors; each has a self-test | `playtest.mjs detectors`: 4 of 4 fire on their old fault; a clean game raises none |
| R33 | One `tip()` for once-only advice | Review, detectors, smoke and bots unchanged |

Curve after retraining: the planner wins all seven levels; the novice wins
1–6 and lost Hill Kingdom this run (it has swung between won, lost and
unfinished across recent runs). New: gold piles up to 1258 on Lion Rock with
nothing worth buying, a sink is missing. Still open: idle near 50% on Ruhuna
and the dam level; raids barely touch the citadel on levels 1–2; tribute
unused by the learner.

## Loop batch 7 (R26–R29)

| Round | Change | Bot evidence |
|---|---|---|
| R26 | Hena: idle villagers clear jungle-edge plots for millet in Yala | Planner idle 25–51% (was 34–56%), novice ~47% (was ~53%); no families lost |
| R27 | Soldier stances: Hold (H) | Test: on guard a spearman strays 1.3 tiles to meet a raider, on hold 0. Bots don't use it yet |
| R28 | Lion Rock's final assault: 10 raiders, 4 bowmen, 2 ram bearers | Novice still wins (3 of 3) with the citadel at 73–84% (was ~98%) |
| R29 | Seasonal work behaviour lives on its table row | Same numbers as R28 |

Curve after retraining: **both bots win all seven levels** for the first time,
with no families lost anywhere. The novice holds Hill Kingdom with the citadel
at 50% (one star). Open: big planner towns still idle 48–58% on Ruhuna, Lion
Rock and the dam level; levels 1–3 and 5 raids barely touch the citadel; the
learner has stopped paying tribute (dial 0.12) because fighting is enough.

## Loop batch 6 (R22–R25): a seven-level campaign

| Round | Change | Bot evidence |
|---|---|---|
| R22 | Wild elephants and the pela; new level 2 *Elephants of Ruhuna* | Targeted test: no pela, the elephant eats a field; staffed pela, it turns back. Both bots build a pela and win with three stars |
| R23 | The disawa's dam; new level 5 *The Disawa's Dam* | First version: the planner broke the dam in the first 20s for free. After a stronger revenge raid and a yearly rebuild, breaking cost the planner citadel (78–89%) and a star in default play, while the novice paying the gift kept 87–100%. After retraining the learner still breaks it (dial at its 0.5 default) and won three stars: the choice is close, which is what we want |
| R24 | Drought years in skirmish | Seeded test: Yala at 90s in drought years, badge and warning shown |
| R25 | Season-change news as one table | No regressions |

Curve after retraining: the planner wins all seven levels (two stars on Lion
Rock and Sea of Parakrama, both capped by tribute; three elsewhere). The novice
wins 1–6; on Hill Kingdom it survives every raid but misses its rice goal.
Open: the idle share is back near 50% on Ruhuna, Lion Rock and the dam level
as towns grow; early raids still don't reach the citadel on levels 1–4.

## Loop batch 5 (R18–R21)

| Round | Change | Bot evidence |
|---|---|---|
| R18 | The Next raid row names the edge; its entry stretch glows in the last minute; minimap marks it | Readability only; smoke test clean |
| R19 | Scouts warn 45s ahead when an incoming side has no archers or towers (the novice follows it) | Lion Rock novice 3 stars in both runs (was 1–2, sometimes lost) |
| R20 | The market never sells the last two rice per villager | Lion Rock families lost: novice 6–9 → 0, planner 8 → 0 after retraining; the planner now grows towns to ~100 |
| R21 | Cut the old mid-edge raid flag (the band and HUD say it) | No regressions |

Also fixed in the bot: the novice now follows the advisor's siege hint (sally out at
stone throwers). Without it Hill Kingdom stalled at the time limit with throwers
grinding rebuilt houses. The novice now wins Hill Kingdom about half the time.

Curve now: the planner wins every level with no families lost anywhere
(three stars on 1, 2 and 5; two on 3 and 4, both capped by paying tribute). The
novice wins 1–4 and the finale about half the time. Open: bigger towns bring
the idle share back (planner 45–49% on L3 and L5); early raids still don't
touch the citadel on L1 and L3.

## Open findings, ranked by evidence

0. **Mid-campaign is on a knife-edge for weak play** (L3–L4 above): trampled
   fields plus soldier upkeep starve a careless kingdom. *Direction:* an
   advisor warning when raiders head for the fields, and/or upkeep only in
   Yala.
1. ✅ *Mostly fixed in R14 (attam): planner 30–42% idle.* **Most villagers are idle (still ~50% after R1).** Shramadana gives them
   work in Yala only, three per silted wewa. *Direction:* a Maha job (bund
   repair, hauling), or growth capped by land and water rather than houses.
2. **Early raids:** now threaten the fields (R2), but the citadel itself is
   still untouched on L1–2 for both bots. Probably fine for the opening
   levels; revisit after a human playtest.
3. **Level 5 is a cliff** (still true after batch 4: the novice now loses to stone throwers and undefended north/south edges; next step, show where the next raid comes from). The hint-following novice loses Hill Kingdom
   (harmony 38/60, rice 1/150, undefended north and east, 7 buildings burnt)
   while the learner wins. *Direction:* a mid-level hint when a second raid
   edge opens, and a softer first Hill Kingdom raid.
4. ✅ *Upkeep raised in R3 (0.06 rice/s).* **The army balloons.** The learner keeps 7 + 4 per raid soldiers (35 by
   L5). Soldiers cost a villager but there is no upkeep. *Direction:* rice
   upkeep per soldier in Yala (already 0.03/s: test raising it), or a barracks
   capacity.
5. **Timber starves late.** Screens show timber at 5 while 50+ villagers idle.
   *Direction:* tie to (1): idle villagers could gather deadwood slowly.
6. ✅ *Explained in R15: it was raiders finishing damaged buildings; the count now only credits fire.* **Fire still takes buildings even for a careful player on L5** (2) and
   many for novices (4–7). Check water-carrier throughput and whether the
   advisor warns early enough.
7. ✅ *Fixed in R3.* **UI:** building cards clipped their third line; the victory screen shows
   "Rain kept" on levels without a rain goal.

## Toward Stronghold-class depth (bigger steps, each one roadmap item)

In order of value for this game's pillars:

1. ✅ *Stone thrower vs bolt tower shipped in R4; a canal-fed moat is still open.* **Sieges with counterplay:** raider stone-thrower that outranges towers
   vs a player bolt tower (GENRE-NOTES step 5); a moat fed by your canals.
2. **Wall height and access:** stairs or ramps so where archers can stand is
   a design choice; tall vs low walls.
3. **Bigger maps** (40×40+) with a defended valley to shape, and one strong
   water idea per level.
4. **A rival kingdom** that builds and raids by its own plan instead of
   fixed waves.
5. **More units with clear counters** (each a data row and art).
6. **Economy chains with choices:** rice vs other crops, ration levels that
   trade food for harmony.

Keep the guardrails: one item per round, a simplify round after every three,
and re-run `node tools/playtest.mjs learn` after each balance change. The
learner tells us within minutes whether a change created a new exploit.

## Loop batch 3 (R10–R13): graphics only

No balance changes, so no retraining. Every level and the skirmish still run
to an end in the smoke test with no errors; render time is unchanged (about
19 ms/frame headless). Figures now face 8 ways with 8-frame walks; see
`docs/screens/batch3-units.png`. The cost is atlas size (4.6 → 6.1 MB).
