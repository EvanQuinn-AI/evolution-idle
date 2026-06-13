// Pure descriptor layer: maps every origin stage and species to a drawable
// archetype, a locomotion style, and a palette. Imported by both the engine
// (to decide "what you currently are") and the canvas stage (to draw it).
// No DOM access here so it stays unit-testable under node.

// Archetypes correspond to draw routines in stage.js:
//   particle | flora | swimmer | crawler | walker | flyer
// Motions drive the animation loop:
//   pulse | drift | sway | swim | crawl | walk | fly

const ORIGIN_CREATURES = {
  atom:     { archetype: "particle", motion: "pulse", glyph: "A", label: "Atom",            palette: orb("#9fd0ff", "#ffffff", "#4d8fff"), scale: 0.4, parts: 1 },
  molecule: { archetype: "particle", motion: "drift", glyph: "M", label: "Molecule",        palette: orb("#a8ffe6", "#ffffff", "#37d6a8"), scale: 0.55, parts: 3 },
  organic:  { archetype: "particle", motion: "drift", glyph: "O", label: "Organic Compound", palette: orb("#ffd79a", "#fff4d8", "#e8a24d"), scale: 0.7, parts: 5 },
  cell:     { archetype: "particle", motion: "pulse", glyph: "C", label: "First Cell",       palette: orb("#bdf2a0", "#f2fff0", "#6fcf5a"), scale: 0.85, parts: 7 }
};

// Per-group visual identity. Derived archetype is overridden per-species below
// when locomotion differs (e.g. a flying fish flies, a whale swims).
const GROUP_STYLE = {
  Microbial:    { archetype: "particle", motion: "pulse", palette: orb("#9be7c8", "#eafff6", "#3fae87") },
  Plant:        { archetype: "flora",    motion: "sway",  palette: leafy("#5fbf52", "#9be36a", "#2f7d3a") },
  Fungus:       { archetype: "flora",    motion: "sway",  palette: leafy("#caa0d8", "#efd6f5", "#7d4f8f") },
  Invertebrate: { archetype: "crawler",  motion: "crawl", palette: shell("#e0a86a", "#ffd9a8", "#9a6b38") },
  Fish:         { archetype: "swimmer",  motion: "swim",  palette: skin("#5aa9e0", "#bfe6ff", "#2f6fa8") },
  Reptile:      { archetype: "walker",   motion: "walk",  palette: skin("#6fae5a", "#b6e08a", "#3f6f33") },
  Mammal:       { archetype: "walker",   motion: "walk",  palette: fur("#c98a5a", "#ecc69a", "#8a5a33") },
  Vertebrate:   { archetype: "walker",   motion: "walk",  palette: skin("#7ec0a8", "#c8f0df", "#3f7d68") },
  Civilization: { archetype: "walker",   motion: "walk",  palette: fur("#d8a87a", "#f2d6b8", "#8a5f3a") }
};

// Species that break from their group's default locomotion/archetype, plus
// per-creature `features` that the draw routines read to make each form distinct.
const SPECIES_OVERRIDE = {
  bacteria:        { features: { flagella: true } },
  archaea:         { features: { spiky: true } },
  green_algae:     { archetype: "swimmer", motion: "drift", palette: skin("#6fcf6f", "#bff5b0", "#2f8f3a"), features: { leafy: true } },
  moss:            { features: { cluster: true } },
  fern:            { features: { frond: true } },
  conifer:         { features: { conifer: true } },
  flowering_plant: { features: { flower: true } },
  mold:            { features: { fuzzy: true } },
  mushroom:        { features: { cap: true } },
  lichen:          { features: { crust: true } },
  parasitic_fungus:{ features: { cap: true, tendrils: true } },
  sponge:          { archetype: "flora",   motion: "sway",  palette: leafy("#e08aa8", "#ffc6da", "#9a4f6b"), features: { pores: true } },
  worm:            { features: { segments: 5 } },
  arthropod:       { features: { legs: 6, antennae: true } },
  mollusk:         { archetype: "swimmer", motion: "drift", palette: shell("#d8b0e0", "#f3dcff", "#8a5a9a"), features: { shell: true } },
  insect:          { archetype: "flyer",   motion: "fly",   palette: shell("#9ad85a", "#d6ff9a", "#5a8a2f"), features: { insectWings: true, antennae: true } },
  fish:            { archetype: "earlyFish", motion: "swim", palette: skin("#4f9fc4", "#bfeaff", "#246c86"), features: { lineageAccent: "#42d1c2", pairedFins: true } },
  flying_fish:     { archetype: "flyer",   motion: "fly",   palette: skin("#8ad0ff", "#d6f2ff", "#3f8fc8"), features: { finWings: true } },
  shark:           { archetype: "swimmer", motion: "swim",  palette: skin("#6a7d8a", "#bcd0da", "#3a4f5a"), scale: 1.25, features: { dorsal: true, teeth: true } },
  whale:           { archetype: "swimmer", motion: "swim",  palette: skin("#5a7a9a", "#a8c6de", "#34506a"), scale: 1.5, features: { fluke: true, blowhole: true, big: true } },
  amphibian:       { archetype: "amphibian", motion: "crawl", palette: skin("#6eaf78", "#bde29a", "#397459"), features: { lineageAccent: "#42d1c2", wetSkin: true } },
  reptile:         { archetype: "smallReptile", motion: "walk", palette: skin("#82964f", "#d5c26a", "#4f642f"), features: { lineageAccent: "#42b9a9", plateAccent: "#d6a64a", scales: true } },
  dinosaur:        { archetype: "walker",  motion: "walk",  palette: skin("#8a9a5a", "#c6d88a", "#5a6a33"), scale: 1.4, features: { tail: true, bigHead: true } },
  bird:            { archetype: "flyer",   motion: "fly",   palette: fur("#e0b85a", "#ffe49a", "#a87f33"), features: { beak: true, feathered: true } },
  mammal:          { archetype: "basalMammal", motion: "walk", palette: fur("#9a6948", "#e6c394", "#613f2d"), features: { lineageAccent: "#3fa99d", furTufts: true } },
  wolf:            { archetype: "canid", motion: "walk", palette: fur("#858d96", "#d5d9d8", "#4f5861"), features: { lineageAccent: "#3b9d94", packHunter: true } },
  primate:         { archetype: "walker",  motion: "walk",  palette: fur("#a8784a", "#d8a878", "#6a4a2a"), features: { upright: true, longArms: true } },
  human:           { archetype: "walker",  motion: "walk",  palette: fur("#d8a87a", "#f2d6b8", "#8a5f3a"), features: { upright: true } },

  // Space Age: the tree leaves the planet behind.
  civilization:    { archetype: "city",   motion: "pulse", palette: skin("#cdd6e0", "#ffe9b0", "#8a93a0"), scale: 1.2, era: "city" },
  spacefarer:      { archetype: "rocket", motion: "fly",   palette: skin("#dde2ea", "#ffffff", "#8a9bb5"), scale: 1.1, era: "space" },
  star_voyager:    { archetype: "ufo",    motion: "fly",   palette: skin("#9ad6c0", "#dfffe9", "#5fae8f"), scale: 1.2, era: "space" }
};

export function creatureForOrigin(id) {
  return ORIGIN_CREATURES[id] || ORIGIN_CREATURES.cell;
}

export function creatureForSpecies(definition) {
  if (!definition) return ORIGIN_CREATURES.cell;
  const base = GROUP_STYLE[definition.group] || GROUP_STYLE.Microbial;
  const override = SPECIES_OVERRIDE[definition.id] || {};
  const aquatic = definition.albums?.includes("ocean") || definition.biome === "ocean";
  return {
    archetype: override.archetype || base.archetype,
    motion: override.motion || (aquatic && base.archetype === "swimmer" ? "swim" : base.motion),
    palette: override.palette || base.palette,
    glyph: definition.glyph,
    label: definition.name,
    rarity: definition.rarity,
    scale: override.scale || rarityScale(definition),
    biome: definition.biome,
    era: override.era || null,
    features: override.features || {}
  };
}

function rarityScale(definition) {
  if (definition.cost >= 400) return 1.25;
  if (definition.cost >= 250) return 1.1;
  if (definition.cost >= 120) return 1.0;
  return 0.9;
}

function orb(body, accent, glow) { return { body, accent, glow }; }
function leafy(body, accent, glow) { return { body, accent, glow }; }
function shell(body, accent, glow) { return { body, accent, glow }; }
function skin(body, accent, glow) { return { body, accent, glow }; }
function fur(body, accent, glow) { return { body, accent, glow }; }

// Backdrop palettes per biome, used by the stage to paint the world the
// current creature lives in. Space tint kicks in for very late worlds.
export const BIOME_SCENES = {
  ocean:   { name: "Ocean",   top: "#0a3a52", mid: "#0c5a78", bottom: "#03222f", light: "#7fe6ff", motes: "bubble", floor: "sand" },
  wetland: { name: "Wetland", top: "#243a1a", mid: "#3a5a28", bottom: "#16240e", light: "#cfe88a", motes: "pollen", floor: "mud" },
  forest:  { name: "Forest",  top: "#10301c", mid: "#1c4a2c", bottom: "#0a1c12", light: "#9be36a", motes: "spore", floor: "grass" },
  cell:    { name: "Primordial Sea", top: "#1a2a3a", mid: "#24405a", bottom: "#0c1722", light: "#8fd6ff", motes: "bubble", floor: "none" },
  city:    { name: "Civilization", top: "#241f3a", mid: "#352d52", bottom: "#100c1c", light: "#ffd08f", motes: "star", floor: "city" },
  space:   { name: "Deep Space", top: "#0a0618", mid: "#140a2a", bottom: "#04020c", light: "#b88fff", motes: "star", floor: "none" }
};

export function sceneForBiome(biomeId, worldNumber = 1, era = null) {
  if (era === "space") return BIOME_SCENES.space;
  if (era === "city") return BIOME_SCENES.city;
  if (worldNumber >= 8) return BIOME_SCENES.space;
  return BIOME_SCENES[biomeId] || BIOME_SCENES.cell;
}
