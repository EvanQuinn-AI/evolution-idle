// Pure descriptor layer: maps every origin stage and species to a drawable
// archetype, a locomotion style, and a palette. Imported by both the engine
// (to decide "what you currently are") and the canvas stage (to draw it).
// No DOM access here so it stays unit-testable under node.
import { wildlifeVisual } from "./assets/stage/manifest.js";

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
  choanoflagellate: { archetype: "particle", motion: "drift", palette: orb("#88d9ba", "#eafff6", "#3fae87"), features: { flagella: true, colony: true } },
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
  jawless_fish:    { archetype: "earlyFish", motion: "swim", palette: skin("#5794ad", "#bde2e8", "#315f72"), features: { lineageAccent: "#42d1c2" } },
  fish:            { archetype: "earlyFish", motion: "swim", palette: skin("#4f9fc4", "#bfeaff", "#246c86"), features: { lineageAccent: "#42d1c2", pairedFins: true } },
  lungfish:        { archetype: "earlyFish", motion: "swim", palette: skin("#668f78", "#c4dfaa", "#3b6552"), features: { lineageAccent: "#42d1c2", pairedFins: true, wetSkin: true } },
  flying_fish:     { archetype: "flyer",   motion: "fly",   palette: skin("#8ad0ff", "#d6f2ff", "#3f8fc8"), features: { finWings: true } },
  shark:           { archetype: "swimmer", motion: "swim",  palette: skin("#6a7d8a", "#bcd0da", "#3a4f5a"), scale: 1.25, features: { dorsal: true, teeth: true } },
  whale:           { archetype: "swimmer", motion: "swim",  palette: skin("#5a7a9a", "#a8c6de", "#34506a"), scale: 1.5, features: { fluke: true, blowhole: true, big: true } },
  amphibian:       { archetype: "amphibian", motion: "crawl", palette: skin("#6eaf78", "#bde29a", "#397459"), features: { lineageAccent: "#42d1c2", wetSkin: true } },
  reptile:         { archetype: "smallReptile", motion: "walk", palette: skin("#82964f", "#d5c26a", "#4f642f"), features: { lineageAccent: "#42b9a9", plateAccent: "#d6a64a", scales: true } },
  dinosaur:        { archetype: "walker",  motion: "walk",  palette: skin("#8a9a5a", "#c6d88a", "#5a6a33"), scale: 1.4, features: { tail: true, bigHead: true } },
  theropod:        { archetype: "walker", motion: "walk", palette: fur("#a08b59", "#e4c978", "#65552f"), scale: 1.15, features: { tail: true, feathered: true, bigHead: true } },
  bird:            { archetype: "flyer",   motion: "fly",   palette: fur("#e0b85a", "#ffe49a", "#a87f33"), features: { beak: true, feathered: true } },
  synapsid:        { archetype: "smallReptile", motion: "walk", palette: skin("#8c7550", "#d5b982", "#59472e"), features: { lineageAccent: "#3fa99d", scales: true, furTufts: true } },
  mammal:          { archetype: "basalMammal", motion: "walk", palette: fur("#9a6948", "#e6c394", "#613f2d"), features: { lineageAccent: "#3fa99d", furTufts: true } },
  wolf:            { archetype: "canid", motion: "walk", palette: fur("#858d96", "#d5d9d8", "#4f5861"), features: { lineageAccent: "#3b9d94", packHunter: true } },
  primate:         { archetype: "walker",  motion: "walk",  palette: fur("#a8784a", "#d8a878", "#6a4a2a"), features: { upright: true, longArms: true } },
  ape:             { archetype: "walker", motion: "walk", palette: fur("#805a3f", "#c89a72", "#4f3525"), scale: 1.1, features: { upright: true, longArms: true, bigHead: true } },
  human:           { archetype: "walker",  motion: "walk",  palette: fur("#d8a87a", "#f2d6b8", "#8a5f3a"), features: { upright: true } },
  post_human:      { archetype: "walker", motion: "walk", palette: skin("#b8c9cf", "#e7fff8", "#62b9a6"), features: { upright: true, lineageAccent: "#67efda" }, era: "city" },

  // Space Age: the tree leaves the planet behind.
  civilization:    { archetype: "city",   motion: "pulse", palette: skin("#cdd6e0", "#ffe9b0", "#8a93a0"), scale: 1.2, era: "city" },
  spacefarer:      { archetype: "rocket", motion: "fly",   palette: skin("#dde2ea", "#ffffff", "#8a9bb5"), scale: 1.1, era: "space" },
  voidborn:        { archetype: "ufo", motion: "fly", palette: skin("#b3b8df", "#f2eaff", "#7e75bd"), scale: 1.05, era: "space", features: { lineageAccent: "#b88fff" } },
  star_voyager:    { archetype: "ufo",    motion: "fly",   palette: skin("#9ad6c0", "#dfffe9", "#5fae8f"), scale: 1.2, era: "space" },

  // Collectible life targets that are not on the species tree get their own
  // distinct body plan here (keyed by life-target id; see content.js LIFE_TARGETS).
  elephant:        { archetype: "walker", motion: "walk", palette: fur("#9aa0a8", "#cfd4da", "#5f656d"), scale: 1.45, features: { big: true, bigHead: true, tail: true } },
  fox:             { archetype: "canid", motion: "walk", palette: fur("#d27a3c", "#f0b07a", "#8a4a1f"), features: { tail: true } },
  chicken:         { archetype: "flyer", motion: "walk", palette: fur("#e8d27a", "#fff4c6", "#b8923a"), features: { beak: true, feathered: true } },
  frog:            { archetype: "amphibian", motion: "crawl", palette: skin("#5fbf52", "#b6e88a", "#2f7d3a"), features: { wetSkin: true } },
  eagle:           { archetype: "flyer", motion: "fly", palette: fur("#7a5a3a", "#e4c978", "#3f2c18"), scale: 1.15, features: { beak: true, feathered: true } },
  lion:            { archetype: "walker", motion: "walk", palette: fur("#d8a85a", "#f2d49a", "#8a5f2a"), scale: 1.2, features: { bigHead: true, tail: true } },
  kangaroo:        { archetype: "walker", motion: "walk", palette: fur("#bb8a5a", "#e6c294", "#75522f"), scale: 1.1, features: { upright: true, tail: true } },
  snake:           { archetype: "smallReptile", motion: "crawl", palette: skin("#8a9a4f", "#d5c26a", "#4f5f2a"), features: { scales: true, segments: 6 } },
  dolphin:         { archetype: "swimmer", motion: "swim", palette: skin("#6f9ac4", "#cfe6ff", "#3f6f9a"), scale: 1.25, features: { fluke: true, blowhole: true } },
  sea_turtle:      { archetype: "swimmer", motion: "swim", palette: skin("#4f8f6f", "#a8d8b0", "#2f5f44"), scale: 1.1, features: { shell: true } },
  octopus:         { archetype: "swimmer", motion: "drift", palette: skin("#c87a9a", "#f0bcd2", "#8a4a64"), features: { tendrils: true } },
  salmon:          { archetype: "earlyFish", motion: "swim", palette: skin("#c4655a", "#ffbfae", "#86342a"), features: { pairedFins: true, lineageAccent: "#ff8a6a" } },
  penguin:         { archetype: "walker", motion: "walk", palette: skin("#2f3a44", "#f2f4f6", "#16202a"), features: { upright: true, beak: true } },
  bear:            { archetype: "walker", motion: "walk", palette: fur("#7a5a3f", "#b89a72", "#4f3525"), scale: 1.3, features: { big: true, bigHead: true } },
  butterfly:       { archetype: "flyer", motion: "fly", palette: shell("#e07ad0", "#ffc6f0", "#9a4f8a"), features: { insectWings: true, antennae: true } },
  crocodile:       { archetype: "smallReptile", motion: "walk", palette: skin("#5f7a4f", "#a8c28a", "#34502f"), scale: 1.2, features: { scales: true, tail: true, teeth: true, bigHead: true } },
  owl:             { archetype: "flyer", motion: "fly", palette: fur("#8a6f4f", "#d8c096", "#52402a"), features: { beak: true, feathered: true, bigHead: true } },
  deer:            { archetype: "walker", motion: "walk", palette: fur("#b07a4a", "#e0b487", "#6f4a28"), scale: 1.1, features: { tail: true } },
  rabbit:          { archetype: "walker", motion: "walk", palette: fur("#b7a890", "#e6dcc8", "#746752"), features: { ears: true } },
  camel:           { archetype: "walker", motion: "walk", palette: fur("#c89a5a", "#e8c890", "#8a6536"), scale: 1.2, features: { big: true, bigHead: true } },
  mountain_goat:   { archetype: "walker", motion: "walk", palette: fur("#d8d2c4", "#f2eee4", "#8a8474"), scale: 1.05, features: { bigHead: true } },
  gorilla:         { archetype: "walker", motion: "walk", palette: fur("#3a3a40", "#6a6a72", "#1c1c20"), scale: 1.25, features: { upright: true, longArms: true, bigHead: true } },
  otter:           { archetype: "swimmer", motion: "swim", palette: fur("#7a5a3f", "#b89a72", "#4a3525"), features: { wetSkin: true } },
  crab:            { archetype: "crawler", motion: "crawl", palette: shell("#d06a4a", "#f0a888", "#8a3a24"), features: { legs: 8, shell: true } },
  tortoise:        { archetype: "smallReptile", motion: "walk", palette: skin("#7a6a3a", "#c2b06a", "#4a3f22"), scale: 1.05, features: { shell: true, scales: true } },
  bat:             { archetype: "flyer", motion: "fly", palette: fur("#3a3038", "#6a5a66", "#1a141c"), features: { leathery: true } },
  seal:            { archetype: "swimmer", motion: "swim", palette: fur("#7a8490", "#c2cad2", "#454d56"), scale: 1.15, features: { wetSkin: true, big: true } },
  parrot:          { archetype: "flyer", motion: "fly", palette: shell("#3aa84a", "#ffe24a", "#d04a4a"), features: { beak: true, feathered: true } },
  scorpion:        { archetype: "crawler", motion: "crawl", palette: shell("#7a5a2f", "#c2a05a", "#4a3318"), features: { legs: 8, tail: true } }
};

export function creatureForOrigin(id) {
  return ORIGIN_CREATURES[id] || ORIGIN_CREATURES.cell;
}

export function creatureForSpecies(definition) {
  if (!definition) return ORIGIN_CREATURES.cell;
  const base = GROUP_STYLE[definition.group] || GROUP_STYLE.Microbial;
  const override = SPECIES_OVERRIDE[definition.id] || {};
  const wildlife = wildlifeVisual(definition.id);
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
    visualId: wildlife?.visualId || null,
    locomotionFamily: wildlife?.family || override.archetype || base.archetype,
    reproductiveScene: wildlife?.stages?.[0]?.scene || null,
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
  space:   { name: "Deep Space", top: "#0a0618", mid: "#140a2a", bottom: "#04020c", light: "#b88fff", motes: "star", floor: "none" },

  // Habitats for the collectible life targets (content.js LIFE_TARGETS biome).
  sky:       { name: "Open Sky", top: "#2f6fb0", mid: "#67a8e0", bottom: "#bfe0f5", light: "#ffffff", motes: "cloud", floor: "none" },
  grassland: { name: "Grassland", top: "#3a5a8a", mid: "#7a9a4a", bottom: "#4a5a24", light: "#e8e07a", motes: "pollen", floor: "grass" },
  desert:    { name: "Desert", top: "#c88a4a", mid: "#e0b06a", bottom: "#7a4f28", light: "#fff0c6", motes: "dust", floor: "sand" },
  reef:      { name: "Coral Reef", top: "#0e5a78", mid: "#1f8aa8", bottom: "#06384a", light: "#9ff0e6", motes: "bubble", floor: "sand" },
  tundra:    { name: "Polar Tundra", top: "#5a7a9a", mid: "#aac4da", bottom: "#dfeef5", light: "#ffffff", motes: "snow", floor: "snow" },
  mountain:  { name: "Mountain", top: "#5f6f90", mid: "#8a96aa", bottom: "#363e4c", light: "#dfe8f5", motes: "snow", floor: "rock" },
  jungle:    { name: "Jungle", top: "#123018", mid: "#1f5a2a", bottom: "#08180c", light: "#8fe06a", motes: "spore", floor: "grass" },
  river:     { name: "River", top: "#1a4a5a", mid: "#2f7a8a", bottom: "#0c2a33", light: "#aee6f0", motes: "bubble", floor: "mud" },
  cave:      { name: "Cave", top: "#1a1820", mid: "#2a2630", bottom: "#0a0810", light: "#8a7fb0", motes: "drip", floor: "rock" }
};

export function sceneForBiome(biomeId, worldNumber = 1, era = null) {
  if (era === "space") return BIOME_SCENES.space;
  if (era === "city") return BIOME_SCENES.city;
  return BIOME_SCENES[biomeId] || BIOME_SCENES.cell;
}
