# Balakotuwa — Keepers of the Wewa

An isometric tank-kingdom builder set in ancient Sri Lanka. Catch the monsoon in
wewas (reservoirs), carry it by canal to your paddies through the dry season,
and hold the citadel against raiders across a five-level campaign.

Plain HTML, CSS and JavaScript. No build step and no runtime dependencies.
The sprite art is original, modelled in code under `tools/art/` (buildings,
terrain, trees) and `tools/art3d/` (3D figures pre-rendered in 8 directions),
and baked into `assets/` (regenerate with `cd tools && npm install` once, then
`node tools/bake.mjs`; needs Node and Playwright).

## Play

- **Online:** https://mlun6440-bit.github.io/balakotuwa-heladiva/
- **Locally:** serve the folder with any static server, for example

  ```bash
  py -m http.server 8137
  ```

  then open http://localhost:8137. Opening `index.html` straight from disk also works in most browsers.

## How it plays

- **Two seasons.** In the 🌧️ Maha monsoon, rain fills every wewa and every paddy grows. In the ☀️ Yala dry season, a paddy grows only beside a watered canal, a wewa or the river.
- **Water network.** Wewas store up to 100 water and fill all year when they sit beside the river. Canals join on four sides; each watered paddy drinks from its network.
- **Sluice gates.** Click a sluice to flood its canal network. Raiders wading through floodwater slow down and drown, but the water comes out of your wewas.
- **Villagers.** They staff farms, woodcutters, quarries and markets (a market never sells the last two rice per villager). Every soldier you train costs one villager. Houses raise the population cap.
- **Harmony.** It rises with a full granary and dagobas, and falls with hunger and destruction. New families settle only at 45 or above.
- **Cascading tanks.** A full wewa spills its rain into the other wewas on its canal network. On Sea of Parakrama, keep 70% of the rain for three stars: "let not one drop reach the sea unused".
- **Royal decrees (👑).** *Rajakariya*, the king's labour service, speeds up work and makes building cheaper for a harmony cost. A *Perahera* festival in Maha lifts harmony with a procession of tuskers and torch-bearers.
- **Pansala.** A monk walks alms rounds; a staffed monastery raises harmony.
- **Forest ambush.** Raiders slow down in thick jungle. Soldiers hidden in the forest can't be seen from afar and strike first for double damage.
- **Smithy.** A staffed Kammala forges timber into arms, making soldiers 30% cheaper in gold.
- **Fire (from Lion Rock).** Raider bowmen shoot fire arrows at thatch and timber. Fire spreads in the dry season and dies in the monsoon. Villagers run with water pots from the nearest wewa, canal or river.
- **Morale.** A raid party that loses most of its strength breaks and flees (no gold for those who escape).
- **Defences.** A moat (diya agala) on your canal network slows raiders to a crawl while it holds water. The 🔨 Improve tool repairs damage, or upgrades palisades to ramparts and houses to walawwas.
- **Silt and shramadana.** Monsoon rain washes silt into the wewas and they hold less. In the dry season idle villagers form work parties to dig it out and carry it to the paddies as manure.
- **Attam.** In the monsoon, idle neighbours join the farmer on each watered paddy (traditional exchange labour), and the rice grows faster.
- **Soldier ranks.** Soldiers resting by the Angam Maduwa drill between raids, and every fight teaches them: ★ veterans and ★★ champions are tougher and hit harder.
- **Raids on the fields.** Raiders break off to trample ripening paddies and rob granaries on their way in, so guard the harvest, not just the citadel.
- **Siege (Hill Kingdom).** Stone throwers outrange watchtowers. Bolt towers and archers on the walls can reach them. Melee raiders can't reach soldiers standing on walls or towers.
- **Tribute (from level 2).** In the 30 seconds before a raid you can pay rice and gold to turn it back. It costs more each time and shames your people.
- **Defeat is explained.** If the Maligawa falls, the end screen names the two or three main reasons and what to try next.
- **Wild elephants (Ruhuna on).** Elephants come out of the jungle for ripening rice. Nobody fights them: a staffed pela (watch hut) within 5 tiles turns them back.
- **The disawa's dam.** On one level a rival lord shuts his dam upstream every Yala and the river runs dry. Break it with soldiers (his revenge raid comes early and stronger) or send a 🎁 gift. He rebuilds it every Maha.
- **Scouts.** The Next raid row names the edge raiders will come from; in the last minute that edge glows on the map and minimap, and the scouts warn if no archers or towers guard it.
- **Raiders.** They follow the cheapest path to the citadel. They walk around walls when there is a gap and break through when there isn't.

## Campaign

| # | Level | Era | New |
|---|-------|-----|-----|
| 1 | Dawn at Anuradhapura | Early kingdom | Core economy, palisades, archers, spearmen |
| 2 | Elephants of Ruhuna | Magama | **Wild elephants and the pela** (watch hut) |
| 3 | The Dry Zone | Rajarata | **Sluice flooding**; watchtowers, pansala |
| 4 | Lion Rock | Sigiriya | **Fire arrows and water carriers**; ramparts, gates, upgrades, market, smithy, Angampora fighters |
| 5 | The Disawa's Dam | Dakkhinadesa | **A rival dams your river every Yala**: break it or send a gift |
| 6 | Sea of Parakrama | Polonnaruwa | **Cascading tanks and the rain-catch goal**; dagoba, war elephants, ram bearers |
| 7 | Hill Kingdom | Senkadagala | **The great siege** (stone throwers, bolt towers) and **royal decrees**; raids from three sides |

Each level introduces one headline mechanic (in bold); the finale brings two. The rest are buildings and units that use ideas you already know.
| ∞ | Skirmish | Random map | Endless escalating raids, wild elephants and drought years; best score saved |
| ∞ | Sandbox | Random map | Full stores; send raids of any size yourself |

Progress, star ratings, the skirmish best and the level in progress are saved in the browser; "Continue" on the menu resumes a level.

## Controls

| Action | Input |
|--------|-------|
| Pan | WASD / arrow keys, Shift+drag, middle-drag, or click the minimap |
| Zoom | Mouse wheel |
| Build | Pick a card, then left-click. Drag to paint walls and canals |
| Select soldiers | Left-click or drag a box |
| Move soldiers | Right-click |
| Cancel | Right-click or Esc |
| Pause / centre | Space or ▶/⏸ / C |
| Control groups | Ctrl+1–9 to store selected soldiers, 1–9 to select (twice to centre) |
| Improve (repair or upgrade) | 🔨 tab, then click or drag |

## Project layout

| File | Purpose |
|------|---------|
| `data.js` | Content: buildings, troops, raiders, levels, tutorial |
| `game.js` | Simulation, pathfinding, water network, HUD, input, save |
| `audio.js` | Synthesised sound effects and seasonal ambience (WebAudio) |
| `render.js` | All drawing: sprite atlas, terrain, shadows, buildings, people, ambient life, effects |
| `assets/` | Baked sprite atlas (generated by `tools/bake.mjs`, do not edit) |
| `tools/art/` | Original sprite models, materials and the art direction (`ARTSTYLE.md`) |
| `tools/art3d/` | 3D figure kit and unit/villager models (three.js), baked to sprites |
| `tools/bake.mjs` | Bakes `tools/art` into `assets/` with headless Chromium |
| `tools/shoot.mjs` | Screenshot + smoke-test harness |
| `styles.css` | HUD and overlay styles |
| `CLAUDE.md` | Rules for extending the game (for people and AI models) |
| `ROADMAP.md` | Prioritised backlog |
