# How to build this game with AI agents

Workflow lessons from a solo developer who shipped a two-level, 18-unit RTS
in about 25 working days with AI agents, adapted to this repo. The
constraint still applies: **no paid asset, voice or image APIs** (procedural,
hand-authored SVG, or free tools only).

## 1. One source of truth, then the game

The developer kept a game wiki (attribute matrix, skill register, level
designs) that every agent read. Changes went **wiki first, then game**.

Here, `data.js` is that source of truth. To keep humans and agents on the same page:

- Generate `docs/WIKI.md` from `data.js` (buildings, troops, raiders, levels,
  costs, unlocks) with a small script in `tools/`, so the docs never drift from the game.
- Design a level as a **sketch first** (an HTML or ASCII map plus objectives
  and raid plan in `docs/levels/<id>.md`). Then port it into `LEVELS`, then
  fine-tune by playing.

## 2. Prototype the mechanic before the art

They spent the first days testing combat with plain shapes before making any
models. Same rule here: a new mechanic lands with the existing procedural art
and must be fun in the smoke test and a hand-played minute *before* anyone
draws sprites for it.

## 3. Reference first, then build

- **Animation:** decide what the motion should look like (a sketch, a short
  description of key poses and timing) before generating it.
- **Effects:** build a tiny standalone HTML preview of an effect's timing
  (arrow volley, splash, fire) and approve it there. Then implement it in
  `render.js`. That is faster and cheaper than iterating in-game.
- **Vocabulary:** name effects with standard terms (impact puff, trail,
  sparks, ground decal, shockwave) so requests to an agent are precise.

## 4. Learn enough to direct

"AI can do anything, and anything means a million options." The bottleneck
is knowing what you want. Before delegating a new kind of work (terrain,
animation, sound), try it once by hand at small scale, then write down what
"good" looks like.

## 5. Build from small, adjustable parts

Assemble buildings and units from parts (base, walls, roof, props; body,
head, item) so any piece can be swapped without redrawing the whole.
`render.js` already works this way (`hall()`, `hipRoof()`, `person()`).
Sprites should keep it: bake parts, compose at runtime.

## 6. Team colour as a swappable region

Every unit should have one recolourable region (a sash, shield or banner) so
player, raider and future neutral factions are one sprite plus a palette, not
three sprites.

## 7. Playtesting is the biggest job

"Making it playable and making it interesting are completely different
things." Budget whole sessions for only playing, polishing and asking other
people whether the goal is clear. No new features in those sessions.

## 8. Track it

Keep a short log per feature: time to build, what went wrong, what made the
next one faster. Their per-unit build time dropped from a week to under a
day once the workflow settled. Ours should too.

# Notes from an indie developer's beginner guide

From a six-game solo developer's "how to start" video. Most of it this repo
already does (one small part at a time, a fixed palette in
`tools/art/ARTSTYLE.md`, scale and flip variety on trees). What still applies:

- **Vary every repeated sound.** The ear catches exact repeats fast. `hit`
  already randomises pitch; `build`, `splash` and other frequent one-shots in
  `audio.js` do not. Add a small random pitch and filter offset to each one-shot.
- **Music changes how a scene looks.** The "quiet melodic loop" roadmap
  follow-up is worth more than it seems. Stay free: synthesise it in `audio.js`,
  or sketch it first in a free grid tool (Bosca Ceoil, BeepBox).
- **Style hides limits; consistency beats detail.** Check new sprites against
  the palette before adding more detail. A single grade over the whole frame
  ties sprites, terrain and effects together.
- **Build the fun, not the plumbing.** Plain canvas is the current "engine".
  Only consider a change (for example a WebGL renderer) if profiling shows a
  real limit in late-game cities.
- **AI code still needs checking.** It can solve one problem and create five.
  Keep the smoke test, playtest bots and hand-played minute as the gate, and
  read diffs for game-feel changes rather than trusting summaries.
