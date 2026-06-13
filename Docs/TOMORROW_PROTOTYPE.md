# Tomorrow Prototype - Encyclopedia Fun Test

## Goal

Build the smallest ugly prototype that answers one question:

> Do unknown encyclopedia slots make the player want to complete one more evolution?

This is a disposable gameplay test. Do not integrate save recovery, cloud sync, analytics SDKs, monetization, achievements, polished UI, art, sound, animation systems, world generation, or the full content compiler.

## Timebox

- Morning: playable loop.
- Afternoon: encyclopedia and extinction reset.
- Evening: three 30-minute playtests and tuning.
- Stop after one day even if it is rough.

## Required Screen

Use one browser-style or Unity debug screen with plain buttons and text:

```text
EVOLUTION IDLE

Energy: 152 (+3/sec)
[Generate Energy]

Atoms: 15
[Create Atom - 10 Energy]

Molecules: 2
[Create Molecule - 5 Atoms]

EVOLUTION CHOICE
[Plant]  [Fish]  [Fungus]

ENCYCLOPEDIA  7 / 15
[Atom] [Molecule] [Cell] [Plant] [Fish]
[???]  [???]      [???]  [???]   [???]

EXTINCTION PRESSURE: 72%
[Trigger Asteroid]
```

No navigation hierarchy is needed. Keep the collection visible while playing.

## Content

Use exactly 15 entries:

1. Atom
2. Molecule
3. Organic Compound
4. Cell
5. Plant
6. Fungus
7. Fish
8. Shark
9. Flying Fish
10. Whale
11. Cactus
12. Carnivorous Plant
13. Mushroom Colony
14. Parasitic Fungus
15. Extremophile

Only twelve should be discoverable in the first run. At least three require a second run or a different branch so extinction creates immediate curiosity.

## Minimal Rules

### Production

- Click generates 1 Energy.
- Starting passive production is 1 Energy per second.
- Atom costs 10 Energy and adds 1 Energy per second.
- Molecule costs 5 Atoms.
- Organic Compound costs 5 Molecules.
- Cell costs 5 Organic Compounds.

Exact balance is disposable. Tune only enough to reach the first choice in 5-8 minutes and extinction in 20-25 minutes.

### First Branch

After Cell, choose Plant, Fungus, or Fish. The choice locks the other two for the current run.

- Plant exposes Cactus and Carnivorous Plant.
- Fungus exposes Mushroom Colony and Parasitic Fungus.
- Fish exposes Shark, Flying Fish, and Whale.

Show silhouettes for locked sibling branches. The player must understand that another run can reveal them.

### One Secret

Extremophile is not shown initially. Reveal its silhouette when extinction pressure reaches 50%. Discover it by reaching Cell while saving a specific resource reserve. Give one clue: "Something survives where ordinary life fails."

The secret tests whether inference is more compelling than a plain price gate.

### Extinction

Extinction pressure begins after the first branch choice and reaches 100% in roughly 15 minutes. The player may trigger the Asteroid at any point after 60%.

On extinction:

- Display discovered species and newly filled encyclopedia slots.
- Award 1 DNA Fragment per unique species discovered that run.
- Reset run resources and branch choice.
- Keep all encyclopedia entries permanently revealed.
- Spend DNA Fragments on one simple permanent bonus: +10% Energy production per level.

The bonus exists only to make the second run visibly faster. The actual test is whether players choose a different branch to fill missing entries.

## Discovery Presentation

Use no art. A discovery still needs a crisp text reveal:

```text
NEW SPECIES DISCOVERED

FLYING FISH
Rare - Fish Lineage

Encyclopedia: 9 / 15
New clue revealed: "A giant shape moves beneath the surface."

[Continue]
```

Known discoveries should not interrupt subsequent runs.

## Deliberate Omissions

- No offline progress.
- No saving between application launches.
- No procedural generation.
- No random event deck.
- No multiple currencies beyond Energy, the conversion chain, and DNA Fragments.
- No polished evolution web.
- No real scientific simulation.
- No content beyond the 15 entries.

## Playtest Script

Do not explain the collection mechanic before starting.

Observe:

1. Does the player inspect or count the unknown slots?
2. After discovering Fish, do they look at nearby silhouettes?
3. Do they form a theory about Shark, Flying Fish, Whale, or Extremophile?
4. At extinction, do they understand why another run is valuable?
5. Do they voluntarily begin the second run?
6. Do they choose a different branch without being instructed?

Ask afterward:

- What were you trying to achieve?
- Which unknown entry interested you most?
- Did any unlock feel arbitrary?
- Did extinction feel like loss or opportunity?
- Would you play another run to reveal the remaining entries?

## Success Criteria

The prototype passes if at least two of three fresh players:

- Voluntarily inspect the encyclopedia before extinction.
- Can name a species they are trying to discover.
- Start a second run without prompting.
- Choose a different branch to pursue missing entries.
- Report that discovery, not clicking, was their main motivation.

It fails if players focus only on making numbers rise, do not understand how unknown entries relate to choices, or feel no desire to restart after extinction.

## Decision After The Test

- **Strong pass:** Build the vertical slice around encyclopedia UX, clue design, and branch discovery.
- **Mixed pass:** Remove friction, improve silhouettes and clues, and repeat with the same scope.
- **Fail:** Rework the discovery loop before adding content or production systems. Do not solve it by adding polish.
