// Living ecosystem: a readable producer -> herbivore -> carnivore -> decomposer
// food web. Imported by game.js (run each tick) and by the unit tests. No DOM
// access so it stays node-testable, mirroring creatures.js.
//
// Design priority order: READABILITY first, punishing active-play tension
// second, numerical stability third. This is intentionally NOT a precise
// Lotka-Volterra model. Ambient plant biomass relaxes toward a carrying
// capacity; consumers grow while fed and starve (steeply) when food runs out;
// predators thin their prey. The goal is legible cause-and-effect the UI can
// narrate ("grass collapsing -- overgrazed", "foxes starving -- prey crashed").

import { SPECIES_BY_ID, BIOME_ECOLOGY } from "./content.js";

export const ROLE = {
  PRODUCER: "producer",
  HERBIVORE: "herbivore",
  OMNIVORE: "omnivore",
  CARNIVORE: "carnivore",
  DECOMPOSER: "decomposer",
  POST: "post" // post-ecological (civilization / space): off the food web
};

// Species whose role or stats need correcting from the derived defaults.
const ECOLOGY_OVERRIDES = {
  sponge: { preyValue: 0.6 }, // filter feeder: cheap, abundant prey
  mollusk: { preyValue: 0.8 },
  parasitic_fungus: { role: ROLE.CARNIVORE }, // a fungus that hunts insects
  amphibian: { role: ROLE.OMNIVORE }, // eats insects as well as algae
  whale: { role: ROLE.OMNIVORE, preyValue: 2.4 }, // huge: grazes small prey, rich carcass
  lungfish: { role: ROLE.OMNIVORE },
  synapsid: { role: ROLE.OMNIVORE },
  primate: { role: ROLE.OMNIVORE },
  ape: { role: ROLE.OMNIVORE },
  human: { role: ROLE.OMNIVORE },
  bird: { role: ROLE.OMNIVORE }
};

// Reproduction tempo per taxonomic group (microbes boom, mammals crawl).
const GROUP_REPRO = {
  Microbial: 1.4, Plant: 1.15, Fungus: 1.25, Invertebrate: 1.2,
  Fish: 1.0, Vertebrate: 0.95, Reptile: 0.85, Mammal: 0.8, Civilization: 0.7
};

// Per-role tuning. Populations live on a readable 0..~20 scale, forming a
// natural pyramid (many producers/herbivores, few apex predators) via `cap`.
const ROLE_BASE = {
  producer:   { repro: 0.100, plantNeed: 0.00, meatNeed: 0.00, preyValue: 0.0, cap: 18 },
  herbivore:  { repro: 0.085, plantNeed: 0.85, meatNeed: 0.00, preyValue: 1.0, cap: 16 },
  omnivore:   { repro: 0.070, plantNeed: 0.55, meatNeed: 0.10, preyValue: 0.9, cap: 11 },
  carnivore:  { repro: 0.055, plantNeed: 0.00, meatNeed: 0.18, preyValue: 0.7, cap: 8 },
  decomposer: { repro: 0.090, plantNeed: 0.00, meatNeed: 0.00, preyValue: 0.7, cap: 14 },
  post:       { repro: 0.000, plantNeed: 0.00, meatNeed: 0.00, preyValue: 0.0, cap: 4 }
};

const PRODUCER_BIOMASS = 7;     // each producer head lifts a biome's effective plant cap
const PLANT_REGEN = 0.05;       // base fraction/sec flora relaxes toward capacity
const DECOMPOSER_NEED = 0.5;    // detritus consumed per decomposer head/sec
const STARVE_RATE = 0.11;       // slow enough to leave time for an idle player to intervene
const MAX_DECLINE = 0.30;       // prevent abrupt population collapse in one simulation step
const PREDATION_CEILING = 0.14; // predators thin prey without erasing a lineage immediately
const PRED_EFFICIENCY = 0.30;   // predator carrying capacity per unit of prey biomass (ratio-dependent)
const DETRITUS_DECAY = 0.04;
const FERTILITY_DECAY = 0.03;
const FERTILITY_YIELD = 0.5;   // detritus converted by decomposers becomes soil fertility
const EXTINCTION_GRACE = 45;   // sustained decline is required before local extinction fires
const MIN_VIABLE = 0.45;
const EXTINCTION_SHOCK = 16;   // health hit (and pressure spike seed) when a species is lost
const MAX_ECO_STEP = 6;        // bound a single update so huge offline gaps cannot blow up

// Derive a full ecological profile from the species definition, applying overrides.
export function ecologyOf(definition) {
  if (!definition) return null;
  const override = ECOLOGY_OVERRIDES[definition.id] || {};
  const role = override.role || deriveRole(definition);
  const base = ROLE_BASE[role] || ROLE_BASE.herbivore;
  const groupRepro = GROUP_REPRO[definition.group] || 1;
  return {
    role,
    repro: (override.repro ?? base.repro) * groupRepro,
    plantNeed: override.plantNeed ?? base.plantNeed,
    meatNeed: override.meatNeed ?? base.meatNeed,
    strength: override.strength ?? base.strength,
    preyValue: override.preyValue ?? base.preyValue,
    cap: override.cap ?? base.cap,
    minViable: override.minViable ?? MIN_VIABLE,
    biome: definition.biome
  };
}

function deriveRole(definition) {
  if (definition.group === "Plant") return ROLE.PRODUCER;
  if (definition.group === "Fungus") return ROLE.DECOMPOSER;
  if (definition.group === "Civilization") return ROLE.POST;
  if (definition.grantsTraits?.includes("predation")) return ROLE.CARNIVORE;
  return ROLE.HERBIVORE;
}

// A fresh per-run ecological state for one biome. `capacityScale` folds in the
// world's richness modifiers so abundant-carbon / tidal worlds grow more flora.
export function defaultBiomeState(biomeId, capacityScale = 1) {
  const base = BIOME_ECOLOGY[biomeId] || BIOME_ECOLOGY.forest;
  const capacity = base.plantCapacity * capacityScale;
  return {
    plantCapacity: capacity,
    plantStock: capacity * 0.6,
    detritus: capacity * 0.15,
    fertility: 0,
    regen: base.regen,
    stress: 0 // 0 = lush, 1 = barren; surfaced to the health score
  };
}

// World richness multiplier from visible modifiers (reuses their production field).
export function capacityScale(game) {
  const worldFeatureScale = 1 + (game.worldFeatures?.habitat || 0) * 0.2;
  return (game.visibleModifiers || []).reduce((value, modifier) => value * (modifier.production || 1), worldFeatureScale);
}

// Advance the whole food web by `dt` seconds. Mutates game.populations,
// game.biomeState, extinction grace, and writes popTrend / ecosystemCauses /
// ecoSummary for the engine and UI to read.
export function stepEcosystem(game, dt) {
  ensureEcosystemState(game);
  if (!(dt > 0) || game.populations.size === 0) {
    game.popTrend = new Map();
    return;
  }
  const step = Math.min(dt, MAX_ECO_STEP); // offline gaps are deliberately bounded (forgiving)
  const richness = capacityScale(game);

  // Bucket living, web-participating populations by their biome.
  const buckets = new Map();
  for (const [id, pop] of game.populations) {
    const definition = SPECIES_BY_ID[id];
    if (!definition || !(pop > 0)) continue;
    const eco = ecologyOf(definition);
    if (eco.role === ROLE.POST) continue;
    const biomeId = eco.biome || game.dominantBiome?.id || "forest";
    if (!buckets.has(biomeId)) buckets.set(biomeId, []);
    buckets.get(biomeId).push({ id, definition, eco, pop, start: pop, fed: 1, killed: 0, cap: eco.cap * richness });
  }

  const trend = new Map();
  const causes = [];
  const summary = { totalPop: 0, starvingPop: 0, decliningPop: 0, plantStress: 0, predatorPressure: 0, biomes: 0 };

  for (const [biomeId, members] of buckets) {
    const state = bucketState(game, biomeId, richness);
    simulateBiome(game, biomeId, state, members, step, trend, causes, summary);
    summary.biomes += 1;
  }

  summary.plantStress = summary.biomes > 0 ? summary.plantStress / summary.biomes : 0;
  // Disturbance = the worst of "currently starving" and "currently crashing",
  // held as a slowly-decaying peak so a collapse keeps health (and the player's
  // sense of crisis) suppressed for a while instead of snapping back the instant
  // a crashed population settles at low, well-fed numbers.
  const instant = summary.totalPop > 0 ? Math.max(summary.starvingPop, summary.decliningPop) / summary.totalPop : 0;
  game.ecoDisturbance = Math.max((game.ecoDisturbance || 0) * (1 - Math.min(0.6, 0.045 * step)), instant);
  summary.disturbance = game.ecoDisturbance;
  game.ecoSummary = summary;
  game.extinctionShock = Math.max(0, (game.extinctionShock || 0) - step * 0.6);
  game.popTrend = trend;
  game.ecosystemCauses = rankCauses(causes).slice(0, 3);
}

function simulateBiome(game, biomeId, state, members, dt, trend, causes, summary) {
  const floraWord = BIOME_ECOLOGY[biomeId]?.floraWord || "greenery";
  const biomeName = capitalize(biomeId);

  const producers = members.filter(m => m.eco.role === ROLE.PRODUCER);
  const plantEaters = members.filter(m => m.eco.plantNeed > 0);
  const predators = members.filter(m => m.eco.meatNeed > 0);
  const prey = members.filter(m => m.eco.preyValue > 0 && m.eco.role !== ROLE.CARNIVORE);
  const decomposers = members.filter(m => m.eco.role === ROLE.DECOMPOSER);

  // 1. Flora relaxes toward an effective capacity lifted by producers + fertility.
  const producerBiomass = producers.reduce((sum, m) => sum + m.pop * PRODUCER_BIOMASS, 0);
  const effectiveCap = state.plantCapacity + producerBiomass + state.fertility;
  state.plantStock += (effectiveCap - state.plantStock) * Math.min(1, (state.regen || PLANT_REGEN) * dt);
  state.plantStock = clamp(state.plantStock, 0, effectiveCap);

  // 2. Herbivores + omnivores graze the flora.
  const plantDemand = plantEaters.reduce((sum, m) => sum + m.pop * m.eco.plantNeed * dt, 0);
  const plantEaten = Math.min(plantDemand, state.plantStock);
  const plantRatio = plantDemand > 0 ? plantEaten / plantDemand : 1;
  state.plantStock -= plantEaten;
  for (const m of plantEaters) m.plantFed = plantRatio;
  // Stress = how short the grazers are of food (not the absolute stock, which sits
  // near zero at a healthy carrying-capacity equilibrium where intake == regrowth).
  state.stress = clamp(1 - plantRatio, 0, 1);

  // 3. Carnivores + omnivores hunt the prey pool; kills are shared by prey share.
  // A hard predation ceiling leaves prey a refuge each step, so predators cannot
  // hunt prey to zero in one crash -- the stabilizer that allows coexistence.
  // Predator satiation is simply whether they got the food they wanted, so a lone
  // predator with adequate prey stays fed (and only goes hungry once crowded).
  const preyBiomass = prey.reduce((sum, m) => sum + m.pop * m.eco.preyValue, 0);
  const meatDemand = predators.reduce((sum, m) => sum + m.pop * m.eco.meatNeed * dt, 0);
  const meatEaten = Math.min(meatDemand, preyBiomass * PREDATION_CEILING);
  const meatRatio = meatDemand > 0 ? meatEaten / meatDemand : 1;
  for (const m of predators) m.meatFed = meatRatio;
  if (meatEaten > 0 && preyBiomass > 0) {
    for (const m of prey) {
      const share = (m.pop * m.eco.preyValue) / preyBiomass;
      m.killed += (meatEaten * share) / m.eco.preyValue; // biomass -> head count
    }
  }
  summary.predatorPressure = Math.max(summary.predatorPressure, preyBiomass > 0 ? meatDemand / preyBiomass : (meatDemand > 0 ? 2 : 0));

  // 4. Decomposers recycle detritus into soil fertility.
  const detDemand = decomposers.reduce((sum, m) => sum + m.pop * DECOMPOSER_NEED * dt, 0);
  const detEaten = Math.min(detDemand, state.detritus);
  const detRatio = detDemand > 0 ? detEaten / detDemand : 1;
  for (const m of decomposers) m.decFed = detRatio;
  state.detritus -= detEaten;
  state.fertility += detEaten * FERTILITY_YIELD;

  // 5. Resolve each member's feeding ratio, then grow / starve / get eaten.
  let biggestRiser = null;
  let biggestFaller = null;
  let deaths = 0;
  for (const m of members) {
    if (m.eco.role === ROLE.PRODUCER) m.fed = 1;
    else if (m.eco.role === ROLE.DECOMPOSER) m.fed = m.decFed ?? 1;
    else if (m.eco.role === ROLE.CARNIVORE) m.fed = m.meatFed ?? 1;
    else if (m.eco.role === ROLE.OMNIVORE) m.fed = Math.max(m.plantFed ?? 1, m.meatFed ?? 1);
    else m.fed = m.plantFed ?? 1;

    let next = m.pop;
    // Predation removes heads first.
    if (m.killed > 0) next -= Math.min(m.killed, m.pop * MAX_DECLINE);
    // Then growth / decline. Apex predators self-limit to a prey-driven cap
    // (ratio-dependent), so they can never multiply to a fixed ceiling that the
    // prey base cannot feed -- the logistic term grows them below that cap and
    // shrinks them above it. Everything else grows when well fed and starves
    // (punishingly) when short of food.
    if (m.eco.role === ROLE.CARNIVORE) {
      const preyCap = Math.max(0.6, preyBiomass * PRED_EFFICIENCY);
      next += m.eco.repro * dt * next * (1 - next / preyCap);
    } else if (m.fed >= 0.95) {
      next += m.eco.repro * dt * next * (1 - next / Math.max(1, m.cap));
    } else {
      const decline = Math.min(MAX_DECLINE, STARVE_RATE * dt * (1 - m.fed));
      next -= next * decline;
    }
    next = Math.max(0, next);
    const stewardship = game.worldFeatures?.stewardship || 0;
    if (stewardship > 0) next = m.start + (next - m.start) * (1 - stewardship * 0.08);

    const deathCount = Math.max(0, m.pop - next);
    deaths += deathCount;

    // Protection floors a collapsing species so the player can rescue it.
    const protectedUntil = game.protectedUntil?.[m.id] || 0;
    if (protectedUntil > game.worldAgeSeconds && next < m.eco.minViable * 1.2) {
      next = m.eco.minViable * 1.2;
    }

    // Local extinction after sustained time below the minimum viable population.
    if (next < m.eco.minViable) {
      game.extinctionGrace[m.id] = (game.extinctionGrace[m.id] || 0) + dt;
      if (game.extinctionGrace[m.id] >= EXTINCTION_GRACE) {
        game.populations.delete(m.id);
        game.reconcileActiveSpecies?.();
        delete game.extinctionGrace[m.id];
        state.detritus += m.pop * (m.eco.preyValue || 0.5);
        game.extinctionShock = (game.extinctionShock || 0) + EXTINCTION_SHOCK;
        game.pendingPressureSpike = (game.pendingPressureSpike || 0) + 6;
        game.onSpeciesExtinct?.(m.id);
        causes.push(cause(`${m.definition.name} went extinct in the ${biomeName} -- ${m.fed < 0.6 ? "starved out" : "hunted out"}.`, 100));
        game.pushStory?.(`${m.definition.name} has gone locally extinct in the ${biomeName}.`, "extinction");
        trend.set(m.id, -1);
        continue;
      }
    } else {
      game.extinctionGrace[m.id] = 0;
    }

    game.populations.set(m.id, next);
    const delta = next - m.start;
    trend.set(m.id, delta > m.start * 0.02 ? 1 : delta < -m.start * 0.02 ? -1 : 0);

    summary.totalPop += next;
    if (m.fed < 0.7 && m.eco.role !== ROLE.PRODUCER) {
      summary.starvingPop += next;
      const food = m.eco.role === ROLE.CARNIVORE ? "prey" : m.eco.role === ROLE.DECOMPOSER ? "detritus" : floraWord;
      causes.push(cause(`${m.definition.name} is starving in the ${biomeName} -- ${food} is scarce.`, 70 + (1 - m.fed) * 10));
    }
    if (next < m.start * 0.97 && m.eco.role !== ROLE.PRODUCER) summary.decliningPop += next;
    if (delta > Math.max(0.4, m.start * 0.06) && (!biggestRiser || delta > biggestRiser.delta)) biggestRiser = { m, delta };
    if (delta < -Math.max(0.4, m.start * 0.06) && (!biggestFaller || delta < biggestFaller.delta)) biggestFaller = { m, delta };
  }

  // 6. Deaths feed detritus; ambient leaf-litter keeps decomposers alive; both decay.
  state.detritus += deaths * 0.6 + producerBiomass * 0.01 * dt + 0.2 * dt;
  state.detritus *= 1 - Math.min(0.9, DETRITUS_DECAY * dt);
  state.fertility *= 1 - Math.min(0.9, FERTILITY_DECAY * dt);
  summary.plantStress += state.stress;

  // 7. Biome-level narration.
  if (state.stress > 0.78 && plantEaters.length > 0) {
    causes.push(cause(`${biomeName} ${floraWord} is collapsing -- overgrazed by herbivores.`, 86));
  } else if (biggestRiser && biggestRiser.m.fed >= 0.95) {
    const food = roleFood(biggestRiser.m.eco.role, floraWord);
    causes.push(cause(`${biggestRiser.m.definition.name} is thriving in the ${biomeName} -- ${food} is abundant.`, 34));
  }
  if (biggestFaller && !(biggestFaller.m.fed < 0.7)) {
    causes.push(cause(`${biggestFaller.m.definition.name} is declining in the ${biomeName}.`, 50));
  }
  if (causes.length === 0) causes.push(cause(`The ${biomeName} ecosystem is stable.`, 10));
}

function roleFood(role, floraWord) {
  if (role === ROLE.CARNIVORE) return "prey";
  if (role === ROLE.DECOMPOSER) return "detritus";
  if (role === ROLE.PRODUCER) return "sunlight";
  return floraWord;
}

function bucketState(game, biomeId, richness) {
  if (!game.biomeState.has(biomeId)) {
    game.biomeState.set(biomeId, defaultBiomeState(biomeId, richness));
  }
  return game.biomeState.get(biomeId);
}

function ensureEcosystemState(game) {
  if (!(game.biomeState instanceof Map)) game.biomeState = new Map();
  if (!game.extinctionGrace) game.extinctionGrace = {};
  if (!game.protectedUntil) game.protectedUntil = {};
  if (typeof game.extinctionShock !== "number") game.extinctionShock = 0;
  if (!(game.popTrend instanceof Map)) game.popTrend = new Map();
  if (!Array.isArray(game.ecosystemCauses)) game.ecosystemCauses = [];
}

function rankCauses(causes) {
  const seen = new Set();
  return causes
    .sort((a, b) => b.severity - a.severity)
    .filter(item => (seen.has(item.text) ? false : seen.add(item.text)));
}

function cause(text, severity) {
  return { text, severity };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
