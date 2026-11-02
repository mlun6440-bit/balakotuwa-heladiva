# Iteration guardrails

Read this before any "make it better" pass, especially a long or repeated one.

## Why this exists

A 2026 experiment told Claude Code models to "make it better" 100 times in a
row on one small website, in clean sessions. Findings:

- **The model sets the ceiling; the prompt sets the direction.** Both models
  improved the site early on. Without a vision, later rounds turned into
  *adding*: more widgets, text, animation and upsells.
- **Forced change produces bloat.** When every round had to ship something,
  the result grew from ~250 to 21,000 lines, became overwhelming, and
  **broke its own earlier features** (dead sections, a toggle that did nothing).
- **Useful peaks came early.** The best versions were roughly a third of the
  way in. Most later rounds added nothing a user needed.
- **Models didn't research on their own.** Neither searched the web for
  reference work even when told to "innovate". Taste and references had to
  come from a person.

Balakotuwa is at exactly that risk: it is being improved in long autonomous
runs. These rules keep it a focused game rather than a feature pile.

## Design pillars (every change must serve one)

1. **Water is the heart.** Features should touch the water network, the
   seasons or villagers. If a feature would work the same in any castle game,
   question it.
2. **Readable at a glance.** A player can tell the state of the kingdom in
   three seconds: food, water, harmony, threat.
3. **Calm building, sharp raids.** Building is unhurried and pleasant; raids
   are short, tense and clear.
4. **Original Sri Lankan identity.** Ideas from the genre, never content from a title.

## Rules for each round of work

- **One change per round**, taken from `ROADMAP.md` or `docs/GENRE-NOTES.md`,
  with the pillar it serves named in the commit message.
- **Polish beats adding.** After every three additions, do one round that
  removes, merges or simplifies something. Removing a weak feature counts as
  shipping.
- **Never ship a regression.** Every round must pass the smoke test in
  `CLAUDE.md`. Then play level 1 by hand for a minute, and check that every
  existing feature you touched still works. A broken old feature is worse than
  a missing new one.
- **Budgets:**
  - At most 4 resources plus water; no new currencies without a strong reason.
  - At most one new mechanic introduced per campaign level.
  - Each mechanic must be explainable in one tooltip sentence.
  - The top bar stays one row and the HUD stays one band.
  - Level 1 must stay winnable by a first-time player using only the tutorial hints.
- **Use references.** Before a visual or UX round, look at well-regarded games
  in the genre for *conventions* (readability, feedback, pacing). Write down
  the takeaway, not the asset.
- **Stop when done.** When the roadmap item is finished and tested, stop and
  report. Do not invent work to fill time. Ask the human for the next direction.

## Reviewing a long autonomous run

Check the diff for:

- features that serve no pillar
- UI that adds a row, a panel or a currency
- text walls in tooltips or overlays
- features that were added and then quietly broken by later rounds

Keep the best, cut the rest, and record what was cut in `ROADMAP.md` so it isn't re-added.
