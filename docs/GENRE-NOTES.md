# Genre notes for the next build pass

Source: a 2026 gameplay video of a commercial castle-builder's sandbox demo,
watched for **genre conventions only**. Nothing here is to be copied: no
names, unit designs, UI layouts, maps or art from that game. Every idea below
is restated in Balakotuwa's own terms, built around water, seasons and
villagers-as-soldiers.

## What players of this genre expect (and how we do it our way)

| # | Genre expectation | Balakotuwa version | Priority |
|---|-------------------|--------------------|----------|
| 1 | **Archer volleys spread across a crowd** instead of every archer focusing one target. The video calls this the single biggest improvement. | Ranged soldiers and towers pick randomly among the nearest 3–5 raiders in range. Add a small landing scatter so arrows read as a volley. | **High** |
| 2 | **Enemy morale**: a raiding party that loses most of its members retreats. | Give `FOES` a `morale` value. When a wave group drops below ~35% strength, survivors flee to their edge (gold only for kills). The conch and the elephant could hit morale. | **High** |
| 3 | **Sandbox / free-build mode** with invasions you trigger at chosen sizes, used for testing and for fun. | "Royal Decree" sandbox: open map, sliders for resources, and buttons to send small / medium / large / extreme raids from a chosen edge. Doubles as our balance-test harness. | **High** |
| 4 | **Multiple simultaneous invasions** from different edges, shown on the minimap. | Already have multi-edge waves. Add minimap arrows and a short horn per edge. | Medium |
| 5 | **Defensive ground works** that slow and hurt attackers (moats, burnable ditches). | Flooded canals already do this. Add a *thorn barrier* (Kandyan thorn-gate tradition): cheap, slows raiders, damaged by fire. Later, a *fire ditch* filled from oil-press output, lit by clicking. | Medium |
| 6 | **Repair tool** for damaged walls and buildings. | Masons repair buildings in range for stone, or the player clicks a damaged building to queue repair. | Medium |
| 7 | **Wall access**: soldiers need stairs or ramps to reach the wall-walk. | Our walls are walkable by archers today. Optional: a *pada* (stair) piece to make wall height a real choice. Low priority; don't add friction for its own sake. | Low |
| 8 | **Siege and counter-siege**: rams and stone throwers versus fixed bolt throwers. | Ram bearers exist. Add a raider stone-thrower that outranges towers, and a player *bolt tower* (no friendly fire). | Medium |
| 9 | **Market thresholds**: keep N of a good, auto-sell above M. | The Pola gets two sliders: sell rice above X; buy timber/stone below Y at a markup. | Medium |
| 10 | **Elite units gated by a prestige currency** rather than only by level. | *Pin* (merit) accrues from dagobas and full granaries; spent on Angampora masters and elephants. Fits harmony thematically. | Low |
| 11 | **Control groups** (Ctrl+1..9 to save, 1..9 to recall). | Straight QoL add in `game.js` input. | **High** |
| 12 | **Pathing edge cases**: players seal themselves in completely; AI must still behave. | Flow field already breaks walls when sealed. Add a test that seals the citadel and checks raiders still attack the cheapest wall. | Medium |
| 13 | **Big armies**: 200+ units on screen. | Performance target for the renderer: 300 units at 60 fps. Spatial hash for `nearestFoe` and `separate()` (both O(n²) now). | **High** for the graphics pass |

Second source: a solo developer's month-long AI-assisted RTS build (a unit-focused fantasy RTS). Again, ideas only.

| # | Genre expectation | Balakotuwa version | Priority |
|---|-------------------|--------------------|----------|
| 14 | **Pay instead of fight**: buying off an enemy camp is often wiser than spending your army. | *Tribute*: when a raid is announced, offer gold and rice to turn it back. It costs more each time and lowers harmony a little. A real decision that fits the economy. | **High** |
| 15 | **Escalation over time**: idle enemies grow stronger on a clock, so delay has a cost. | Raiders gain a level every few minutes of waiting (more HP and damage), shown on the wave timer. Calling a raid early with the conch becomes a meaningful choice. | Medium |
| 16 | **Home-ground bonus**: units fight better near their own stronghold. | Defenders within 3 tiles of the citadel or a tower get +15% damage; raiders get the same near their spawn edge. Shown by a soft aura. | Medium |
| 17 | **Hidden routes through dense forest** that reward scouting. | Some forests hide a footpath that raiders may use. Felling trees reveals it; a watchtower nearby shows it. | Low |
| 18 | **Random finds on the map** that reward exploring. | Buried coin hoards (*nidhana*) that a villager can dig up for gold, sometimes with a harmony bonus. | Low |
| 19 | **Hard but fair, and readable**: tough fights are fine if the player can see why they lost. | Every defeat screen names the cause (for example "the east wall had no archers", or "the rice ran out in Yala"). Ask fresh players whether the goal is clear. | **High** |

Third source: well-known castle-builder conventions in general (no single
title), restated for Balakotuwa in batch 6. Ideas only.

| # | Genre convention | Balakotuwa version | Status |
|---|------------------|--------------------|--------|
| 20 | Hazards between raids | **Wild elephants** raid ripe paddies; a *pela* (watch hut) turns them back | Done (R22, level 2) |
| 21 | A rival lord who acts by his own plan | **The disawa's dam**: shut every Yala; break it (revenge raid) or pay a gift | Done (R23, level 5) |
| 22 | Droughts and floods | **Drought years** (one Yala in three runs long) and **burst bunds** (a brimming wewa with no spillway) in skirmish | Done (R24, R44) |
| 23 | Different mission types | A siege level starting with a built fort; a peaceful tank-builder level | Siege done (R42, Yapahuwa); peaceful level open |
| 24 | Arms supply chain | Forged arms stocked at the barracks gate elite troops | Open |
| 25 | Tax lever | A harvest share (*bhaga*): more rice to the citadel for gold, at a harmony cost | Open |

## Visual targets for the graphics pass

- **Mass battles stay readable**: clear team colours, health bars only when hurt, and selection rings.
- **Volleys look like volleys**: many arrows in a shared arc, with impact puffs.
- **Fire**: flames and smoke on burning thatch and ditches, plus scorched ground afterwards.
- **Soldiers visible on top of walls and towers**, drawn above the parapet.
- **Terrain relief**: hills and cliffs that block building (the video's "too uneven to build"). We could add `hill` tiles with height shading.
- **Walls running right up to water and cliffs**, so enclosures look deliberate.
- **Damage states**: cracked walls, broken roofs and rubble before a building is removed.

## Suggested order

1. Volley spread, morale and control groups: small changes that make battles feel good.
2. Spatial hash so big battles stay fast.
3. Sandbox "Royal Decree" mode, which is also the balance harness.
4. Thorn barriers, repair, market thresholds.
5. Siege pair (stone-thrower versus bolt tower), hills, fire.
