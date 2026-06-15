# Progression And Flow Audit

## Product Arc

The browser prototype now has a deliberate ten-world campaign spine rather than one repeating prestige loop:

| World | Era | Main change |
| --- | --- | --- |
| 1 | Primordial World | Chemistry, microbes, marine food webs |
| 2 | Adaptive World | Guarantees at least one biome not seen in World 1 |
| 3 | Living Biosphere | Ocean, Wetland, and Forest coexist |
| 5 | Planetary Era | Post-Human evolution becomes available |
| 8 | Space Age | Spacefarer route opens |
| 10 | Interstellar Era | Voidborn and Star Voyager finale |

A focused lineage simulation reaches Star Voyager on World 10 after roughly 100 hours of accumulated normal-speed simulation. Offline progress pauses at 99% extinction risk, so this time can be accumulated safely across short sessions. The main route uses 23 forms; 18 side species, alternate branches, Mastery levels, survivor stamps, achievements, and records remain available for collection play.

## Audited Systems

### First Launch And Origins

- Atomic chemistry automatically establishes the first cells.
- Founding chemistry remains fast, but background chemistry slows after three cells.
- Origin production now has logarithmic returns. This removed a first-world runaway from billions of Energy to a useful incremental economy.
- The stage, origin totals, save flow, and offline return remain synchronized.

### Directed Evolution

- The tree contains 41 forms and every parent reference resolves.
- Missing transition forms were added to the core ancestry.
- Species require living parents, not merely historical discovery.
- Late routes use explicit world gates and readable reasons.
- Known species rebuild at a discount; three Mastery levels increase that discount.
- Rediscovery grants one DNA Fragment until Mastery is complete.

### World Goals

- Every world now presents three short-term goals: advance the lineage, maintain living diversity, and actively hold a healthy ecosystem.
- Targets scale across the campaign so later worlds ask for broader trees and food webs rather than replaying the first-world tutorial.
- Goals grant Energy, Adaptation, and Discovery Knowledge immediately, then add a score bonus to the completed run.
- Goal completion is persisted and idempotent: reloads cannot repay a finished goal, while beginning a new world resets the objective set.
- The balance goal advances only during active play, giving ecosystem interventions a clear skill-based purpose instead of becoming another offline timer.
- A compact canvas prompt opens the World tab directly, keeping the next meaningful target visible between evolution checkpoints.

### Ecosystem

- Diversity gates count living populations.
- Local extinction removes active control and blocks descendants.
- Reintroduction is explicit; protection and ambient events cannot silently resurrect a species.
- Producer, herbivore, omnivore, predator, and decomposer roles feed ecosystem health and extinction risk.
- Intervention costs, cooldowns, recommended actions, and mobile controls were exercised in-browser.

### Events

- Choice totals count resolved decisions rather than displayed cards.
- Resource-spending options are disabled until affordable.
- Event buttons update while resources accrue.
- Events require living species.
- Eleven choices and seventeen ambient incidents cover early life through post-human evolution.

### Extinction

- Six catastrophe families have distinct text, preparations, survivor weighting, and stage presentation.
- A preparation costs 50 Adaptation and only one may be selected.
- Riskier unprepared runs yield an additional Mutation Point.
- Only living species can survive and become fossil legacies.

### Permanent Progression

- Evolution Memory: Cellular Origin plus 13 levels of Deep Time upgrades.
- DNA Fragments: 25 Genome levels plus species Mastery rewards.
- Mutation Points: tactical reveal/vent actions plus 13 permanent Mutation Lab levels.
- Discovery Knowledge: event and discovery progression gates late forms.
- Fossil Nursery and survivor stamps strengthen founder populations in later worlds.

### Interface And Persistence

- The Lab is a main-menu checkpoint screen with a visible world roadmap.
- Codex entries show Mastery and named survivor stamps.
- The expanded evolution map remains pannable and readable on desktop and mobile.
- Version 8 saves restore older snapshots with defaults for every new progression field.
- Malformed collections, numbers, populations, cooldowns, and upgrade levels are sanitized.

## Remaining Production Opportunities

These are expansion work, not blockers in the current prototype:

1. Grow from 41 core forms toward launch-scale albums through optional branches and variants.
2. Add authored Mastery objectives instead of rediscovery-only levels.
3. Add pre-run world modifier selection and challenge modifiers.
4. Give Civilization a world-state presentation instead of treating it as a literal creature node.
5. Add biome migration controls and late-game automation policies.
6. Tune final pacing with telemetry from human playtests; deterministic simulations verify reachability, not subjective delight.
