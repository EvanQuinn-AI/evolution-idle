import {
  ACHIEVEMENTS,
  ALBUMS,
  AMBIENT_EVENTS,
  BIOMES,
  CHOICE_EVENTS,
  EXTINCTIONS,
  ORIGIN_ANCHORS,
  SPECIES,
  SPECIES_BY_ID,
  TRAITS,
  WORLD_MODIFIERS
} from "./content.js";
import { creatureForOrigin, creatureForSpecies, sceneForBiome } from "./creatures.js";
import { stepEcosystem, defaultBiomeState, capacityScale, ecologyOf, ROLE } from "./ecosystem.js";

export { ACHIEVEMENTS, ALBUMS, BIOMES, ORIGIN_ANCHORS, SPECIES, SPECIES_BY_ID, TRAITS, WORLD_MODIFIERS };
export { ecologyOf, ROLE } from "./ecosystem.js";

const LEADERBOARD_SIZE = 8;
// Early life assembles itself from energy: the chain auto-builds until the
// player has this many cells, at which point directed evolution takes over.
export const CELL_GOAL = 3;

const ORIGIN_IDS = ["atom", "molecule", "organic", "cell"];

export const GENOME_UPGRADES = {
  production: { name: "Metabolic Genome", description: "+10% Energy production per level", maxLevel: 10 },
  adaptation: { name: "Plastic Genome", description: "+10% Adaptation per level", maxLevel: 10 },
  survival: { name: "Resilient Genome", description: "+4% extinction survivors per level", maxLevel: 5 }
};

export function genomeUpgradeCost(level) {
  return 4 + level * 3;
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
    seed = 184206,
    snapshot = null,
    onChange = () => {},
    onDiscovery = () => {},
    onChoiceEvent = () => {},
    onExtinctionReady = () => {},
    onExtinction = () => {},
    onAchievement = () => {}
  } = {}) {
    this.fast = fast;
    this.profileSeed = seed >>> 0;
    this.onChange = onChange;
    this.onDiscovery = onDiscovery;
    this.onChoiceEvent = onChoiceEvent;
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
    this.mastery = new Map();
    this.unlockedOrigins = new Set(["atomic"]);
    this.activeOrigin = "atomic";
    this.fossilSpecies = null;
    this.evolutionMemory = 0;
    this.dna = 0;
    this.mutationPoints = 0;
    this.discoveryKnowledge = 0;
    this.genome = { production: 0, adaptation: 0, survival: 0 };
    this.worldNumber = 0;
    this.eventPity = {};
    this.totalChoiceEvents = 0;
    this.genomeUpgradesBought = 0;
    this.unlockedAchievements = new Set();
    this.leaderboard = [];
    this.bestScore = 0;

    if (snapshot) this.restore(snapshot);
    if (snapshot?.run) this.restoreRun(snapshot.run);
    else this.beginWorld({ initial: true });
  }

  beginWorld({ initial = false } = {}) {
    if (!initial) this.worldNumber += 1;
    if (initial && this.worldNumber === 0) this.worldNumber = 1;

    this.worldSeed = mixSeed(this.profileSeed, this.worldNumber);
    this.rngState = this.worldSeed;
    const shuffledModifiers = deterministicShuffle(WORLD_MODIFIERS, () => this.random());
    this.visibleModifiers = shuffledModifiers.slice(0, 2);
    this.hiddenModifier = shuffledModifiers[2];
    this.worldBiomes = deterministicShuffle(BIOMES, () => this.random()).slice(0, 2);
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
    this.runNew = new Set();
    this.populations = new Map();
    this.initEcosystem();
    this.activeTraits = new Set();
    this.eventLog = [];
    this.eventCooldowns = {};
    this.ambientTimer = 0;
    this.choiceTimer = 0;
    this.pendingChoice = null;
    this.awaitingCataclysm = false;
    this.worldEnded = false;
    this.extinctionReadyAnnounced = false;
    this.revealedHiddenModifier = false;
    this.selectedPreparation = null;

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
      this.populations.set(this.fossilSpecies, 1);
      this.activeLineageId = this.fossilSpecies;
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
    const originPower = 1 + this.totalOrigins * 2.5;
    const ecologyPower = [...this.populations.values()].reduce((sum, value) => sum + value, 0) * 5;
    const modifier = this.visibleModifiers.reduce((value, item) => value * (item.production || 1), 1);
    const fossil = this.fossilSpecies ? 1.15 : 1;
    const genome = 1 + (this.genome.production || 0) * 0.1;
    return (originPower + ecologyPower) * modifier * fossil * genome * (this.fast ? 25 : 1);
  }

  get adaptationRate() {
    if (this.cells < 1) return 0;
    const populations = [...this.populations.values()].reduce((sum, value) => sum + value, 0);
    const diversity = this.runReached.size;
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
    return lineageBase * this.evolutionRateMultiplier * populationBoost * worldModifier * genome * (this.fast ? 12 : 1);
  }

  get ecosystemKarma() {
    const populations = [...this.populations.values()].filter(value => value > 0);
    if (populations.length === 0) return 100;
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

  // Broader ecosystem health (0..100) that now drives extinction risk: blends
  // diversity, how well-fed consumers are, predator/prey balance, and the shock
  // of recent local extinctions. ecosystemKarma (diversity only) is kept intact.
  get ecosystemHealth() {
    const diversity = this.ecosystemKarma / 100;
    const summary = this.ecoSummary;
    if (!summary || this.populations.size === 0) {
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
    if (this.activeLineageId && this.runReached.has(this.activeLineageId)) {
      const active = SPECIES_BY_ID[this.activeLineageId];
      if (active) return { kind: "species", id: active.id, ...creatureForSpecies(active) };
    }
    let best = null;
    let bestCost = -1;
    for (const id of this.runReached) {
      const definition = SPECIES_BY_ID[id];
      if (definition && definition.cost > bestCost) {
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
    return sceneForBiome(this.dominantBiome?.id, this.worldNumber, this.currentCreature.era);
  }

  tick(seconds, { offline = false } = {}) {
    if (this.worldEnded || seconds <= 0) return;
    const elapsed = Math.min(seconds, offline ? 172800 : 1);
    this.energy += this.productionRate * elapsed;
    this.adaptation += this.adaptationRate * elapsed;
    if (this.cells > 0) this.evolutionEnergy += this.evolutionRate * elapsed;
    this.worldAgeSeconds += elapsed;
    this.autoBuildOrigins();

    // Advance the living food web. Offline gaps are bounded inside stepEcosystem
    // so a long absence stays forgiving (per the design guardrail) while active
    // play feels the full predator/prey/grazing pressure.
    if (!this.awaitingCataclysm) stepEcosystem(this, Math.min(elapsed, offline ? 4 : 1));
    this.tickActionCooldowns(elapsed);

    if (this.runReached.size > 0 && !this.awaitingCataclysm) {
      // Extinction risk now EMERGES from ecosystem health: a balanced, well-fed
      // world barely climbs (a small floor still guarantees the world ends), but
      // imbalance accelerates risk sharply, and a collapsing web climbs fastest.
      const modifier = this.visibleModifiers.reduce((value, item) => value * (item.pressure || 1), 1);
      const baseFloor = this.fast ? 1.8 : this.worldNumber === 1 ? 0.011 : 0.0006;
      const deficitGain = this.fast ? 6.5 : this.worldNumber === 1 ? 0.052 : 0.004;
      const health = this.ecosystemHealth;
      const deficit = (100 - health) / 100;
      const accel = health < 40 ? 1 + (40 - health) / 28 : 1;
      const riskRate = (baseFloor + deficitGain * deficit * accel) * modifier;
      const nextPressure = this.pressure + elapsed * riskRate + (this.pendingPressureSpike || 0);
      this.pendingPressureSpike = 0;
      this.pressure = offline ? Math.min(99, nextPressure) : Math.min(100, nextPressure);
      if (this.pressure >= 55) this.revealedHiddenModifier = true;
      if (this.pressure >= 100) {
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

  advanceOffline(seconds) {
    this.tick(Math.max(0, seconds), { offline: true });
    if (this.pressure >= 99 && !this.awaitingCataclysm) {
      this.pushStory("The world waited at the brink of catastrophe until you returned.", "extinction");
    }
    return { seconds, pausedAtFinale: this.pressure >= 99 };
  }

  generateEnergy() {
    if (this.worldEnded) return false;
    this.energy += this.fast ? 20 : 1;
    if (this.cells > 0) this.evolutionEnergy += this.fast ? 5 : 0.5;
    this.notify();
    return true;
  }

  // The origin chain assembles itself from banked energy each tick, so the
  // player never hand-clicks atoms. Tapping the creature just supplies fuel.
  autoBuildOrigins() {
    if (this.worldEnded || this.runOrigin !== "atomic") return false;
    let steps = 200;
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
    if (!this.spend("energy", 10)) return false;
    this.atoms += 1;
    this.totalOrigins += 1;
    this.discoverOrigin("atom");
    return this.changed();
  }

  createMolecule() {
    if (this.atoms < 3 || this.worldEnded) return false;
    this.atoms -= 3;
    this.molecules += 1;
    this.totalOrigins += 2;
    this.discoverOrigin("molecule");
    return this.changed();
  }

  createOrganic() {
    if (this.molecules < 3 || this.worldEnded) return false;
    this.molecules -= 3;
    this.organics += 1;
    this.totalOrigins += 3;
    this.discoverOrigin("organic");
    return this.changed();
  }

  createCell() {
    if (this.organics < 3 || this.worldEnded) return false;
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
      this.runNew.size * 250 +
      populations * 25 +
      this.worldNumber * 200
    );
  }

  speciesStatus(id) {
    const definition = SPECIES_BY_ID[id];
    if (!definition) return { state: "hidden", reasons: ["Unknown species"] };
    if (this.runReached.has(id)) return { state: "reached", reasons: [] };

    const reasons = [];
    if (this.cells < 1) reasons.push("Create a Cell");
    for (const required of definition.requires) {
      if (!this.runReached.has(required)) reasons.push(`Discover ${SPECIES_BY_ID[required].name}`);
    }
    if (definition.modifierAny && !definition.modifierAny.some(idValue => this.modifierIds.has(idValue))) {
      reasons.push("Find a compatible world modifier");
    }
    if (definition.biome !== "cell" && !this.worldBiomes.some(biome => biome.id === definition.biome)) reasons.push(`Find a world with a ${capitalize(definition.biome)}`);
    if (definition.requiresStory && !this.stories.has(definition.requiresStory)) reasons.push("Resolve a related ecosystem story");
    if (definition.minDiversity && this.runReached.size < definition.minDiversity) reasons.push(`Reach ${definition.minDiversity} species this world`);
    if (definition.knowledgeAtLeast && this.discoveryKnowledge < definition.knowledgeAtLeast) reasons.push(`Collect ${definition.knowledgeAtLeast} Discovery Knowledge`);
    if (definition.pressureAtLeast && this.pressure < definition.pressureAtLeast) reasons.push(`Let instability pass ${definition.pressureAtLeast}%`);
    if (this.evolutionEnergy < definition.cost) reasons.push(`Charge ${definition.cost} Evolution Energy`);

    const parentsKnown = definition.requires.length === 0 || definition.requires.some(required => this.runReached.has(required));
    const clueVisible = this.clues.has(id) || parentsKnown || this.known.has(id);
    const available = reasons.length === 0 && !this.worldEnded;
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
        state: this.evolutionEnergy >= definition.cost && !this.worldEnded ? "available" : "charging",
        remaining: Math.max(0, definition.cost - this.evolutionEnergy),
        direct: this.activeLineageId ? definition.requires.includes(this.activeLineageId) : definition.requires.length === 0
      });
    }
    return choices.sort((left, right) => Number(right.direct) - Number(left.direct) || left.definition.cost - right.definition.cost);
  }

  get nextEvolutionCheckpoint() {
    const choices = this.evolutionChoices();
    if (choices.length > 0) return Math.min(...choices.map(choice => choice.definition.cost));
    const frontier = SPECIES.filter(definition => !this.runReached.has(definition.id)
      && definition.requires.every(required => this.runReached.has(required)));
    return frontier.length ? Math.min(...frontier.map(definition => definition.cost)) : 0;
  }

  discoverSpecies(id) {
    const definition = SPECIES_BY_ID[id];
    const status = this.speciesStatus(id);
    if (!definition || status.state !== "available" || !this.spend("evolutionEnergy", definition.cost)) return false;

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
      this.mastery.set(id, Math.min(3, (this.mastery.get(id) || 0) + 1));
    }

    this.pushStory(`${definition.name} establishes a population in the ${capitalize(definition.biome)}.`, "discovery");
    return this.changed();
  }

  setActiveSpecies(id) {
    if (!this.runReached.has(id) || !SPECIES_BY_ID[id] || this.worldEnded) return false;
    if (this.activeLineageId === id) return true;
    this.activeLineageId = id;
    return this.changed();
  }

  populationGrowthCost(id) {
    if (!this.runReached.has(id)) return Infinity;
    return 30 + (this.populations.get(id) || 1) * 20;
  }

  growPopulation(id) {
    if (!this.runReached.has(id) || this.worldEnded) return false;
    const cost = this.populationGrowthCost(id);
    if (!this.spend("energy", cost)) return false;
    this.populations.set(id, (this.populations.get(id) || 1) + 1);
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
    return { ...meta, cooldown, affordable, ready: cooldown <= 0 && affordable && !this.worldEnded };
  }

  startCooldown(key) {
    const base = INTERVENTIONS[key]?.baseCooldown || 10;
    this.actionCooldowns[key] = this.fast ? Math.max(1, base * 0.2) : base;
  }

  // Fertilize a biome: a temporary surge of flora (fertility decays in the sim)
  // that lets more herbivores feed -- the answer to an overgrazed biome.
  boostPlants(biomeId = this.dominantBiome?.id) {
    if (this.worldEnded || this.actionCooldown("boostPlants") > 0) return false;
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
    if (this.worldEnded || this.actionCooldown("cull") > 0) return false;
    const pop = this.populations.get(id);
    if (!pop || pop <= 1 || !this.spend("adaptation", INTERVENTIONS.cull.cost)) return false;
    this.populations.set(id, Math.max(1, pop * 0.55));
    this.startCooldown("cull");
    this.pushStory(`${SPECIES_BY_ID[id]?.name || id} is culled to ease pressure on the ecosystem.`, "action");
    return this.changed();
  }

  // Shelter a collapsing species: it cannot fall to extinction for a while.
  protectSpecies(id) {
    if (this.worldEnded || this.actionCooldown("protect") > 0 || !this.runReached.has(id)) return false;
    if (!this.spend("adaptation", INTERVENTIONS.protect.cost)) return false;
    this.protectedUntil[id] = this.worldAgeSeconds + (this.fast ? 12 : 90);
    this.extinctionGrace[id] = 0;
    if (!this.populations.has(id)) this.populations.set(id, 1);
    this.startCooldown("protect");
    this.pushStory(`${SPECIES_BY_ID[id]?.name || id} is placed under active protection.`, "action");
    return this.changed();
  }

  // Seed a meaningful population of a reached species into its biome (a bigger,
  // pricier version of growPopulation used to reintroduce after a crash).
  introduceSpecies(id, amount = 3) {
    if (this.worldEnded || !this.runReached.has(id) || this.actionCooldown("introduce") > 0) return false;
    const cost = this.populationGrowthCost(id);
    if (!this.spend("energy", cost)) return false;
    this.populations.set(id, (this.populations.get(id) || 0) + amount);
    this.extinctionGrace[id] = 0;
    this.startCooldown("introduce");
    return this.changed();
  }

  // Calm the whole biosphere: refill flora everywhere and vent some pressure.
  stabiliseClimate() {
    if (this.worldEnded || this.actionCooldown("stabilise") > 0) return false;
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
    if (this.cells < 1 || this.pendingChoice || this.awaitingCataclysm) return;
    this.ambientTimer += seconds;
    this.choiceTimer += seconds;
    Object.keys(this.eventCooldowns).forEach(id => {
      this.eventCooldowns[id] = Math.max(0, this.eventCooldowns[id] - seconds);
    });

    const ambientInterval = this.fast ? 2.5 : 90;
    const choiceInterval = this.fast ? 8 : 300;
    if (this.ambientTimer >= ambientInterval) {
      this.ambientTimer = 0;
      this.triggerAmbientEvent();
    }
    if (this.choiceTimer >= choiceInterval) {
      this.choiceTimer = 0;
      this.triggerChoiceEvent();
    }
  }

  triggerAmbientEvent() {
    const eligible = AMBIENT_EVENTS.filter(event => this.eventEligible(event) && !this.eventCooldowns[event.id]);
    if (eligible.length === 0) return false;
    const event = eligible[Math.floor(this.random() * eligible.length)];
    this.eventCooldowns[event.id] = event.cooldown * (this.fast ? 4 : 120);
    this.applyAmbientEffect(event);
    this.pushStory(event.text, "ambient");
    return true;
  }

  triggerChoiceEvent(forcedId = null) {
    if (this.pendingChoice) return false;
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
    this.eventCooldowns[event.id] = event.cooldown * (this.fast ? 5 : 180);
    this.pendingChoice = event;
    this.totalChoiceEvents += 1;
    this.onChoiceEvent(event);
    this.notify();
    return true;
  }

  resolveChoice(optionId) {
    if (!this.pendingChoice) return false;
    const option = this.pendingChoice.options.find(item => item.id === optionId);
    if (!option) return false;
    const eventTitle = this.pendingChoice.title;
    this.applyEffects(option.effects);
    this.pushStory(`${eventTitle}: ${option.label}. ${option.description}`, "choice");
    this.pendingChoice = null;
    return this.changed();
  }

  eventEligible(event) {
    return event.requires.every(id => this.worldBiomes.some(biome => biome.id === id) || this.runReached.has(id));
  }

  applyAmbientEffect(event) {
    if (event.effect === "population") {
      const speciesId = event.requires.find(id => this.runReached.has(id));
      if (speciesId) this.populations.set(speciesId, (this.populations.get(speciesId) || 1) + event.amount);
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
      const target = this.pendingChoice?.requires.find(id => this.runReached.has(id));
      if (target) this.populations.set(target, Math.max(1, (this.populations.get(target) || 1) + effects.population));
    }
  }

  selectPreparation(id) {
    if (!this.extinction.preparation.includes(id) || this.pressure < 70 || this.worldEnded) return false;
    this.selectedPreparation = id;
    this.activeTraits.add("dormancy");
    this.adaptation = Math.max(0, this.adaptation - 50);
    return this.changed();
  }

  resolveExtinction() {
    if (!this.awaitingCataclysm || this.worldEnded) return false;
    this.worldEnded = true;
    this.knownExtinctions.add(this.extinction.id);

    const reached = [...this.runReached];
    const survivalFraction = Math.min(0.8, (this.selectedPreparation ? 0.45 : 0.25) + (this.genome.survival || 0) * 0.04);
    const survivorCount = Math.max(1, Math.ceil(reached.length * survivalFraction));
    const weighted = reached.flatMap(id => {
      const resistant = SPECIES_BY_ID[id].grantsTraits.some(trait => this.extinction.resistantTraits.includes(trait));
      return resistant ? [id, id] : [id];
    });
    const survivors = [];
    for (const id of deterministicShuffle(weighted, () => this.random())) {
      if (!survivors.includes(id)) survivors.push(id);
      if (survivors.length >= survivorCount) break;
    }
    survivors.forEach(id => {
      if (!this.survivorStamps.has(id)) this.survivorStamps.set(id, new Set());
      this.survivorStamps.get(id).add(this.extinction.id);
    });

    const rewards = {
      memory: Math.max(4, reached.length + this.runNew.size),
      dna: Math.max(2, Math.ceil(reached.length / 2) + survivors.length),
      mutation: Math.max(1, Math.floor(this.pressure / 30)),
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
      survivors,
      rewards,
      cellularAvailable: !this.unlockedOrigins.has("cellular") && this.evolutionMemory >= ORIGIN_ANCHORS.find(item => item.id === "cellular").memoryCost
    };
    summary.record = this.recordRun(reached, survivors);
    summary.score = summary.record.score;
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

  revealHiddenCondition() {
    if (this.revealedHiddenModifier || this.mutationPoints < 1 || this.worldEnded) return false;
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
      version: 7,
      profileSeed: this.profileSeed,
      known: [...this.known],
      knownOrigins: [...this.knownOrigins],
      knownTraits: [...this.knownTraits],
      knownWorlds: [...this.knownWorlds],
      knownExtinctions: [...this.knownExtinctions],
      stories: [...this.stories],
      clues: [...this.clues],
      survivorStamps: [...this.survivorStamps].map(([id, stamps]) => [id, [...stamps]]),
      mastery: [...this.mastery],
      unlockedOrigins: [...this.unlockedOrigins],
      activeOrigin: this.activeOrigin,
      fossilSpecies: this.fossilSpecies,
      evolutionMemory: this.evolutionMemory,
      dna: this.dna,
      mutationPoints: this.mutationPoints,
      discoveryKnowledge: this.discoveryKnowledge,
      genome: { ...this.genome },
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
        runNew: [...this.runNew],
        populations: [...this.populations],
        activeTraits: [...this.activeTraits],
        eventLog: this.eventLog,
        eventCooldowns: this.eventCooldowns,
        ambientTimer: this.ambientTimer,
        choiceTimer: this.choiceTimer,
        pendingChoice: this.pendingChoice?.id || null,
        awaitingCataclysm: this.awaitingCataclysm,
        worldEnded: this.worldEnded,
        extinctionReadyAnnounced: this.extinctionReadyAnnounced,
        revealedHiddenModifier: this.revealedHiddenModifier,
        selectedPreparation: this.selectedPreparation,
        biomeState: [...this.biomeState].map(([id, state]) => [id, { ...state }]),
        extinctionGrace: { ...this.extinctionGrace },
        protectedUntil: { ...this.protectedUntil },
        extinctionShock: this.extinctionShock,
        actionCooldowns: { ...this.actionCooldowns }
      }
    };
  }

  restore(snapshot) {
    this.profileSeed = snapshot.profileSeed || this.profileSeed;
    this.known = new Set(snapshot.known || []);
    this.knownOrigins = new Set(snapshot.knownOrigins || []);
    this.knownTraits = new Set(snapshot.knownTraits || []);
    this.knownWorlds = new Set(snapshot.knownWorlds || []);
    this.knownExtinctions = new Set(snapshot.knownExtinctions || []);
    this.stories = new Set(snapshot.stories || []);
    this.clues = new Set(snapshot.clues || []);
    this.survivorStamps = new Map((snapshot.survivorStamps || []).map(([id, stamps]) => [id, new Set(stamps)]));
    this.mastery = new Map(snapshot.mastery || []);
    this.unlockedOrigins = new Set(snapshot.unlockedOrigins || ["atomic"]);
    this.activeOrigin = snapshot.activeOrigin || "atomic";
    this.fossilSpecies = snapshot.fossilSpecies || null;
    this.evolutionMemory = snapshot.evolutionMemory || 0;
    this.dna = snapshot.dna || 0;
    this.mutationPoints = snapshot.mutationPoints || 0;
    this.discoveryKnowledge = snapshot.discoveryKnowledge || 0;
    this.genome = { production: 0, adaptation: 0, survival: 0, ...(snapshot.genome || {}) };
    this.worldNumber = snapshot.worldNumber || 0;
    this.eventPity = snapshot.eventPity || {};
    this.totalChoiceEvents = snapshot.totalChoiceEvents || 0;
    this.genomeUpgradesBought = snapshot.genomeUpgradesBought || 0;
    this.unlockedAchievements = new Set(snapshot.unlockedAchievements || []);
    this.leaderboard = Array.isArray(snapshot.leaderboard) ? snapshot.leaderboard : [];
    this.bestScore = snapshot.bestScore || 0;
  }

  restoreRun(run) {
    this.worldSeed = run.worldSeed;
    this.runOrigin = run.runOrigin || (this.activeOrigin === "cellular" && (run.cells || 0) >= 1 ? "cellular" : "atomic");
    this.rngState = run.rngState || run.worldSeed;
    this.visibleModifiers = (run.visibleModifiers || []).map(id => WORLD_MODIFIERS.find(item => item.id === id)).filter(Boolean);
    this.hiddenModifier = WORLD_MODIFIERS.find(item => item.id === run.hiddenModifier) || WORLD_MODIFIERS[0];
    this.worldBiomes = (run.worldBiomes || []).map(id => BIOMES.find(item => item.id === id)).filter(Boolean);
    if (this.worldBiomes.length === 0) this.worldBiomes = BIOMES.slice(0, 2);
    this.dominantBiome = this.worldBiomes[0];
    this.extinction = EXTINCTIONS.find(item => item.id === run.extinction) || EXTINCTIONS[0];
    this.energy = run.energy || 0;
    this.atoms = run.atoms || 0;
    this.molecules = run.molecules || 0;
    this.organics = run.organics || 0;
    this.cells = run.cells || 0;
    this.totalOrigins = run.totalOrigins || 0;
    this.adaptation = run.adaptation || 0;
    this.pressure = run.pressure || 0;
    this.worldAgeSeconds = run.worldAgeSeconds || 0;
    this.runReached = new Set(run.runReached || []);
    this.activeLineageId = run.activeLineageId && this.runReached.has(run.activeLineageId)
      ? run.activeLineageId
      : [...this.runReached].sort((left, right) => (SPECIES_BY_ID[right]?.cost || 0) - (SPECIES_BY_ID[left]?.cost || 0))[0] || null;
    this.evolutionEnergy = Number.isFinite(run.evolutionEnergy)
      ? run.evolutionEnergy
      : Math.min(run.energy || 0, this.nextEvolutionCheckpoint || run.energy || 0);
    this.runNew = new Set(run.runNew || []);
    this.populations = new Map(run.populations || []);
    this.activeTraits = new Set(run.activeTraits || []);
    this.eventLog = run.eventLog || [];
    this.eventCooldowns = run.eventCooldowns || {};
    this.ambientTimer = run.ambientTimer || 0;
    this.choiceTimer = run.choiceTimer || 0;
    this.pendingChoice = CHOICE_EVENTS.find(item => item.id === run.pendingChoice) || null;
    this.awaitingCataclysm = Boolean(run.awaitingCataclysm);
    this.worldEnded = Boolean(run.worldEnded);
    this.extinctionReadyAnnounced = Boolean(run.extinctionReadyAnnounced);
    this.revealedHiddenModifier = Boolean(run.revealedHiddenModifier);
    this.selectedPreparation = run.selectedPreparation || null;
    this.restoreEcosystem(run);
    this.notify();
  }

  // Restore the food web from a v7 save, or rebuild fresh biome pools when an
  // older save (no biomeState) is loaded so legacy saves keep working.
  restoreEcosystem(run) {
    this.biomeState = new Map((run.biomeState || []).map(([id, state]) => [id, { ...state }]));
    if (this.biomeState.size === 0) {
      const scale = capacityScale(this);
      for (const biome of this.worldBiomes) this.biomeState.set(biome.id, defaultBiomeState(biome.id, scale));
      this.biomeState.set("cell", defaultBiomeState("cell", scale));
    }
    this.extinctionGrace = run.extinctionGrace || {};
    this.protectedUntil = run.protectedUntil || {};
    this.extinctionShock = run.extinctionShock || 0;
    this.ecoDisturbance = 0;
    this.actionCooldowns = run.actionCooldowns || {};
    this.pendingPressureSpike = 0;
    this.popTrend = new Map();
    this.ecosystemCauses = [];
    this.ecoSummary = null;
  }
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
