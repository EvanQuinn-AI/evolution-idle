# Evolution Idle - Game Design Specification

## Product Promise

Evolution Idle is a science-fantasy collection game presented through an incremental evolution system. The player begins with one atom and gradually fills an enormous living encyclopedia of species, traits, ecosystems, extinctions, and impossible forms of life.

The defining emotional loop is:

```text
See an unknown silhouette -> infer how to reach it -> evolve it -> reveal its entry -> notice the next unknown
```

The fantasy is not merely becoming larger or richer. It is becoming the person who has discovered 847 of 1,200 species, finally solving a stubborn branch, and owning a fossil record unlike anyone else's.

The game prioritizes satisfying escalation and surprising outcomes over biological realism. Scientific ideas provide recognizable anchors; playful mutations, alternate evolution, and cosmic absurdity provide the fun.

## Design Pillars

1. **The Encyclopedia Is The Game.** Resources, choices, events, and prestige exist primarily to produce discoveries and collection stories.
2. **There is always an enticing unknown nearby.** Silhouettes, empty slots, clue trails, and completion percentages continuously create curiosity.
3. **Discovery requires meaningful choices.** New species come from branch commitments, world conditions, and experimentation rather than simple linear purchasing.
4. **Extinction remixes the collection hunt.** Prestige opens new routes and conditions instead of merely multiplying production.
5. **Every collection tells a story.** Trees, rare finds, extinction survivors, and missing entries make progress personal and shareable.

## Player Journey

The broad progression is organized into eras. An era is a ruleset and fantasy shift, not a mandatory linear branch.

```text
Atomic -> Chemical -> Cellular -> Ecological -> Planetary -> Cosmic
```

- **Atomic:** Gather matter, stabilize atoms, and create useful elements.
- **Chemical:** Build molecules, catalysts, organic compounds, and self-replicating chemistry.
- **Cellular:** Choose metabolism, membranes, reproduction, organelles, and early specialization.
- **Ecological:** Populate biomes with plants, fungi, animals, symbiotes, parasites, and decomposers.
- **Planetary:** Shape climate, migration, intelligence, megafauna, and civilization-adjacent life.
- **Cosmic:** Seed moons and planets, engineer panspermia, and create bizarre life under alien conditions.

Players do not leave earlier eras behind. A late ecosystem still depends on its chemistry, cellular traits, food web, and environmental history.

## Core Gameplay Loop

### Moment-To-Moment

1. Generate the current era's primary resource automatically.
2. Use taps, holds, and short active abilities to create bursts or target bottlenecks.
3. Buy producers and process upgrades.
4. Inspect nearby evolution nodes and their clues.
5. Commit resources and traits to unlock a node.
6. React to an event, environmental shift, or mission opportunity.
7. Reconfigure automation around the new branch.

Active interactions include tapping unstable particles, tracing molecule chains, selecting mutation samples, directing migration, and triggering temporary adaptation surges. They are quick and optional, with diminishing returns that prevent repetitive clicking from becoming mandatory.

### Session Loop

1. Collect offline production and review what changed.
2. Resolve queued discoveries and event reports.
3. Spend resources on one or two meaningful evolutionary decisions.
4. Adjust automation priorities or trait loadouts.
5. Advance a mission, extinction preparation, or codex objective.
6. Leave with a clear next target visible.

### Run Loop

1. Begin with a world seed, two environmental modifiers, and selected legacy bonuses.
2. Rebuild efficiently through known early discoveries.
3. Enter unfamiliar branches created by world conditions, mutations, and player choices.
4. Develop an ecosystem that produces Complexity and Resilience.
5. Face escalating extinction pressure and decide whether to resist, exploit, or embrace it.
6. End the run, score the fossil record, and claim persistent rewards.
7. Spend meta currencies and configure the next world.

### Long-Term Loop

Players complete regional and lineage encyclopedia pages, master species, unlock stranger world types, pursue missing silhouettes, and contribute discoveries to community research seasons. Numerical power supports the hunt; collection progress is the durable measure players care about.

## Evolution Encyclopedia

The Evolution Encyclopedia is the primary progression screen, retention system, social artifact, and content-delivery framework. The evolution web shows what a player can attempt now. The Encyclopedia shows the enormous universe still waiting to be found.

### Collection Structure

Entries are grouped into understandable albums:

- Era: Atomic, Chemical, Cellular, Ecological, Planetary, Cosmic.
- Kingdom or lineage: Plants, Fungi, Fish, Insects, Reptiles, Mammals, and stranger groups.
- Habitat: Deep Ocean, Reef, Forest, Desert, Tundra, Sky, Subterranean, Alien.
- Trait family: Flight, Venom, Bioluminescence, Intelligence, Symbiosis, Extremophile.
- Extinction survivors: Species proven against each cataclysm.
- Anomalies: Secret, humorous, alternate-history, and impossible species.

An entry may appear in multiple albums, letting one discovery advance several collections without duplicating the species.

### The Unknown Slot

Unknown entries are deliberately designed, not generic question marks. Each slot can reveal progressively more information:

1. A blank numbered slot establishes collection size.
2. A silhouette communicates body plan or category.
3. A habitat icon or short clue suggests where to search.
4. Neighbor relationships hint at likely parent species.
5. Discovery Knowledge reveals one unmet condition.
6. Full requirements appear only after enough related experimentation.

The player should usually have three kinds of target visible:

- One species they can probably discover this session.
- One mysterious species they are actively investigating.
- One aspirational species that may take several runs.

### Discovery Reveal

A first discovery receives a short interruption worthy of the moment:

- Silhouette resolves into the species portrait.
- Name and rarity appear.
- One surprising fact or playful description is revealed.
- Its position lights up in every relevant album.
- New neighboring silhouettes briefly pulse.
- The game records the world, lineage, and extinction history that produced it.

Common discoveries resolve quickly. Rare, secret, and mastery discoveries receive stronger presentation. The reveal should not become a modal nuisance when many known species are rebuilt after prestige.

### Entry Anatomy

Every species entry contains:

- Name, portrait, rarity, and discovery date.
- Its parent routes and known alternate routes.
- Habitat, diet, traits, niche, and extinction resistances.
- First-discovery world seed and run summary.
- Current mastery objectives.
- Related species silhouettes.
- Player population and run records.
- A concise flavor fact that favors wonder over textbook density.

### Collection Progress

Use several completion measures instead of one intimidating global percentage:

- Overall discovered species.
- Era and lineage album completion.
- Known versus secret entries.
- Species mastered.
- Extinction survivor stamps.
- Rare variants and cosmetic forms.

Core species count toward gameplay completion. Limited-time cosmetics and supporter variants never reduce the permanent completion percentage.

### Rarity And Secrets

- **Common:** Natural route discoveries that teach the system.
- **Uncommon:** Require a deliberate branch or environmental condition.
- **Rare:** Require a multi-system combination, unusual event result, or challenge world.
- **Mythic:** Long clue chains and difficult authored conditions with pity protection where randomness is involved.
- **Anomaly:** Secret forms that are hidden from totals until their clue family is encountered.

Rarity measures discovery complexity, not random drop chance. A player should be able to reason toward almost every species.

### Variants

Variants provide scalable collection depth without pretending every recolor is a species:

- Environmental forms such as Arctic, Abyssal, Volcanic, and Low Gravity.
- Mutation forms such as Gigantic, Miniature, Bioluminescent, and Crystalline.
- Extinction survivor forms carrying a visible fossil stamp.
- Seasonal cosmetic forms that do not affect species completion.

Variants occupy a secondary panel inside a species entry. They reward specialists while keeping the main collection legible.

### Duplicate Discoveries

Rediscovering a known species should still matter without becoming loot-box grinding:

- Improves that species' research level through authored milestones.
- Reveals alternate routes, lore, or ecological interactions.
- Advances mastery objectives.
- Adds a small amount of DNA Fragments on the first few meaningful rediscoveries.

Repeatedly farming the easiest species has sharply diminishing rewards.

### Search And Completion Tools

As the collection grows, players unlock filters for era, habitat, trait, rarity, missing conditions, and reachable-this-run entries. A Research Desk can pin up to three species, surfacing relevant clues during play without solving the route automatically.

### Social Collection

Players can share:

- An album completion card.
- A rare species reveal card.
- Their strangest evolutionary route.
- A spoiler-safe missing-species grid.
- A seed and build code that lets others attempt the same discovery.

Global statistics show discovery rarity only after the player has found the entry or explicitly enabled spoilers.

## Economy And Resources

Each resource must answer a distinct player question. Avoid adding a currency when an existing one can perform the same job.

### Run Resources

| Resource | Role | Main Sources | Main Sinks |
|---|---|---|---|
| Matter | Foundational quantity and early production | Taps, atomic producers, recycling | Elements, molecules, basic infrastructure |
| Energy | Throughput and automation capacity | Reactions, metabolism, sunlight, consumption | Active processes, automation slots, high-output species |
| Biomass | Living population and ecological scale | Cells, producers, food chains | Species populations, organs, habitats |
| Complexity | Primary run advancement measure | New niches, stable food webs, intelligence | Era gates, rare evolution nodes, extinction score |
| Adaptation | Tactical run currency | Events, harsh conditions, missions | Mutations, emergency responses, branch rerolls |

The UI foregrounds only resources relevant to the current decision. Earlier resources collapse into compact summaries after their era is automated.

### Persistent Resources

| Resource | Purpose | Design Rule |
|---|---|---|
| Evolution Memory | Broad permanent account progression | Unlocks systems and modest global efficiency bonuses |
| DNA Fragments | Collection and build crafting | Used to unlock, fuse, and equip inherited traits |
| Mutation Points | Permanent specialization | Spent in a reversible mutation web with limited active slots |
| Discovery Knowledge | Codex and information progression | Reveals clues, probabilities, hidden prerequisites, and lore |

Persistent currencies are earned through different behaviors. A single optimal farming strategy must not dominate all four.

## Evolution Web

The central screen is a zoomable, shareable evolution web rather than a conventional upgrade list.

### Node Types

- **Foundation:** Elements, molecules, cellular structures, and other prerequisites.
- **Trait:** Reusable properties such as photosynthesis, venom, flight, spores, armor, or social behavior.
- **Species:** Discoverable life forms that produce resources and occupy niches.
- **Niche:** Environmental roles such as apex predator, pollinator, decomposer, reef builder, or parasite.
- **Symbiosis:** Links between compatible species that create powerful combined effects.
- **Keystone:** Run-defining commitments that reshape costs, events, and available branches.
- **Anomaly:** Rare, seed-dependent discoveries with unusual rules and cosmetic presentation.

### Discovery States

1. **Hidden:** Not displayed until a relevant clue is found.
2. **Silhouette:** Position and broad category are visible.
3. **Revealed:** Requirements are partially or fully shown.
4. **Discovered:** The node is unlocked for the current run and recorded in the Codex.
5. **Mastered:** A lineage-specific challenge has been completed, granting a persistent perk or cosmetic.

### Unlock Conditions

Nodes combine several data-driven conditions:

- Resource thresholds or sustained production.
- Required and forbidden traits.
- Parent species or niche occupancy.
- Temperature, atmosphere, radiation, moisture, or gravity ranges.
- Prior event decisions.
- World seed tags.
- A minimum ecosystem stability or diversity score.
- Discovery Knowledge that exposes an alternate route.

Requirements should create deductions, not arbitrary guessing. Hidden nodes provide ecological clues such as "thrives where light is scarce" or "requires a stable host population."

### Meaningful Branching

- Keystone choices consume limited **Adaptation Capacity**, preventing every branch from being taken in one run.
- Traits have advantages and liabilities. Flight increases migration and discovery but raises Energy demand. Armor improves extinction survival but slows reproduction.
- Branches alter the event deck. A fungal world sees decomposition and spore events; a marine world sees salinity, currents, and reef crises.
- Some lineages exclude others locally but may coexist in separate biomes later.
- Cross-branch synergies reward experimentation without making one canonical tree mandatory.

### Species Mastery

Every species has three mastery objectives selected from a curated pool:

- Reach a population threshold.
- Survive a relevant extinction.
- Form a specific symbiosis.
- Become dominant under an unusual world modifier.
- Complete a run while accepting a trait liability.

Mastery rewards are small permanent lineage perks, profile cosmetics, tree decorations, and share-card frames.

## Automation And Active Play

Automation is unlocked in layers:

1. **Auto-collect:** Production accrues without input.
2. **Auto-buy:** A rule spends a percentage of a resource on a selected producer.
3. **Priority queues:** Players rank goals such as cheapest upgrade, selected lineage, or reserve threshold.
4. **Ecological policies:** Late systems balance population floors, predator ratios, energy reserves, and migration.
5. **Evolution scripts:** Not executable code; players arrange approved condition/action cards such as "when Energy exceeds 80%, invest in Biomass."

Active play grants Focus. Focus powers short abilities such as Catalyze, Mutation Surge, Accelerated Gestation, or Emergency Migration. Focus has a low cap and replenishes while away, making active sessions satisfying without punishing passive players.

## World Generation And Replayability

Each run receives a deterministic world seed containing:

- Climate profile and biome availability.
- Atmosphere and stellar conditions.
- Two visible modifiers and one discoverable hidden modifier.
- Weighted event families.
- Rare lineage opportunities.
- Extinction likelihoods.

Example modifiers include High Gravity, Shallow Seas, Toxic Atmosphere, Twin Suns, Endless Night, Abundant Carbon, Unstable Magnetosphere, and Ancient Ruins.

Players may reroll one visible modifier for free before a run. Additional control is earned through meta progression, not sold as a consumable.

## Extinction Prestige

Extinction is both a dramatic event chain and the primary run reset.

### Extinction Pressure

Pressure rises from era advancement, unstable builds, greedy production, and world modifiers. It progresses through four readable stages:

1. **Omen:** The threat family is hinted and preparation opportunities appear.
2. **Warning:** The exact extinction is revealed with likely effects.
3. **Crisis:** Multi-step events test the ecosystem and offer costly choices.
4. **Cataclysm:** The player may trigger the finale for maximum control or continue briefly at mounting risk.

The player usually chooses the final moment. Remaining too long in Cataclysm applies escalating damage and eventually ends the run, preserving tension without making ordinary offline absence destructive.

### Extinction Families

- **Asteroid:** Impact zone, dust winter, fires, and isolated refuges.
- **Ice Age:** Migration, insulation, scarcity, and shrinking habitats.
- **Solar Flare:** Radiation, mutation, technology disruption, and underground survival.
- **Super Volcano:** Toxic atmosphere, ash, cooling, and ocean acidification.
- **Pandemic:** Population density, immunity, symbiosis, and genetic bottlenecks.
- **Ocean Anoxia:** Marine collapse, microbial blooms, and landward pressure.
- **Runaway Greenhouse:** Heat adaptation, nocturnal life, and atmospheric engineering.
- **Reality Fracture:** Late-game anomaly producing impossible hybrid lineages.

### Preparation Choices

Players can build refuges, preserve genomes, migrate populations, diversify food webs, or deliberately cultivate extremophiles. No preparation negates all consequences. The goal is to choose what survives.

### Fossil Record Scoring

The final score evaluates:

- Peak Complexity.
- Number and rarity of discoveries.
- Ecosystem diversity and stability.
- Species mastered.
- Crisis objectives completed.
- Lineages preserved.
- Voluntary risk modifiers.

### Persistent Rewards

- **Evolution Memory:** Based primarily on Complexity and era reached.
- **DNA Fragments:** Based on species diversity, mastery, and survivors.
- **Mutation Points:** Based on risk, extinction severity, and challenge modifiers.
- **Discovery Knowledge:** Based on new nodes, events, and secret outcomes.

### Next-Run Legacy

Before the next run, the player chooses:

- One preserved foundational adaptation.
- One fossil species that grants a passive legacy effect.
- A limited DNA trait loadout.
- Optional challenge modifiers that increase rewards.

This creates roguelite builds without allowing a completed tree to be copied wholesale.

## Meta Progression

### Memory Constellation

A permanent, mostly horizontal progression web unlocks automation, world control, additional biomes, event information, loadout slots, and modest production improvements. Major nodes change strategy; minor nodes smooth pacing.

Respec is always available between runs for a small, capped fee or becomes free after the early game. Players should experiment, not fear permanent account damage.

### Genome Library

DNA Fragments unlock inherited trait cards. A pre-run loadout has limited slots and a complexity budget. Traits include a benefit and occasionally a liability:

- Rapid Reproduction: faster population growth, higher food demand.
- Dormancy: improved offline and extinction survival, slower active production.
- Adaptive Immune System: pandemic resistance, increased Biomass cost.
- Metamorphosis: access to unusual branches, delayed maturation.
- Distributed Intelligence: automation bonus, weaker individual species output.

Duplicate fragments improve flexibility or cosmetics, not infinitely scaling power.

### Codex

The Codex records species, traits, symbioses, worlds, extinctions, and event outcomes. Entries contain silhouettes, clue trails, mastery tasks, and the player's first-discovery tree. Completion unlocks new search tools and presentation rewards rather than only percentage bonuses.

## Event System

Events are short, data-driven chains with immediate and delayed consequences.

### Event Categories

- **Environmental:** Drought, currents, volcanic islands, oxygen spikes.
- **Ecological:** Invasive species, population booms, predator collapse, symbiosis.
- **Mutation:** Beneficial anomaly, unstable genome, convergent evolution.
- **Cosmic:** Meteor showers, solar cycles, alien material.
- **Discovery:** Fossils, ancient chemistry, hidden biomes.
- **Crisis:** Extinction preparation and cataclysm stages.

### Choice Structure

Good event choices trade dimensions rather than presenting an obvious correct answer:

- Immediate output versus long-term resilience.
- Protect a dominant species versus increase diversity.
- Spend Adaptation now versus unlock a rare branch.
- Accept a mutation liability for a unique discovery.

Delayed outcomes return several minutes or an era later. The event log clearly connects consequence to decision so outcomes feel earned rather than random.

Rare events use pity counters and eligibility tracking. A player should never be locked out of collection completion by indefinite bad luck.

## Missions

### Field Tasks

Short, optional session goals such as purchasing three traits, stabilizing an ecosystem, or activating an ability. Rewards are useful but small. Tasks accumulate while away and do not require daily attendance.

### Expeditions

Multi-step objectives that encourage a branch or biome without dictating the full run. Example: establish photosynthesis, support a pollinator, then survive a cooling event.

### Run Challenges

Selected before a run and paired with reward multipliers:

- No active abilities.
- High-gravity world.
- One biome only.
- Predator-heavy ecosystem.
- Accelerated extinction pressure.

### Legacy Quests

Long-term account goals that introduce major systems and story fragments. They teach mechanics, unlock world types, and culminate in authored challenge runs.

### Community Research

Players contribute eligible discoveries or completed objectives to a global research target. Contributions are asynchronous and noncompetitive. Everyone receives baseline rewards; personal milestones grant additional cosmetics.

## Achievements

Achievements are divided into four groups:

- **Milestones:** Reach eras, production levels, and extinction counts.
- **Mastery:** Complete difficult lineage or world combinations.
- **Discovery:** Find secret species, event outcomes, and symbioses.
- **Style:** Build amusing or extreme trees, such as a world dominated by armored fungi.

Most achievement rewards are titles, portraits, tree skins, extinction animations, and Codex decorations. Small mechanical rewards are reserved for broad milestones so secret checklists do not become mandatory optimization.

## Retention Without Chores

- Offline gains are always useful and clearly explained.
- The player returns to decisions, not a wall of claim buttons.
- Field Tasks stack up to a cap instead of expiring each day.
- Missing a day never breaks a reward streak; attendance advances a calendar at the player's pace.
- Weekly challenge seeds are available for the full season and can be replayed.
- A comeback report summarizes discoveries, automation, threats, and recommended actions.
- Notifications are opt-in, sparse, and tied to player-selected goals.
- No energy system prevents play, and no irreversible loss occurs solely because the player was offline.

## Community Features

### Shareable Evolution Trees

Every run generates a compact share card containing:

- Seed and challenge modifiers.
- Tree silhouette and dominant lineage colors.
- Rarest discovery.
- Extinction survived or embraced.
- Fossil Record score.
- A short import code for replaying the same world seed.

### Weekly Parallel Worlds

All players receive the same seed and optional challenge rules. Rankings are separated into broad categories such as fastest discovery, highest diversity, and highest score so one optimized strategy does not invalidate all others.

### Discovery Almanac

Global, anonymized percentages show how many players discovered a species or chose an event outcome. Hidden content remains concealed until personally revealed.

### Collaborative Tree

Seasonal community research grows a giant visual tree on the title screen. Contributions unlock shared branches, lore, cosmetics, and eventually a permanent event family.

## Monetization

The recommended model is premium-first and platform-sensitive:

- **PC/macOS:** Premium purchase with the complete core game.
- **Mobile:** Free opening eras with one permanent full-game unlock, or a low upfront price based on store testing.
- **Expansions:** Substantial new world types, eras, extinction families, and authored legacy quests.
- **Cosmetics:** Optional tree themes, UI skins, profile frames, extinction visuals, and soundtrack packs.
- **Supporter Pack:** Cosmetic-only bundle with soundtrack and digital art book.

Do not sell raw resources, random mutation loot boxes, extinction protection, offline multipliers, or exclusive power. Do not use forced ads. A voluntary rewarded ad may be tested only in the free mobile trial and must grant a small session convenience, never a unique discovery or permanent advantage.

## LiveOps

### Research Seasons

Six-to-eight-week themes add a world modifier family, event chain, community tree, weekly seeds, cosmetics, and several permanent Codex entries. Core mechanical content moves into the evergreen pool when the season ends.

Example themes:

- Age of Giants.
- Fungal Dominion.
- Frozen Worlds.
- Deep Ocean.
- Twin Suns.
- Synthetic Life.

### Event Weekends

Short modifiers alter event weights or make a discovery family easier to pursue. They improve variety but never become the only way to obtain essential content.

### Curated Challenge Worlds

Hand-authored seeds create puzzle-like runs with fixed conditions and limited trait loadouts. These are cheap to produce with the data-driven system and can spotlight underused branches.

### Expansion Hooks

Future catalogs can add celestial bodies, multiplayer guild research, seasonal ecosystems, and AI-assisted draft content. AI-generated definitions must be schema-valid, simulation-tested, reviewed by a designer, and published like any human-authored content.

## Pacing Targets

- First meaningful purchase: under 30 seconds.
- First hidden-node reveal: 2-3 minutes.
- Atom to stable molecule: 5-8 minutes for a new player.
- First cell: 15-25 minutes.
- First major branch commitment: 25-40 minutes.
- First extinction: 60-90 minutes, split across active and idle sessions.
- Experienced standard runs: 30-120 minutes of interaction over 4-24 elapsed hours.
- Late challenge runs: one to seven days, with meaningful decisions every session.

Long-term play expands horizontally through new worlds, lineages, challenges, and mastery. It should not rely on making the same upgrade take progressively longer forever.

## Content Targets

### Vertical Slice

- Atomic, Chemical, Cellular, and early Ecological eras.
- 30 evolution nodes and 12 species.
- Plant, fungus, and animal keystone branches.
- Asteroid and Ice Age extinctions.
- 20 events, 15 missions, and 25 achievements.
- One complete extinction/meta loop.

### Launch

- Six eras with at least four viable macro-lineages.
- 180-250 evolution nodes and 80-120 named species.
- Eight extinction families.
- 100+ event chains with alternate outcomes.
- 150 missions and 200 achievements.
- 20 curated challenge worlds and recurring weekly seeds.

## Data-Driven Definitions Required

The content pipeline should eventually support these definition families:

- `EvolutionNodeDefinition`
- `TraitDefinition`
- `SpeciesDefinition`
- `BiomeDefinition`
- `ConditionDefinition`
- `EffectDefinition`
- `EventChainDefinition`
- `MissionDefinition`
- `AchievementDefinition`
- `ExtinctionDefinition`
- `WorldModifierDefinition`
- `MetaUpgradeDefinition`
- `RewardTableDefinition`

Conditions and effects should use a closed set of typed primitives. Designers may combine primitives freely in data, while new primitive behavior requires reviewed code.

## Design Guardrails

- Never require repetitive clicking for optimal long-term progress.
- Never make one evolution branch best in every world.
- Never hide a major irreversible choice behind unclear wording.
- Never destroy meaningful progress because the player was offline.
- Never make collection completion depend on unbounded random chance.
- Never add a currency without a unique source, sink, and decision role.
- Never use extinction as a punishment for engaging with the game incorrectly.
- Never let numerical escalation replace discovery, presentation, and strategic novelty.
