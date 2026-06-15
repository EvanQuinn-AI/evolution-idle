// Data-only visual contract for the illustrated wildlife renderer. The SVG
// parts are generated locally from these measurements so every animal shares
// one house style while retaining a distinct, recognizable silhouette.

export const WILDLIFE_FEATURE = "illustrated-wildlife-v1";

const STAGE_SCALE = [0.46, 0.58, 0.72, 0.88, 1];
const STAGE_HEAD = [1.34, 1.25, 1.17, 1.08, 1];
const STAGE_LIMB = [0.58, 0.7, 0.82, 0.92, 1];

function stages(scenes) {
  return STAGE_SCALE.map((scale, index) => ({
    index,
    scale,
    headScale: STAGE_HEAD[index],
    limbScale: STAGE_LIMB[index],
    scene: scenes[index] || "habitat",
    mobileScale: index < 2 ? 1.12 : 1
  }));
}

function animal(id, biome, family, colors, shape, scenes) {
  const hasExternalEars = family === "quadruped" || family === "biped" || family === "bird" || family === "flyer";
  return {
    id,
    visualId: `wildlife-${id}`,
    biome,
    family,
    colors: { body: colors[0], light: colors[1], dark: colors[2], mark: colors[3] || colors[1] },
    shape: {
      bodyLength: 1,
      bodyHeight: 0.52,
      headSize: 0.36,
      legLength: 0.64,
      tailLength: 0.72,
      earSize: hasExternalEars ? 0.22 : 0,
      ...shape
    },
    animations: ["idle", "locomotion", "tap"],
    parts: partsFor(family),
    stages: stages(scenes)
  };
}

function partsFor(family) {
  if (family === "bird" || family === "flyer") return ["body", "head", "wing", "leg", "tail"];
  if (family === "swimmer") return ["body", "head", "fin", "tail"];
  if (family === "serpentine") return ["body", "head"];
  if (family === "invertebrate") return ["body", "head", "leg", "appendage"];
  if (family === "biped") return ["body", "head", "arm", "leg", "tail"];
  return ["body", "head", "leg", "tail"];
}

const WOMB = ["womb", "womb", "nursery", "habitat", "habitat"];
const DEN = ["womb", "womb", "den", "habitat", "habitat"];
const EGG = ["egg", "egg", "nest", "habitat", "habitat"];
const WATER_EGG = ["spawn", "spawn", "shallows", "habitat", "habitat"];
const OCEAN_WOMB = ["womb", "womb", "shallows", "habitat", "habitat"];

export const ANIMAL_VISUALS = {
  human: animal("human", "forest", "biped", ["#b87952", "#efc7a6", "#6b3d28", "#4d2c21"], { bodyLength: 0.62, bodyHeight: 0.9, headSize: 0.39, legLength: 0.82, tailLength: 0, hair: true }, WOMB),
  shark: animal("shark", "ocean", "swimmer", ["#667783", "#c5d3d8", "#344650", "#eff5f6"], { bodyLength: 1.45, bodyHeight: 0.42, headSize: 0.42, tailLength: 0.62, dorsal: true, sharkTail: true, sharkSnout: true }, ["egg-case", "egg-case", "shallows", "habitat", "habitat"]),
  elephant: animal("elephant", "grassland", "quadruped", ["#858b8f", "#bdc1c2", "#555a5d", "#d8d1bf"], { bodyLength: 1.3, bodyHeight: 0.76, headSize: 0.5, legLength: 0.76, tailLength: 0.36, earSize: 0.52, trunk: true, tusks: true }, WOMB),
  fox: animal("fox", "forest", "quadruped", ["#c9682f", "#f3d3ad", "#743317", "#1f211d"], { bodyLength: 1.16, bodyHeight: 0.48, headSize: 0.36, legLength: 0.62, tailLength: 1.05, earSize: 0.34, fluffyTail: true, pointedFace: true, socks: true }, DEN),
  chicken: animal("chicken", "grassland", "bird", ["#d6b871", "#fff0c2", "#8c642f", "#c8452d"], { bodyLength: 0.8, bodyHeight: 0.75, headSize: 0.31, legLength: 0.52, tailLength: 0.38, comb: true, beak: true }, EGG),
  frog: animal("frog", "wetland", "reptile", ["#4d9b45", "#a9d66f", "#285d2e", "#e6ca45"], { bodyLength: 0.78, bodyHeight: 0.42, headSize: 0.5, legLength: 0.75, tailLength: 0, frogLegs: true }, WATER_EGG),
  wolf: animal("wolf", "forest", "quadruped", ["#737b82", "#c8c9c2", "#3f464c", "#d7b88a"], { bodyLength: 1.23, bodyHeight: 0.57, headSize: 0.39, legLength: 0.7, tailLength: 0.72, earSize: 0.27, pointedFace: true, mane: true }, DEN),
  whale: animal("whale", "ocean", "swimmer", ["#496b83", "#9eb8c8", "#243e50", "#dbe8ed"], { bodyLength: 1.72, bodyHeight: 0.54, headSize: 0.55, tailLength: 0.58, fluke: true, blowhole: true }, OCEAN_WOMB),
  eagle: animal("eagle", "sky", "flyer", ["#563a27", "#e9e5d5", "#2b211b", "#d4a22c"], { bodyLength: 0.85, bodyHeight: 0.7, headSize: 0.3, legLength: 0.35, tailLength: 0.45, wingSpan: 1.65, hookedBeak: true }, EGG),
  lion: animal("lion", "grassland", "quadruped", ["#c89043", "#e8c477", "#71451f", "#4f2e19"], { bodyLength: 1.25, bodyHeight: 0.64, headSize: 0.47, legLength: 0.72, tailLength: 0.86, earSize: 0.2, mane: true, tailTuft: true }, DEN),
  kangaroo: animal("kangaroo", "desert", "biped", ["#aa7548", "#dec09b", "#604028", "#d7b083"], { bodyLength: 0.65, bodyHeight: 0.95, headSize: 0.32, legLength: 1.03, tailLength: 1.18, earSize: 0.43, pouch: true, longFeet: true }, ["womb", "pouch", "pouch", "habitat", "habitat"]),
  snake: animal("snake", "desert", "serpentine", ["#72833d", "#c6bc62", "#3d4b24", "#251f18"], { bodyLength: 1.75, bodyHeight: 0.25, headSize: 0.31, tailLength: 1.1, scales: true }, EGG),
  dolphin: animal("dolphin", "ocean", "swimmer", ["#557f9f", "#c8dce7", "#2b536d", "#eff7f8"], { bodyLength: 1.35, bodyHeight: 0.4, headSize: 0.38, tailLength: 0.55, fluke: true, beakFace: true, dorsal: true }, OCEAN_WOMB),
  sea_turtle: animal("sea_turtle", "reef", "reptile", ["#41745a", "#9ab47a", "#274739", "#d2bb72"], { bodyLength: 1.05, bodyHeight: 0.43, headSize: 0.28, legLength: 0.56, tailLength: 0.16, shell: true, flippers: true }, ["egg", "nest", "shallows", "habitat", "habitat"]),
  octopus: animal("octopus", "reef", "invertebrate", ["#a95275", "#e69ab4", "#653047", "#efc8a8"], { bodyLength: 0.72, bodyHeight: 0.76, headSize: 0.56, legLength: 0.86, tailLength: 0, tentacles: 8 }, WATER_EGG),
  salmon: animal("salmon", "wetland", "swimmer", ["#b64e45", "#f3a18c", "#6d2b29", "#d9e2d2"], { bodyLength: 1.25, bodyHeight: 0.42, headSize: 0.34, tailLength: 0.48, speckles: true }, WATER_EGG),
  penguin: animal("penguin", "tundra", "bird", ["#252d34", "#f3f0df", "#11171c", "#df9e2d"], { bodyLength: 0.62, bodyHeight: 0.98, headSize: 0.37, legLength: 0.28, tailLength: 0.16, flipperWing: true, beak: true, upright: true }, EGG),
  bear: animal("bear", "forest", "quadruped", ["#67452f", "#a88360", "#38271e", "#c4a076"], { bodyLength: 1.28, bodyHeight: 0.78, headSize: 0.49, legLength: 0.58, tailLength: 0.13, earSize: 0.18, heavy: true }, DEN),
  butterfly: animal("butterfly", "wetland", "flyer", ["#7d3a8e", "#e69bd8", "#3d2251", "#efc34f"], { bodyLength: 0.42, bodyHeight: 0.22, headSize: 0.19, legLength: 0.18, tailLength: 0, wingSpan: 1.45, insectWing: true, antennae: true }, ["egg", "larva", "chrysalis", "habitat", "habitat"]),
  crocodile: animal("crocodile", "wetland", "reptile", ["#526a3c", "#8e9d62", "#2e4025", "#c6b578"], { bodyLength: 1.48, bodyHeight: 0.4, headSize: 0.42, legLength: 0.45, tailLength: 1.18, scales: true, longJaw: true, armored: true }, EGG),
  owl: animal("owl", "sky", "flyer", ["#735a3f", "#d1bd91", "#3f3024", "#f1d66b"], { bodyLength: 0.68, bodyHeight: 0.88, headSize: 0.48, legLength: 0.28, tailLength: 0.3, wingSpan: 1.45, faceDisk: true, hookedBeak: true }, EGG),
  deer: animal("deer", "forest", "quadruped", ["#9c663d", "#dab48a", "#573820", "#f0e4cf"], { bodyLength: 1.18, bodyHeight: 0.57, headSize: 0.32, legLength: 0.92, tailLength: 0.24, earSize: 0.32, antlers: true, spots: true }, WOMB),
  rabbit: animal("rabbit", "grassland", "quadruped", ["#a69780", "#ded3c1", "#625a4c", "#efe8dc"], { bodyLength: 0.84, bodyHeight: 0.59, headSize: 0.4, legLength: 0.57, tailLength: 0.18, earSize: 0.62, haunches: true }, DEN),
  camel: animal("camel", "desert", "quadruped", ["#b9824b", "#dfbd86", "#6b4628", "#c99a61"], { bodyLength: 1.25, bodyHeight: 0.72, headSize: 0.31, legLength: 0.94, tailLength: 0.45, earSize: 0.18, hump: true, longNeck: true }, WOMB),
  mountain_goat: animal("mountain_goat", "mountain", "quadruped", ["#c9c3b4", "#f0ece2", "#746f65", "#3d352c"], { bodyLength: 1.05, bodyHeight: 0.62, headSize: 0.36, legLength: 0.67, tailLength: 0.24, earSize: 0.2, horns: true, beard: true }, WOMB),
  gorilla: animal("gorilla", "jungle", "biped", ["#303338", "#60636a", "#17191d", "#7c8187"], { bodyLength: 0.83, bodyHeight: 0.87, headSize: 0.45, legLength: 0.62, tailLength: 0, longArms: true, heavy: true, knuckleWalk: true }, WOMB),
  otter: animal("otter", "river", "swimmer", ["#65452f", "#ba936d", "#35261e", "#d8c3a5"], { bodyLength: 1.17, bodyHeight: 0.38, headSize: 0.34, legLength: 0.35, tailLength: 0.8, whiskers: true, paws: true }, DEN),
  crab: animal("crab", "reef", "invertebrate", ["#b84f34", "#ef9b70", "#6b291d", "#e8c18e"], { bodyLength: 0.78, bodyHeight: 0.36, headSize: 0.2, legLength: 0.7, tailLength: 0, claws: true, sideWalk: true }, WATER_EGG),
  tortoise: animal("tortoise", "desert", "reptile", ["#74643a", "#b9a663", "#403721", "#d0bd7b"], { bodyLength: 1, bodyHeight: 0.58, headSize: 0.28, legLength: 0.37, tailLength: 0.13, shell: true, heavy: true }, EGG),
  bat: animal("bat", "cave", "flyer", ["#342b34", "#756272", "#171218", "#b59cae"], { bodyLength: 0.48, bodyHeight: 0.4, headSize: 0.32, legLength: 0.2, tailLength: 0.2, wingSpan: 1.7, leatheryWing: true, earSize: 0.45 }, DEN),
  seal: animal("seal", "tundra", "swimmer", ["#707984", "#c2c9ce", "#3e464e", "#e3dfd1"], { bodyLength: 1.23, bodyHeight: 0.47, headSize: 0.39, tailLength: 0.35, flippers: true, whiskers: true }, OCEAN_WOMB),
  parrot: animal("parrot", "jungle", "bird", ["#278a43", "#e8d646", "#15542a", "#d44435"], { bodyLength: 0.66, bodyHeight: 0.78, headSize: 0.35, legLength: 0.3, tailLength: 0.7, wingSpan: 1.05, curvedBeak: true }, EGG),
  scorpion: animal("scorpion", "desert", "invertebrate", ["#745329", "#b9944d", "#3c2917", "#d0b66d"], { bodyLength: 0.77, bodyHeight: 0.28, headSize: 0.24, legLength: 0.52, tailLength: 0.92, claws: true, stinger: true }, ["brood", "brood", "nursery", "habitat", "habitat"])
};

function habitat(id, name, palette, weather, ground, distant, midground, foreground, ambient) {
  return {
    id,
    name,
    palette,
    weather,
    ground,
    ambient,
    layers: [
      { id: "atmosphere", kind: "atmosphere" },
      { id: "distance", kind: distant },
      { id: "midground", kind: midground },
      { id: "playfield", kind: ground },
      { id: "foreground", kind: foreground }
    ]
  };
}

export const HABITAT_VISUALS = {
  cave: habitat("cave", "Cave", ["#0b0d12", "#24232b", "#4d4a59", "#897fa4"], "drips", "rock", "cave-mouth", "stalactites", "rocks", ["bat", "scorpion"]),
  desert: habitat("desert", "Desert", ["#6f9fc1", "#e5b96e", "#c9853f", "#8b5129"], "dust", "sand", "mesas", "dunes", "scrub", ["camel", "snake", "scorpion"]),
  forest: habitat("forest", "Forest", ["#183824", "#315a34", "#63814a", "#c6bd79"], "leaves", "forest-floor", "hills", "trees", "branches", ["rabbit", "deer", "owl"]),
  grassland: habitat("grassland", "Grassland", ["#5f9bc0", "#b7c96b", "#75813f", "#d6bd65"], "pollen", "grass", "hills", "acacias", "tall-grass", ["elephant", "lion", "rabbit"]),
  jungle: habitat("jungle", "Jungle", ["#102e20", "#245735", "#4d7a46", "#9aa85d"], "mist", "jungle-floor", "canopy", "vines", "leaves", ["parrot", "gorilla", "butterfly"]),
  mountain: habitat("mountain", "Mountain", ["#7893ac", "#c3d1dc", "#68737e", "#d8e2e8"], "snow", "rock", "peaks", "cliffs", "boulders", ["mountain_goat", "eagle"]),
  ocean: habitat("ocean", "Open Ocean", ["#073b55", "#0e6e8e", "#2b94aa", "#8ccbd2"], "bubbles", "water", "sun-rays", "kelp", "bubbles", ["dolphin", "shark", "whale"]),
  reef: habitat("reef", "Coral Reef", ["#07516d", "#1389a0", "#35a99e", "#e0c77c"], "bubbles", "reef-sand", "water-rays", "coral", "coral-frame", ["sea_turtle", "octopus", "crab"]),
  river: habitat("river", "River", ["#477d8f", "#659d86", "#3d6c58", "#9f9d68"], "ripples", "riverbank", "hills", "reeds", "bank-plants", ["otter", "salmon", "frog"]),
  sky: habitat("sky", "Open Sky", ["#4b86bc", "#8cc5e7", "#d6ecf5", "#ffffff"], "clouds", "air", "cloudbank", "distant-birds", "cloud-wisps", ["eagle", "owl", "butterfly"]),
  tundra: habitat("tundra", "Polar Tundra", ["#6688a4", "#b6ccd9", "#dce8ec", "#ffffff"], "snow", "snow", "icebergs", "ice", "snowdrifts", ["penguin", "seal", "owl"]),
  wetland: habitat("wetland", "Wetland", ["#385a46", "#71885a", "#556b3e", "#b8b46e"], "fireflies", "mud", "willows", "reeds", "lilies", ["frog", "butterfly", "crocodile"])
};

export function validateWildlifeManifest(targets) {
  const errors = [];
  for (const target of targets) {
    const visual = ANIMAL_VISUALS[target.id];
    if (!visual) { errors.push(`Missing animal visual: ${target.id}`); continue; }
    if (visual.stages.length !== 5) errors.push(`${target.id} needs five visual stages`);
    if (!["idle", "locomotion", "tap"].every(id => visual.animations.includes(id))) errors.push(`${target.id} needs idle, locomotion, and tap animations`);
    if (visual.parts.length < 2) errors.push(`${target.id} needs multiple rig parts`);
    if (!HABITAT_VISUALS[visual.biome]) errors.push(`${target.id} references missing habitat ${visual.biome}`);
  }
  for (const habitat of Object.values(HABITAT_VISUALS)) {
    if (habitat.layers.length !== 5) errors.push(`${habitat.id} needs five parallax layers`);
    if (habitat.ambient.length < 2) errors.push(`${habitat.id} needs an ambient roster`);
    for (const id of habitat.ambient) if (!ANIMAL_VISUALS[id]) errors.push(`${habitat.id} ambient animal is missing: ${id}`);
  }
  return errors;
}

export function wildlifeVisual(id) { return ANIMAL_VISUALS[id] || null; }
export function habitatVisual(id) { return HABITAT_VISUALS[id] || HABITAT_VISUALS.ocean; }
