import {
  ACHIEVEMENTS,
  ALBUMS,
  AMBIENT_EVENTS,
  BIOMES,
  CHOICE_EVENTS,
  EXTINCTIONS,
  LIFE_TARGETS,
  LIFE_TARGETS_BY_ID,
  ORIGIN_ANCHORS,
  SPECIES,
  SPECIES_BY_ID,
  TRAITS,
  WORLD_MODIFIERS
} from "./content.js";
import { creatureForOrigin, creatureForSpecies, sceneForBiome } from "./creatures.js";
import { stepEcosystem, defaultBiomeState, capacityScale, ecologyOf, ROLE } from "./ecosystem.js";

export { ACHIEVEMENTS, ALBUMS, BIOMES, EXTINCTIONS, LIFE_TARGETS, LIFE_TARGETS_BY_ID, ORIGIN_ANCHORS, SPECIES, SPECIES_BY_ID, TRAITS, WORLD_MODIFIERS };
export { ecologyOf, ROLE } from "./ecosystem.js";

const LEADERBOARD_SIZE = 8;
const EVOLUTION_DEPTHS = buildEvolutionDepths();
// Early life assembles itself from energy: the chain auto-builds until the
// player has this many cells, at which point directed evolution takes over.
export const CELL_GOAL = 3;

const ORIGIN_IDS = ["atom", "molecule", "organic", "cell"];

export const GENOME_UPGRADES = {
  production: { name: "Metabolic Genome", description: "+10% Energy production per level", maxLevel: 10 },
  adaptation: { name: "Plastic Genome", description: "+10% Adaptation per level", maxLevel: 10 },
  survival: { name: "Resilient Genome", description: "+4% extinction survivors per level", maxLevel: 5 }
};

export const MEMORY_UPGRADES = {
  synthesis: { name: "Remembered Chemistry", description: "+8% Energy production per level", maxLevel: 5, baseCost: 18, costStep: 18 },
  convergence: { name: "Ancestral Momentum", description: "+8% Evolution Energy gain per level", maxLevel: 5, baseCost: 28, costStep: 28 },
  nursery: { name: "Fossil Nursery", description: "Preserved species begin with +1 population per level", maxLevel: 3, baseCost: 45, costStep: 45 }
};

export const MUTATION_UPGRADES = {
  radiation: { name: "Adaptive Radiation", description: "+6% Evolution Energy gain per level", maxLevel: 5, baseCost: 3, costStep: 2 },
  homeostasis: { name: "Planetary Homeostasis", description: "-5% extinction risk gain per level", maxLevel: 5, baseCost: 4, costStep: 3 },
  curiosity: { name: "Curious Genome", description: "+10% ecosystem event frequency per level", maxLevel: 3, baseCost: 5, costStep: 4 }
};

export const WORLD_FEATURES = {
  nursery: { name: "Evolution Nursery", description: "Grow and revive species 12% cheaper per level.", maxLevel: 3, baseCost: 600, costStep: 700 },
  habitat: { name: "Habitat Reserve", description: "+20% food and carrying capacity per level.", maxLevel: 3, baseCost: 900, costStep: 900 },
  stewardship: { name: "Stewardship Network", description: "Cheaper, stronger population balancing and gentler ecosystem swings.", maxLevel: 3, baseCost: 1200, costStep: 1100 }
};

export const WORLD_MILESTONES = [
  { world: 1, name: "Primordial World", description: "Establish chemistry, microbes, and the first marine food webs." },
  { world: 3, name: "Living Biosphere", description: "Ocean, Wetland, and Forest coexist, opening complete land transitions." },
  { world: 5, name: "Planetary Era", description: "Deliberate evolution and Post-Human routes become possible." },
  { world: 8, name: "Space Age", description: "Civilizations can leave their homeworld." },
  { world: 10, name: "Interstellar Era", description: "Voidborn descendants can pursue the Star Voyager finale." }
];

export function genomeUpgradeCost(level) {
  return 4 + level * 3;
}

export function memoryUpgradeCost(type, level) {
  const upgrade = MEMORY_UPGRADES[type];
  return upgrade ? upgrade.baseCost + level * upgrade.costStep : Infinity;
}

export function mutationUpgradeCost(type, level) {
  const upgrade = MUTATION_UPGRADES[type];
  return upgrade ? upgrade.baseCost + level * upgrade.costStep : Infinity;
}

export function worldFeatureCost(type, level) {
  const feature = WORLD_FEATURES[type];
  return feature ? feature.baseCost + level * feature.costStep : Infinity;
}

// The active "manage imbalance" toolset. Each is a single-resource action with a
// cooldown; the engine methods below enforce cost + cooldown, and the UI reads
// this table for labels, tooltips, and costs. Cooldowns are shortened in fast mode.
export const INTERVENTIONS = {
  boostPlants: { key: "boostPlants", label: "Boost Plants", icon: "\u{1F331}", costResource: "energy", cost: 120, baseCooldown: 25, tip: "Fertilize the active biome so flora feeds more herbivores." },
  cull: { key: "cull", label: "Cull", icon: "✂", costResource: "adaptation", cost: 40, baseCooldown: 20, tip: "Thin an overgrown species to relieve grazing or predation." },
  protect: { key: "protect", label: "Protect", icon: "\u{1F6E1}", costResource: "adaptation", cost: 60, baseCooldown: 30, tip: "Shelter a species so it cannot go extinct for a while." },
  introduce: { key: "introduce", label: "Introduce", icon: "\u{1F423}", costResource: "energy", cost: 0, baseCooldown: 6, tip: "Seed more of a reached species into its biome." },
  stabilise: { key: "stabilise", label: "Stabilise Climate", icon: "❄", costResource: "adaptation", cost: 80, baseCooldown: 45, tip: "Calm the biosphere: refill flora and ease extinction pressure." }
};

export class EvolutionGame {
  constructor({
    fast = false,
    collectionMode = false,
    seed = 184206,
    snapshot = null,
    onChange = () => {},
    onDiscovery = () => {},
    onChoiceEvent = () => {},
    onDiceRoll = () => {},
    onFossilCollected = () => {},
    onLifeCollected = () => {},
    onLifeStage = () => {},
    onAttemptEnded = () => {},
    onExtinctionReady = () => {},
    onExtinction = () => {},
    onAchievement = () => {}
  } = {}) {
    this.fast = fast;
    this.collectionMode = collectionMode;
    this.profileSeed = seed >>> 0;
    this.onChange = onChange;
    this.onDiscovery = onDiscovery;
    this.onChoiceEvent = onChoiceEvent;
    this.onDiceRoll = onDiceRoll;
    this.onFossilCollected = onFossilCollected;
    this.onLifeCollected = onLifeCollected;
    this.onLifeStage = onLifeStage;
    this.onAttemptEnded = onAttemptEnded;
    this.onExtinctionReady = onExtinctionReady;
    this.onExtinction = onExtinction;
    this.onAchievement = onAchievement;

    this.known = new Set();
    this.knownOrigins = new Set();
    this.knownTraits = new Set();
    this.knownWorlds = new Set();
    this.knownExtinctions = new Set();
    this.stories = new Set();
    this.clues = new Set();
    this.survivorStamps = new Map();
    this.fossilCollection = new Set();
    this.lifeCollection = new Set();
    this.mastery = new Map();
    this.unlockedOrigins = new Set(["atomic"]);
    this.activeOrigin = "atomic";
    this.fossilSpecies = null;
    this.evolutionMemory = 0;
    this.dna = 0;
    this.mutationPoints = 0;
    this.discoveryKnowledge = 0;
    this.genome = { production: 0, adaptation: 0, survival: 0 };
    this.memoryUpgrades = { synthesis: 0, convergence: 0, nursery: 0 };
    this.mutationGenome = { radiation: 0, homeostasis: 0, curiosity: 0 };
    this.worldNumber = 0;
    this.eventPity = {};
    this.totalChoiceEvents = 0;
    this.genomeUpgradesBought = 0;
    this.unlockedAchievements = new Set();
    this.leaderboard = [];
    this.bestScore = 0;
    this.onSpeciesExtinct = id => this.recordLineageDeath(id, "local extinction");

    if (snapshot) this.restore(snapshot);
    if (snapshot?.run) this.restoreRun(snapshot.run);
    else this.beginWorld({ initial: true });
  }

  beginWorld({ initial = false } = {}) {
    const previousBiomes = this.worldBiomes?.map(biome => biome.id) || [];
    if (!initial) this.worldNumber += 1;
    if (initial && this.worldNumber === 0) this.worldNumber = 1;

    this.worldSeed = mixSeed(this.profileSeed, this.worldNumber);
    this.rngState = this.worldSeed;
    const shuffledModifiers = deterministicShuffle(WORLD_MODIFIERS, () => this.random());
    this.visibleModifiers = shuffledModifiers.slice(0, 2);
    this.hiddenModifier = shuffledModifiers[2];
    if (this.worldNumber >= 3) {
      // The mature biosphere opens every biome at once.
      this.worldBiomes = deterministicShuffle(BIOMES, () => this.random());
    } else {
      // Early worlds ALWAYS include the Ocean. It is the root of the tree of life
      // -- algae and sponges gate every plant and animal route -- so a land-only
      // world would dead-end a run at a handful of microbes and fungi. Worlds 1
      // and 2 each pair the Ocean with one land biome; World 2 steps onto the
      // OTHER land biome (showcased as the backdrop) so there is always somewhere
      // new to go while the cradle Ocean keeps the full tree reachable.
      const ocean = BIOMES.find(biome => biome.id === "ocean");
      const land = deterministicShuffle(BIOMES.filter(biome => biome.id !== "ocean"), () => this.random());
      if (this.worldNumber === 2 && previousBiomes.length) {
        const fresh = land.find(biome => !previousBiomes.includes(biome.id)) || land[0];
        this.worldBiomes = [fresh, ocean];
      } else {
        this.worldBiomes = [ocean, land[0]];
      }
    }
    this.dominantBiome = this.worldBiomes[0];
    this.extinction = EXTINCTIONS[Math.floor(this.random() * EXTINCTIONS.length)];
    this.knownWorlds.add(`world_${this.worldSeed}`);

    this.energy = 0;
    this.atoms = 0;
    this.molecules = 0;
    this.organics = 0;
    this.cells = 0;
    this.totalOrigins = 0;
    this.adaptation = 0;
    this.evolutionEnergy = 0;
    this.pressure = 0;
    this.worldAgeSeconds = 0;
    this.runReached = new Set();
    this.activeLineageId = null;
    this.lineagePathId = null;
    this.lineageDraft = [];
    this.lineageHistory = [];
    this.lineageEnded = false;
    this.runFossils = new Set();
    this.lifeTargetId = null;
    this.lifeTargetDraft = [];
    this.lifeStageIndex = -1;
    this.lifeStageProgress = 0;
    this.attemptNumber = 1;
    this.runNew = new Set();
    this.populations = new Map();
    this.worldFeatures = { nursery: 0, habitat: 0, stewardship: 0 };
    this.initEcosystem();
    this.activeTraits = new Set();
    this.eventLog = [];
    this.eventCooldowns = {};
    this.ambientTimer = 0;
    this.choiceTimer = 0;
    this.pendingChoice = null;
    this.lastDiceRoll = null;
    this.awaitingCataclysm = false;
    this.worldEnded = false;
    this.extinctionReadyAnnounced = false;
    this.revealedHiddenModifier = false;
    this.selectedPreparation = null;
    this.completedRunSummary = null;
    this.completedObjectives = new Set();
    this.objectiveBalanceSeconds = 0;

    this.runOrigin = this.activeOrigin === "cellular" && this.unlockedOrigins.has("cellular") ? "cellular" : "atomic";
    if (this.runOrigin === "cellular") {
      this.cells = 1;
      this.totalOrigins = 12;
      ORIGIN_IDS.forEach(id => this.knownOrigins.add(id));
      this.pushStory("Cellular Origin reconstructed. Four billion years have been summarized for scheduling reasons.", "origin");
    }

    if (this.fossilSpecies && this.known.has(this.fossilSpecies)) {
      const legacy = SPECIES_BY_ID[this.fossilSpecies];
      this.runReached.add(this.fossilSpecies);
      const stamps = this.survivorStamps.get(this.fossilSpecies)?.size || 0;
      const nursery = this.memoryUpgrades.nursery || 0;
      this.populations.set(this.fossilSpecies, 1 + Math.min(2, stamps) + nursery);
      this.activeLineageId = this.fossilSpecies;
      this.lineagePathId = this.fossilSpecies;
      this.lineageHistory.push(this.fossilSpecies);
      this.activeTraits.add("dormancy");
      legacy.grantsTraits.forEach(trait => this.activeTraits.add(trait));
      this.pushStory(`${legacy.name} survives into this world through the fossil record.`, "legacy");
    }

    this.notify();
  }

  // Per-run living-ecosystem state: ambient flora pools per biome plus the
  // bookkeeping the food web reads and writes each tick (see ecosystem.js).
  initEcosystem() {
    const scale = capacityScale(this);
    this.biomeState = new Map();
    for (const biome of this.worldBiomes) this.biomeState.set(biome.id, defaultBiomeState(biome.id, scale));
    this.biomeState.set("cell", defaultBiomeState("cell", scale));
    this.extinctionGrace = {};
    this.protectedUntil = {};
    this.extinctionShock = 0;
    this.ecoDisturbance = 0;
    this.actionCooldowns = {};
    this.pendingPressureSpike = 0;
    this.popTrend = new Map();
    this.ecosystemCauses = [];
    this.ecoSummary = null;
  }

  tickActionCooldowns(elapsed) {
    if (!this.actionCooldowns) return;
    for (const id of Object.keys(this.actionCooldowns)) {
      this.actionCooldowns[id] = Math.max(0, this.actionCooldowns[id] - elapsed);
      if (this.actionCooldowns[id] <= 0) delete this.actionCooldowns[id];
    }
  }

  get productionRate() {
    // Chemistry establishes the run, but must not compound into an exponential
    // engine that makes every species and intervention price meaningless.
    const originPower = 1 + Math.log2(1 + this.totalOrigins) * 12;
    const ecologyPower = [...this.populations.values()].reduce((sum, value) => sum + value, 0) * 5;
    const modifier = this.visibleModifiers.reduce((value, item) => value * (item.production || 1), 1);
    const fossil = this.fossilSpecies ? 1.15 : 1;
    const genome = 1 + (this.genome.production || 0) * 0.1;
    const memory = 1 + (this.memoryUpgrades.synthesis || 0) * 0.08;
    const mastery = 1 + Math.min(0.35, this.totalMastery * 0.01);
    return (originPower + ecologyPower) * modifier * fossil * genome * memory * mastery * (this.fast ? 25 : 1);
  }

  get adaptationRate() {
    if (this.cells < 1) return 0;
    const populations = [...this.populations.values()].reduce((sum, value) => sum + value, 0);
    const diversity = this.populations.size;
    const modifier = this.visibleModifiers.reduce((value, item) => value * (item.adaptation || 1), 1);
    const genome = 1 + (this.genome.adaptation || 0) * 0.1;
    return (1 + populations * 0.55 + diversity * 0.35) * modifier * genome * (this.fast ? 16 : 1);
  }

  get evolutionRateMultiplier() {
    const definition = SPECIES_BY_ID[this.activeLineageId];
    if (!definition) return 1;
    const groupRates = {
      Microbial: 1.25,
      Plant: 1.05,
      Fungus: 1.1,
      Invertebrate: 1.15,
      Fish: 0.95,
      Vertebrate: 1,
      Reptile: 0.9,
      Mammal: 0.85,
      Civilization: 0.75
    };
    return groupRates[definition.group] || 1;
  }

  get evolutionRate() {
    const definition = SPECIES_BY_ID[this.activeLineageId];
    const lineageBase = definition ? 1.2 + Math.sqrt(definition.cost) * 0.16 : 1;
    const population = definition ? this.populations.get(definition.id) || 1 : Math.max(1, this.cells);
    const populationBoost = 1 + Math.min(0.5, Math.max(0, population - 1) * 0.08);
    const worldModifier = this.visibleModifiers.reduce((value, item) => value * (item.adaptation || 1), 1);
    const genome = 1 + (this.genome.adaptation || 0) * 0.1;
    const memory = 1 + (this.memoryUpgrades.convergence || 0) * 0.08;
    const mutation = 1 + (this.mutationGenome.radiation || 0) * 0.06;
    return lineageBase * this.evolutionRateMultiplier * populationBoost * worldModifier * genome * memory * mutation * (this.fast ? 12 : 1);
  }

  get livingDiversity() {
    return [...this.populations.values()].filter(population => population > 0).length;
  }

  get worldObjectives() {
    const branchTarget = this.worldNumber === 1 ? 3 : Math.min(12, 4 + this.worldNumber);
    const diversityTarget = Math.min(8, 3 + Math.floor((this.worldNumber - 1) / 2));
    const balanceTarget = this.fast ? 4 : 20;
    const definitions = [
      {
        id: "progress",
        title: this.worldNumber === 1 ? "Awaken Life" : "Expand the Tree",
        description: this.worldNumber === 1
          ? "Establish three cells and begin directed evolution."
          : `Reach ${branchTarget} species in this world.`,
        progress: this.worldNumber === 1 ? this.cells : this.runReached.size,
        target: branchTarget,
        unit: this.worldNumber === 1 ? "cells" : "species",
        reward: { resource: "energy", amount: 100 + this.worldNumber * 50 }
      },
      {
        id: "diversity",
        title: "Living Web",
        description: `Keep ${diversityTarget} species alive at the same time.`,
        progress: this.livingDiversity,
        target: diversityTarget,
        unit: "living",
        reward: { resource: "adaptation", amount: 60 + this.worldNumber * 20 }
      },
      {
        id: "balance",
        title: "Steady Hand",
        description: `Hold Ecosystem Health at 70% or higher with at least ${Math.min(3, diversityTarget)} living species.`,
        progress: this.objectiveBalanceSeconds,
        target: balanceTarget,
        unit: "seconds",
        reward: { resource: "discoveryKnowledge", amount: 1 + Math.floor((this.worldNumber - 1) / 3) }
      }
    ];
    return definitions.map(objective => ({
      ...objective,
      progress: Math.min(objective.target, nonnegativeFinite(objective.progress)),
      completed: this.completedObjectives.has(objective.id)
    }));
  }

  get objectiveProgress() {
    return { completed: this.completedObjectives.size, total: this.worldObjectives.length };
  }

  updateWorldObjectiveProgress(elapsed, offline = false) {
    if (offline || this.completedObjectives.has("balance")) return;
    const diversityNeeded = Math.min(3, this.worldObjectives.find(item => item.id === "diversity").target);
    if (this.livingDiversity >= diversityNeeded && this.ecosystemHealth >= 70) {
      this.objectiveBalanceSeconds += elapsed;
    } else {
      this.objectiveBalanceSeconds = 0;
    }
  }

  checkWorldObjectives() {
    if (this.worldEnded || this.awaitingCataclysm) return;
    for (const objective of this.worldObjectives) {
      if (objective.completed || objective.progress + 1e-9 < objective.target) continue;
      this.completedObjectives.add(objective.id);
      this[objective.reward.resource] += objective.reward.amount;
      this.pushStory(`${objective.title} complete. ${objective.reward.amount} ${objectiveRewardName(objective.reward.resource)} gained.`, "objective");
    }
  }

  get totalMastery() {
    return [...this.mastery.values()].reduce((sum, level) => sum + Math.max(0, level || 0), 0);
  }

  get worldEra() {
    if (this.worldNumber >= 10) return "Interstellar Era";
    if (this.worldNumber >= 8) return "Space Age";
    if (this.worldNumber >= 5) return "Planetary Era";
    if (this.worldNumber >= 3) return "Living Biosphere";
    if (this.worldNumber >= 2) return "Adaptive World";
    return "Primordial World";
  }

  get ecosystemKarma() {
    const populations = [...this.populations.values()].filter(value => value > 0);
    if (populations.length === 0) return this.runReached.size === 0 ? 100 : 0;
    const total = populations.reduce((sum, value) => sum + value, 0);
    if (populations.length === 1) return 45;
    const entropy = -populations.reduce((sum, value) => {
      const share = value / total;
      return sum + share * Math.log(share);
    }, 0);
    const evenness = entropy / Math.log(populations.length);
    const diversity = Math.min(1, populations.length / 6);
    return Math.round(Math.max(0, Math.min(100, 30 + evenness * 50 + diversity * 20)));
  }

  get ecosystemState() {
    if (this.ecosystemKarma >= 85) return "Harmonious";
    if (this.ecosystemKarma >= 65) return "Balanced";
    if (this.ecosystemKarma >= 45) return "Strained";
    if (this.ecosystemKarma >= 25) return "Unstable";
    return "Collapsing";
  }

  get imbalanceRiskMultiplier() {
    return 0.45 + (100 - this.ecosystemKarma) / 35;
  }

  get extinctionRiskRate() {
    if (this.awaitingCataclysm || this.worldEnded) return 0;
    // While a single collectible develops there is no ecosystem to model, so
    // disaster risk is a gentle, steady climb: a focused attempt reaches
    // adulthood with the danger bar high but survivable, while a slow or idle
    // attempt risks a catastrophe reset (the design's "disasters can destroy any
    // unfinished life form"). Without this branch runReached is empty during the
    // collection loop and pressure would never rise at all.
    if (this.lifeTargetId) {
      const modifier = this.visibleModifiers.reduce((value, item) => value * (item.pressure || 1), 1);
      return (this.fast ? 2.2 : 0.06) * modifier;
    }
    if (this.runReached.size === 0) return 0;
    const modifier = this.visibleModifiers.reduce((value, item) => value * (item.pressure || 1), 1);
    const baseFloor = this.fast ? 1.8 : this.worldNumber === 1 ? 0.011 : 0.0006;
    const deficitGain = this.fast ? 6.5 : this.worldNumber === 1 ? 0.052 : 0.004;
    const health = this.ecosystemHealth;
    const deficit = (100 - health) / 100;
    const accel = health < 40 ? 1 + (40 - health) / 28 : 1;
    const homeostasis = Math.max(0.7, 1 - (this.mutationGenome.homeostasis || 0) * 0.05);
    return (baseFloor + deficitGain * deficit * accel) * modifier * homeostasis;
  }

  // Broader ecosystem health (0..100) that now drives extinction risk: blends
  // diversity, how well-fed consumers are, predator/prey balance, and the shock
  // of recent local extinctions. ecosystemKarma (diversity only) is kept intact.
  get ecosystemHealth() {
    const diversity = this.ecosystemKarma / 100;
    const summary = this.ecoSummary;
    if (this.populations.size === 0) return this.runReached.size === 0 ? 100 : 0;
    if (!summary) {
      return Math.round(clampValue(55 + diversity * 45, 0, 100));
    }
    const disturbance = clampValue(summary.disturbance ?? (summary.totalPop > 0 ? summary.starvingPop / summary.totalPop : 0), 0, 1);
    const foodSecurity = 1 - clampValue(summary.plantStress, 0, 1);
    const predatorBalance = 1 - clampValue(summary.predatorPressure - 1, 0, 1);
    const shock = Math.min(40, this.extinctionShock || 0);
    // An active collapse (disturbance) is weighted heavily so a diverse world
    // cannot read "Thriving" while its populations are crashing.
    const health = 22 * diversity + 24 * foodSecurity + 14 * predatorBalance + 40 * (1 - disturbance) - shock;
    return Math.round(clampValue(health, 0, 100));
  }

  get ecosystemHealthState() {
    const health = this.ecosystemHealth;
    if (health >= 80) return "Thriving";
    if (health >= 60) return "Stable";
    if (health >= 40) return "Strained";
    if (health >= 20) return "Unstable";
    return "Collapsing";
  }

  get threatStage() {
    if (this.pressure < 20) return "Stable";
    if (this.pressure < 45) return "Instability";
    if (this.pressure < 70) return "Omens";
    if (this.pressure < 90) return "Crisis";
    if (this.pressure < 100) return "Revelation";
    return "Cataclysm";
  }

  get visibleExtinctionName() {
    return this.pressure >= 90 ? this.extinction.name : "Unknown Catastrophe";
  }

  get modifierIds() {
    return new Set([...this.visibleModifiers, this.hiddenModifier].map(item => item.id));
  }

  // "What you currently are" on the stage: the most-advanced living species
  // this world, falling back through the origin chain (cell -> atom).
  get currentCreature() {
    if (this.lifeTargetId) {
      const target = LIFE_TARGETS_BY_ID[this.lifeTargetId];
      const adultDefinition = SPECIES_BY_ID[target.id] || {
        id: target.id,
        name: target.name,
        glyph: target.glyph,
        group: target.group,
        biome: target.biome,
        albums: target.biome === "ocean" ? ["ocean"] : []
      };
      const profile = creatureForSpecies(adultDefinition);
      const stage = target.stages[Math.max(0, this.lifeStageIndex)] || target.name;
      const scale = 0.45 + Math.max(0, this.lifeStageIndex) * 0.15;
      return { kind: "life-stage", id: target.id, ...profile, label: stage, scale: profile.scale * scale };
    }
    if (this.collectionMode) {
      const originId = this.cells > 0 ? "cell" : this.organics > 0 ? "organic" : this.molecules > 0 ? "molecule" : "atom";
      return { kind: "origin", id: originId, ...creatureForOrigin(originId) };
    }
    if (this.isSpeciesLiving(this.activeLineageId)) {
      const active = SPECIES_BY_ID[this.activeLineageId];
      if (active) return { kind: "species", id: active.id, ...creatureForSpecies(active) };
    }
    let best = null;
    let bestCost = -1;
    for (const [id, population] of this.populations) {
      const definition = SPECIES_BY_ID[id];
      if (population > 0 && definition && definition.cost > bestCost) {
        best = definition;
        bestCost = definition.cost;
      }
    }
    if (best) {
      return { kind: "species", id: best.id, ...creatureForSpecies(best) };
    }
    const originId = this.cells > 0 ? "cell" : this.organics > 0 ? "organic" : this.molecules > 0 ? "molecule" : "atom";
    return { kind: "origin", id: originId, ...creatureForOrigin(originId) };
  }

  get currentScene() {
    // While a collectible is growing, the world reflects that animal's habitat
    // (a shark's ocean, an eagle's sky) rather than the run's dominant biome.
    const target = this.lifeTargetId ? LIFE_TARGETS_BY_ID[this.lifeTargetId] : null;
    if (target) return sceneForBiome(target.biome, 1, this.currentCreature.era);
    return sceneForBiome(this.dominantBiome?.id, this.worldNumber, this.currentCreature.era);
  }

  tick(seconds, { offline = false } = {}) {
    if (this.worldEnded || this.awaitingCataclysm || seconds <= 0) return;
    const elapsed = Math.min(seconds, offline ? 172800 : 1);
    this.energy += this.productionRate * elapsed;
    this.adaptation += this.adaptationRate * elapsed;
    if (this.cells > 0) this.evolutionEnergy += this.evolutionRate * elapsed;
    this.worldAgeSeconds += elapsed;
    this.autoBuildOrigins();
    // A collectible only grows under active play. Freezing it while offline means
    // an absence can't silently advance — or, via accrued disaster pressure, doom —
    // an in-progress attempt the player has no way to defend while away.
    const frozenLifeTarget = offline && this.lifeTargetId;
    if (!frozenLifeTarget) this.advanceLifeStage(elapsed);

    // Advance the living food web. Offline gaps are bounded inside stepEcosystem
    // so a long absence stays forgiving (per the design guardrail) while active
    // play feels the full predator/prey/grazing pressure.
    if (!this.awaitingCataclysm) stepEcosystem(this, Math.min(elapsed, offline ? 4 : 1));
    this.updateWorldObjectiveProgress(elapsed, offline);
    this.tickActionCooldowns(elapsed);

    const pressureActive = this.lifeTargetId || (!this.collectionMode && this.runReached.size > 0);
    if (pressureActive && !this.awaitingCataclysm && !frozenLifeTarget) {
      // Extinction risk now EMERGES from ecosystem health: a balanced, well-fed
      // world barely climbs (a small floor still guarantees the world ends), but
      // imbalance accelerates risk sharply, and a collapsing web climbs fastest.
      const nextPressure = this.pressure + elapsed * this.extinctionRiskRate + (this.pendingPressureSpike || 0);
      this.pendingPressureSpike = 0;
      this.pressure = offline ? Math.min(99, nextPressure) : Math.min(100, nextPressure);
      if (this.pressure >= 55) this.revealedHiddenModifier = true;
      if (this.pressure >= 100) {
        if (this.lifeTargetId) {
          const disaster = this.extinction.name;
          this.failLifeAttempt(disaster);
          this.notify();
          return;
        }
        this.awaitingCataclysm = true;
        if (!this.extinctionReadyAnnounced) {
          this.extinctionReadyAnnounced = true;
          this.onExtinctionReady(this.extinction);
        }
      }
    }

    if (!offline) this.advanceEvents(elapsed);
    this.notify();
  }

  lifeTargetChoices() {
    if (this.cells < CELL_GOAL || this.lifeTargetId || this.worldEnded || this.awaitingCataclysm) return [];
    const valid = new Set(LIFE_TARGETS.map(item => item.id));
    this.lifeTargetDraft = this.lifeTargetDraft.filter(id => valid.has(id));
    if (this.lifeTargetDraft.length === 0) {
      const pool = deterministicShuffle(LIFE_TARGETS, () => this.random());
      pool.sort((left, right) => Number(this.lifeCollection.has(left.id)) - Number(this.lifeCollection.has(right.id)));
      this.lifeTargetDraft = pool.slice(0, 2).map(item => item.id);
    }
    return this.lifeTargetDraft.map(id => LIFE_TARGETS_BY_ID[id]);
  }

  chooseLifeTarget(id) {
    if (!this.lifeTargetChoices().some(target => target.id === id)) return false;
    this.lifeTargetId = id;
    this.lifeStageIndex = 0;
    this.lifeStageProgress = 0;
    this.lifeTargetDraft = [];
    this.pressure = 0;
    this.pushStory(`${LIFE_TARGETS_BY_ID[id].name} development begins.`, "development");
    return this.changed();
  }

  get lifeStageCost() {
    return (this.fast ? 25 : 100) * (this.lifeStageIndex + 1);
  }

  advanceLifeStage(seconds) {
    if (!this.lifeTargetId || this.worldEnded || this.awaitingCataclysm) return;
    this.lifeStageProgress += this.evolutionRate * seconds;
    if (this.lifeStageProgress < this.lifeStageCost) return;
    this.lifeStageProgress -= this.lifeStageCost;
    const target = LIFE_TARGETS_BY_ID[this.lifeTargetId];
    if (this.lifeStageIndex < target.stages.length - 1) {
      this.lifeStageIndex += 1;
      this.pushStory(`${target.name} reaches the ${target.stages[this.lifeStageIndex]} stage.`, "development");
      this.onLifeStage({ target, stageIndex: this.lifeStageIndex, label: target.stages[this.lifeStageIndex], maximum: target.stages.length });
      return;
    }
    this.completeLifeTarget();
  }

  completeLifeTarget() {
    const target = LIFE_TARGETS_BY_ID[this.lifeTargetId];
    if (!target) return false;
    const isNew = !this.lifeCollection.has(target.id);
    this.lifeCollection.add(target.id);
    this.onLifeCollected({ target, isNew, total: this.lifeCollection.size, maximum: LIFE_TARGETS.length });
    this.resetLifeAttempt("collected", true);
    return true;
  }

  failLifeAttempt(cause) {
    if (!this.lifeTargetId) return false;
    const target = LIFE_TARGETS_BY_ID[this.lifeTargetId];
    this.onAttemptEnded({ target, cause });
    this.resetLifeAttempt(cause, false);
    return true;
  }

  resetLifeAttempt(cause, collected) {
    const target = LIFE_TARGETS_BY_ID[this.lifeTargetId];
    this.pushStory(collected ? `${target.name} collected. A new life begins from the cell.` : `${target.name} was lost to ${cause}. Development restarts from the cell.`, collected ? "collection" : "extinction");
    this.lifeTargetId = null;
    this.lifeTargetDraft = [];
    this.lifeStageIndex = -1;
    this.lifeStageProgress = 0;
    // A disaster (or a failed encounter) ends the attempt; never leave a stale
    // decision card that could be resolved against a life form that no longer exists.
    this.pendingChoice = null;
    this.attemptNumber += 1;
    this.atoms = 0;
    this.molecules = 0;
    this.organics = 0;
    this.cells = 1;
    this.evolutionEnergy = 0;
    this.pressure = 0;
    this.awaitingCataclysm = false;
  }

  advanceOffline(seconds) {
    this.tick(Math.max(0, seconds), { offline: true });
    if (this.pressure >= 99 && !this.awaitingCataclysm) {
      this.pushStory("The world waited at the brink of catastrophe until you returned.", "extinction");
    }
    return { seconds, pausedAtFinale: this.pressure >= 99 };
  }

  generateEnergy() {
    if (this.worldEnded || this.awaitingCataclysm) return false;
    this.energy += this.fast ? 20 : 1;
    if (this.cells > 0) this.evolutionEnergy += this.fast ? 5 : 0.5;
    this.notify();
    return true;
  }

  // The origin chain assembles itself from banked energy each tick, so the
  // player never hand-clicks atoms. Tapping the creature just supplies fuel.
  autoBuildOrigins() {
    if (this.worldEnded || this.runOrigin !== "atomic") return false;
    // Rush the founding cells, then let chemistry continue as a quiet background
    // process instead of consuming the entire economy every render tick.
    let steps = this.cells < CELL_GOAL ? 200 : 1;
    let progressed = false;
    const populationReserve = this.activeLineageId
      ? this.populationGrowthCost(this.activeLineageId)
      : 0;
    while (steps-- > 0) {
      if (this.organics >= 3) {
        this.organics -= 3; this.cells += 1; this.totalOrigins += 6; this.discoverOrigin("cell"); progressed = true; continue;
      }
      if (this.molecules >= 3) {
        this.molecules -= 3; this.organics += 1; this.totalOrigins += 3; this.discoverOrigin("organic"); progressed = true; continue;
      }
      if (this.atoms >= 3) {
        this.atoms -= 3; this.molecules += 1; this.totalOrigins += 2; this.discoverOrigin("molecule"); progressed = true; continue;
      }
      // Once a lineage is active, chemistry only uses surplus Energy so the
      // advertised population-growth action remains affordable.
      if (this.energy >= populationReserve + 10) {
        this.energy -= 10; this.atoms += 1; this.totalOrigins += 1; this.discoverOrigin("atom"); progressed = true; continue;
      }
      break;
    }
    return progressed;
  }

  // True while early life is still assembling (before directed evolution).
  get assemblingOrigins() {
    return this.runOrigin === "atomic" && this.cells < 1;
  }

  // Show how much chemistry has reached each origin tier. Converted matter is
  // still represented in every foundation below it instead of appearing lost.
  get establishedOrigins() {
    return {
      atoms: this.atoms + this.molecules * 3 + this.organics * 9 + this.cells * 27,
      molecules: this.molecules + this.organics * 3 + this.cells * 9,
      organics: this.organics + this.cells * 3,
      cells: this.cells
    };
  }

  createAtom() {
    if (this.awaitingCataclysm) return false;
    if (!this.spend("energy", 10)) return false;
    this.atoms += 1;
    this.totalOrigins += 1;
    this.discoverOrigin("atom");
    return this.changed();
  }

  createMolecule() {
    if (this.atoms < 3 || this.worldEnded || this.awaitingCataclysm) return false;
    this.atoms -= 3;
    this.molecules += 1;
    this.totalOrigins += 2;
    this.discoverOrigin("molecule");
    return this.changed();
  }

  createOrganic() {
    if (this.molecules < 3 || this.worldEnded || this.awaitingCataclysm) return false;
    this.molecules -= 3;
    this.organics += 1;
    this.totalOrigins += 3;
    this.discoverOrigin("organic");
    return this.changed();
  }

  createCell() {
    if (this.organics < 3 || this.worldEnded || this.awaitingCataclysm) return false;
    this.organics -= 3;
    this.cells += 1;
    this.totalOrigins += 6;
    this.discoverOrigin("cell");
    return this.changed();
  }

  discoverOrigin(id) {
    if (this.knownOrigins.has(id)) return;
    this.knownOrigins.add(id);
    // Atoms/molecules/organics assemble quietly; only the first Cell is celebrated.
    if (id === "cell") {
      this.onDiscovery({ kind: "origin", definition: originDefinition(id), total: this.known.size, maximum: SPECIES.length });
    }
  }

  // A live run score from how long you've survived and what you've achieved.
  get currentScore() {
    const populations = [...this.populations.values()].reduce((sum, value) => sum + value, 0);
    return Math.round(
      Math.floor(this.worldAgeSeconds) * 2 +
      this.runReached.size * 120 +
      this.livingDiversity * 80 +
      this.runNew.size * 250 +
      this.totalMastery * 45 +
      this.completedObjectives.size * 150 +
      populations * 25 +
      this.worldNumber * 200
    );
  }

  speciesEvolutionCost(id) {
    const definition = SPECIES_BY_ID[id];
    if (!definition) return Infinity;
    const depth = EVOLUTION_DEPTHS.get(id) || 1;
    const targetMinutes = depth === 1 ? 1.5 : 1.5 + (depth - 1) * 2;
    const expectedRate = depth === 1 ? 1 : 2.6 + (depth - 2) * 0.4;
    const pacedCost = Math.ceil(targetMinutes * 60 * expectedRate / 5) * 5;
    const baseCost = Math.max(definition.cost, pacedCost);
    if (!this.known.has(id)) return baseCost;
    const mastery = this.mastery.get(id) || 0;
    const factor = Math.max(0.55, 0.85 - mastery * 0.1);
    return Math.max(5, Math.ceil(baseCost * factor));
  }

  speciesStatus(id) {
    const definition = SPECIES_BY_ID[id];
    if (!definition) return { state: "hidden", reasons: ["Unknown species"] };
    if (this.runReached.has(id)) return { state: "reached", reasons: [] };

    const reasons = [];
    if (this.cells < 1) reasons.push("Create a Cell");
    for (const required of definition.requires) {
      if (!this.runReached.has(required)) reasons.push(`Discover ${SPECIES_BY_ID[required].name}`);
      else if (!this.isSpeciesLiving(required)) reasons.push(`Restore ${SPECIES_BY_ID[required].name} population`);
    }
    if (definition.modifierAny && !definition.modifierAny.some(idValue => this.modifierIds.has(idValue))) {
      reasons.push("Find a compatible world modifier");
    }
    if (definition.biome !== "cell" && !this.worldBiomes.some(biome => biome.id === definition.biome)) reasons.push(`Find a world with a ${capitalize(definition.biome)}`);
    if (definition.requiresStory && !this.stories.has(definition.requiresStory)) reasons.push("Resolve a related ecosystem story");
    if (definition.minDiversity && this.livingDiversity < definition.minDiversity) reasons.push(`Keep ${definition.minDiversity} species alive together`);
    if (definition.knowledgeAtLeast && this.discoveryKnowledge < definition.knowledgeAtLeast) reasons.push(`Collect ${definition.knowledgeAtLeast} Discovery Knowledge`);
    if (definition.worldAtLeast && this.worldNumber < definition.worldAtLeast) reasons.push(`Reach World ${definition.worldAtLeast}`);
    if (definition.pressureAtLeast && this.pressure < definition.pressureAtLeast) reasons.push(`Let instability pass ${definition.pressureAtLeast}%`);
    const evolutionCost = this.speciesEvolutionCost(id);
    if (this.evolutionEnergy < evolutionCost) reasons.push(`Charge ${evolutionCost} Evolution Energy`);

    const parentsKnown = definition.requires.length === 0 || definition.requires.some(required => this.runReached.has(required));
    const clueVisible = this.clues.has(id) || parentsKnown || this.known.has(id);
    const available = reasons.length === 0 && !this.worldEnded && !this.awaitingCataclysm;
    return { state: available ? "available" : clueVisible ? "revealed" : "silhouette", reasons };
  }

  availableSpecies() {
    return SPECIES.map(definition => ({ definition, ...this.speciesStatus(definition.id) }))
      .filter(item => item.state === "available" || item.state === "revealed" || item.state === "reached")
      .sort((left, right) => stateRank(left.state) - stateRank(right.state) || left.definition.cost - right.definition.cost);
  }

  // The frontier contains only species whose parent lineages and world
  // conditions are satisfied. Energy determines when each choice becomes live.
  evolutionChoices() {
    const choices = [];
    for (const definition of SPECIES) {
      if (this.runReached.has(definition.id)) continue;
      const status = this.speciesStatus(definition.id);
      const routeReasons = status.reasons.filter(reason => !reason.startsWith("Charge "));
      if (routeReasons.length > 0) continue;
      choices.push({
        definition,
        cost: this.speciesEvolutionCost(definition.id),
        state: this.evolutionEnergy >= this.speciesEvolutionCost(definition.id) && !this.worldEnded && !this.awaitingCataclysm ? "available" : "charging",
        remaining: Math.max(0, this.speciesEvolutionCost(definition.id) - this.evolutionEnergy),
        direct: this.activeLineageId ? definition.requires.includes(this.activeLineageId) : definition.requires.length === 0
      });
    }
    return choices.sort((left, right) => Number(right.direct) - Number(left.direct) || left.cost - right.cost);
  }

  // A run's featured lineage is drafted separately from the supporting food
  // web. The first generation offers two roots; later generations only offer
  // direct descendants of the committed form. A single descendant is a locked
  // maturation step rather than a fresh branch.
  lineageChoices() {
    if (this.cells < 1 || this.worldEnded || this.awaitingCataclysm || this.lineageEnded) return [];
    const current = SPECIES_BY_ID[this.lineagePathId];
    const candidates = SPECIES.filter(definition => {
      if (this.runReached.has(definition.id)) return false;
      if (!current) return definition.requires.length === 0;
      return definition.requires.includes(current.id);
    });
    if (candidates.length === 0) {
      this.lineageDraft = [];
      return [];
    }

    const eligibleIds = new Set(candidates.map(definition => definition.id));
    this.lineageDraft = this.lineageDraft.filter(id => eligibleIds.has(id));
    if (this.lineageDraft.length === 0) {
      const missingFirst = candidates.slice().sort((left, right) => {
        const fossilDifference = Number(this.fossilCollection.has(left.id)) - Number(this.fossilCollection.has(right.id));
        return fossilDifference || left.cost - right.cost;
      });
      const pool = deterministicShuffle(missingFirst, () => this.random());
      pool.sort((left, right) => Number(this.fossilCollection.has(left.id)) - Number(this.fossilCollection.has(right.id)));
      this.lineageDraft = pool.slice(0, 2).map(definition => definition.id);
    }

    return this.lineageDraft.map(id => {
      const definition = SPECIES_BY_ID[id];
      const status = this.speciesStatus(id);
      const cost = this.speciesEvolutionCost(id);
      return {
        definition,
        cost,
        reasons: status.reasons.filter(reason => !reason.startsWith("Charge ")),
        state: status.state === "available" ? "available" : "locked",
        remaining: Math.max(0, cost - this.evolutionEnergy),
        forced: this.lineageDraft.length === 1
      };
    });
  }

  chooseLineage(id) {
    const choice = this.lineageChoices().find(item => item.definition.id === id);
    if (!choice || choice.state !== "available") return false;
    this.lineageDraft = [];
    this.lineagePathId = id;
    this.lineageHistory.push(id);
    if (!this.discoverSpecies(id)) {
      this.lineageHistory.pop();
      this.lineagePathId = this.lineageHistory.at(-1) || null;
      return false;
    }
    return true;
  }

  recordLineageDeath(id, cause = "death") {
    const definition = SPECIES_BY_ID[id];
    if (!definition) return false;
    const isNew = !this.fossilCollection.has(id);
    this.fossilCollection.add(id);
    this.runFossils.add(id);
    if (id === this.lineagePathId) {
      this.lineageEnded = true;
      this.lineageDraft = [];
    }
    if (isNew) {
      this.pushStory(`${definition.name} enters the Fossil Collection after ${cause}.`, "fossil");
      this.onFossilCollected({ definition, cause, total: this.fossilCollection.size, maximum: SPECIES.length });
    }
    return isNew;
  }

  get nextEvolutionCheckpoint() {
    const choices = this.evolutionChoices();
    if (choices.length > 0) return Math.min(...choices.map(choice => choice.cost));
    const frontier = SPECIES.filter(definition => !this.runReached.has(definition.id)
      && definition.requires.every(required => this.runReached.has(required)));
    return frontier.length ? Math.min(...frontier.map(definition => this.speciesEvolutionCost(definition.id))) : 0;
  }

  discoverSpecies(id) {
    const definition = SPECIES_BY_ID[id];
    const status = this.speciesStatus(id);
    const evolutionCost = this.speciesEvolutionCost(id);
    if (!definition || this.awaitingCataclysm || status.state !== "available" || !this.spend("evolutionEnergy", evolutionCost)) return false;

    this.runReached.add(id);
    this.activeLineageId = id;
    this.populations.set(id, 1);
    definition.grantsTraits.forEach(trait => {
      this.activeTraits.add(trait);
      this.knownTraits.add(trait);
    });
    this.clues.add(id);

    if (!this.known.has(id)) {
      this.known.add(id);
      this.runNew.add(id);
      this.onDiscovery({ kind: "species", definition, total: this.known.size, maximum: SPECIES.length, nextClue: this.findNextClue(id) });
    } else {
      const before = this.mastery.get(id) || 0;
      const after = Math.min(3, before + 1);
      this.mastery.set(id, after);
      if (after > before) {
        this.dna += 1;
        this.pushStory(`${definition.name} reaches Mastery ${after}. Its rediscovery yields 1 DNA Fragment.`, "mastery");
      }
    }

    this.pushStory(`${definition.name} establishes a population in the ${capitalize(definition.biome)}.`, "discovery");
    return this.changed();
  }

  setActiveSpecies(id) {
    if (!this.isSpeciesLiving(id) || !SPECIES_BY_ID[id] || this.worldEnded || this.awaitingCataclysm) return false;
    if (this.activeLineageId === id) return true;
    this.activeLineageId = id;
    return this.changed();
  }

  isSpeciesLiving(id) {
    return this.runReached.has(id) && (this.populations.get(id) || 0) > 0;
  }

  reconcileActiveSpecies() {
    if (this.isSpeciesLiving(this.activeLineageId)) return this.activeLineageId;
    this.activeLineageId = [...this.populations.entries()]
      .filter(([id, population]) => population > 0 && this.runReached.has(id) && SPECIES_BY_ID[id])
      .sort((left, right) => (SPECIES_BY_ID[right[0]]?.cost || 0) - (SPECIES_BY_ID[left[0]]?.cost || 0))[0]?.[0] || null;
    return this.activeLineageId;
  }

  populationGrowthCost(id) {
    if (!this.runReached.has(id)) return Infinity;
    const base = 30 + Math.max(1, Math.round(this.populations.get(id) || 1)) * 20;
    return Math.max(10, Math.round(base * (1 - (this.worldFeatures?.nursery || 0) * 0.12)));
  }

  growPopulation(id) {
    if (!this.isSpeciesLiving(id) || this.worldEnded || this.awaitingCataclysm) return false;
    const cost = this.populationGrowthCost(id);
    if (!this.spend("energy", cost)) return false;
    this.populations.set(id, (this.populations.get(id) || 1) + 1);
    return this.changed();
  }

  populationBalanceTarget(id) {
    if (!this.isSpeciesLiving(id)) return 0;
    const definition = SPECIES_BY_ID[id];
    const eco = ecologyOf(definition);
    const peers = [...this.populations.entries()]
      .filter(([peerId, population]) => peerId !== id && population > 0 && ecologyOf(SPECIES_BY_ID[peerId])?.role !== ROLE.POST)
      .map(([, population]) => population)
      .sort((left, right) => left - right);
    const median = peers.length
      ? peers.length % 2 ? peers[(peers.length - 1) / 2] : (peers[peers.length / 2 - 1] + peers[peers.length / 2]) / 2
      : Math.max(2, (eco?.cap || 8) * 0.45);
    return Math.max(1, Math.min((eco?.cap || 20) * 0.75, median));
  }

  populationBalanceCost(id) {
    if (!this.isSpeciesLiving(id)) return Infinity;
    const current = this.populations.get(id) || 0;
    const distance = Math.abs(current - this.populationBalanceTarget(id));
    const discount = 1 - (this.worldFeatures?.stewardship || 0) * 0.15;
    return Math.max(40, Math.round((100 + distance * 24) * discount));
  }

  balancePopulation(id) {
    if (!this.isSpeciesLiving(id) || this.worldEnded || this.awaitingCataclysm) return false;
    const current = this.populations.get(id) || 0;
    const target = this.populationBalanceTarget(id);
    if (Math.abs(current - target) < 0.15) return false;
    if (!this.spend("energy", this.populationBalanceCost(id))) return false;
    const strength = 0.55 + (this.worldFeatures?.stewardship || 0) * 0.1;
    this.populations.set(id, current + (target - current) * strength);
    this.extinctionGrace[id] = 0;
    this.pushStory(`${SPECIES_BY_ID[id]?.name || id} is guided toward a healthier population balance.`, "action");
    return this.changed();
  }

  buyWorldFeature(type) {
    const feature = WORLD_FEATURES[type];
    const level = this.worldFeatures?.[type] || 0;
    if (!feature || level >= feature.maxLevel || this.worldEnded || this.awaitingCataclysm) return false;
    if (!this.spend("energy", worldFeatureCost(type, level))) return false;
    this.worldFeatures[type] = level + 1;
    if (type === "habitat") {
      const ratio = (1 + this.worldFeatures.habitat * 0.2) / (1 + level * 0.2);
      for (const biome of this.biomeState.values()) {
        biome.plantCapacity *= ratio;
        biome.plantStock *= ratio;
        biome.fertility *= ratio;
      }
    }
    this.pushStory(`${feature.name} reaches level ${level + 1}.`, "action");
    return this.changed();
  }

  // ---- Intervention actions: the active loop for managing the food web. ----

  actionCooldown(key) {
    return this.actionCooldowns?.[key] || 0;
  }

  interventionStatus(key) {
    const meta = INTERVENTIONS[key];
    if (!meta) return null;
    const cooldown = this.actionCooldown(key);
    const affordable = (this[meta.costResource] || 0) >= meta.cost;
    return { ...meta, cooldown, affordable, ready: cooldown <= 0 && affordable && !this.worldEnded && !this.awaitingCataclysm };
  }

  startCooldown(key) {
    const base = INTERVENTIONS[key]?.baseCooldown || 10;
    this.actionCooldowns[key] = this.fast ? Math.max(1, base * 0.2) : base;
  }

  // Fertilize a biome: a temporary surge of flora (fertility decays in the sim)
  // that lets more herbivores feed -- the answer to an overgrazed biome.
  boostPlants(biomeId = this.dominantBiome?.id) {
    if (this.worldEnded || this.awaitingCataclysm || this.actionCooldown("boostPlants") > 0) return false;
    const state = this.biomeState.get(biomeId);
    if (!state || !this.spend("energy", INTERVENTIONS.boostPlants.cost)) return false;
    state.fertility += state.plantCapacity * 0.6;
    state.plantStock = Math.min(state.plantCapacity + state.fertility, state.plantStock + state.plantCapacity * 0.4);
    this.startCooldown("boostPlants");
    this.pushStory(`Plant growth surges across the ${capitalize(biomeId)}.`, "action");
    return this.changed();
  }

  // Thin an overgrown population to relieve grazing or predator pressure.
  cullSpecies(id) {
    if (this.worldEnded || this.awaitingCataclysm || this.actionCooldown("cull") > 0) return false;
    const pop = this.populations.get(id);
    if (!pop || pop <= 1 || !this.spend("adaptation", INTERVENTIONS.cull.cost)) return false;
    this.populations.set(id, Math.max(1, pop * 0.55));
    this.startCooldown("cull");
    this.pushStory(`${SPECIES_BY_ID[id]?.name || id} is culled to ease pressure on the ecosystem.`, "action");
    return this.changed();
  }

  // Shelter a collapsing species: it cannot fall to extinction for a while.
  protectSpecies(id) {
    if (this.worldEnded || this.awaitingCataclysm || this.actionCooldown("protect") > 0 || !this.isSpeciesLiving(id)) return false;
    if (!this.spend("adaptation", INTERVENTIONS.protect.cost)) return false;
    this.protectedUntil[id] = this.worldAgeSeconds + (this.fast ? 12 : 90);
    this.extinctionGrace[id] = 0;
    this.startCooldown("protect");
    this.pushStory(`${SPECIES_BY_ID[id]?.name || id} is placed under active protection.`, "action");
    return this.changed();
  }

  // Seed a meaningful population of a reached species into its biome (a bigger,
  // pricier version of growPopulation used to reintroduce after a crash).
  introduceSpecies(id, amount = 3) {
    if (this.worldEnded || this.awaitingCataclysm || !this.runReached.has(id) || this.actionCooldown("introduce") > 0) return false;
    amount = positiveFinite(amount, 3);
    const cost = this.populationGrowthCost(id);
    if (!this.spend("energy", cost)) return false;
    this.populations.set(id, (this.populations.get(id) || 0) + amount);
    this.extinctionGrace[id] = 0;
    this.startCooldown("introduce");
    return this.changed();
  }

  // Calm the whole biosphere: refill flora everywhere and vent some pressure.
  stabiliseClimate() {
    if (this.worldEnded || this.awaitingCataclysm || this.actionCooldown("stabilise") > 0) return false;
    if (!this.spend("adaptation", INTERVENTIONS.stabilise.cost)) return false;
    for (const state of this.biomeState.values()) {
      state.fertility += state.plantCapacity * 0.25;
      state.plantStock = Math.min(state.plantCapacity + state.fertility, state.plantStock + state.plantCapacity * 0.2);
    }
    this.extinctionShock = Math.max(0, (this.extinctionShock || 0) - 10);
    this.pressure = Math.max(0, this.pressure - 5);
    this.startCooldown("stabilise");
    this.pushStory("Climate stabilisation steadies the biosphere.", "action");
    return this.changed();
  }

  // The single most useful intervention right now, surfaced as a one-tap hint.
  get recommendedAction() {
    if (this.worldEnded || this.populations.size === 0) return null;
    const summary = this.ecoSummary;

    // 1. A species on the brink -> protect it.
    let weakest = null;
    for (const [id, pop] of this.populations) {
      const eco = ecologyOf(SPECIES_BY_ID[id]);
      if (!eco || eco.role === ROLE.POST) continue;
      if (!weakest || pop < weakest.pop) weakest = { id, pop };
    }
    if (weakest && weakest.pop < 1.6 && this.interventionStatus("protect").ready) {
      return { action: "protect", target: weakest.id, label: "Protect", reason: `${SPECIES_BY_ID[weakest.id]?.name} is collapsing.` };
    }

    // 2. An overgrazed biome -> boost its flora.
    let worstBiome = null;
    for (const [biomeId, state] of this.biomeState) {
      if (!worstBiome || (state.stress || 0) > worstBiome.stress) worstBiome = { biomeId, stress: state.stress || 0 };
    }
    if (worstBiome && worstBiome.stress > 0.28 && this.interventionStatus("boostPlants").ready) {
      return { action: "boostPlants", target: worstBiome.biomeId, label: "Boost Plants", reason: `${capitalize(worstBiome.biomeId)} flora is overgrazed.` };
    }

    // 3. Too many predators for the prey base -> cull the biggest predator.
    if (summary && summary.predatorPressure > 1.1) {
      let predator = null;
      for (const [id, pop] of this.populations) {
        const eco = ecologyOf(SPECIES_BY_ID[id]);
        if (eco?.role === ROLE.CARNIVORE && (!predator || pop > predator.pop)) predator = { id, pop };
      }
      if (predator && this.interventionStatus("cull").ready) {
        return { action: "cull", target: predator.id, label: "Cull", reason: `${SPECIES_BY_ID[predator.id]?.name} are overhunting prey.` };
      }
    }
    return null;
  }

  advanceEvents(seconds) {
    if (this.cells < 1 || !this.lifeTargetId || this.pendingChoice || this.awaitingCataclysm) return;
    this.choiceTimer += seconds;
    Object.keys(this.eventCooldowns).forEach(id => {
      this.eventCooldowns[id] = Math.max(0, this.eventCooldowns[id] - seconds);
    });

    const curiosity = 1 + (this.mutationGenome.curiosity || 0) * 0.1;
    const choiceInterval = (this.fast ? 8 : 300) / curiosity;
    // The collection loop only schedules the active animal's authored peril.
    // Legacy events remain callable for old saves, but cannot interrupt play.
    if (this.choiceTimer >= choiceInterval) {
      this.choiceTimer = 0;
      const encounter = this.lifeEncounterEvent();
      if (encounter) this.triggerChoiceEvent(encounter.id);
    }
  }

  triggerAmbientEvent() {
    if (this.worldEnded || this.awaitingCataclysm || this.pendingChoice) return false;
    const eligible = AMBIENT_EVENTS.filter(event => this.eventEligible(event) && !this.eventCooldowns[event.id]);
    if (eligible.length === 0) return false;
    const event = eligible[Math.floor(this.random() * eligible.length)];
    this.eventCooldowns[event.id] = event.cooldown * (this.fast ? 4 : 120);
    this.applyAmbientEffect(event);
    this.pushStory(event.text, "ambient");
    return true;
  }

  triggerChoiceEvent(forcedId = null) {
    if (this.pendingChoice || this.worldEnded || this.awaitingCataclysm) return false;
    if (!forcedId && this.lineageChoices().some(choice => choice.state === "available")) return false;
    const eligible = CHOICE_EVENTS.filter(event => this.eventEligible(event) && !this.eventCooldowns[event.id]);
    const forced = forcedId ? eligible.find(event => event.id === forcedId) : null;
    if (forcedId && !forced) return false;
    let event = forced;
    if (!event && eligible.length > 0) {
      const pityEvent = eligible.find(item => item.pity && (this.eventPity[item.id] || 0) >= item.pity);
      event = pityEvent || eligible[Math.floor(this.random() * eligible.length)];
    }
    if (!event) return false;
    CHOICE_EVENTS.filter(item => item.pity && item.id !== event.id).forEach(item => {
      this.eventPity[item.id] = (this.eventPity[item.id] || 0) + 1;
    });

    this.eventPity[event.id] = 0;
    if (event.lifeTarget) this.stories.add(`${event.id}_${this.attemptNumber}`);
    this.eventCooldowns[event.id] = event.cooldown * (this.fast ? 5 : 180);
    this.pendingChoice = event;
    this.onChoiceEvent(event);
    this.notify();
    return true;
  }

  resolveChoice(optionId) {
    if (!this.pendingChoice || this.worldEnded) return false;
    const option = this.pendingChoice.options.find(item => item.id === optionId);
    if (!option || !this.canResolveChoice(option)) return false;
    const eventTitle = this.pendingChoice.title;
    // Capture the id up front: a roll failure can call failAttempt, which now
    // clears pendingChoice, so reading this.pendingChoice.id afterward would throw.
    const eventId = this.pendingChoice.id;
    this.applyEffects(option.effects);
    let rollSummary = "";
    if (option.effects?.roll) {
      const rule = option.effects.roll;
      const natural = 1 + Math.floor(this.random() * 20);
      const bonus = rule.bonusTrait && this.activeTraits.has(rule.bonusTrait) ? 2 : 0;
      const total = natural + bonus;
      const success = total >= rule.difficulty;
      const resultEffects = success ? rule.success : rule.failure;
      this.applyEffects(resultEffects || {});
      this.lastDiceRoll = {
        eventId,
        natural,
        bonus,
        total,
        difficulty: rule.difficulty,
        success,
        text: success ? rule.successText : rule.failureText
      };
      rollSummary = ` d20 ${natural}${bonus ? ` + ${bonus}` : ""} = ${total} vs ${rule.difficulty}: ${this.lastDiceRoll.text}`;
      this.onDiceRoll(this.lastDiceRoll);
    }
    this.pushStory(`${eventTitle}: ${option.label}.${rollSummary || ` ${option.description}`}`, option.effects?.roll ? "dice" : "choice");
    this.pendingChoice = null;
    this.totalChoiceEvents += 1;
    return this.changed();
  }

  canResolveChoice(option) {
    if (!option) return false;
    const effects = option.effects || {};
    if ((effects.energy || 0) < 0 && this.energy < -effects.energy) return false;
    if ((effects.adaptation || 0) < 0 && this.adaptation < -effects.adaptation) return false;
    return true;
  }

  // A life-target encounter is the d20 peril authored for the animal currently
  // growing (content.js LIFE_TARGETS `encounter`). It fires once per attempt
  // once development reaches the animal's `encounterStage`.
  lifeEncounterEvent() {
    const target = this.lifeTargetId ? LIFE_TARGETS_BY_ID[this.lifeTargetId] : null;
    if (!target?.encounter) return null;
    const event = CHOICE_EVENTS.find(item => item.id === target.encounter);
    return event && this.eventEligible(event) ? event : null;
  }

  eventEligible(event) {
    if (event.lifeTarget) {
      const target = LIFE_TARGETS_BY_ID[event.lifeTarget];
      const stageNeeded = target?.encounterStage ?? 2;
      return this.lifeTargetId === event.lifeTarget
        && this.lifeStageIndex >= stageNeeded
        && !this.stories.has(`${event.id}_${this.attemptNumber}`);
    }
    return event.requires.every(id => this.worldBiomes.some(biome => biome.id === id) || this.isSpeciesLiving(id));
  }

  applyAmbientEffect(event) {
    if (event.effect === "population") {
      const speciesId = event.requires.find(id => this.isSpeciesLiving(id));
      if (speciesId) this.populations.set(speciesId, this.populations.get(speciesId) + event.amount);
    } else if (event.effect === "clue") {
      if (this.runReached.has("fish")) this.clues.add("shark");
    } else if (event.effect === "memory") {
      this.evolutionMemory += event.amount;
    } else if (event.effect === "knowledge") {
      this.discoveryKnowledge += event.amount;
    } else {
      this[event.effect] += event.amount;
    }
  }

  applyEffects(effects) {
    if (effects.energy) this.energy = Math.max(0, this.energy + effects.energy);
    if (effects.adaptation) this.adaptation = Math.max(0, this.adaptation + effects.adaptation);
    if (effects.pressure) this.pressure = Math.max(0, Math.min(100, this.pressure + effects.pressure));
    if (effects.knowledge) this.discoveryKnowledge += effects.knowledge;
    if (effects.memory) this.evolutionMemory += effects.memory;
    if (effects.clue) this.clues.add(effects.clue);
    if (effects.story) this.stories.add(effects.story);
    if (effects.trait) {
      this.activeTraits.add(effects.trait);
      this.knownTraits.add(effects.trait);
    }
    if (effects.population) {
      const target = this.pendingChoice?.requires.find(id => this.isSpeciesLiving(id));
      if (target) this.populations.set(target, Math.max(0.1, this.populations.get(target) + effects.population));
    }
    if (effects.eliminatePopulation) {
      const target = effects.targetSpecies || this.pendingChoice?.requires.find(id => this.isSpeciesLiving(id));
      if (target && this.isSpeciesLiving(target)) {
        this.populations.delete(target);
        this.recordLineageDeath(target, "a failed d20 encounter");
        this.reconcileActiveSpecies();
      }
    }
    if (effects.failAttempt) this.failLifeAttempt(effects.failAttempt);
  }

  selectPreparation(id) {
    if (!this.extinction.preparation.includes(id) || this.pressure < 70 || this.worldEnded || this.selectedPreparation || this.adaptation < 50) return false;
    this.selectedPreparation = id;
    const preparation = this.extinction.preparationDetails?.[id];
    if (preparation?.trait) this.activeTraits.add(preparation.trait);
    this.adaptation -= 50;
    return this.changed();
  }

  resolveExtinction() {
    if (!this.awaitingCataclysm || this.worldEnded) return false;
    this.worldEnded = true;
    this.knownExtinctions.add(this.extinction.id);

    const reached = [...this.runReached];
    const living = reached.filter(id => this.isSpeciesLiving(id));
    const preparation = this.extinction.preparationDetails?.[this.selectedPreparation] || null;
    const survivalFraction = Math.min(0.8, 0.25 + (preparation?.survival || 0) + (this.genome.survival || 0) * 0.04);
    const survivorCount = living.length > 0 ? Math.max(1, Math.ceil(living.length * survivalFraction)) : 0;
    const weighted = living.flatMap(id => {
      const definition = SPECIES_BY_ID[id];
      const resistant = definition.grantsTraits.some(trait => this.extinction.resistantTraits.includes(trait));
      const prepared = preparation && (definition.grantsTraits.includes(preparation.trait) || definition.biome === preparation.biome);
      return resistant || prepared ? [id, id] : [id];
    });
    const survivors = [];
    for (const id of deterministicShuffle(weighted, () => this.random())) {
      if (!survivors.includes(id)) survivors.push(id);
      if (survivors.length >= survivorCount) break;
    }
    const fossilsBefore = this.fossilCollection.size;
    reached.filter(id => !survivors.includes(id)).forEach(id => this.recordLineageDeath(id, this.extinction.name));
    survivors.forEach(id => {
      if (!this.survivorStamps.has(id)) this.survivorStamps.set(id, new Set());
      this.survivorStamps.get(id).add(this.extinction.id);
    });
    if (!survivors.includes(this.fossilSpecies)) this.fossilSpecies = null;
    this.pendingChoice = null;

    const rewards = {
      memory: Math.max(4, reached.length + this.runNew.size),
      dna: Math.max(2, Math.ceil(reached.length / 2) + survivors.length),
      mutation: Math.max(2, 2 + Math.floor(this.runNew.size / 6) + Math.floor(living.length / 15) + (this.selectedPreparation ? 0 : 1)),
      knowledge: this.runNew.size > 0 ? Math.max(1, Math.ceil(this.runNew.size / 3)) : 1
    };
    this.evolutionMemory += rewards.memory;
    this.dna += rewards.dna;
    this.mutationPoints += rewards.mutation;
    this.discoveryKnowledge += rewards.knowledge;

    const summary = {
      extinction: this.extinction,
      reached: reached.length,
      newDiscoveries: this.runNew.size,
      newFossils: this.fossilCollection.size - fossilsBefore,
      survivors,
      rewards,
      cellularAvailable: !this.unlockedOrigins.has("cellular") && this.evolutionMemory >= ORIGIN_ANCHORS.find(item => item.id === "cellular").memoryCost
    };
    summary.record = this.recordRun(reached, survivors);
    summary.score = summary.record.score;
    this.completedRunSummary = summary;
    this.onExtinction(summary);
    this.notify();
    return summary;
  }

  // Each completed world produces a leaderboard run. The score rewards
  // reaching far up the tree, surviving long, and getting deep into time.
  recordRun(reached, survivors) {
    const apex = this.currentCreature;
    const score = this.currentScore + survivors.length * 60;
    const entry = {
      world: this.worldNumber,
      species: reached.length,
      newSpecies: this.runNew.size,
      apex: apex.label,
      apexGlyph: apex.glyph,
      extinction: this.extinction.name,
      ageSeconds: Math.floor(this.worldAgeSeconds),
      score,
      at: Date.now()
    };
    this.leaderboard.push(entry);
    this.leaderboard.sort((left, right) => right.score - left.score);
    this.leaderboard = this.leaderboard.slice(0, LEADERBOARD_SIZE);
    this.bestScore = Math.max(this.bestScore, score);
    return entry;
  }

  unlockOriginAnchor(id) {
    const anchor = ORIGIN_ANCHORS.find(item => item.id === id);
    if (!anchor || this.unlockedOrigins.has(id) || this.evolutionMemory < anchor.memoryCost) return false;
    this.evolutionMemory -= anchor.memoryCost;
    this.unlockedOrigins.add(id);
    this.activeOrigin = id;
    return this.changed();
  }

  buyGenomeUpgrade(type) {
    const upgrade = GENOME_UPGRADES[type];
    if (!upgrade) return false;
    const level = this.genome[type] || 0;
    const cost = genomeUpgradeCost(level);
    if (level >= upgrade.maxLevel || this.dna < cost) return false;
    this.dna -= cost;
    this.genome[type] = level + 1;
    this.genomeUpgradesBought += 1;
    return this.changed();
  }

  buyMemoryUpgrade(type) {
    const upgrade = MEMORY_UPGRADES[type];
    if (!upgrade) return false;
    const level = this.memoryUpgrades[type] || 0;
    const cost = memoryUpgradeCost(type, level);
    if (level >= upgrade.maxLevel || this.evolutionMemory < cost) return false;
    this.evolutionMemory -= cost;
    this.memoryUpgrades[type] = level + 1;
    return this.changed();
  }

  buyMutationUpgrade(type) {
    const upgrade = MUTATION_UPGRADES[type];
    if (!upgrade) return false;
    const level = this.mutationGenome[type] || 0;
    const cost = mutationUpgradeCost(type, level);
    if (level >= upgrade.maxLevel || this.mutationPoints < cost) return false;
    this.mutationPoints -= cost;
    this.mutationGenome[type] = level + 1;
    return this.changed();
  }

  revealHiddenCondition() {
    if (this.revealedHiddenModifier || this.mutationPoints < 1 || this.worldEnded || this.awaitingCataclysm) return false;
    this.mutationPoints -= 1;
    this.revealedHiddenModifier = true;
    this.pushStory(`Mutation insight reveals a hidden condition: ${this.hiddenModifier.name}.`, "mutation");
    return this.changed();
  }

  ventPressure() {
    if (this.mutationPoints < 2 || this.worldEnded || this.awaitingCataclysm || this.pressure < 10) return false;
    this.mutationPoints -= 2;
    this.pressure = Math.max(0, this.pressure - 15);
    this.pushStory("Engineered resilience vents extinction pressure from the biosphere.", "mutation");
    return this.changed();
  }

  setActiveOrigin(id) {
    if (!this.unlockedOrigins.has(id) || !this.worldEnded) return false;
    this.activeOrigin = id;
    return this.changed();
  }

  setFossilSpecies(id) {
    if (id !== null && !this.known.has(id)) return false;
    this.fossilSpecies = id;
    return this.changed();
  }

  startNextWorld() {
    if (!this.worldEnded) return false;
    this.beginWorld();
    return true;
  }

  albumProgress(albumId) {
    const members = albumId === "all"
      ? SPECIES
      : albumId === "survivors"
        ? SPECIES.filter(item => this.survivorStamps.has(item.id))
        : SPECIES.filter(item => item.albums.includes(albumId));
    return { known: members.filter(item => this.known.has(item.id)).length, total: members.length, members };
  }

  atlasState(id) {
    if (this.known.has(id)) return "discovered";
    const status = this.speciesStatus(id);
    if (this.clues.has(id) || status.state === "available" || status.state === "revealed") return "revealed";
    const definition = SPECIES_BY_ID[id];
    if (definition.requires.some(required => this.known.has(required))) return "silhouette";
    return "hidden";
  }

  entryClue(id) {
    const definition = SPECIES_BY_ID[id];
    const status = this.speciesStatus(id);
    if (this.known.has(id)) return definition.fact;
    if (this.atlasState(id) === "hidden") return "No reliable record exists yet.";
    return status.reasons[0] || definition.clue;
  }

  suggestedTargets() {
    const candidates = SPECIES.filter(item => !this.known.has(item.id)).map(item => ({ item, status: this.speciesStatus(item.id) }));
    return {
      achievable: candidates.find(candidate => candidate.status.state === "available")?.item || null,
      deduction: candidates.find(candidate => candidate.status.state === "revealed")?.item || null,
      aspirational: candidates.find(candidate => candidate.item.rarity === "Mythic" || candidate.item.cost >= 300)?.item || null
    };
  }

  findNextClue(id) {
    const child = SPECIES.find(item => item.requires.includes(id) && !this.known.has(item.id));
    if (child) {
      this.clues.add(child.id);
      return child.clue;
    }
    return "A different world or ecological story may reveal another route.";
  }

  pushStory(text, type) {
    this.eventLog.unshift({ id: `${this.worldNumber}-${this.worldAgeSeconds}-${this.eventLog.length}`, text, type, age: this.worldAgeSeconds });
    this.eventLog = this.eventLog.slice(0, 24);
  }

  spend(resource, amount) {
    if (this.worldEnded || this[resource] + 1e-9 < amount) return false;
    this[resource] -= amount;
    return true;
  }

  changed() {
    this.notify();
    return true;
  }

  notify() {
    this.checkWorldObjectives();
    this.checkAchievements();
    this.onChange(this);
  }

  checkAchievements() {
    if (this._checkingAchievements) return;
    this._checkingAchievements = true;
    for (const achievement of ACHIEVEMENTS) {
      if (this.unlockedAchievements.has(achievement.id)) continue;
      let passed = false;
      try {
        passed = achievement.check(this);
      } catch {
        passed = false;
      }
      if (passed) {
        this.unlockedAchievements.add(achievement.id);
        this.onAchievement(achievement);
      }
    }
    this._checkingAchievements = false;
  }

  get achievementProgress() {
    return { unlocked: this.unlockedAchievements.size, total: ACHIEVEMENTS.length };
  }

  random() {
    this.rngState = (Math.imul(this.rngState, 1664525) + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  }

  exportSnapshot() {
    return {
      version: 9,
      profileSeed: this.profileSeed,
      known: [...this.known],
      knownOrigins: [...this.knownOrigins],
      knownTraits: [...this.knownTraits],
      knownWorlds: [...this.knownWorlds],
      knownExtinctions: [...this.knownExtinctions],
      stories: [...this.stories],
      clues: [...this.clues],
      survivorStamps: [...this.survivorStamps].map(([id, stamps]) => [id, [...stamps]]),
      fossilCollection: [...this.fossilCollection],
      lifeCollection: [...this.lifeCollection],
      mastery: [...this.mastery],
      unlockedOrigins: [...this.unlockedOrigins],
      activeOrigin: this.activeOrigin,
      fossilSpecies: this.fossilSpecies,
      evolutionMemory: this.evolutionMemory,
      dna: this.dna,
      mutationPoints: this.mutationPoints,
      discoveryKnowledge: this.discoveryKnowledge,
      genome: { ...this.genome },
      memoryUpgrades: { ...this.memoryUpgrades },
      mutationGenome: { ...this.mutationGenome },
      worldNumber: this.worldNumber,
      eventPity: this.eventPity,
      totalChoiceEvents: this.totalChoiceEvents,
      genomeUpgradesBought: this.genomeUpgradesBought,
      unlockedAchievements: [...this.unlockedAchievements],
      leaderboard: this.leaderboard,
      bestScore: this.bestScore,
      savedAt: Date.now(),
      run: {
        worldSeed: this.worldSeed,
        runOrigin: this.runOrigin,
        rngState: this.rngState,
        visibleModifiers: this.visibleModifiers.map(item => item.id),
        hiddenModifier: this.hiddenModifier.id,
        worldBiomes: this.worldBiomes.map(item => item.id),
        extinction: this.extinction.id,
        energy: this.energy,
        atoms: this.atoms,
        molecules: this.molecules,
        organics: this.organics,
        cells: this.cells,
        totalOrigins: this.totalOrigins,
        adaptation: this.adaptation,
        evolutionEnergy: this.evolutionEnergy,
        pressure: this.pressure,
        worldAgeSeconds: this.worldAgeSeconds,
        runReached: [...this.runReached],
        activeLineageId: this.activeLineageId,
        lineagePathId: this.lineagePathId,
        lineageDraft: this.lineageDraft,
        lineageHistory: this.lineageHistory,
        lineageEnded: this.lineageEnded,
        runFossils: [...this.runFossils],
        lifeTargetId: this.lifeTargetId,
        lifeTargetDraft: this.lifeTargetDraft,
        lifeStageIndex: this.lifeStageIndex,
        lifeStageProgress: this.lifeStageProgress,
        attemptNumber: this.attemptNumber,
        runNew: [...this.runNew],
        populations: [...this.populations],
        activeTraits: [...this.activeTraits],
        eventLog: this.eventLog,
        eventCooldowns: this.eventCooldowns,
        ambientTimer: this.ambientTimer,
        choiceTimer: this.choiceTimer,
        pendingChoice: this.pendingChoice?.id || null,
        lastDiceRoll: this.lastDiceRoll,
        awaitingCataclysm: this.awaitingCataclysm,
        worldEnded: this.worldEnded,
        extinctionReadyAnnounced: this.extinctionReadyAnnounced,
        revealedHiddenModifier: this.revealedHiddenModifier,
        selectedPreparation: this.selectedPreparation,
        completedObjectives: [...this.completedObjectives],
        objectiveBalanceSeconds: this.objectiveBalanceSeconds,
        completedRunSummary: serializeRunSummary(this.completedRunSummary),
        biomeState: [...this.biomeState].map(([id, state]) => [id, { ...state }]),
        extinctionGrace: { ...this.extinctionGrace },
        protectedUntil: { ...this.protectedUntil },
        extinctionShock: this.extinctionShock,
        actionCooldowns: { ...this.actionCooldowns },
        worldFeatures: { ...this.worldFeatures }
      }
    };
  }

  restore(snapshot) {
    this.profileSeed = finiteNumber(snapshot.profileSeed, this.profileSeed) >>> 0;
    this.known = new Set(arrayOrEmpty(snapshot.known).filter(id => SPECIES_BY_ID[id]));
    this.knownOrigins = new Set(arrayOrEmpty(snapshot.knownOrigins));
    this.knownTraits = new Set(arrayOrEmpty(snapshot.knownTraits));
    this.knownWorlds = new Set(arrayOrEmpty(snapshot.knownWorlds));
    this.knownExtinctions = new Set(arrayOrEmpty(snapshot.knownExtinctions));
    this.stories = new Set(arrayOrEmpty(snapshot.stories));
    this.clues = new Set(arrayOrEmpty(snapshot.clues));
    this.survivorStamps = new Map(arrayOrEmpty(snapshot.survivorStamps)
      .filter(entry => Array.isArray(entry) && SPECIES_BY_ID[entry[0]])
      .map(([id, stamps]) => [id, new Set(arrayOrEmpty(stamps))]));
    this.fossilCollection = new Set(arrayOrEmpty(snapshot.fossilCollection).filter(id => SPECIES_BY_ID[id]));
    this.lifeCollection = new Set(arrayOrEmpty(snapshot.lifeCollection).filter(id => LIFE_TARGETS_BY_ID[id]));
    this.mastery = new Map(arrayOrEmpty(snapshot.mastery)
      .filter(entry => Array.isArray(entry) && SPECIES_BY_ID[entry[0]])
      .map(([id, level]) => [id, Math.min(3, Math.floor(nonnegativeFinite(level)))]));
    this.unlockedOrigins = new Set(arrayOrEmpty(snapshot.unlockedOrigins).filter(id => ORIGIN_ANCHORS.some(anchor => anchor.id === id)));
    if (this.unlockedOrigins.size === 0) this.unlockedOrigins.add("atomic");
    this.activeOrigin = this.unlockedOrigins.has(snapshot.activeOrigin) ? snapshot.activeOrigin : "atomic";
    this.fossilSpecies = SPECIES_BY_ID[snapshot.fossilSpecies] ? snapshot.fossilSpecies : null;
    this.evolutionMemory = nonnegativeFinite(snapshot.evolutionMemory);
    this.dna = nonnegativeFinite(snapshot.dna);
    this.mutationPoints = nonnegativeFinite(snapshot.mutationPoints);
    this.discoveryKnowledge = nonnegativeFinite(snapshot.discoveryKnowledge);
    const savedGenome = isPlainObject(snapshot.genome) ? snapshot.genome : {};
    this.genome = Object.fromEntries(Object.entries(GENOME_UPGRADES).map(([key, upgrade]) => [
      key,
      Math.min(upgrade.maxLevel, Math.floor(nonnegativeFinite(savedGenome[key])))
    ]));
    const savedMemory = isPlainObject(snapshot.memoryUpgrades) ? snapshot.memoryUpgrades : {};
    this.memoryUpgrades = Object.fromEntries(Object.entries(MEMORY_UPGRADES).map(([key, upgrade]) => [
      key,
      Math.min(upgrade.maxLevel, Math.floor(nonnegativeFinite(savedMemory[key])))
    ]));
    const savedMutations = isPlainObject(snapshot.mutationGenome) ? snapshot.mutationGenome : {};
    this.mutationGenome = Object.fromEntries(Object.entries(MUTATION_UPGRADES).map(([key, upgrade]) => [
      key,
      Math.min(upgrade.maxLevel, Math.floor(nonnegativeFinite(savedMutations[key])))
    ]));
    this.worldNumber = snapshot.run
      ? Math.max(1, Math.floor(nonnegativeFinite(snapshot.worldNumber, 1)))
      : Math.floor(nonnegativeFinite(snapshot.worldNumber));
    this.eventPity = numericRecord(snapshot.eventPity);
    this.totalChoiceEvents = Math.floor(nonnegativeFinite(snapshot.totalChoiceEvents));
    this.genomeUpgradesBought = Math.floor(nonnegativeFinite(snapshot.genomeUpgradesBought));
    this.unlockedAchievements = new Set(arrayOrEmpty(snapshot.unlockedAchievements));
    this.leaderboard = arrayOrEmpty(snapshot.leaderboard)
      .filter(isPlainObject)
      .map(entry => ({ ...entry, score: nonnegativeFinite(entry.score), ageSeconds: nonnegativeFinite(entry.ageSeconds) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, LEADERBOARD_SIZE);
    this.bestScore = nonnegativeFinite(snapshot.bestScore);
  }

  restoreRun(run) {
    this.worldSeed = finiteNumber(run.worldSeed, mixSeed(this.profileSeed, Math.max(1, this.worldNumber))) >>> 0;
    const cellularRun = run.runOrigin === "cellular"
      || (!run.runOrigin && this.activeOrigin === "cellular" && nonnegativeFinite(run.cells) >= 1);
    this.runOrigin = cellularRun ? "cellular" : "atomic";
    this.rngState = finiteNumber(run.rngState, this.worldSeed) >>> 0;
    this.visibleModifiers = uniqueById(arrayOrEmpty(run.visibleModifiers).map(id => WORLD_MODIFIERS.find(item => item.id === id)).filter(Boolean));
    for (const modifier of WORLD_MODIFIERS) {
      if (this.visibleModifiers.length >= 2) break;
      if (!this.visibleModifiers.some(item => item.id === modifier.id)) this.visibleModifiers.push(modifier);
    }
    this.hiddenModifier = WORLD_MODIFIERS.find(item => item.id === run.hiddenModifier && !this.visibleModifiers.some(visible => visible.id === item.id))
      || WORLD_MODIFIERS.find(item => !this.visibleModifiers.some(visible => visible.id === item.id))
      || WORLD_MODIFIERS[0];
    this.worldBiomes = uniqueById(arrayOrEmpty(run.worldBiomes).map(id => BIOMES.find(item => item.id === id)).filter(Boolean));
    if (this.worldBiomes.length === 0) this.worldBiomes = BIOMES.slice(0, 2);
    if (this.worldNumber >= 3) {
      for (const biome of BIOMES) if (!this.worldBiomes.some(item => item.id === biome.id)) this.worldBiomes.push(biome);
    }
    this.dominantBiome = this.worldBiomes[0];
    this.extinction = EXTINCTIONS.find(item => item.id === run.extinction) || EXTINCTIONS[0];
    this.energy = nonnegativeFinite(run.energy);
    this.atoms = nonnegativeFinite(run.atoms);
    this.molecules = nonnegativeFinite(run.molecules);
    this.organics = nonnegativeFinite(run.organics);
    this.cells = nonnegativeFinite(run.cells);
    this.totalOrigins = nonnegativeFinite(run.totalOrigins);
    this.adaptation = nonnegativeFinite(run.adaptation);
    this.pressure = clampValue(nonnegativeFinite(run.pressure), 0, 100);
    this.worldAgeSeconds = nonnegativeFinite(run.worldAgeSeconds);
    this.runReached = new Set(arrayOrEmpty(run.runReached).filter(id => SPECIES_BY_ID[id]));
    for (const id of this.runReached) this.known.add(id);
    this.populations = new Map(arrayOrEmpty(run.populations)
      .filter(entry => Array.isArray(entry) && this.runReached.has(entry[0]) && SPECIES_BY_ID[entry[0]])
      .map(([id, population]) => [id, positiveFinite(population, 0)]));
    for (const [id, population] of this.populations) {
      if (!SPECIES_BY_ID[id] || !Number.isFinite(population) || population <= 0) this.populations.delete(id);
    }
    this.activeLineageId = run.activeLineageId && this.runReached.has(run.activeLineageId)
      ? run.activeLineageId
      : [...this.runReached].sort((left, right) => (SPECIES_BY_ID[right]?.cost || 0) - (SPECIES_BY_ID[left]?.cost || 0))[0] || null;
    this.lineagePathId = run.lineagePathId && this.runReached.has(run.lineagePathId)
      ? run.lineagePathId
      : this.activeLineageId;
    this.lineageDraft = arrayOrEmpty(run.lineageDraft).filter(id => SPECIES_BY_ID[id] && !this.runReached.has(id)).slice(0, 2);
    this.lineageHistory = arrayOrEmpty(run.lineageHistory).filter(id => SPECIES_BY_ID[id]);
    this.lineageEnded = Boolean(run.lineageEnded);
    this.runFossils = new Set(arrayOrEmpty(run.runFossils).filter(id => SPECIES_BY_ID[id]));
    this.lifeTargetId = LIFE_TARGETS_BY_ID[run.lifeTargetId] ? run.lifeTargetId : null;
    this.lifeTargetDraft = arrayOrEmpty(run.lifeTargetDraft).filter(id => LIFE_TARGETS_BY_ID[id]).slice(0, 2);
    this.lifeStageIndex = this.lifeTargetId ? Math.min(LIFE_TARGETS_BY_ID[this.lifeTargetId].stages.length - 1, Math.floor(nonnegativeFinite(run.lifeStageIndex))) : -1;
    this.lifeStageProgress = nonnegativeFinite(run.lifeStageProgress);
    this.attemptNumber = Math.max(1, Math.floor(nonnegativeFinite(run.attemptNumber, 1)));
    this.evolutionEnergy = Number.isFinite(run.evolutionEnergy)
      ? Math.max(0, run.evolutionEnergy)
      : Math.min(this.energy, this.nextEvolutionCheckpoint || this.energy);
    this.runNew = new Set(arrayOrEmpty(run.runNew).filter(id => this.runReached.has(id) && SPECIES_BY_ID[id]));
    this.reconcileActiveSpecies();
    this.activeTraits = new Set(arrayOrEmpty(run.activeTraits));
    this.eventLog = Array.isArray(run.eventLog) ? run.eventLog : [];
    this.eventCooldowns = numericRecord(run.eventCooldowns);
    this.ambientTimer = nonnegativeFinite(run.ambientTimer);
    this.choiceTimer = nonnegativeFinite(run.choiceTimer);
    const restoredChoice = CHOICE_EVENTS.find(item => item.id === run.pendingChoice) || null;
    this.pendingChoice = restoredChoice?.lifeTarget === this.lifeTargetId ? restoredChoice : null;
    this.lastDiceRoll = isPlainObject(run.lastDiceRoll) ? run.lastDiceRoll : null;
    this.awaitingCataclysm = Boolean(run.awaitingCataclysm);
    this.worldEnded = Boolean(run.worldEnded);
    if (this.collectionMode) {
      this.worldEnded = false;
      this.awaitingCataclysm = false;
      if (!this.lifeTargetId) this.pressure = 0;
    }
    if (this.worldEnded) this.awaitingCataclysm = false;
    if (this.awaitingCataclysm) this.pressure = 100;
    if (this.worldEnded) this.pendingChoice = null;
    this.extinctionReadyAnnounced = Boolean(run.extinctionReadyAnnounced);
    this.revealedHiddenModifier = Boolean(run.revealedHiddenModifier);
    this.selectedPreparation = this.extinction.preparation.includes(run.selectedPreparation) ? run.selectedPreparation : null;
    const savedWorldFeatures = isPlainObject(run.worldFeatures) ? run.worldFeatures : {};
    this.worldFeatures = Object.fromEntries(Object.entries(WORLD_FEATURES).map(([key, feature]) => [
      key,
      Math.min(feature.maxLevel, Math.floor(nonnegativeFinite(savedWorldFeatures[key])))
    ]));
    this.completedObjectives = new Set(arrayOrEmpty(run.completedObjectives)
      .filter(id => ["progress", "diversity", "balance"].includes(id)));
    this.objectiveBalanceSeconds = nonnegativeFinite(run.objectiveBalanceSeconds);
    this.completedRunSummary = this.worldEnded
      ? restoreRunSummary(run.completedRunSummary, this)
      : null;
    this.restoreEcosystem(run);
    this.notify();
  }

  // Restore the food web from a v7 save, or rebuild fresh biome pools when an
  // older save (no biomeState) is loaded so legacy saves keep working.
  restoreEcosystem(run) {
    this.biomeState = new Map(arrayOrEmpty(run.biomeState)
      .filter(entry => Array.isArray(entry)
        && (entry[0] === "cell" || BIOMES.some(biome => biome.id === entry[0]))
        && isPlainObject(entry[1]))
      .map(([id, state]) => {
        const fallback = defaultBiomeState(id, capacityScale(this));
        return [id, {
          plantCapacity: positiveFinite(state.plantCapacity, fallback.plantCapacity),
          plantStock: nonnegativeFinite(state.plantStock, fallback.plantStock),
          detritus: nonnegativeFinite(state.detritus, fallback.detritus),
          fertility: nonnegativeFinite(state.fertility),
          regen: positiveFinite(state.regen, fallback.regen),
          stress: clampValue(nonnegativeFinite(state.stress), 0, 1)
        }];
      }));
    const scale = capacityScale(this);
    for (const biome of this.worldBiomes) {
      if (!this.biomeState.has(biome.id)) this.biomeState.set(biome.id, defaultBiomeState(biome.id, scale));
    }
    if (!this.biomeState.has("cell")) this.biomeState.set("cell", defaultBiomeState("cell", scale));
    this.extinctionGrace = numericRecord(run.extinctionGrace);
    this.protectedUntil = numericRecord(run.protectedUntil);
    this.extinctionShock = nonnegativeFinite(run.extinctionShock);
    this.ecoDisturbance = 0;
    this.actionCooldowns = numericRecord(run.actionCooldowns);
    this.pendingPressureSpike = 0;
    this.popTrend = new Map();
    this.ecosystemCauses = [];
    this.ecoSummary = null;
  }
}

function buildEvolutionDepths() {
  const depths = new Map();
  const visit = (definition, trail = new Set()) => {
    if (!definition) return 1;
    if (depths.has(definition.id)) return depths.get(definition.id);
    if (definition.requires.length === 0 || trail.has(definition.id)) {
      depths.set(definition.id, 1);
      return 1;
    }
    const nextTrail = new Set(trail).add(definition.id);
    const depth = 1 + Math.max(...definition.requires.map(id => visit(SPECIES_BY_ID[id], nextTrail)));
    depths.set(definition.id, depth);
    return depth;
  };
  for (const definition of SPECIES) visit(definition);
  return depths;
}

function originDefinition(id) {
  const definitions = {
    atom: { id, name: "Atom", glyph: "A", group: "Origins", rarity: "Common", fact: "Stable matter gives the universe something to build with." },
    molecule: { id, name: "Molecule", glyph: "M", group: "Origins", rarity: "Common", fact: "Atoms discover collaboration." },
    organic: { id, name: "Organic Compound", glyph: "O", group: "Origins", rarity: "Common", fact: "Carbon begins assembling suspiciously useful shapes." },
    cell: { id, name: "Cell", glyph: "C", group: "Origins", rarity: "Uncommon", fact: "A membrane draws a line between life and everything else." }
  };
  return definitions[id];
}

function stateRank(state) {
  return { available: 0, revealed: 1, reached: 2, silhouette: 3, hidden: 4 }[state] ?? 5;
}

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function serializeRunSummary(summary) {
  if (!summary) return null;
  return {
    extinction: summary.extinction?.id || null,
    reached: nonnegativeFinite(summary.reached),
    newDiscoveries: nonnegativeFinite(summary.newDiscoveries),
    newFossils: nonnegativeFinite(summary.newFossils),
    survivors: arrayOrEmpty(summary.survivors),
    rewards: { ...summary.rewards },
    cellularAvailable: Boolean(summary.cellularAvailable),
    score: nonnegativeFinite(summary.score),
    record: isPlainObject(summary.record) ? { ...summary.record } : null
  };
}

function restoreRunSummary(value, game) {
  const saved = isPlainObject(value) ? value : {};
  const savedSurvivors = Array.isArray(saved.survivors)
    ? saved.survivors.filter(id => game.runReached.has(id) && SPECIES_BY_ID[id])
    : null;
  const survivors = savedSurvivors || [...game.runReached]
    .filter(id => game.survivorStamps.get(id)?.has(game.extinction.id));
  const savedRewards = isPlainObject(saved.rewards) ? saved.rewards : {};
  const record = isPlainObject(saved.record)
    ? { ...saved.record }
    : game.leaderboard.find(entry => entry.world === game.worldNumber) || game.leaderboard[0] || null;
  return {
    extinction: game.extinction,
    reached: Math.floor(nonnegativeFinite(saved.reached, game.runReached.size)),
    newDiscoveries: Math.floor(nonnegativeFinite(saved.newDiscoveries, game.runNew.size)),
    newFossils: Math.floor(nonnegativeFinite(saved.newFossils, game.runFossils.size)),
    survivors,
    rewards: {
      memory: nonnegativeFinite(savedRewards.memory),
      dna: nonnegativeFinite(savedRewards.dna),
      mutation: nonnegativeFinite(savedRewards.mutation),
      knowledge: nonnegativeFinite(savedRewards.knowledge)
    },
    cellularAvailable: !game.unlockedOrigins.has("cellular")
      && game.evolutionMemory >= ORIGIN_ANCHORS.find(anchor => anchor.id === "cellular").memoryCost,
    score: nonnegativeFinite(saved.score, record?.score || 0),
    record
  };
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function nonnegativeFinite(value, fallback = 0) {
  return Math.max(0, finiteNumber(value, fallback));
}

function positiveFinite(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function numericRecord(value) {
  if (!isPlainObject(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([, amount]) => Number.isFinite(amount) && amount >= 0));
}

function deterministicShuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function mixSeed(seed, worldNumber) {
  let value = (seed ^ Math.imul(worldNumber, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  return (value >>> 0) || 1;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function objectiveRewardName(resource) {
  return {
    energy: "Energy",
    adaptation: "Adaptation",
    discoveryKnowledge: "Discovery Knowledge"
  }[resource] || resource;
}
