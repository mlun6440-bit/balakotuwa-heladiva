# Balakotuwa — Keepers of the Wewa

An isometric tank-kingdom builder set in ancient Sri Lanka. Catch the monsoon in
wewas (reservoirs), carry it by canal to your paddies through the dry season,
and hold the citadel against raiders across a five-level campaign.

Plain HTML, CSS and JavaScript. No build step and no dependencies.

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
- **Villagers.** They staff farms, woodcutters, quarries and markets. Every soldier you train costs one villager. Houses raise the population cap.
- **Harmony.** It rises with a full granary and dagobas, and falls with hunger and destruction. New families settle only at 45 or above.
- **Raiders.** They follow the cheapest path to the citadel. They walk around walls when there is a gap and break through when there isn't.

## Campaign

| # | Level | Era | New |
|---|-------|-----|-----|
| 1 | Dawn at Anuradhapura | Early kingdom | Core economy, palisades, archers, spearmen |
| 2 | The Dry Zone | Rajarata | Sluice gates, watchtowers |
| 3 | Lion Rock | Sigiriya | Ramparts, gates, market, Angampora fighters |
| 4 | Sea of Parakrama | Polonnaruwa | Dagoba, war elephants, ram bearers |
| 5 | Hill Kingdom | Senkadagala | Raids from three sides |

Progress and star ratings are saved in the browser.

## Controls

| Action | Input |
|--------|-------|
| Pan | WASD / arrow keys, Shift+drag, middle-drag, or click the minimap |
| Zoom | Mouse wheel |
| Build | Pick a card, then left-click. Drag to paint walls and canals |
| Select soldiers | Left-click or drag a box |
| Move soldiers | Right-click |
| Cancel | Right-click or Esc |
| Pause / centre | Space / C |

## Project layout

| File | Purpose |
|------|---------|
| `data.js` | Content: buildings, troops, raiders, levels, tutorial |
| `game.js` | Simulation, pathfinding, water network, HUD, input |
| `render.js` | All drawing: terrain cache, buildings, people, effects |
| `styles.css` | HUD and overlay styles |
| `CLAUDE.md` | Rules for extending the game (for people and AI models) |
| `ROADMAP.md` | Prioritised backlog |
