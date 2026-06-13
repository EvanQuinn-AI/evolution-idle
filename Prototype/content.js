export const ALBUMS = [
  { id: "all", name: "All Species", description: "Every named lifeform in the current chapter." },
  { id: "microbial", name: "Microbial", description: "Life before anyone had the decency to become visible." },
  { id: "plants", name: "Plants", description: "Sunlight converted into increasingly ambitious greenery." },
  { id: "fungi", name: "Fungi", description: "Decomposers, partners, parasites, and excellent networkers." },
  { id: "invertebrates", name: "Invertebrates", description: "A vast empire built without a backbone." },
  { id: "fish", name: "Fish", description: "Aquatic vertebrates and their alarming neighbors." },
  { id: "reptiles", name: "Reptiles", description: "Life leaves the water and immediately grows scales." },
  { id: "mammals", name: "Mammals", description: "Warm blood, parental investment, and complicated consequences." },
  { id: "predators", name: "Predators", description: "Species that discovered other species contain calories." },
  { id: "ocean", name: "Ocean", description: "Life shaped by salt water, currents, and depth." },
  { id: "flight", name: "Flight", description: "Several unrelated attempts to stop touching the ground." },
  { id: "civilization", name: "Civilization", description: "Life that builds, writes, and overthinks the consequences." },
  { id: "space", name: "Spacefaring", description: "Life that decided one planet was not enough." },
  { id: "survivors", name: "Extinction Survivors", description: "Species stamped by surviving a cataclysm." }
];

export const TRAITS = [
  { id: "photosynthesis", name: "Photosynthesis", description: "Harvest light for passive Adaptation." },
  { id: "spores", name: "Spores", description: "Fungal routes spread faster after ambient events." },
  { id: "predation", name: "Predation", description: "Unlock hunters and risky ecological events." },
  { id: "flight", name: "Flight", description: "Unlock aerial routes and migration outcomes." },
  { id: "intelligence", name: "Intelligence", description: "Unlock tools, stories, and the Human route." },
  { id: "dormancy", name: "Dormancy", description: "Improves extinction survival and offline production." },
  { id: "spacefaring", name: "Spacefaring", description: "Unlock routes beyond the homeworld." }
];

export const SPECIES = [
  species("bacteria", "Bacteria", "BA", "Microbial", 20, ["microbial"], [], [], "cell", "The first successful strategy is to be tiny and numerous.", "Life begins where chemistry learns to copy itself."),
  species("archaea", "Archaea", "AR", "Microbial", 28, ["microbial"], [], [], "cell", "Ancient specialists treat hostile environments as reasonably priced housing.", "Harsh conditions favor a second microscopic lineage.", { modifierAny: ["cold_climate", "abundant_carbon"] }),
  species("protist", "Protist", "PR", "Microbial", 42, ["microbial"], ["bacteria"], [], "cell", "A single cell starts collecting internal departments.", "Complex cells need an established microbial world."),
  species("extremophile", "Extremophile", "EX", "Microbial", 90, ["microbial"], ["archaea"], ["dormancy"], "cell", "It survives catastrophe mostly to make ordinary life look dramatic.", "An ancient lineage waits for danger to reveal its talent.", { pressureAtLeast: 45, rarity: "Mythic" }),

  species("green_algae", "Green Algae", "GA", "Plant", 55, ["plants", "ocean"], ["protist"], ["photosynthesis"], "ocean", "A floating green film quietly invents the future of lunch.", "A photosynthetic protist needs open water."),
  species("moss", "Moss", "MO", "Plant", 80, ["plants"], ["green_algae"], ["photosynthesis"], "wetland", "Land receives a soft green carpet with no respect for property lines.", "The first plants ashore require persistent moisture."),
  species("fern", "Fern", "FE", "Plant", 125, ["plants"], ["moss"], ["photosynthesis"], "wetland", "Vascular tissue turns damp greenery into architecture.", "A wetland plant seeks height without seeds."),
  species("conifer", "Conifer", "CO", "Plant", 190, ["plants"], ["fern"], ["photosynthesis", "dormancy"], "forest", "The cone is a patient plan for outlasting winter.", "Cold forests reward seeds and stubbornness.", { modifierAny: ["cold_climate"] }),
  species("flowering_plant", "Flowering Plant", "FL", "Plant", 210, ["plants"], ["fern"], ["photosynthesis"], "forest", "It recruits animals into a global pollen delivery business.", "A mature forest needs a more persuasive reproductive strategy."),

  species("mold", "Mold", "MD", "Fungus", 58, ["fungi"], ["protist"], ["spores"], "forest", "Decay becomes a career path.", "Dead organic matter is an invitation to a patient network."),
  species("mushroom", "Mushroom", "MU", "Fungus", 92, ["fungi"], ["mold"], ["spores"], "forest", "The visible mushroom is the network briefly introducing itself.", "A fungal web prepares a fruiting body."),
  species("lichen", "Lichen", "LI", "Fungus", 150, ["fungi"], ["mushroom", "green_algae"], ["spores", "photosynthesis"], "forest", "A fungus and an alga enter a long-term business arrangement.", "Two lineages can survive together where neither thrives alone.", { rarity: "Rare" }),
  species("parasitic_fungus", "Parasitic Fungus", "PF", "Fungus", 185, ["fungi", "predators"], ["mushroom", "insect"], ["spores", "predation"], "forest", "Evolution invents remote control and immediately makes it unsettling.", "A mature fungus searches for a mobile host.", { rarity: "Rare" }),

  species("sponge", "Sponge", "SP", "Invertebrate", 62, ["invertebrates", "ocean"], ["protist"], [], "ocean", "Multicellular life begins by filtering lunch out of the room.", "Calm water favors simple cooperation between cells."),
  species("worm", "Worm", "WO", "Invertebrate", 76, ["invertebrates"], ["sponge"], [], "wetland", "A front end and a back end prove to be a major organizational breakthrough.", "A simple animal needs direction and soft ground."),
  species("mollusk", "Mollusk", "ML", "Invertebrate", 118, ["invertebrates", "ocean"], ["worm"], ["dormancy"], "ocean", "Soft bodies respond to danger by carrying architecture.", "An ocean invertebrate needs protection and patience."),
  species("arthropod", "Arthropod", "AT", "Invertebrate", 132, ["invertebrates"], ["worm"], [], "wetland", "Jointed legs become one of evolution's most reused ideas.", "Segmented life experiments with armor and movement."),
  species("insect", "Insect", "IN", "Invertebrate", 175, ["invertebrates", "flight"], ["arthropod"], ["flight"], "forest", "Six legs, optional wings, and very little interest in human approval.", "High oxygen gives a small armored animal room to take flight.", { modifierAny: ["high_oxygen"] }),

  species("fish", "Fish", "FI", "Fish", 105, ["fish", "ocean"], ["sponge"], [], "ocean", "The ocean becomes a road instead of a barrier.", "A swimming vertebrate needs an established marine ecosystem."),
  species("shark", "Shark", "SH", "Fish", 185, ["fish", "ocean", "predators"], ["fish"], ["predation"], "ocean", "A highly optimized answer to the question: what if teeth kept moving?", "A mature fish population attracts a dedicated hunter.", { minDiversity: 5 }),
  species("flying_fish", "Flying Fish", "FF", "Fish", 205, ["fish", "ocean", "flight"], ["fish"], ["flight"], "ocean", "The ocean was apparently not enough territory.", "Predator pressure may convince a fish to briefly borrow the sky.", { requiresStory: "fish_escaped", rarity: "Rare" }),

  species("amphibian", "Amphibian", "AM", "Vertebrate", 155, ["reptiles"], ["fish"], [], "wetland", "A fish tries land but keeps the return policy.", "Shallow wetlands connect water to a new world."),
  species("reptile", "Reptile", "RE", "Reptile", 215, ["reptiles"], ["amphibian"], ["dormancy"], "forest", "A sealed egg makes dry land considerably less inconvenient.", "A land vertebrate needs protection from water loss."),
  species("dinosaur", "Dinosaur", "DI", "Reptile", 310, ["reptiles", "predators"], ["reptile"], ["predation"], "forest", "For a while, being enormous solves nearly every problem.", "Warm air and abundant oxygen favor a dominant reptile.", { modifierAny: ["high_oxygen"], minDiversity: 8, rarity: "Rare" }),
  species("bird", "Bird", "BI", "Vertebrate", 330, ["reptiles", "flight"], ["dinosaur"], ["flight", "dormancy"], "forest", "One dinosaur branch becomes smaller, fluffier, and much louder at dawn.", "A feathered dinosaur discovers that falling can be negotiated.", { rarity: "Rare" }),

  species("mammal", "Mammal", "MA", "Mammal", 235, ["mammals"], ["reptile"], ["dormancy"], "forest", "Warm blood turns the night shift into an opportunity.", "Small nocturnal survivors wait beneath larger reptiles."),
  species("wolf", "Wolf", "WF", "Mammal", 315, ["mammals", "predators"], ["mammal"], ["predation"], "forest", "Cooperation turns several medium-sized problems into one large problem.", "A social hunter needs prey, forest, and a mammal lineage.", { minDiversity: 9 }),
  species("whale", "Whale", "WH", "Mammal", 350, ["mammals", "ocean"], ["mammal", "fish"], ["dormancy"], "ocean", "A mammal returns to the sea and commits completely.", "A land mammal can revisit the ocean after marine life is established.", { rarity: "Rare" }),
  species("primate", "Primate", "PM", "Mammal", 390, ["mammals"], ["mammal", "flowering_plant"], ["intelligence"], "forest", "Grasping hands make branches, tools, and trouble easier to hold.", "A fruit-rich forest rewards dexterity and social learning.", { minDiversity: 10 }),
  species("human", "Human", "HU", "Mammal", 520, ["mammals"], ["primate"], ["intelligence"], "forest", "A clever primate invents history, traffic, and forms in triplicate.", "Intelligence needs accumulated knowledge and a complex ecosystem.", { knowledgeAtLeast: 3, minDiversity: 12, rarity: "Mythic" }),

  species("civilization", "Civilization", "CV", "Civilization", 720, ["civilization"], ["human"], ["intelligence"], "forest", "A clever ape builds cities, archives, and committees to run the committees.", "Accumulated knowledge lets a species reshape the whole world at once.", { knowledgeAtLeast: 5, minDiversity: 13, rarity: "Mythic" }),
  species("spacefarer", "Spacefarer", "SF", "Civilization", 1000, ["civilization", "space"], ["civilization"], ["spacefaring"], "forest", "The first cautious step off the only home anyone has ever known.", "A civilization eventually points all that cleverness straight up.", { knowledgeAtLeast: 7, rarity: "Mythic" }),
  species("star_voyager", "Star Voyager", "SV", "Civilization", 1400, ["space", "flight"], ["spacefarer"], ["spacefaring", "flight"], "forest", "An alien silhouette drifts between stars in a craft of its own design.", "Mastery of space turns a species into something the stars recognize.", { knowledgeAtLeast: 9, rarity: "Mythic" })
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map(item => [item.id, item]));

export const WORLD_MODIFIERS = [
  { id: "abundant_carbon", name: "Abundant Carbon", effect: "+25% Energy production", production: 1.25, clue: "Black-rich soil feeds chemistry." },
  { id: "high_oxygen", name: "High Oxygen", effect: "+20% Adaptation; enables giant and flying routes", adaptation: 1.2, clue: "Every breath feels unusually generous." },
  { id: "cold_climate", name: "Cold Climate", effect: "Extinction pressure rises 15% slower", pressure: 0.85, clue: "Ice advances farther each season." },
  { id: "tidal_world", name: "Powerful Tides", effect: "+15% marine population output", production: 1.15, clue: "The coastline moves twice a day with unusual conviction." },
  { id: "volcanic_soil", name: "Volcanic Soil", effect: "+15% Adaptation from land life", adaptation: 1.15, clue: "Fresh stone becomes fertile with surprising speed." }
];

export const BIOMES = [
  { id: "ocean", name: "Ocean", description: "Currents connect microbial, fish, and marine mammal routes." },
  { id: "wetland", name: "Wetland", description: "The bridge between aquatic and terrestrial life." },
  { id: "forest", name: "Forest", description: "Dense ecological interactions favor fungi, insects, mammals, and plants." }
];

// Per-biome ecological baselines for the living food web (see ecosystem.js).
// plantCapacity is the carrying capacity of ambient flora (the "auto-producer"
// floor that herbivores graze even before the player evolves real plants);
// regen is the fraction/sec that flora relaxes back toward capacity. water and
// temperature are flavor/expansion hooks. "cell" is the primordial sea origin.
export const BIOME_ECOLOGY = {
  cell:    { plantCapacity: 70,  regen: 0.060, water: 1.0, temperature: 0.50, floraWord: "microbial mats" },
  ocean:   { plantCapacity: 120, regen: 0.050, water: 1.0, temperature: 0.50, floraWord: "algae" },
  wetland: { plantCapacity: 110, regen: 0.055, water: 0.9, temperature: 0.55, floraWord: "reeds" },
  forest:  { plantCapacity: 140, regen: 0.050, water: 0.7, temperature: 0.60, floraWord: "greenery" }
};

export const AMBIENT_EVENTS = [
  ambient("microbial_bloom", "A microbial bloom turns the shallows an ambitious shade of green.", 18, "adaptation"),
  ambient("quiet_decay", "Fungi recycle a fallen population. Nothing is wasted, merely reassigned.", 22, "energy", ["mold"]),
  ambient("mass_spawning", "The ocean briefly contains more eggs than water.", 1, "population", ["fish"]),
  ambient("predator_shadow", "A large shadow passes beneath the fish. The fish reconsider optimism.", 1, "clue", ["fish"]),
  ambient("spore_weather", "Spores drift across the forest like extremely patient weather.", 24, "adaptation", ["mushroom"]),
  ambient("insect_hatch", "Millions of insects hatch simultaneously. The forest notices.", 2, "population", ["insect"]),
  ambient("moss_rain", "A week of rain turns every stone into potential moss territory.", 20, "energy", ["moss"]),
  ambient("reef_shelter", "Young fish shelter among sponges, inconveniencing several predators.", 2, "population", ["sponge", "fish"]),
  ambient("wolf_song", "A wolf pack announces its borders with excellent acoustics.", 1, "knowledge", ["wolf"]),
  ambient("tool_spark", "A primate strikes two stones together and refuses to stop experimenting.", 1, "knowledge", ["primate"]),
  ambient("whale_fall", "A whale fall feeds an entire deep-ocean neighborhood for years.", 35, "adaptation", ["whale"]),
  ambient("fossil_exposed", "Erosion exposes a fossil from a previous world. The rocks have kept receipts.", 1, "memory")
];

export const CHOICE_EVENTS = [
  choice("fish_eaten", "Something Ate The Fish", "A fish population drops sharply. Something with teeth is treating the reef as a buffet.", ["fish"], [
    option("migrate", "Migrate to the shallows", "Lose less population and reveal a flight clue.", { population: -1, adaptation: 35, story: "fish_escaped", clue: "flying_fish", trait: "flight" }),
    option("camouflage", "Evolve camouflage", "Spend Energy to stabilize the population.", { energy: -80, adaptation: 60, trait: "dormancy" }),
    option("hunt", "Hunt the hunter", "Risk more fish to expose the predator route.", { population: -2, knowledge: 1, clue: "shark", trait: "predation" })
  ]),
  choice("human_car", "A Human Gets Hit By A Car", "One notable human loses an argument with urban transport. Humanity remains discovered; urban planning gains a meeting.", ["human"], [
    option("safe_streets", "Build safer streets", "Reduce productivity now and record a compassionate outcome.", { energy: -140, knowledge: 2, story: "vision_zero" }),
    option("faster_cars", "Build faster cars", "Gain Energy. Urban mortality becomes a future event modifier.", { energy: 220, story: "speed_over_safety" }),
    option("ban_cars", "Ban private cars", "Gain Adaptation and unlock an unusual city story.", { adaptation: 150, story: "car_free_city" })
  ]),
  choice("oxygen_spike", "The Atmosphere Changes", "Photosynthetic life pushes oxygen upward. Fire and large bodies both become more plausible.", ["green_algae"], [
    option("embrace_oxygen", "Let oxygen rise", "Gain Adaptation and reveal aerial routes.", { adaptation: 80, trait: "flight" }),
    option("buffer_oxygen", "Stabilize the atmosphere", "Slow extinction pressure and favor resilient life.", { pressure: -8, trait: "dormancy" })
  ]),
  choice("fungal_bargain", "A Fungal Bargain", "A fungal network offers nutrients to a photosynthetic partner, though neither has legal representation.", ["mushroom", "green_algae"], [
    option("cooperate", "Encourage cooperation", "Reveal Lichen and gain Knowledge.", { knowledge: 1, clue: "lichen", adaptation: 45 }),
    option("compete", "Let them compete", "Gain immediate Energy from rapid turnover.", { energy: 160 })
  ]),
  choice("egg_on_land", "An Egg On Dry Land", "A vertebrate egg survives away from water. This is either a miracle or good packaging.", ["amphibian"], [
    option("protect_egg", "Protect the clutch", "Reveal the Reptile route.", { clue: "reptile", adaptation: 70 }),
    option("consume_egg", "Recycle the nutrients", "Gain Energy and postpone the route.", { energy: 180 })
  ]),
  choice("night_shift", "The Night Shift", "Small warm animals thrive while larger reptiles sleep.", ["reptile"], [
    option("warm_blood", "Favor warm blood", "Reveal Mammals and gain Dormancy.", { clue: "mammal", trait: "dormancy", adaptation: 75 }),
    option("giant_reptiles", "Favor giant reptiles", "Reveal Dinosaur and gain Predation.", { clue: "dinosaur", trait: "predation", adaptation: 75 })
  ]),
  choice("forest_fire", "Fire In The Forest", "Lightning starts a fire. Several species call it a disaster; a few call it available real estate.", ["forest"], [
    option("let_burn", "Let succession begin", "Lose Energy, gain Adaptation, and advance extinction pressure.", { energy: -90, adaptation: 120, pressure: 5 }),
    option("contain", "Contain the fire", "Spend Adaptation to preserve current populations.", { adaptation: -50, knowledge: 1 })
  ]),
  choice("strange_fossil", "A Fossil That Should Not Be Here", "The skeleton resembles no known branch. The sensible response is curiosity followed by paperwork.", [], [
    option("study", "Study it", "Gain Discovery Knowledge and increase anomaly pity.", { knowledge: 2, story: "anomaly_studied" }),
    option("display", "Put it in the museum", "Gain Evolution Memory and a notable story.", { memory: 2, story: "museum_fossil" })
  ], { pity: 4 })
];

export const EXTINCTIONS = [
  {
    id: "asteroid",
    name: "Asteroid Impact",
    omens: ["Unusual lights cross the night sky.", "A new star appears to move against the heavens.", "Tidal records show a distant gravitational visitor."],
    crisis: "Orbital calculations become deeply unpopular.",
    preparation: ["Shelter burrowing life", "Preserve ocean genomes", "Diversify food webs"],
    resistantTraits: ["dormancy"],
    stamp: "Impact Survivor"
  },
  {
    id: "ice_age",
    name: "Ice Age",
    omens: ["Winters linger beyond their invitation.", "Glaciers begin moving with geological confidence.", "Migration routes shift toward the equator."],
    crisis: "Ice advances while habitats contract.",
    preparation: ["Migrate populations", "Favor insulation", "Store seasonal energy"],
    resistantTraits: ["dormancy"],
    stamp: "Ice Survivor"
  }
];

export const ORIGIN_ANCHORS = [
  { id: "atomic", name: "Atomic Origin", memoryCost: 0, description: "Begin from raw Energy." },
  { id: "cellular", name: "Cellular Origin", memoryCost: 12, description: "Begin each world with Cell unlocked and the origin chain automated." }
];

// Achievements double as the "collection" of milestones the player chases.
// Each check is a pure predicate over the live game; the engine evaluates them
// on every change and fires onAchievement the first time one passes.
export const ACHIEVEMENTS = [
  ach("first_spark", "First Spark", "Catalyze your very first Cell.", g => g.cells >= 1),
  ach("it_lives", "It Lives", "Discover your first species.", g => g.known.size >= 1),
  ach("the_collector", "The Collector", "Record 10 species in the Atlas.", g => g.known.size >= 10),
  ach("archivist", "Archivist", "Record 20 species in the Atlas.", g => g.known.size >= 20),
  ach("tree_of_life", "Tree Of Life", "Complete the entire Species Atlas.", g => g.known.size >= SPECIES.length),
  ach("crowded_world", "Crowded World", "Keep 8 species alive in one world.", g => g.runReached.size >= 8),
  ach("survivor", "Survivor", "Live through your first extinction.", g => g.knownExtinctions.size >= 1),
  ach("both_ends", "Both Ends", "Survive an Asteroid Impact and an Ice Age.", g => g.knownExtinctions.size >= 2),
  ach("deep_time", "Deep Time", "Reach World 5.", g => g.worldNumber >= 5),
  ach("ancient_one", "Ancient One", "Reach World 10.", g => g.worldNumber >= 10),
  ach("took_to_sky", "Took To The Sky", "Evolve a flying lifeform.", g => g.activeTraits.has("flight")),
  ach("apex", "Apex", "Evolve a dedicated predator.", g => g.activeTraits.has("predation")),
  ach("self_aware", "Self Aware", "Evolve intelligence.", g => g.activeTraits.has("intelligence")),
  ach("became_human", "Became Human", "Discover the Human lineage.", g => g.known.has("human")),
  ach("left_the_planet", "Left The Planet", "Evolve a spacefaring species.", g => g.activeTraits.has("spacefaring")),
  ach("among_the_stars", "Among The Stars", "Become a Star Voyager.", g => g.known.has("star_voyager"), true),
  ach("decision_maker", "Decision Maker", "Resolve 10 ecosystem decisions.", g => g.totalChoiceEvents >= 10),
  ach("geneticist", "Geneticist", "Buy 5 genome upgrades.", g => g.genomeUpgradesBought >= 5),
  ach("hoarder", "Energy Hoarder", "Hold 5,000 Energy at once.", g => g.energy >= 5000),
  ach("mythic_hunter", "Mythic Hunter", "Discover a Mythic species.", g => [...g.known].some(id => SPECIES_BY_ID[id]?.rarity === "Mythic"), true)
];

function ach(id, name, description, check, secret = false) {
  return { id, name, description, check, secret };
}

function species(id, name, glyph, group, cost, albums, requires, grantsTraits, biome, fact, clue, extra = {}) {
  return {
    id,
    name,
    glyph,
    group,
    cost,
    albums,
    requires,
    grantsTraits,
    biome,
    fact,
    clue,
    rarity: extra.rarity || (cost >= 300 ? "Rare" : cost >= 120 ? "Uncommon" : "Common"),
    ...extra
  };
}

function ambient(id, text, amount, effect, requires = []) {
  return { id, text, amount, effect, requires, cooldown: 2 };
}

function choice(id, title, text, requires, options, extra = {}) {
  return { id, title, text, requires, options, cooldown: 3, ...extra };
}

function option(id, label, description, effects) {
  return { id, label, description, effects };
}
