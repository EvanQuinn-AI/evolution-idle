import assert from "node:assert/strict";
import { ACHIEVEMENTS, BIOMES, GENOME_UPGRADES, LIFE_TARGETS, MEMORY_UPGRADES, MUTATION_UPGRADES, SPECIES, SPECIES_BY_ID, WORLD_MODIFIERS, EvolutionGame, genomeUpgradeCost, memoryUpgradeCost, mutationUpgradeCost } from "./game.js";
import { creatureForSpecies, sceneForBiome } from "./creatures.js";
import { CHOICE_EVENTS } from "./content.js";

assert.equal(SPECIES.length, 41, "The expanded milestone must contain 41 named species.");
assert.deepEqual(SPECIES_BY_ID.sponge.requires, ["choanoflagellate"]);
assert.deepEqual(SPECIES_BY_ID.fish.requires, ["jawless_fish"]);
assert.deepEqual(SPECIES_BY_ID.amphibian.requires, ["lungfish"]);
assert.deepEqual(SPECIES_BY_ID.mammal.requires, ["synapsid"]);
assert.deepEqual(SPECIES_BY_ID.bird.requires, ["theropod"]);
assert.deepEqual(SPECIES_BY_ID.human.requires, ["ape"]);
assert.deepEqual(SPECIES_BY_ID.star_voyager.requires, ["voidborn"]);
assert.ok(SPECIES_BY_ID.whale.requires.includes("mammal"), "Whale must descend from Mammal.");
assert.ok(!SPECIES_BY_ID.whale.requires.includes("shark"), "Whale must not descend from Fish predators.");
assert.ok(SPECIES_BY_ID.whale.albums.includes("ocean"));
assert.ok(SPECIES_BY_ID.shark.albums.includes("predators"));
assert.equal(LIFE_TARGETS.length, 33);
for (const target of LIFE_TARGETS) {
  assert.equal(target.stages.length, 5, `${target.id} must have five authored life stages.`);
  assert.ok(["Common", "Rare", "Legendary"].includes(target.rarity), `${target.id} must have a valid rarity tier.`);
}
assert.ok(LIFE_TARGETS.some(t => t.rarity === "Legendary"), "The collection needs at least one Legendary tier.");
// Every authored encounter must reference a real choice event tagged for that target.
for (const target of LIFE_TARGETS) {
  if (!target.encounter) continue;
  const event = CHOICE_EVENTS.find(item => item.id === target.encounter);
  assert.ok(event, `${target.id} references missing encounter ${target.encounter}.`);
  assert.equal(event.lifeTarget, target.id, `${target.encounter} must be tagged for ${target.id}.`);
}

for (const definition of SPECIES) {
  for (const parent of definition.requires) {
    assert.ok(SPECIES_BY_ID[parent], `${definition.id} references missing parent ${parent}.`);
  }
}

const firstWorld = new EvolutionGame({ fast: true, seed: 7 });
const matchingWorld = new EvolutionGame({ fast: true, seed: 7 });
assert.deepEqual(firstWorld.worldBiomes.map(item => item.id), matchingWorld.worldBiomes.map(item => item.id));
assert.deepEqual(firstWorld.visibleModifiers.map(item => item.id), matchingWorld.visibleModifiers.map(item => item.id));
assert.equal(firstWorld.extinction.id, matchingWorld.extinction.id);
const openingBiomes = firstWorld.worldBiomes.map(item => item.id);
firstWorld.worldEnded = true;
firstWorld.startNextWorld();
assert.ok(firstWorld.worldBiomes.some(biome => !openingBiomes.includes(biome.id)), "World 2 guarantees a newly available biome.");
firstWorld.worldEnded = true;
firstWorld.startNextWorld();
assert.equal(firstWorld.worldNumber, 3);
assert.equal(firstWorld.worldBiomes.length, BIOMES.length, "World 3 opens the complete Ocean/Wetland/Forest biosphere.");

// Early worlds must ALWAYS include the Ocean so a run can never dead-end in a
// land-only world (the Ocean gates every plant and animal route, leaving a
// land-only world stuck at a handful of microbes and fungi).
for (const seed of [3, 7, 42, 123, 9999, 250101]) {
  const earlyWorld = new EvolutionGame({ fast: true, seed });
  assert.ok(earlyWorld.worldBiomes.some(biome => biome.id === "ocean"), `World 1 (seed ${seed}) must include the Ocean.`);
  const openingW1 = earlyWorld.worldBiomes.map(item => item.id);
  earlyWorld.worldEnded = true;
  earlyWorld.startNextWorld();
  assert.ok(earlyWorld.worldBiomes.some(biome => biome.id === "ocean"), `World 2 (seed ${seed}) must include the Ocean.`);
  assert.ok(earlyWorld.worldBiomes.some(biome => !openingW1.includes(biome.id)), `World 2 (seed ${seed}) still introduces a new biome.`);
}

const routeGame = new EvolutionGame({ fast: true, seed: 5 });
routeGame.cells = 1;
routeGame.evolutionEnergy = 100000;
routeGame.worldBiomes = [...BIOMES];
routeGame.visibleModifiers = WORLD_MODIFIERS.slice(0, -1);
routeGame.hiddenModifier = WORLD_MODIFIERS.at(-1);
routeGame.stories.add("fish_escaped");
routeGame.discoveryKnowledge = 100;
routeGame.worldNumber = 10;
routeGame.pressure = 60;

let progress = true;
while (progress) {
  progress = false;
  for (const species of SPECIES) {
    if (routeGame.runReached.has(species.id)) continue;
    routeGame.evolutionEnergy = 100000;
    if (routeGame.discoverSpecies(species.id)) progress = true;
  }
}
assert.equal(routeGame.runReached.size, SPECIES.length, "Every authored species must have a reachable route.");

const eventGame = new EvolutionGame({ fast: true, seed: 2 });
eventGame.cells = 1;
eventGame.runReached.add("fish");
eventGame.populations.set("fish", 5);
assert.equal(eventGame.triggerChoiceEvent("fish_eaten"), true);
assert.equal(eventGame.pendingChoice.id, "fish_eaten");
assert.equal(eventGame.resolveChoice("migrate"), true);
assert.ok(eventGame.stories.has("fish_escaped"));
assert.equal(eventGame.totalChoiceEvents, 1, "Choice totals count resolved decisions, not merely displayed cards.");
assert.equal(eventGame.triggerChoiceEvent("fish_eaten"), false, "Choice cooldown must prevent immediate repetition.");

eventGame.eventPity.strange_fossil = 4;
eventGame.eventCooldowns = {};
assert.equal(eventGame.triggerChoiceEvent(), true);
assert.equal(eventGame.pendingChoice.id, "strange_fossil", "Pity must select an overdue rare event.");

// Featured lineages draft two seeded roots, then narrow to direct descendants.
const lineageGame = new EvolutionGame({ fast: true, seed: 17 });
lineageGame.cells = 1;
lineageGame.evolutionEnergy = 100000;
const rootDraft = lineageGame.lineageChoices();
assert.equal(rootDraft.length, 2);
assert.deepEqual(new Set(rootDraft.map(choice => choice.definition.id)), new Set(["bacteria", "archaea"]));
assert.ok(rootDraft.every(choice => choice.state === "available"), "Both opening lineage cards must be genuine choices.");
assert.equal(lineageGame.chooseLineage("bacteria"), true);
assert.equal(lineageGame.lineagePathId, "bacteria");
const forcedMaturation = lineageGame.lineageChoices();
assert.equal(forcedMaturation.length, 1);
assert.equal(forcedMaturation[0].definition.id, "protist");
assert.equal(forcedMaturation[0].forced, true);

let diceResult = null;
const diceGame = new EvolutionGame({ fast: true, seed: 4, onDiceRoll: result => { diceResult = result; } });
diceGame.cells = 1;
diceGame.runReached.add("bird");
diceGame.populations.set("bird", 3);
diceGame.activeLineageId = "bird";
diceGame.lineagePathId = "bird";
diceGame.rngState = 0; // The next deterministic d20 is 5, below difficulty 11.
assert.equal(diceGame.triggerChoiceEvent("fox_coop"), true);
assert.equal(diceGame.resolveChoice("roll_guard"), true);
assert.equal(diceResult.natural, 5);
assert.equal(diceResult.success, false);
assert.equal(diceGame.isSpeciesLiving("bird"), false);
assert.ok(diceGame.fossilCollection.has("bird"));
assert.equal(diceGame.lineageEnded, true);
const diceRestored = new EvolutionGame({ snapshot: diceGame.exportSnapshot() });
assert.ok(diceRestored.fossilCollection.has("bird"));
assert.equal(diceRestored.lineagePathId, "bird");
assert.equal(diceRestored.lineageEnded, true);

const lifeGame = new EvolutionGame({ fast: true, seed: 23 });
lifeGame.cells = 3;
lifeGame.lifeTargetDraft = ["human", "elephant"];
assert.deepEqual(lifeGame.lifeTargetChoices().map(target => target.id), ["human", "elephant"]);
assert.equal(lifeGame.chooseLifeTarget("human"), true);
assert.equal(lifeGame.lifeStageIndex, 0);
for (let stage = 0; stage < 5; stage += 1) {
  lifeGame.lifeStageProgress = lifeGame.lifeStageCost;
  lifeGame.advanceLifeStage(0);
}
assert.ok(lifeGame.lifeCollection.has("human"), "Completing adulthood awards the Human collectible.");
assert.equal(lifeGame.lifeTargetId, null);
assert.equal(lifeGame.cells, 1, "A completed collectible restarts from the cell.");

const chickenGame = new EvolutionGame({ fast: true, seed: 4 });
chickenGame.cells = 3;
chickenGame.lifeTargetDraft = ["chicken", "fox"];
assert.equal(chickenGame.chooseLifeTarget("chicken"), true);
chickenGame.lifeStageIndex = 2;
chickenGame.rngState = 0;
assert.equal(chickenGame.triggerChoiceEvent("chicken_fox"), true);
assert.equal(chickenGame.resolveChoice("roll_survival"), true);
assert.equal(chickenGame.lifeCollection.has("chicken"), false, "A dead chick is not collected.");
assert.equal(chickenGame.lifeTargetId, null);
assert.equal(chickenGame.cells, 1);

// The encounter system is data-driven: any life target tagged with an encounter
// fires its own d20 peril at the authored stage, and a failed roll resets to cell.
const eagleGame = new EvolutionGame({ fast: true, seed: 4 });
eagleGame.cells = 3;
eagleGame.lifeTargetDraft = ["eagle", "lion"];
assert.equal(eagleGame.chooseLifeTarget("eagle"), true);
eagleGame.lifeStageIndex = 1;
assert.equal(eagleGame.lifeEncounterEvent(), null, "The eagle encounter waits for its authored stage.");
eagleGame.lifeStageIndex = 2;
assert.equal(eagleGame.lifeEncounterEvent()?.id, "eagle_storm");
eagleGame.rngState = 0; // Deterministic d20 = 5, below difficulty 11.
assert.equal(eagleGame.triggerChoiceEvent("eagle_storm"), true);
assert.equal(eagleGame.resolveChoice("roll_shelter"), true);
assert.equal(eagleGame.lifeCollection.has("eagle"), false, "A failed storm roll collects nothing.");
assert.equal(eagleGame.lifeTargetId, null);
assert.equal(eagleGame.cells, 1, "A failed encounter restarts from the cell.");

const disasterLifeGame = new EvolutionGame({ fast: true, seed: 31 });
disasterLifeGame.cells = 3;
disasterLifeGame.lifeTargetDraft = ["elephant", "human"];
disasterLifeGame.chooseLifeTarget("elephant");
disasterLifeGame.pressure = 100;
disasterLifeGame.failLifeAttempt("an asteroid impact");
assert.equal(disasterLifeGame.lifeCollection.has("elephant"), false);
assert.equal(disasterLifeGame.lifeTargetId, null);

// The collection and an in-progress attempt (including a resolved encounter's
// story) must survive a snapshot round trip, so a reload cannot re-roll it.
const lifeSaveGame = new EvolutionGame({ fast: true, seed: 5 });
lifeSaveGame.cells = 3;
lifeSaveGame.lifeCollection.add("frog");
lifeSaveGame.lifeTargetDraft = ["eagle", "lion"];
lifeSaveGame.chooseLifeTarget("eagle");
lifeSaveGame.lifeStageIndex = 2;
lifeSaveGame.lifeStageProgress = 7;
lifeSaveGame.stories.add(`eagle_storm_${lifeSaveGame.attemptNumber}`);
const lifeRestored = new EvolutionGame({ snapshot: lifeSaveGame.exportSnapshot() });
assert.ok(lifeRestored.lifeCollection.has("frog"), "Collected life forms persist.");
assert.equal(lifeRestored.lifeTargetId, "eagle");
assert.equal(lifeRestored.lifeStageIndex, 2);
assert.equal(lifeRestored.lifeEncounterEvent(), null, "A resolved encounter cannot be re-rolled after reload.");

// A growing life form must FREEZE while offline: an absence cannot silently
// advance its stage, and — since the loop has no pressure-reduction action — it
// must never accrue disaster pressure the player cannot defend against.
const offlineLifeGame = new EvolutionGame({ fast: false, seed: 3 });
offlineLifeGame.cells = 3;
offlineLifeGame.lifeTargetDraft = ["wolf", "shark"];
offlineLifeGame.chooseLifeTarget("wolf");
offlineLifeGame.lifeStageIndex = 1;
offlineLifeGame.lifeStageProgress = 10;
offlineLifeGame.advanceOffline(7200);
assert.equal(offlineLifeGame.lifeStageIndex, 1, "Offline time must not advance a life form's stage.");
assert.equal(offlineLifeGame.lifeStageProgress, 10, "Offline time must not charge life-stage progress.");
assert.equal(offlineLifeGame.pressure, 0, "A frozen offline life form accrues no disaster pressure.");
assert.equal(offlineLifeGame.lifeTargetId, "wolf", "The in-progress life form survives the absence.");

// Regression: a developing life form must actually ACCRUE disaster risk over
// time (runReached is empty during the collection loop, so the old guard left
// extinctionRiskRate at 0 and disasters could never strike a growing animal).
const lifeRiskGame = new EvolutionGame({ fast: true, seed: 7 });
lifeRiskGame.cells = 3;
lifeRiskGame.lifeTargetDraft = ["wolf", "bear"];
lifeRiskGame.chooseLifeTarget("wolf");
assert.ok(lifeRiskGame.extinctionRiskRate > 0, "A growing life form accrues disaster pressure with no tree species reached.");
const pressureBefore = lifeRiskGame.pressure;
lifeRiskGame.tick(1);
assert.ok(lifeRiskGame.pressure > pressureBefore, "Disaster pressure climbs while a life form develops.");
lifeRiskGame.pressure = 99.9;
lifeRiskGame.lifeStageProgress = 0;
lifeRiskGame.tick(1);
assert.equal(lifeRiskGame.lifeTargetId, null, "Full pressure destroys the unfinished life form.");
assert.equal(lifeRiskGame.cells, 1, "A disaster restarts development from the cell.");

// Regression: a disaster striking while an encounter card is open must not leave
// a stale, resolvable decision behind (which would double-apply or soft-lock).
const cardDisasterGame = new EvolutionGame({ fast: true, seed: 12 });
cardDisasterGame.cells = 3;
cardDisasterGame.lifeTargetDraft = ["lion", "shark"];
cardDisasterGame.chooseLifeTarget("lion");
cardDisasterGame.lifeStageIndex = 2;
assert.equal(cardDisasterGame.triggerChoiceEvent("lion_hyenas"), true);
assert.ok(cardDisasterGame.pendingChoice, "The encounter card is open.");
cardDisasterGame.pressure = 99.9;
cardDisasterGame.lifeStageProgress = 0;
cardDisasterGame.tick(1);
assert.equal(cardDisasterGame.lifeTargetId, null, "The disaster ends the attempt.");
assert.equal(cardDisasterGame.pendingChoice, null, "No stale decision card survives the disaster.");
assert.equal(cardDisasterGame.resolveChoice("roll_retreat"), false, "A stale card cannot be resolved.");

// The collection loop must not leak legacy species-era events: while a no-encounter
// life form grows, advanceEvents may never pop an old choice card (e.g. strange_fossil).
const cleanLoopGame = new EvolutionGame({ fast: true, seed: 8 });
cleanLoopGame.cells = 3;
cleanLoopGame.lifeTargetDraft = ["octopus", "shark"];
cleanLoopGame.chooseLifeTarget("octopus");
cleanLoopGame.lifeStageIndex = 0; // held below octopus's stage-2 encounter
for (let i = 0; i < 100; i += 1) cleanLoopGame.advanceEvents(10);
assert.equal(cleanLoopGame.pendingChoice, null, "No legacy choice card may appear while a life form grows.");
const draftingGame = new EvolutionGame({ fast: true, seed: 81 });
draftingGame.cells = 3;
for (let i = 0; i < 100; i += 1) draftingGame.advanceEvents(10);
assert.equal(draftingGame.pendingChoice, null, "Legacy events cannot block the life-form draft.");
const staleEventSnapshot = draftingGame.exportSnapshot();
staleEventSnapshot.run.pendingChoice = "strange_fossil";
const staleEventRestore = new EvolutionGame({ fast: true, snapshot: staleEventSnapshot });
assert.equal(staleEventRestore.pendingChoice, null, "Restoring a save discards stale legacy event cards.");
staleEventSnapshot.run.runReached = ["bacteria"];
staleEventSnapshot.run.populations = [["bacteria", 4]];
staleEventSnapshot.run.activeLineageId = "bacteria";
staleEventSnapshot.run.awaitingCataclysm = true;
staleEventSnapshot.run.pressure = 100;
const migratedCollectionGame = new EvolutionGame({ fast: true, collectionMode: true, snapshot: staleEventSnapshot });
assert.equal(migratedCollectionGame.awaitingCataclysm, false, "Legacy cataclysms cannot block collection mode.");
assert.equal(migratedCollectionGame.pressure, 0, "Legacy pressure resets between collectible attempts.");
assert.equal(migratedCollectionGame.currentCreature.id, "cell", "Legacy species cannot replace the collection-mode Cell.");
// But the animal's OWN encounter must still fire on schedule.
const ownEncounterGame = new EvolutionGame({ fast: true, seed: 8 });
ownEncounterGame.cells = 3;
ownEncounterGame.lifeTargetDraft = ["fox", "shark"];
ownEncounterGame.chooseLifeTarget("fox");
ownEncounterGame.lifeStageIndex = 2; // fox_winter fires at stage 2
ownEncounterGame.advanceEvents(10);
assert.equal(ownEncounterGame.pendingChoice?.id, "fox_winter", "The animal's own encounter still interrupts its growth.");

const costlyChoiceGame = new EvolutionGame({ fast: true, seed: 3 });
costlyChoiceGame.cells = 1;
costlyChoiceGame.runReached.add("human");
costlyChoiceGame.populations.set("human", 1);
assert.equal(costlyChoiceGame.triggerChoiceEvent("human_car"), true);
assert.equal(costlyChoiceGame.canResolveChoice(costlyChoiceGame.pendingChoice.options[0]), false);
assert.equal(costlyChoiceGame.resolveChoice("safe_streets"), false, "A costly event option cannot be selected for free.");
costlyChoiceGame.energy = 140;
assert.equal(costlyChoiceGame.resolveChoice("safe_streets"), true);
assert.equal(costlyChoiceGame.energy, 0);

const offlineGame = new EvolutionGame({ fast: false, seed: 1 });
offlineGame.cells = 1;
offlineGame.runReached.add("bacteria");
offlineGame.populations.set("bacteria", 1);
offlineGame.pressure = 98;
const offlineResult = offlineGame.advanceOffline(172800);
assert.equal(offlineGame.pressure, 99, "Offline progress must stop before the irreversible finale.");
assert.equal(offlineResult.pausedAtFinale, true);
assert.equal(offlineGame.awaitingCataclysm, false);
while (!offlineGame.awaitingCataclysm) offlineGame.tick(1);
assert.equal(offlineGame.awaitingCataclysm, true, "Active play may advance into the final decision.");

const extinctionGame = new EvolutionGame({ fast: true, seed: 9 });
extinctionGame.cells = 1;
extinctionGame.evolutionEnergy = 1000;
assert.equal(extinctionGame.discoverSpecies("bacteria"), true);
extinctionGame.awaitingCataclysm = true;
extinctionGame.pressure = 100;
const summary = extinctionGame.resolveExtinction();
assert.equal(summary.reached, 1);
assert.ok(extinctionGame.known.has("bacteria"));
assert.ok(extinctionGame.survivorStamps.has("bacteria"));

const preparationGame = new EvolutionGame({ fast: true, seed: 10 });
preparationGame.pressure = 80;
preparationGame.adaptation = 49;
const preparationId = preparationGame.extinction.preparation[0];
assert.equal(preparationGame.selectPreparation(preparationId), false, "Preparation requires its full Adaptation cost.");
preparationGame.adaptation = 50;
assert.equal(preparationGame.selectPreparation(preparationId), true);
assert.equal(preparationGame.adaptation, 0);
assert.equal(preparationGame.selectPreparation(preparationGame.extinction.preparation[1]), false, "Only one preparation may be committed per world.");
extinctionGame.evolutionMemory = 12;
assert.equal(extinctionGame.unlockOriginAnchor("cellular"), true);
assert.equal(extinctionGame.activeOrigin, "cellular");
assert.equal(extinctionGame.startNextWorld(), true);
assert.equal(extinctionGame.cells, 1, "Cellular Origin must skip the manual origin chain.");
assert.ok(extinctionGame.known.has("bacteria"), "The Species Atlas must persist after extinction.");

// A preserved survivor must bridge biome-dependent routes between worlds.
const survivorBridgeGame = new EvolutionGame({ fast: true, seed: 19 });
survivorBridgeGame.known.add("amphibian");
survivorBridgeGame.survivorStamps.set("amphibian", new Set(["asteroid"]));
survivorBridgeGame.fossilSpecies = "amphibian";
survivorBridgeGame.worldEnded = true;
assert.equal(survivorBridgeGame.startNextWorld(), true);
assert.ok(survivorBridgeGame.runReached.has("amphibian"), "The fossil survivor must inhabit the next world.");
assert.equal(survivorBridgeGame.populations.get("amphibian"), 2, "A stamped fossil starts with a stronger founder population.");
assert.equal(survivorBridgeGame.activeLineageId, "amphibian");

extinctionGame.energy = 321;
extinctionGame.adaptation = 123;
const snapshot = extinctionGame.exportSnapshot();
const restoredGame = new EvolutionGame({ fast: true, snapshot });
assert.equal(restoredGame.worldSeed, extinctionGame.worldSeed);
assert.equal(restoredGame.energy, 321);
assert.equal(restoredGame.adaptation, 123);
assert.deepEqual([...restoredGame.known], [...extinctionGame.known]);
assert.deepEqual(restoredGame.worldBiomes.map(item => item.id), extinctionGame.worldBiomes.map(item => item.id));

// Regression: unlocking the Cellular Origin mid-run must not disable the current run's origin chain.
const midRunGame = new EvolutionGame({ fast: true, seed: 11 });
midRunGame.evolutionMemory = 12;
midRunGame.energy = 100;
assert.equal(midRunGame.unlockOriginAnchor("cellular"), true);
assert.equal(midRunGame.activeOrigin, "cellular", "The anchor selection applies to the next world.");
assert.equal(midRunGame.runOrigin, "atomic", "The world already in progress keeps its atomic origin.");
assert.equal(midRunGame.createAtom(), true, "Manual origin actions must keep working mid-run.");
midRunGame.cells = 1;
midRunGame.evolutionEnergy = 1000;
assert.equal(midRunGame.discoverSpecies("bacteria"), true);
midRunGame.awaitingCataclysm = true;
midRunGame.resolveExtinction();
midRunGame.startNextWorld();
assert.equal(midRunGame.runOrigin, "cellular", "The next world begins from the Cellular Origin.");
assert.equal(midRunGame.cells, 1);

// Genome upgrades: a permanent DNA sink with real production effects.
const genomeGame = new EvolutionGame({ fast: false, seed: 21 });
const baseProduction = genomeGame.productionRate;
genomeGame.dna = 3;
assert.equal(genomeGame.buyGenomeUpgrade("production"), false, "Insufficient DNA must be rejected.");
genomeGame.dna = genomeUpgradeCost(0);
assert.equal(genomeGame.buyGenomeUpgrade("production"), true);
assert.equal(genomeGame.dna, 0);
assert.equal(genomeGame.genome.production, 1);
assert.ok(Math.abs(genomeGame.productionRate - baseProduction * 1.1) < 1e-9, "Metabolic Genome must raise production by 10%.");
genomeGame.dna = 10000;
for (let level = genomeGame.genome.survival; level < GENOME_UPGRADES.survival.maxLevel; level += 1) {
  assert.equal(genomeGame.buyGenomeUpgrade("survival"), true);
}
assert.equal(genomeGame.buyGenomeUpgrade("survival"), false, "Upgrades must respect their level cap.");
genomeGame.worldEnded = true;
genomeGame.dna = 100;
assert.equal(genomeGame.buyGenomeUpgrade("adaptation"), true, "The Genome Lab must work in the extinction summary.");

// Evolution Memory remains useful after the Cellular checkpoint.
const memoryGame = new EvolutionGame({ fast: false, seed: 22 });
const memoryBaseProduction = memoryGame.productionRate;
memoryGame.evolutionMemory = memoryUpgradeCost("synthesis", 0);
assert.equal(memoryGame.buyMemoryUpgrade("synthesis"), true);
assert.equal(memoryGame.memoryUpgrades.synthesis, 1);
assert.ok(memoryGame.productionRate > memoryBaseProduction);
memoryGame.evolutionMemory = 10000;
for (let level = 0; level < MEMORY_UPGRADES.nursery.maxLevel; level += 1) assert.equal(memoryGame.buyMemoryUpgrade("nursery"), true);
assert.equal(memoryGame.buyMemoryUpgrade("nursery"), false);
const memorySnapshot = memoryGame.exportSnapshot();
const memoryRestored = new EvolutionGame({ snapshot: memorySnapshot });
assert.deepEqual(memoryRestored.memoryUpgrades, memoryGame.memoryUpgrades);

// Mutation Point sinks: reveal the hidden condition and vent pressure.
const mutationGame = new EvolutionGame({ fast: true, seed: 31 });
mutationGame.cells = 1;
mutationGame.evolutionEnergy = 1000;
mutationGame.discoverSpecies("bacteria");
assert.equal(mutationGame.revealHiddenCondition(), false, "Reveal requires a Mutation Point.");
mutationGame.mutationPoints = 3;
assert.equal(mutationGame.revealHiddenCondition(), true);
assert.equal(mutationGame.revealedHiddenModifier, true);
assert.equal(mutationGame.mutationPoints, 2);
assert.equal(mutationGame.revealHiddenCondition(), false, "Reveal cannot be purchased twice.");
mutationGame.pressure = 40;
assert.equal(mutationGame.ventPressure(), true);
assert.equal(mutationGame.pressure, 25);
assert.equal(mutationGame.mutationPoints, 0);
assert.equal(mutationGame.ventPressure(), false, "Venting requires two Mutation Points.");
mutationGame.mutationPoints = mutationUpgradeCost("radiation", 0);
const mutationRate = mutationGame.evolutionRate;
assert.equal(mutationGame.buyMutationUpgrade("radiation"), true);
assert.ok(mutationGame.evolutionRate > mutationRate, "Adaptive Radiation permanently accelerates evolution.");
mutationGame.mutationPoints = 1000;
for (let level = 0; level < MUTATION_UPGRADES.homeostasis.maxLevel; level += 1) assert.equal(mutationGame.buyMutationUpgrade("homeostasis"), true);
assert.equal(mutationGame.buyMutationUpgrade("homeostasis"), false);

// Survivor weighting: survivors are always a subset of the reached species.
const survivorGame = new EvolutionGame({ fast: true, seed: 41 });
survivorGame.cells = 1;
survivorGame.evolutionEnergy = 100000;
["bacteria", "archaea", "protist", "green_algae", "choanoflagellate", "sponge"].forEach(id => survivorGame.discoverSpecies(id));
survivorGame.awaitingCataclysm = true;
const survivorSummary = survivorGame.resolveExtinction();
assert.ok(survivorSummary.survivors.every(id => survivorGame.known.has(id)));
assert.ok(new Set(survivorSummary.survivors).size === survivorSummary.survivors.length, "Survivors must be unique.");

// Genome state must survive a snapshot round trip.
const persistedSnapshot = genomeGame.exportSnapshot();
assert.equal(persistedSnapshot.version, 9);
const persistedGame = new EvolutionGame({ fast: false, snapshot: persistedSnapshot });
assert.equal(persistedGame.genome.production, 1);
assert.equal(persistedGame.genome.survival, GENOME_UPGRADES.survival.maxLevel);
assert.equal(persistedGame.genome.adaptation, 1);
assert.equal(persistedGame.runOrigin, genomeGame.runOrigin);

// Old version-2 snapshots (no genome, no runOrigin) must still restore.
const legacySnapshot = JSON.parse(JSON.stringify(persistedSnapshot));
legacySnapshot.version = 2;
delete legacySnapshot.genome;
delete legacySnapshot.run.runOrigin;
const legacyGame = new EvolutionGame({ fast: false, snapshot: legacySnapshot });
assert.deepEqual(legacyGame.genome, { production: 0, adaptation: 0, survival: 0 });
assert.ok(legacyGame.runOrigin === "atomic" || legacyGame.runOrigin === "cellular");

// Malformed imported collection fields recover instead of bricking startup.
const malformedSnapshot = JSON.parse(JSON.stringify(persistedSnapshot));
malformedSnapshot.known = {};
malformedSnapshot.survivorStamps = "broken";
malformedSnapshot.evolutionMemory = -20;
malformedSnapshot.dna = Infinity;
malformedSnapshot.genome = { production: 999, adaptation: -2, survival: "broken" };
malformedSnapshot.mutationGenome = { radiation: 999, homeostasis: -2, curiosity: "broken" };
malformedSnapshot.eventPity = { valid: 2, invalid: NaN };
malformedSnapshot.leaderboard = [{ score: Infinity }, "broken"];
malformedSnapshot.run.runReached = ["bacteria"];
malformedSnapshot.run.populations = [["bacteria", -5], ["unknown", 4]];
malformedSnapshot.run.visibleModifiers = "broken";
malformedSnapshot.run.energy = "broken";
malformedSnapshot.run.pressure = Infinity;
malformedSnapshot.run.worldAgeSeconds = -30;
malformedSnapshot.run.eventCooldowns = { valid: 4, invalid: "soon" };
malformedSnapshot.run.actionCooldowns = { valid: 3, invalid: -4 };
malformedSnapshot.run.biomeState = [["cell", { plantCapacity: Infinity, plantStock: -5, detritus: "broken", fertility: 2, regen: 0, stress: 8 }]];
const recoveredMalformedGame = new EvolutionGame({ fast: false, snapshot: malformedSnapshot });
assert.ok(recoveredMalformedGame.visibleModifiers.length > 0);
assert.ok(recoveredMalformedGame.biomeState instanceof Map);
assert.ok(recoveredMalformedGame.populations instanceof Map);
assert.equal(recoveredMalformedGame.populations.size, 0);
assert.equal(recoveredMalformedGame.energy, 0);
assert.equal(recoveredMalformedGame.pressure, 0);
assert.equal(recoveredMalformedGame.worldAgeSeconds, 0);
assert.equal(recoveredMalformedGame.evolutionMemory, 0);
assert.equal(recoveredMalformedGame.dna, 0);
assert.deepEqual(recoveredMalformedGame.genome, { production: 10, adaptation: 0, survival: 0 });
assert.deepEqual(recoveredMalformedGame.mutationGenome, { radiation: 5, homeostasis: 0, curiosity: 0 });
assert.deepEqual(recoveredMalformedGame.eventCooldowns, { valid: 4 });
assert.deepEqual(recoveredMalformedGame.actionCooldowns, { valid: 3 });
assert.equal(recoveredMalformedGame.biomeState.get("cell").stress, 1);
assert.ok(Number.isFinite(recoveredMalformedGame.biomeState.get("cell").plantCapacity));

// Current creature: reflects the most-advanced living species, else the origin chain.
const stageGame = new EvolutionGame({ fast: true, seed: 51 });
assert.equal(stageGame.currentCreature.kind, "origin");
assert.equal(stageGame.currentCreature.id, "atom", "An empty world shows the atom.");
stageGame.cells = 1;
assert.equal(stageGame.currentCreature.id, "cell", "A catalyzed cell becomes the stage creature.");
stageGame.evolutionEnergy = 100000;
stageGame.discoverSpecies("bacteria");
assert.equal(stageGame.currentCreature.kind, "species");
assert.equal(stageGame.currentCreature.id, "bacteria");
stageGame.worldBiomes = [...BIOMES];
["protist", "choanoflagellate", "sponge", "jawless_fish", "fish"].forEach(id => stageGame.discoverSpecies(id));
assert.equal(stageGame.currentCreature.id, "fish", "The most-advanced species is shown.");
stageGame.populations.clear();
stageGame.reconcileActiveSpecies();
assert.equal(stageGame.currentCreature.id, "cell", "Locally extinct species cannot remain on the stage.");
stageGame.adaptation = 100;
assert.equal(stageGame.protectSpecies("fish"), false, "Protection cannot resurrect a locally extinct species.");
stageGame.populations.set("fish", 1);
stageGame.activeLineageId = "fish";
assert.ok(["swimmer", "flyer", "walker", "crawler", "flora", "particle", "earlyFish", "amphibian", "smallReptile", "basalMammal", "canid"].includes(stageGame.currentCreature.archetype));
assert.ok(creatureForSpecies(SPECIES_BY_ID.bird).archetype === "flyer", "Birds fly on the stage.");
assert.ok(creatureForSpecies(SPECIES_BY_ID.whale).motion === "swim", "Whales swim on the stage.");
assert.ok(creatureForSpecies(SPECIES_BY_ID.shark).features.dorsal === true, "Sharks get a dorsal fin.");
assert.ok(creatureForSpecies(SPECIES_BY_ID.human).features.upright === true, "Humans stand upright.");
assert.equal(creatureForSpecies(SPECIES_BY_ID.fish).archetype, "earlyFish");
assert.equal(creatureForSpecies(SPECIES_BY_ID.amphibian).archetype, "amphibian");
assert.equal(creatureForSpecies(SPECIES_BY_ID.reptile).archetype, "smallReptile");
assert.equal(creatureForSpecies(SPECIES_BY_ID.mammal).archetype, "basalMammal");
assert.equal(creatureForSpecies(SPECIES_BY_ID.wolf).archetype, "canid");
assert.equal(creatureForSpecies(SPECIES_BY_ID.fish).features.lineageAccent, creatureForSpecies(SPECIES_BY_ID.amphibian).features.lineageAccent, "Fish and Amphibian retain the same lineage stripe.");
for (const id of ["fish", "amphibian", "reptile", "mammal", "wolf"]) {
  assert.ok(creatureForSpecies(SPECIES_BY_ID[id]).features.lineageAccent, `${id} must retain a visible ancestry accent.`);
}
assert.equal(new Set(["fish", "amphibian", "reptile", "mammal", "wolf"].map(id => creatureForSpecies(SPECIES_BY_ID[id]).archetype)).size, 5, "Each major transition needs its own readable body plan.");
stageGame.runReached.delete("fish");
stageGame.populations.delete("fish");
stageGame.populations.set("jawless_fish", 1);
stageGame.evolutionEnergy = 100000;
const firstRediscoveryCost = stageGame.speciesEvolutionCost("fish");
const unknownFishCost = new EvolutionGame({ fast: false, seed: 59 }).speciesEvolutionCost("fish");
assert.ok(firstRediscoveryCost < unknownFishCost, "Known species rebuild for less Evolution Energy.");
assert.equal(stageGame.discoverSpecies("fish"), true, "A known species can be rediscovered in a later run.");
assert.equal(stageGame.mastery.get("fish"), 1);
assert.ok(stageGame.dna >= 1, "Meaningful rediscovery awards a DNA Fragment.");
assert.ok(stageGame.speciesEvolutionCost("fish") < firstRediscoveryCost, "Mastery further discounts future rediscovery.");
assert.ok(sceneForBiome("ocean", 1).name === "Ocean");
assert.equal(sceneForBiome("ocean", 12).name, "Ocean", "Collectible habitats must not turn into space because of an old world counter.");

// Space Age: the tree now goes past Human into a UFO-flying alien, with the
// backdrop driven by the apex creature's era rather than just the biome.
const voyager = creatureForSpecies(SPECIES_BY_ID.star_voyager);
assert.equal(voyager.archetype, "ufo", "The Star Voyager flies a UFO.");
assert.equal(voyager.era, "space");
assert.equal(sceneForBiome("forest", 1, "space").name, "Deep Space", "Space-age creatures pull the world into space.");
assert.equal(sceneForBiome("forest", 1, "city").name, "Civilization", "Civilization gets its own skyline scene.");

// Achievements unlock once and fire a callback.
const unlocked = [];
const achGame = new EvolutionGame({ fast: true, seed: 61, onAchievement: a => unlocked.push(a.id) });
assert.equal(achGame.unlockedAchievements.size, 0);
achGame.cells = 1;
achGame.changed();
assert.ok(achGame.unlockedAchievements.has("first_spark"), "Catalyzing a cell unlocks First Spark.");
assert.ok(unlocked.includes("first_spark"), "onAchievement fires for new unlocks.");
const countBefore = unlocked.length;
achGame.changed();
assert.equal(unlocked.length, countBefore, "Achievements never fire twice.");
achGame.evolutionEnergy = 100000;
achGame.discoverSpecies("bacteria");
assert.ok(achGame.unlockedAchievements.has("it_lives"));

// Collection achievements: the milestones the reshaped loop actually produces.
const collectAchGame = new EvolutionGame({ fast: true, seed: 3 });
const collected = [];
collectAchGame.onAchievement = a => collected.push(a.id);
function collectLifeForm(game, id) {
  game.cells = 3; // a fresh attempt always begins from the cell goal
  game.lifeTargetDraft = [id, id === "lion" ? "fox" : "lion"];
  assert.equal(game.chooseLifeTarget(id), true, `must be able to choose ${id}`);
  for (let stage = 0; stage < 5; stage += 1) {
    game.lifeStageProgress = game.lifeStageCost;
    game.advanceLifeStage(0);
  }
  game.changed();
}
collectLifeForm(collectAchGame, "frog");
assert.ok(collectAchGame.unlockedAchievements.has("first_life"), "Collecting one life form unlocks First Life Form.");
// frog/wolf/shark/eagle/camel/goat span wetland, forest, ocean, sky, desert, mountain (6 worlds).
for (const id of ["wolf", "shark", "eagle", "camel", "mountain_goat"]) collectLifeForm(collectAchGame, id);
assert.equal(collectAchGame.lifeCollection.size, 6);
assert.ok(collectAchGame.unlockedAchievements.has("menagerie"), "Five collected life forms unlocks Menagerie.");
assert.ok(collectAchGame.unlockedAchievements.has("globetrotter"), "Collecting across six worlds unlocks Globetrotter.");
assert.ok(collected.includes("first_life") && collected.includes("menagerie"), "Collection achievements fire their callback.");
assert.ok(collectAchGame.unlockedAchievements.has("first_legend"), "Collecting a Legendary (shark) unlocks Legend In The Making.");

// Leaderboard records a scored run on extinction and keeps the best entries.
const boardGame = new EvolutionGame({ fast: true, seed: 71 });
boardGame.cells = 1;
boardGame.evolutionEnergy = 100000;
boardGame.worldBiomes = [...BIOMES];
["bacteria", "protist", "choanoflagellate", "sponge"].forEach(id => boardGame.discoverSpecies(id));
assert.equal(boardGame.runReached.size, 4);
boardGame.awaitingCataclysm = true;
const boardSummary = boardGame.resolveExtinction();
assert.ok(boardSummary.score > 0, "Extinction produces a leaderboard score.");
assert.equal(boardGame.leaderboard.length, 1);
assert.equal(boardGame.leaderboard[0].species, 4);
assert.equal(boardGame.bestScore, boardSummary.score);

// New meta fields survive a snapshot round trip.
const metaSnapshot = boardGame.exportSnapshot();
const metaRestored = new EvolutionGame({ fast: true, snapshot: metaSnapshot });
assert.equal(metaRestored.leaderboard.length, 1);
assert.equal(metaRestored.bestScore, boardGame.bestScore);
assert.deepEqual([...metaRestored.unlockedAchievements].sort(), [...boardGame.unlockedAchievements].sort());
assert.equal(metaRestored.worldEnded, true);
assert.ok(metaRestored.completedRunSummary, "A finished world must restore its extinction summary.");
assert.equal(metaRestored.completedRunSummary.score, boardSummary.score);
assert.deepEqual(metaRestored.completedRunSummary.survivors, boardSummary.survivors);
assert.equal(metaRestored.startNextWorld(), true, "A restored summary must still advance to the next world.");

// Catastrophe confirmation is a real pause: no resource, ecology, event, or
// intervention action can continue changing the finished simulation.
const pausedGame = new EvolutionGame({ fast: true, seed: 72 });
pausedGame.cells = 3;
pausedGame.runReached.add("bacteria");
pausedGame.known.add("bacteria");
pausedGame.populations.set("bacteria", 3);
pausedGame.activeLineageId = "bacteria";
pausedGame.energy = 1000;
pausedGame.adaptation = 1000;
pausedGame.mutationPoints = 10;
pausedGame.pressure = 100;
pausedGame.awaitingCataclysm = true;
const pausedState = {
  energy: pausedGame.energy,
  adaptation: pausedGame.adaptation,
  evolutionEnergy: pausedGame.evolutionEnergy,
  population: pausedGame.populations.get("bacteria"),
  age: pausedGame.worldAgeSeconds
};
pausedGame.tick(1);
assert.deepEqual({
  energy: pausedGame.energy,
  adaptation: pausedGame.adaptation,
  evolutionEnergy: pausedGame.evolutionEnergy,
  population: pausedGame.populations.get("bacteria"),
  age: pausedGame.worldAgeSeconds
}, pausedState);
assert.equal(pausedGame.generateEnergy(), false);
assert.equal(pausedGame.growPopulation("bacteria"), false);
assert.equal(pausedGame.boostPlants(), false);
assert.equal(pausedGame.protectSpecies("bacteria"), false);
assert.equal(pausedGame.stabiliseClimate(), false);
assert.equal(pausedGame.revealHiddenCondition(), false);
assert.equal(pausedGame.triggerChoiceEvent(), false);

// Current-world fossil choices cannot leak in from an older extinction.
const staleFossilGame = new EvolutionGame({ fast: true, seed: 73 });
staleFossilGame.known.add("fish");
staleFossilGame.fossilSpecies = "fish";
staleFossilGame.cells = 1;
staleFossilGame.runReached.add("bacteria");
staleFossilGame.populations.set("bacteria", 2);
staleFossilGame.awaitingCataclysm = true;
staleFossilGame.resolveExtinction();
assert.equal(staleFossilGame.fossilSpecies, null);

// Contradictory and partial save state is normalized into a playable world.
const contradictorySnapshot = boardGame.exportSnapshot();
contradictorySnapshot.run.worldEnded = true;
contradictorySnapshot.run.awaitingCataclysm = true;
contradictorySnapshot.run.pendingChoice = "fish_eaten";
delete contradictorySnapshot.run.completedRunSummary;
contradictorySnapshot.run.visibleModifiers = [WORLD_MODIFIERS[0].id, WORLD_MODIFIERS[0].id];
contradictorySnapshot.run.worldBiomes = [BIOMES[0].id, BIOMES[0].id];
contradictorySnapshot.run.biomeState = [["cell", { plantCapacity: 10, plantStock: 5, detritus: 0, fertility: 0, regen: 1, stress: 0 }]];
contradictorySnapshot.known = [];
contradictorySnapshot.run.runReached = ["bacteria"];
contradictorySnapshot.run.runNew = ["bacteria", "fish"];
const contradictoryGame = new EvolutionGame({ fast: true, snapshot: contradictorySnapshot });
assert.equal(contradictoryGame.awaitingCataclysm, false);
assert.equal(contradictoryGame.pendingChoice, null);
assert.ok(contradictoryGame.completedRunSummary, "Old completed saves receive a recovery summary.");
assert.equal(new Set(contradictoryGame.visibleModifiers.map(item => item.id)).size, contradictoryGame.visibleModifiers.length);
assert.equal(new Set(contradictoryGame.worldBiomes.map(item => item.id)).size, contradictoryGame.worldBiomes.length);
assert.ok(contradictoryGame.known.has("bacteria"));
assert.deepEqual([...contradictoryGame.runNew], ["bacteria"]);
for (const biome of contradictoryGame.worldBiomes) assert.ok(contradictoryGame.biomeState.has(biome.id));

const brinkSnapshot = boardGame.exportSnapshot();
brinkSnapshot.run.worldEnded = false;
brinkSnapshot.run.awaitingCataclysm = true;
brinkSnapshot.run.pressure = 20;
const brinkGame = new EvolutionGame({ fast: true, snapshot: brinkSnapshot });
assert.equal(brinkGame.pressure, 100, "An awaiting catastrophe always restores at 100% risk.");

// Auto-assembling origins keep converting ordinary Energy while the separate
// evolution meter charges toward the next species choice.
const autoGame = new EvolutionGame({ fast: false, seed: 81 });
assert.equal(autoGame.cells, 0);
assert.equal(autoGame.assemblingOrigins, true, "A fresh atomic world is still assembling.");
autoGame.energy = 5000;
for (let i = 0; i < 30; i += 1) autoGame.tick(0.2);
assert.ok(autoGame.cells >= 3, "Origins auto-build to at least the cell goal.");
assert.ok(autoGame.establishedOrigins.atoms >= autoGame.establishedOrigins.molecules, "Background chemistry preserves a valid foundation hierarchy.");
assert.equal(autoGame.assemblingOrigins, false, "Once cells exist, directed evolution takes over.");
const chargedEvolution = autoGame.evolutionEnergy;
for (let i = 0; i < 10; i += 1) autoGame.tick(0.2);
assert.ok(autoGame.evolutionEnergy > chargedEvolution, "The evolution meter charges independently from origin chemistry.");
assert.ok(autoGame.cells > 3, "Origin chemistry continues producing cells after life is established.");

// Directed evolution: Energy checkpoints expose one frontier choice at a time,
// and the chosen species becomes the saved active lineage.
const progressionGame = new EvolutionGame({ fast: false, seed: 91 });
progressionGame.cells = 3;
assert.equal(progressionGame.speciesEvolutionCost("bacteria"), 90, "The first directed evolution takes about 90 seconds at the base rate.");
assert.ok(progressionGame.speciesEvolutionCost("protist") > progressionGame.speciesEvolutionCost("bacteria") * 4, "Later stages are spaced substantially farther apart.");
assert.ok(progressionGame.speciesEvolutionCost("choanoflagellate") > progressionGame.speciesEvolutionCost("protist"), "Evolution spacing keeps increasing with lineage depth.");
progressionGame.evolutionEnergy = 89;
assert.equal(progressionGame.evolutionChoices().some(choice => choice.state === "available"), false);
progressionGame.evolutionEnergy = 90;
assert.equal(progressionGame.evolutionChoices()[0].definition.id, "bacteria");
assert.equal(progressionGame.discoverSpecies("bacteria"), true);
assert.equal(progressionGame.activeLineageId, "bacteria");
const progressionSnapshot = progressionGame.exportSnapshot();
const progressionRestored = new EvolutionGame({ snapshot: progressionSnapshot });
assert.equal(progressionRestored.activeLineageId, "bacteria");
assert.equal(progressionRestored.currentCreature.id, "bacteria");

const pacingGame = new EvolutionGame({ fast: false, seed: 911 });
pacingGame.cells = 3;
const firstEta = pacingGame.speciesEvolutionCost("bacteria") / pacingGame.evolutionRate;
pacingGame.runReached.add("bacteria");
pacingGame.populations.set("bacteria", 1);
pacingGame.activeLineageId = "bacteria";
const secondEta = pacingGame.speciesEvolutionCost("protist") / pacingGame.evolutionRate;
pacingGame.runReached.add("protist");
pacingGame.populations.set("protist", 1);
pacingGame.activeLineageId = "protist";
const thirdEta = pacingGame.speciesEvolutionCost("choanoflagellate") / pacingGame.evolutionRate;
assert.ok(firstEta >= 60 && firstEta <= 120, "Stage one should take roughly one to two minutes.");
assert.ok(secondEta >= 180 && secondEta <= 260, "Stage two should take roughly three to four minutes.");
assert.ok(thirdEta >= 285 && thirdEta <= 390, "Stage three should take roughly five minutes or more.");

// Origin chemistry and evolution charging advance independently.
const fluxGame = new EvolutionGame({ fast: false, seed: 92 });
fluxGame.cells = 3;
fluxGame.energy = 100;
for (let i = 0; i < 5; i += 1) fluxGame.tick(0.2);
assert.ok(fluxGame.cells > 3 || fluxGame.atoms > 0 || fluxGame.molecules > 0 || fluxGame.organics > 0);
assert.ok(fluxGame.evolutionEnergy > 0, "Evolution charging must continue independently from origin chemistry.");

// World Goals give each run short-term purpose, pay exactly once, persist, and
// reset for the next world without erasing the resources they awarded.
const objectiveGame = new EvolutionGame({ fast: false, seed: 921 });
objectiveGame.cells = 3;
objectiveGame.changed();
assert.ok(objectiveGame.completedObjectives.has("progress"));
assert.equal(objectiveGame.energy, 150);
objectiveGame.changed();
assert.equal(objectiveGame.energy, 150, "Completed goals cannot pay twice.");
for (const id of ["bacteria", "archaea", "protist"]) {
  objectiveGame.runReached.add(id);
  objectiveGame.known.add(id);
  objectiveGame.populations.set(id, 2);
}
objectiveGame.changed();
assert.ok(objectiveGame.completedObjectives.has("diversity"));
assert.equal(objectiveGame.adaptation, 80);
objectiveGame.updateWorldObjectiveProgress(20);
objectiveGame.changed();
assert.ok(objectiveGame.completedObjectives.has("balance"));
assert.equal(objectiveGame.discoveryKnowledge, 1);
assert.equal(objectiveGame.objectiveProgress.completed, 3);
assert.ok(objectiveGame.currentScore >= 450, "Completed goals contribute to the run score.");
const objectiveSnapshot = objectiveGame.exportSnapshot();
const objectiveRestored = new EvolutionGame({ snapshot: objectiveSnapshot });
assert.deepEqual([...objectiveRestored.completedObjectives].sort(), ["balance", "diversity", "progress"]);
assert.equal(objectiveRestored.discoveryKnowledge, 1);
objectiveRestored.changed();
assert.equal(objectiveRestored.discoveryKnowledge, 1, "Reloading cannot replay goal rewards.");
objectiveRestored.awaitingCataclysm = true;
objectiveRestored.resolveExtinction();
objectiveRestored.startNextWorld();
assert.equal(objectiveRestored.completedObjectives.size, 0);
assert.equal(objectiveRestored.objectiveBalanceSeconds, 0);

// Lineages charge at distinct rates, and legacy saves migrate their banked
// Energy into the new evolution meter without exceeding the next checkpoint.
const rateGame = new EvolutionGame({ fast: false, seed: 93 });
rateGame.cells = 3;
rateGame.runReached.add("bacteria");
rateGame.populations.set("bacteria", 1);
rateGame.activeLineageId = "bacteria";
const bacteriaRate = rateGame.evolutionRate;
rateGame.runReached.add("shark");
rateGame.populations.set("shark", 1);
rateGame.activeLineageId = "shark";
assert.notEqual(rateGame.evolutionRate, bacteriaRate, "Different lineages must charge evolution at different rates.");
const legacyEvolutionSnapshot = rateGame.exportSnapshot();
legacyEvolutionSnapshot.version = 5;
legacyEvolutionSnapshot.run.energy = 80;
delete legacyEvolutionSnapshot.run.evolutionEnergy;
const migratedEvolutionGame = new EvolutionGame({ snapshot: legacyEvolutionSnapshot });
assert.ok(Number.isFinite(migratedEvolutionGame.evolutionEnergy));
assert.ok(migratedEvolutionGame.evolutionEnergy <= migratedEvolutionGame.nextEvolutionCheckpoint);

// Reached species can be selected as the active creature, and growing a single
// dominant population lowers Karma and accelerates extinction pressure.
const selectionGame = new EvolutionGame({ fast: false, seed: 94 });
selectionGame.cells = 3;
assert.deepEqual(selectionGame.establishedOrigins, { atoms: 81, molecules: 27, organics: 9, cells: 3 });
for (const id of ["bacteria", "protist", "choanoflagellate"]) {
  selectionGame.runReached.add(id);
  selectionGame.populations.set(id, 2);
}
selectionGame.activeLineageId = "bacteria";
assert.equal(selectionGame.setActiveSpecies("choanoflagellate"), true);
assert.equal(selectionGame.currentCreature.id, "choanoflagellate");
assert.equal(selectionGame.populationGrowthCost("choanoflagellate"), 70);
selectionGame.energy = 170;
selectionGame.autoBuildOrigins();
assert.ok(selectionGame.energy >= 70, "origin automation reserves enough Energy for the active population");
selectionGame.energy = 70;
assert.equal(selectionGame.growPopulation("choanoflagellate"), true);
assert.equal(selectionGame.populations.get("choanoflagellate"), 3);

const forgivingEcologyGame = new EvolutionGame({ fast: false, seed: 940 });
forgivingEcologyGame.cells = 3;
forgivingEcologyGame.runReached.add("bacteria");
forgivingEcologyGame.known.add("bacteria");
forgivingEcologyGame.populations.set("bacteria", 10);
forgivingEcologyGame.activeLineageId = "bacteria";
forgivingEcologyGame.biomeState.set("cell", { plantCapacity: 0, plantStock: 0, detritus: 0, fertility: 0, regen: 0.0001, stress: 1 });
for (let i = 0; i < 5; i += 1) forgivingEcologyGame.tick(1);
assert.ok(forgivingEcologyGame.populations.get("bacteria") > 5, "Even a starving population should leave an idle player time to intervene.");

// Local extinction separates a discovered lineage from a living population.
selectionGame.populations.delete("choanoflagellate");
selectionGame.reconcileActiveSpecies();
assert.equal(selectionGame.activeLineageId, "protist");
assert.equal(selectionGame.setActiveSpecies("choanoflagellate"), false);
assert.equal(selectionGame.growPopulation("choanoflagellate"), false);
selectionGame.energy = selectionGame.populationGrowthCost("choanoflagellate");
assert.equal(selectionGame.introduceSpecies("choanoflagellate"), true);
assert.equal(selectionGame.populations.get("choanoflagellate"), 3);

// Per-world infrastructure spends Energy on meaningful growth and balance
// tools, persists with the active run, and resets naturally next world.
const infrastructureGame = new EvolutionGame({ fast: false, seed: 942 });
infrastructureGame.runReached.add("bacteria");
infrastructureGame.runReached.add("protist");
infrastructureGame.known.add("bacteria");
infrastructureGame.known.add("protist");
infrastructureGame.populations.set("bacteria", 15);
infrastructureGame.populations.set("protist", 2);
infrastructureGame.activeLineageId = "bacteria";
infrastructureGame.energy = 10000;
const growthCostBeforeNursery = infrastructureGame.populationGrowthCost("bacteria");
assert.equal(infrastructureGame.buyWorldFeature("nursery"), true);
assert.ok(infrastructureGame.populationGrowthCost("bacteria") < growthCostBeforeNursery);
const plantCapacityBeforeHabitat = infrastructureGame.biomeState.get("cell").plantCapacity;
assert.equal(infrastructureGame.buyWorldFeature("habitat"), true);
assert.ok(infrastructureGame.biomeState.get("cell").plantCapacity > plantCapacityBeforeHabitat);
assert.equal(infrastructureGame.buyWorldFeature("stewardship"), true);
const balanceTarget = infrastructureGame.populationBalanceTarget("bacteria");
const balanceDistanceBefore = Math.abs(infrastructureGame.populations.get("bacteria") - balanceTarget);
assert.equal(infrastructureGame.balancePopulation("bacteria"), true);
assert.ok(Math.abs(infrastructureGame.populations.get("bacteria") - balanceTarget) < balanceDistanceBefore);
const infrastructureRestored = new EvolutionGame({ snapshot: infrastructureGame.exportSnapshot() });
assert.deepEqual(infrastructureRestored.worldFeatures, infrastructureGame.worldFeatures);
infrastructureGame.worldEnded = true;
infrastructureGame.startNextWorld();
assert.deepEqual(infrastructureGame.worldFeatures, { nursery: 0, habitat: 0, stewardship: 0 });

// Extinct parents cannot produce descendants until their population returns.
const extinctParentGame = new EvolutionGame({ fast: false, seed: 941 });
extinctParentGame.cells = 3;
extinctParentGame.evolutionEnergy = 1000;
extinctParentGame.runReached.add("lungfish");
extinctParentGame.known.add("lungfish");
extinctParentGame.populations.set("lungfish", 1);
extinctParentGame.worldBiomes = [...BIOMES];
assert.notEqual(extinctParentGame.speciesStatus("amphibian").state, "hidden");
extinctParentGame.populations.delete("lungfish");
assert.ok(extinctParentGame.speciesStatus("amphibian").reasons.includes("Restore Lungfish population"));
assert.equal(extinctParentGame.ecosystemKarma, 0);
assert.equal(extinctParentGame.ecosystemHealth, 0);

const balancedRiskGame = new EvolutionGame({ fast: false, seed: 95 });
const unbalancedRiskGame = new EvolutionGame({ fast: false, seed: 95 });
for (const game of [balancedRiskGame, unbalancedRiskGame]) {
  game.cells = 3;
  for (const id of ["bacteria", "protist", "choanoflagellate"]) game.runReached.add(id);
}
balancedRiskGame.populations = new Map([["bacteria", 5], ["protist", 5], ["choanoflagellate", 5]]);
unbalancedRiskGame.populations = new Map([["bacteria", 13], ["protist", 1], ["choanoflagellate", 1]]);
assert.ok(balancedRiskGame.ecosystemKarma > unbalancedRiskGame.ecosystemKarma);
balancedRiskGame.tick(1);
unbalancedRiskGame.tick(1);
assert.ok(unbalancedRiskGame.pressure > balancedRiskGame.pressure, "Low Karma must accelerate extinction risk.");

assert.ok(ACHIEVEMENTS.length >= 12, "The collection needs a meaningful set of achievements.");

console.log("Long-term progression milestone passed: 41 routes, ten-world era gates, deterministic worlds, events, offline pause, six extinctions, mastery, checkpoints, persistent labs, origin-run isolation, stage creatures, achievements, and leaderboard.");
