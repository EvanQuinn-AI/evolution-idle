import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { LIFE_TARGETS } from "./content.js";
import { ANIMAL_VISUALS, HABITAT_VISUALS, validateWildlifeManifest } from "./assets/stage/manifest.js";
import { creatureForSpecies } from "./creatures.js";

assert.equal(Object.keys(ANIMAL_VISUALS).length, 33, "Every collectible needs an illustrated visual.");
assert.equal(Object.keys(HABITAT_VISUALS).length, 12, "The collection must keep twelve illustrated habitats.");
assert.deepEqual(validateWildlifeManifest(LIFE_TARGETS), []);

for (const target of LIFE_TARGETS) {
  const visual = ANIMAL_VISUALS[target.id];
  assert.equal(visual.stages.length, target.stages.length, `${target.id} stage art must match gameplay stages.`);
  assert.ok(visual.stages.every((stage, index) => stage.index === index && stage.scale > 0), `${target.id} stage configuration must be ordered and drawable.`);
  assert.deepEqual(visual.animations, ["idle", "locomotion", "tap"]);
  assert.ok(visual.parts.includes("body") && visual.parts.includes("head"), `${target.id} needs a cutout body and head.`);
  assert.ok(visual.visualId.startsWith("wildlife-"));
  const descriptor = creatureForSpecies(target);
  assert.equal(descriptor.visualId, visual.visualId);
  assert.equal(descriptor.locomotionFamily, visual.family);
}

for (const habitat of Object.values(HABITAT_VISUALS)) {
  assert.deepEqual(habitat.layers.map(layer => layer.id), ["atmosphere", "distance", "midground", "playfield", "foreground"]);
  assert.ok(habitat.ambient.length >= 2);
  assert.ok(habitat.ambient.every(id => ANIMAL_VISUALS[id]), `${habitat.id} ambience must use collectible rigs.`);
}

for (const [left, right] of [["fox", "wolf"], ["shark", "dolphin"], ["sea_turtle", "tortoise"], ["eagle", "owl"], ["seal", "otter"]]) {
  const signature = id => JSON.stringify({ colors: ANIMAL_VISUALS[id].colors, shape: ANIMAL_VISUALS[id].shape, family: ANIMAL_VISUALS[id].family });
  assert.notEqual(signature(left), signature(right), `${left} and ${right} need distinct visual signatures.`);
}

const runtimeBytes = (await stat(new URL("./wildlife-stage.js", import.meta.url))).size
  + (await stat(new URL("./assets/stage/manifest.js", import.meta.url))).size;
assert.ok(runtimeBytes < 1_500_000, "The initial wildlife runtime must remain below 1.5 MB.");

console.log("wildlife manifest tests passed: 33 animals, five stages each, and 12 layered habitats");
