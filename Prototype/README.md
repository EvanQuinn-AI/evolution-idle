# Evolution Idle Long-Term Progression Prototype

This browser vertical slice expands the original encyclopedia fun test into a persistent, seeded world loop.

It includes:

- A cinematic boot sequence: big bang, black hole collapse, and logo reveal (tap to skip, disable in settings).
- A main menu with Continue/Begin Evolution, an Admin Settings launch mode, and Engine Settings.
- A living canvas **stage** as the centerpiece: collectible animals use illustrated skeletal cutout rigs,
  autonomous locomotion, five stage-specific development scenes, and twelve layered habitat dioramas.
  Habitat-correct wildlife moves in the background without changing gameplay. Origins and failed asset
  loads retain the procedural renderer as a fallback.
- Six visible catastrophe families, from asteroid impact and ice age to solar flare, pandemic, supervolcano, and ocean anoxia.
- A Codex with the Species Atlas, 22 unlockable **Achievements** (with toasts), and a scored local **Leaderboard** of your best worlds.
- Engine Settings: synthesized sound effects and volume, haptics, reduced motion, large text, battery saver, and save export/import/wipe.
- Admin mode: fast simulation, seed control, fresh-save launches, and an in-game playtest console (resource grants, pressure control, event triggers).
- 41 authored species in a directed evolution graph, including logical bridge forms such as Choanoflagellate,
  Jawless Fish, Lungfish, Synapsid, Feathered Theropod, Great Ape, Post-Human, and Voidborn, now reaching past Humanity into a Space Age
  (Civilization with its own skyline scene, Spacefarer, and a UFO-flying Star Voyager in deep space).
- A collectible-life loop: origins assemble from Atom to Cell, two random adult targets appear, and the selected animal grows through five age stages before its adult form is collected and the game resets to the Cell.
- Visible d20 encounters and mid-development disasters with real failure states. A failed Chicken fox attack or catastrophe ends the attempt, awards no collectible, and immediately restarts from the Cell.
- Each species draws with bespoke `features` (shark dorsal fin, whale fluke, bird beak, upright human/ape,
  mushroom cap, bacterial flagella, the rocket/UFO/city forms), so every form on the stage reads distinctly.
- Overlapping Species Atlas albums, filters, clues, mastery, and survivor stamps.
- Three biomes and deterministic visible/hidden world modifiers.
- Seventeen ambient incidents and eleven choice-event chains.
- Six extinction finales with distinct preparations and trait/biome-weighted survivors.
- Evolution Memory, DNA Fragments, Mutation Points, and Discovery Knowledge - all four now have sinks:
  Memory unlocks origin anchors and Deep Time upgrades, DNA buys permanent Genome upgrades, Mutation Points
  can be saved for tactical actions or permanent Mutation Lab upgrades, and Knowledge gates late species routes.
- A ten-world era arc: Primordial, Adaptive, Living Biosphere, Planetary, Space Age, and Interstellar progression.
- Three scaling World Goals per run that reward lineage growth, living diversity, and actively maintained ecosystem health.
- Species Mastery rewards rediscovery with DNA, permanent production strength, and cheaper rebuilding in future worlds.
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

The prototype has no external runtime dependencies, analytics, shop, or cloud integration. Wildlife SVG parts are generated and cached locally from the stage manifest; audio is synthesized with WebAudio. Browser storage is intentionally a lightweight playtest save rather than the production save envelope.
