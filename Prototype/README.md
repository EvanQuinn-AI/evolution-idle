# Evolution Idle Long-Term Progression Prototype

This browser vertical slice expands the original encyclopedia fun test into a persistent, seeded world loop.

It includes:

- A cinematic boot sequence: big bang, black hole collapse, and logo reveal (tap to skip, disable in settings).
- A main menu with Continue/Begin Evolution, an Admin Settings launch mode, and Engine Settings.
- A living canvas **stage** as the centerpiece: an animated biome backdrop and a procedurally drawn
  creature that *is whatever you currently are* (atom -> cell -> fish that swims, bird that flies,
  beast that walks). The primary action is tapping that creature to catalyze energy, with squash,
  ripple, and particle juice. Word-heavy systems now live behind Evolve / World / Survive / Codex / Lab tabs.
- Visible catastrophes: an asteroid streaks in and flashes, or an ice age frosts the world, before the fossil record.
- A Codex with the Species Atlas, 18 unlockable **Achievements** (with toasts), and a scored local **Leaderboard** of your best worlds.
- Engine Settings: synthesized sound effects and volume, haptics, reduced motion, large text, battery saver, and save export/import/wipe.
- Admin mode: fast simulation, seed control, fresh-save launches, and an in-game playtest console (resource grants, pressure control, event triggers).
- 33 authored species in a directed evolution graph, now reaching past Humanity into a Space Age
  (Civilization with its own skyline scene, Spacefarer, and a UFO-flying Star Voyager in deep space).
- Each species draws with bespoke `features` (shark dorsal fin, whale fluke, bird beak, upright human/ape,
  mushroom cap, bacterial flagella, the rocket/UFO/city forms), so every form on the stage reads distinctly.
- Overlapping Species Atlas albums, filters, clues, mastery, and survivor stamps.
- Three biomes and deterministic visible/hidden world modifiers.
- Twelve ambient incidents and eight choice-event chains.
- Asteroid and Ice Age extinction finales with trait-weighted survivors.
- Evolution Memory, DNA Fragments, Mutation Points, and Discovery Knowledge - all four now have sinks:
  Memory unlocks origin anchors, DNA buys permanent Genome Lab upgrades, Mutation Points reveal hidden
  world conditions or vent extinction pressure, and Knowledge gates late species routes.
- Fossil legacies, active-world persistence, offline progression (including background-tab catch-up), and a Cellular Origin checkpoint.

## Run

From the repository root:

```powershell
python -m http.server 4173 -d Prototype
```

Open `http://localhost:4173`.

For rapid testing use the main menu's "Run with Admin Settings", or open `http://localhost:4173/?fast=1`. Add `&fresh=1` to clear the local prototype save.

## Test

```powershell
node Prototype/game.test.mjs
```

The prototype has no external dependencies, art assets, analytics, shop, or cloud integration; audio is synthesized at runtime with WebAudio. Browser storage is intentionally a lightweight playtest save rather than the production save envelope.
