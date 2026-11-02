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

## Open findings, ranked by evidence

0. **Mid-campaign is on a knife-edge for weak play** (L3–L4 above): trampled
   fields plus soldier upkeep starve a careless kingdom. *Direction:* an
   advisor warning when raiders head for the fields, and/or upkeep only in
   Yala.
1. **Most villagers are idle (still ~50% after R1).** Shramadana gives them
   work in Yala only, three per silted wewa. *Direction:* a Maha job (bund
   repair, hauling), or growth capped by land and water rather than houses.
2. **Early raids:** now threaten the fields (R2), but the citadel itself is
   still untouched on L1–2 for both bots. Probably fine for the opening
   levels; revisit after a human playtest.
3. **Level 5 is a cliff.** The hint-following novice loses Hill Kingdom
   (harmony 38/60, rice 1/150, undefended north and east, 7 buildings burnt)
   while the learner wins. *Direction:* a mid-level hint when a second raid
   edge opens, and a softer first Hill Kingdom raid.
4. **The army balloons.** The learner keeps 7 + 4 per raid soldiers (35 by
   L5). Soldiers cost a villager but there is no upkeep. *Direction:* rice
   upkeep per soldier in Yala (already 0.03/s: test raising it), or a barracks
   capacity.
5. **Timber starves late.** Screens show timber at 5 while 50+ villagers idle.
   *Direction:* tie to (1): idle villagers could gather deadwood slowly.
6. **Fire still takes buildings even for a careful player on L5** (2) and
   many for novices (4–7). Check water-carrier throughput and whether the
   advisor warns early enough.
7. **UI:** building cards clip their third line; the victory screen shows
   "Rain kept" on levels without a rain goal.

## Toward Stronghold-class depth (bigger steps, each one roadmap item)

In order of value for this game's pillars:

1. **Sieges with counterplay:** raider stone-thrower that outranges towers
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
