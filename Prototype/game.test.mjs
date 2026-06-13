import assert from "node:assert/strict";
import { ACHIEVEMENTS, BIOMES, GENOME_UPGRADES, SPECIES, SPECIES_BY_ID, WORLD_MODIFIERS, EvolutionGame, genomeUpgradeCost } from "./game.js";
import { creatureForSpecies, sceneForBiome } from "./creatures.js";

assert.equal(SPECIES.length, 33, "The milestone must contain exactly 33 named species.");
assert.ok(SPECIES_BY_ID.whale.requires.includes("mammal"), "Whale must descend from Mammal.");
assert.ok(!SPECIES_BY_ID.whale.requires.includes("shark"), "Whale must not descend from Fish predators.");
assert.ok(SPECIES_BY_ID.whale.albums.includes("ocean"));
assert.ok(SPECIES_BY_ID.shark.albums.includes("predators"));

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

const routeGame = new EvolutionGame({ fast: true, seed: 5 });
routeGame.cells = 1;
routeGame.evolutionEnergy = 100000;
routeGame.worldBiomes = [...BIOMES];
routeGame.visibleModifiers = WORLD_MODIFIERS.slice(0, -1);
routeGame.hiddenModifier = WORLD_MODIFIERS.at(-1);
routeGame.stories.add("fish_escaped");
routeGame.discoveryKnowledge = 10;
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
assert.equal(eventGame.triggerChoiceEvent("fish_eaten"), false, "Choice cooldown must prevent immediate repetition.");

eventGame.eventPity.strange_fossil = 4;
eventGame.eventCooldowns = {};
assert.equal(eventGame.triggerChoiceEvent(), true);
assert.equal(eventGame.pendingChoice.id, "strange_fossil", "Pity must select an overdue rare event.");

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
assert.equal(survivorBridgeGame.populations.get("amphibian"), 1);
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

// Survivor weighting: survivors are always a subset of the reached species.
const survivorGame = new EvolutionGame({ fast: true, seed: 41 });
survivorGame.cells = 1;
survivorGame.evolutionEnergy = 100000;
["bacteria", "archaea", "protist", "green_algae", "sponge"].forEach(id => survivorGame.discoverSpecies(id));
survivorGame.awaitingCataclysm = true;
const survivorSummary = survivorGame.resolveExtinction();
assert.ok(survivorSummary.survivors.every(id => survivorGame.known.has(id)));
assert.ok(new Set(survivorSummary.survivors).size === survivorSummary.survivors.length, "Survivors must be unique.");

// Genome state must survive a snapshot round trip.
const persistedSnapshot = genomeGame.exportSnapshot();
assert.equal(persistedSnapshot.version, 7);
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
["protist", "sponge", "fish"].forEach(id => stageGame.discoverSpecies(id));
assert.equal(stageGame.currentCreature.id, "fish", "The most-advanced species is shown.");
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
assert.ok(sceneForBiome("ocean", 1).name === "Ocean");
assert.ok(sceneForBiome("ocean", 12).name === "Deep Space", "Very late worlds drift into space.");

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

// Leaderboard records a scored run on extinction and keeps the best entries.
const boardGame = new EvolutionGame({ fast: true, seed: 71 });
boardGame.cells = 1;
boardGame.evolutionEnergy = 100000;
boardGame.worldBiomes = [...BIOMES];
["bacteria", "protist", "sponge"].forEach(id => boardGame.discoverSpecies(id));
assert.equal(boardGame.runReached.size, 3);
boardGame.awaitingCataclysm = true;
const boardSummary = boardGame.resolveExtinction();
assert.ok(boardSummary.score > 0, "Extinction produces a leaderboard score.");
assert.equal(boardGame.leaderboard.length, 1);
assert.equal(boardGame.leaderboard[0].species, 3);
assert.equal(boardGame.bestScore, boardSummary.score);

// New meta fields survive a snapshot round trip.
const metaSnapshot = boardGame.exportSnapshot();
const metaRestored = new EvolutionGame({ fast: true, snapshot: metaSnapshot });
assert.equal(metaRestored.leaderboard.length, 1);
assert.equal(metaRestored.bestScore, boardGame.bestScore);
assert.deepEqual([...metaRestored.unlockedAchievements].sort(), [...boardGame.unlockedAchievements].sort());

// Auto-assembling origins keep converting ordinary Energy while the separate
// evolution meter charges toward the next species choice.
const autoGame = new EvolutionGame({ fast: false, seed: 81 });
assert.equal(autoGame.cells, 0);
assert.equal(autoGame.assemblingOrigins, true, "A fresh atomic world is still assembling.");
autoGame.energy = 5000;
for (let i = 0; i < 30; i += 1) autoGame.tick(0.2);
assert.ok(autoGame.cells >= 3, "Origins auto-build to at least the cell goal.");
assert.ok(autoGame.atoms < 3 && autoGame.molecules < 3 && autoGame.organics < 3, "Intermediate matter keeps flowing through the automatic chain.");
assert.equal(autoGame.assemblingOrigins, false, "Once cells exist, directed evolution takes over.");
const chargedEvolution = autoGame.evolutionEnergy;
for (let i = 0; i < 10; i += 1) autoGame.tick(0.2);
assert.ok(autoGame.evolutionEnergy > chargedEvolution, "The evolution meter charges independently from origin chemistry.");
assert.ok(autoGame.cells > 3, "Origin chemistry continues producing cells after life is established.");

// Directed evolution: Energy checkpoints expose one frontier choice at a time,
// and the chosen species becomes the saved active lineage.
const progressionGame = new EvolutionGame({ fast: false, seed: 91 });
progressionGame.cells = 3;
progressionGame.evolutionEnergy = 19;
assert.equal(progressionGame.evolutionChoices().some(choice => choice.state === "available"), false);
progressionGame.evolutionEnergy = 20;
assert.equal(progressionGame.evolutionChoices()[0].definition.id, "bacteria");
assert.equal(progressionGame.discoverSpecies("bacteria"), true);
assert.equal(progressionGame.activeLineageId, "bacteria");
const progressionSnapshot = progressionGame.exportSnapshot();
const progressionRestored = new EvolutionGame({ snapshot: progressionSnapshot });
assert.equal(progressionRestored.activeLineageId, "bacteria");
assert.equal(progressionRestored.currentCreature.id, "bacteria");

// Origin chemistry and evolution charging advance independently.
const fluxGame = new EvolutionGame({ fast: false, seed: 92 });
fluxGame.cells = 3;
fluxGame.energy = 100;
for (let i = 0; i < 5; i += 1) fluxGame.tick(0.2);
assert.ok(fluxGame.cells > 3 || fluxGame.atoms > 0 || fluxGame.molecules > 0 || fluxGame.organics > 0);
assert.ok(fluxGame.evolutionEnergy > 0, "Evolution charging must continue independently from origin chemistry.");

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
for (const id of ["bacteria", "protist", "sponge"]) {
  selectionGame.runReached.add(id);
  selectionGame.populations.set(id, 2);
}
selectionGame.activeLineageId = "bacteria";
assert.equal(selectionGame.setActiveSpecies("sponge"), true);
assert.equal(selectionGame.currentCreature.id, "sponge");
assert.equal(selectionGame.populationGrowthCost("sponge"), 70);
selectionGame.energy = 170;
selectionGame.autoBuildOrigins();
assert.ok(selectionGame.energy >= 70, "origin automation reserves enough Energy for the active population");
selectionGame.energy = 70;
assert.equal(selectionGame.growPopulation("sponge"), true);
assert.equal(selectionGame.populations.get("sponge"), 3);

const balancedRiskGame = new EvolutionGame({ fast: false, seed: 95 });
const unbalancedRiskGame = new EvolutionGame({ fast: false, seed: 95 });
for (const game of [balancedRiskGame, unbalancedRiskGame]) {
  game.cells = 3;
  for (const id of ["bacteria", "protist", "sponge"]) game.runReached.add(id);
}
balancedRiskGame.populations = new Map([["bacteria", 5], ["protist", 5], ["sponge", 5]]);
unbalancedRiskGame.populations = new Map([["bacteria", 13], ["protist", 1], ["sponge", 1]]);
assert.ok(balancedRiskGame.ecosystemKarma > unbalancedRiskGame.ecosystemKarma);
balancedRiskGame.tick(1);
unbalancedRiskGame.tick(1);
assert.ok(unbalancedRiskGame.pressure > balancedRiskGame.pressure, "Low Karma must accelerate extinction risk.");

assert.ok(ACHIEVEMENTS.length >= 12, "The collection needs a meaningful set of achievements.");

console.log("Long-term progression milestone passed: 30 routes, deterministic worlds, events, offline pause, extinction, checkpoints, persistence, genome lab, mutation sinks, origin-run isolation, stage creatures, achievements, and leaderboard.");
