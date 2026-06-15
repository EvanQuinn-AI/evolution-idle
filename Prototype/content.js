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

// Adult collectibles. Each grows through five authored stages; reaching the
// final stage adds it to the Life Form Collection. `biome` paints the world
// behind the growing creature (see creatures.js BIOME_SCENES). An optional
// `encounter` names a d20 peril event (CHOICE_EVENTS) that fires once per
// attempt at `encounterStage`, giving that animal its own survival decision.
export const LIFE_TARGETS = [
  lifeTarget("human", "Human", "HU", "Mammal", "forest", ["Embryo", "Fetus", "Baby", "Child", "Adult Human"], "Grow a complete human life cycle.", { encounter: "human_fever", encounterStage: 3 }),
  lifeTarget("shark", "Shark", "SH", "Fish", "ocean", ["Egg Case", "Embryo", "Shark Pup", "Juvenile Shark", "Adult Shark"], "Grow from an egg case into an apex ocean predator.", { encounter: "shark_orcas", encounterStage: 3 }),
  lifeTarget("elephant", "Elephant", "EL", "Mammal", "grassland", ["Embryo", "Fetus", "Elephant Calf", "Young Elephant", "Adult Elephant"], "Complete the long development of the largest land mammal.", { encounter: "elephant_drought", encounterStage: 2 }),
  lifeTarget("fox", "Fox", "FX", "Mammal", "forest", ["Embryo", "Fetus", "Fox Kit", "Young Fox", "Adult Fox"], "Raise a fox from its earliest stage to adulthood.", { encounter: "fox_winter", encounterStage: 2 }),
  lifeTarget("chicken", "Chicken", "CK", "Vertebrate", "grassland", ["Fertilized Egg", "Embryo", "Baby Chick", "Young Chicken", "Adult Chicken"], "Protect a vulnerable chick until it becomes an adult chicken.", { encounter: "chicken_fox", encounterStage: 2 }),
  lifeTarget("frog", "Frog", "FR", "Vertebrate", "wetland", ["Egg", "Tadpole", "Legged Tadpole", "Froglet", "Adult Frog"], "Complete metamorphosis from egg to frog.", { encounter: "frog_heron", encounterStage: 3 }),
  lifeTarget("wolf", "Wolf", "WF", "Mammal", "forest", ["Embryo", "Fetus", "Wolf Pup", "Young Wolf", "Adult Wolf"], "Raise a social hunter to adulthood.", { encounter: "wolf_rival", encounterStage: 2 }),
  lifeTarget("whale", "Whale", "WH", "Mammal", "ocean", ["Embryo", "Fetus", "Whale Calf", "Young Whale", "Adult Whale"], "Grow one of the ocean's largest animals.", { encounter: "whale_ship", encounterStage: 3 }),

  // New world: the open sky and warm grasslands.
  lifeTarget("eagle", "Eagle", "EA", "Vertebrate", "sky", ["Egg", "Eaglet", "Fledgling", "Juvenile Eagle", "Adult Eagle"], "Raise a chick on a cliff ledge into a soaring raptor.", { encounter: "eagle_storm", encounterStage: 2 }),
  lifeTarget("lion", "Lion", "LN", "Mammal", "grassland", ["Embryo", "Fetus", "Lion Cub", "Young Lion", "Adult Lion"], "Raise a cub through the dangers of the pride lands.", { encounter: "lion_hyenas", encounterStage: 2 }),
  lifeTarget("kangaroo", "Kangaroo", "KG", "Mammal", "desert", ["Embryo", "Newborn Joey", "Pouch Joey", "Young-at-foot", "Adult Kangaroo"], "Carry a joey from the pouch to the open outback.", { encounter: "kangaroo_dingo", encounterStage: 3 }),
  lifeTarget("snake", "Snake", "SN", "Reptile", "desert", ["Egg", "Hatchling", "Juvenile Snake", "Subadult Snake", "Adult Snake"], "Grow a cold-blooded hunter across the dry lands.", { encounter: "snake_hawk", encounterStage: 2 }),

  // New world: deep ocean and coral reef.
  lifeTarget("dolphin", "Dolphin", "DP", "Mammal", "ocean", ["Embryo", "Fetus", "Dolphin Calf", "Juvenile Dolphin", "Adult Dolphin"], "Raise an intelligent calf in the open ocean.", { encounter: "dolphin_net", encounterStage: 3 }),
  lifeTarget("sea_turtle", "Sea Turtle", "TU", "Reptile", "reef", ["Egg", "Hatchling", "Juvenile Turtle", "Subadult Turtle", "Adult Sea Turtle"], "Survive the gauntlet from beach nest to open reef.", { encounter: "turtle_gauntlet", encounterStage: 1 }),
  lifeTarget("octopus", "Octopus", "OC", "Invertebrate", "reef", ["Egg", "Paralarva", "Juvenile Octopus", "Subadult Octopus", "Adult Octopus"], "Grow a soft-bodied genius of the reef.", { encounter: "octopus_eel", encounterStage: 2 }),
  lifeTarget("salmon", "Salmon", "SA", "Fish", "wetland", ["Egg", "Alevin", "Fry", "Smolt", "Adult Salmon"], "Complete the river-to-sea-and-back salmon journey.", { encounter: "salmon_bear", encounterStage: 3 }),

  // New world: cold tundra and pine forest.
  lifeTarget("penguin", "Penguin", "PN", "Vertebrate", "tundra", ["Egg", "Embryo", "Penguin Chick", "Juvenile Penguin", "Adult Penguin"], "Shelter a chick through the long polar winter.", { encounter: "penguin_blizzard", encounterStage: 2 }),
  lifeTarget("bear", "Bear", "BR", "Mammal", "forest", ["Embryo", "Fetus", "Bear Cub", "Young Bear", "Adult Bear"], "Raise a cub through its first seasons to a giant of the forest.", { encounter: "bear_rival", encounterStage: 2 }),
  lifeTarget("butterfly", "Butterfly", "BF", "Invertebrate", "wetland", ["Egg", "Caterpillar", "Chrysalis", "Emerging Butterfly", "Adult Butterfly"], "Complete a full metamorphosis from egg to butterfly.", { encounter: "butterfly_wasp", encounterStage: 1 }),
  lifeTarget("crocodile", "Crocodile", "CR", "Reptile", "wetland", ["Egg", "Hatchling", "Juvenile Croc", "Subadult Croc", "Adult Crocodile"], "Guard a clutch and grow an ancient ambush predator.", { encounter: "croc_drought", encounterStage: 2 }),

  // New world: high mountains, plus more sky/grassland/desert life.
  lifeTarget("owl", "Owl", "OW", "Vertebrate", "sky", ["Egg", "Owlet", "Fledgling", "Juvenile Owl", "Adult Owl"], "Raise a night hunter from a hollow to silent flight.", { encounter: "owl_marten", encounterStage: 2 }),
  lifeTarget("deer", "Deer", "DE", "Mammal", "forest", ["Embryo", "Fetus", "Fawn", "Yearling", "Adult Deer"], "Raise a fawn through the wolf-haunted woods.", { encounter: "deer_wolves", encounterStage: 2 }),
  lifeTarget("rabbit", "Rabbit", "RB", "Mammal", "grassland", ["Embryo", "Kit", "Weanling", "Young Rabbit", "Adult Rabbit"], "Bring a fast-breeding prey animal safely to adulthood.", { encounter: "rabbit_hawk", encounterStage: 2 }),
  lifeTarget("camel", "Camel", "CM", "Mammal", "desert", ["Embryo", "Fetus", "Camel Calf", "Young Camel", "Adult Camel"], "Grow a desert traveler built to outlast the dunes.", { encounter: "camel_sandstorm", encounterStage: 2 }),
  lifeTarget("mountain_goat", "Mountain Goat", "MG", "Mammal", "mountain", ["Embryo", "Fetus", "Kid", "Yearling", "Adult Goat"], "Raise a kid on sheer cliffs where few predators follow.", { encounter: "goat_eagle", encounterStage: 2 }),

  // New worlds: jungle, river, and cave.
  lifeTarget("gorilla", "Gorilla", "GO", "Mammal", "jungle", ["Embryo", "Fetus", "Infant", "Juvenile Gorilla", "Adult Gorilla"], "Raise a gentle giant through the dense rainforest.", { encounter: "gorilla_leopard", encounterStage: 2 }),
  lifeTarget("otter", "Otter", "OT", "Mammal", "river", ["Embryo", "Fetus", "Otter Pup", "Young Otter", "Adult Otter"], "Raise a playful swimmer along the river's edge.", { encounter: "otter_flood", encounterStage: 2 }),
  lifeTarget("crab", "Crab", "CB", "Invertebrate", "reef", ["Egg", "Zoea", "Megalopa", "Juvenile Crab", "Adult Crab"], "Complete a crab's strange drifting metamorphosis to the seabed.", { encounter: "crab_gull", encounterStage: 3 }),
  lifeTarget("tortoise", "Tortoise", "TO", "Reptile", "desert", ["Egg", "Hatchling", "Juvenile Tortoise", "Subadult Tortoise", "Adult Tortoise"], "Grow a slow, armored survivor of the dry lands.", { encounter: "tortoise_raven", encounterStage: 1 }),
  lifeTarget("bat", "Bat", "BT", "Mammal", "cave", ["Embryo", "Pup", "Juvenile Bat", "Subadult Bat", "Adult Bat"], "Raise a pup in the roost until it can hunt on the wing.", { encounter: "bat_snake", encounterStage: 2 }),

  // More life across existing worlds.
  lifeTarget("seal", "Seal", "SE", "Mammal", "tundra", ["Embryo", "Fetus", "Seal Pup", "Young Seal", "Adult Seal"], "Raise a pup on the ice through its first hunts.", { encounter: "seal_orca", encounterStage: 3 }),
  lifeTarget("parrot", "Parrot", "PA", "Vertebrate", "jungle", ["Egg", "Chick", "Fledgling", "Juvenile Parrot", "Adult Parrot"], "Raise a bright, clever bird in the rainforest canopy.", { encounter: "parrot_snake", encounterStage: 2 }),
  lifeTarget("scorpion", "Scorpion", "SC", "Invertebrate", "desert", ["Embryo", "Newborn", "Juvenile Scorpion", "Subadult Scorpion", "Adult Scorpion"], "Grow an armored desert hunter from a back-riding newborn.", { encounter: "scorpion_owl", encounterStage: 2 })
];

// Collection rarity tiers — give the Life Form Collection visible structure and
// completion goals. Purely a display/achievement layer (it does not change draft
// odds), so a player can still complete every tier. Anything unlisted is Common.
export const LIFE_RARITIES = ["Common", "Rare", "Legendary"];
const LIFE_RARITY = {
  human: "Legendary", whale: "Legendary", shark: "Legendary", elephant: "Legendary", gorilla: "Legendary", octopus: "Legendary",
  eagle: "Rare", dolphin: "Rare", lion: "Rare", bear: "Rare", wolf: "Rare", sea_turtle: "Rare", crocodile: "Rare",
  kangaroo: "Rare", penguin: "Rare", seal: "Rare", owl: "Rare", camel: "Rare", mountain_goat: "Rare", bat: "Rare", tortoise: "Rare"
};
for (const target of LIFE_TARGETS) target.rarity = LIFE_RARITY[target.id] || "Common";

export const LIFE_TARGETS_BY_ID = Object.fromEntries(LIFE_TARGETS.map(item => [item.id, item]));

export const SPECIES = [
  species("bacteria", "Bacteria", "BA", "Microbial", 20, ["microbial"], [], [], "cell", "The first successful strategy is to be tiny and numerous.", "Life begins where chemistry learns to copy itself."),
  species("archaea", "Archaea", "AR", "Microbial", 28, ["microbial"], [], [], "cell", "Ancient specialists treat hostile environments as reasonably priced housing.", "Harsh conditions favor a second microscopic lineage."),
  species("protist", "Protist", "PR", "Microbial", 42, ["microbial"], ["bacteria"], [], "cell", "A single cell starts collecting internal departments.", "Complex cells need an established microbial world."),
  species("choanoflagellate", "Choanoflagellate", "CH", "Microbial", 52, ["microbial", "invertebrates"], ["protist"], [], "cell", "A collar of feeding cells rehearses the cooperation that will become an animal.", "Colonial protists begin sharing food, motion, and responsibility."),
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

  species("sponge", "Sponge", "SP", "Invertebrate", 68, ["invertebrates", "ocean"], ["choanoflagellate"], [], "ocean", "Multicellular life begins by filtering lunch out of the room.", "Calm water favors simple cooperation between cells."),
  species("worm", "Worm", "WO", "Invertebrate", 86, ["invertebrates"], ["sponge"], [], "wetland", "A front end and a back end prove to be a major organizational breakthrough.", "A simple animal needs direction and soft ground."),
  species("mollusk", "Mollusk", "ML", "Invertebrate", 132, ["invertebrates", "ocean"], ["worm"], ["dormancy"], "ocean", "Soft bodies respond to danger by carrying architecture.", "An ocean invertebrate needs protection and patience."),
  species("arthropod", "Arthropod", "AT", "Invertebrate", 148, ["invertebrates"], ["worm"], [], "wetland", "Jointed legs become one of evolution's most reused ideas.", "Segmented life experiments with armor and movement."),
  species("insect", "Insect", "IN", "Invertebrate", 205, ["invertebrates", "flight"], ["arthropod"], ["flight"], "forest", "Six legs, optional wings, and very little interest in human approval.", "High oxygen gives a small armored animal room to take flight.", { modifierAny: ["high_oxygen"] }),

  species("jawless_fish", "Jawless Fish", "JF", "Fish", 105, ["fish", "ocean"], ["sponge"], [], "ocean", "A flexible spine and muscular tail turn drifting into deliberate travel.", "A simple marine animal begins organizing itself around a backbone."),
  species("fish", "Fish", "FI", "Fish", 135, ["fish", "ocean"], ["jawless_fish"], [], "ocean", "Jaws and paired fins make the ocean a road instead of a barrier.", "A jawless swimmer experiments with biting and steering."),
  species("lungfish", "Lungfish", "LF", "Fish", 185, ["fish", "ocean", "reptiles"], ["fish"], ["dormancy"], "wetland", "A gulp of air becomes insurance against a shrinking pool.", "Seasonal wetlands reward fish that can breathe above the waterline."),
  species("shark", "Shark", "SH", "Fish", 225, ["fish", "ocean", "predators"], ["fish"], ["predation"], "ocean", "A highly optimized answer to the question: what if teeth kept moving?", "A mature fish population attracts a dedicated hunter.", { minDiversity: 6 }),
  species("flying_fish", "Flying Fish", "FF", "Fish", 245, ["fish", "ocean", "flight"], ["fish"], ["flight"], "ocean", "The ocean was apparently not enough territory.", "Predator pressure may convince a fish to briefly borrow the sky.", { requiresStory: "fish_escaped", rarity: "Rare" }),

  species("amphibian", "Amphibian", "AM", "Vertebrate", 215, ["reptiles"], ["lungfish"], [], "wetland", "A fish tries land but keeps the return policy.", "Fleshy fins become limbs along the wet margin of the world."),
  species("reptile", "Reptile", "RE", "Reptile", 290, ["reptiles"], ["amphibian"], ["dormancy"], "forest", "A sealed egg makes dry land considerably less inconvenient.", "A land vertebrate needs protection from water loss."),
  species("dinosaur", "Dinosaur", "DI", "Reptile", 410, ["reptiles", "predators"], ["reptile"], ["predation"], "forest", "For a while, being enormous solves nearly every problem.", "Warm air and abundant oxygen favor a dominant reptile.", { modifierAny: ["high_oxygen"], minDiversity: 10, rarity: "Rare" }),
  species("theropod", "Feathered Theropod", "TH", "Reptile", 500, ["reptiles", "flight", "predators"], ["dinosaur"], ["predation"], "forest", "Insulating filaments become display feathers, then begin negotiating with gravity.", "A smaller dinosaur turns warmth and balance into a new body plan.", { rarity: "Rare" }),
  species("bird", "Bird", "BI", "Vertebrate", 590, ["reptiles", "flight"], ["theropod"], ["flight", "dormancy"], "forest", "One dinosaur branch becomes smaller, fluffier, and much louder at dawn.", "A feathered theropod discovers that falling can be negotiated.", { rarity: "Rare" }),

  species("synapsid", "Synapsid", "SY", "Reptile", 360, ["reptiles", "mammals"], ["reptile"], ["dormancy"], "forest", "A new jaw hinge and a warmer metabolism sketch the outline of mammals.", "One reptile branch trades heavy armor for endurance and a more flexible bite."),
  species("mammal", "Mammal", "MA", "Mammal", 450, ["mammals"], ["synapsid"], ["dormancy"], "forest", "Warm blood turns the night shift into an opportunity.", "Small nocturnal survivors wait beneath larger reptiles."),
  species("wolf", "Wolf", "WF", "Mammal", 610, ["mammals", "predators"], ["mammal"], ["predation"], "forest", "Cooperation turns several medium-sized problems into one large problem.", "A social hunter needs prey, forest, and a mammal lineage.", { minDiversity: 12 }),
  species("whale", "Whale", "WH", "Mammal", 680, ["mammals", "ocean"], ["mammal", "fish"], ["dormancy"], "ocean", "A mammal returns to the sea and commits completely.", "A land mammal can revisit the ocean after marine life is established.", { rarity: "Rare" }),
  species("primate", "Primate", "PM", "Mammal", 740, ["mammals"], ["mammal", "flowering_plant"], ["intelligence"], "forest", "Grasping hands make branches, tools, and trouble easier to hold.", "A fruit-rich forest rewards dexterity and social learning.", { minDiversity: 13 }),
  species("ape", "Great Ape", "AP", "Mammal", 900, ["mammals"], ["primate"], ["intelligence"], "forest", "Broad shoulders, patient teaching, and social memory turn tools into traditions.", "An intelligent primate begins passing discoveries between generations.", { minDiversity: 14 }),
  species("human", "Human", "HU", "Mammal", 1100, ["mammals"], ["ape"], ["intelligence"], "forest", "A clever ape invents history, traffic, and forms in triplicate.", "Intelligence needs accumulated knowledge and a complex ecosystem.", { knowledgeAtLeast: 5, minDiversity: 15, worldAtLeast: 3, rarity: "Mythic" }),

  species("post_human", "Post-Human", "PH", "Civilization", 1450, ["civilization"], ["human"], ["intelligence", "dormancy"], "forest", "Evolution becomes partly deliberate, but ancestry remains visible beneath every careful edit.", "A technological species begins adapting itself instead of waiting for the world.", { knowledgeAtLeast: 7, worldAtLeast: 5, rarity: "Mythic" }),
  species("civilization", "Civilization", "CV", "Civilization", 1800, ["civilization"], ["post_human"], ["intelligence"], "forest", "A clever lineage builds cities, archives, and committees to run the committees.", "Accumulated knowledge lets a species reshape the whole world at once.", { knowledgeAtLeast: 9, minDiversity: 16, worldAtLeast: 6, rarity: "Mythic" }),
  species("spacefarer", "Spacefarer", "SF", "Civilization", 2400, ["civilization", "space"], ["civilization"], ["spacefaring"], "forest", "The first cautious step off the only home anyone has ever known.", "A civilization eventually points all that cleverness straight up.", { knowledgeAtLeast: 11, worldAtLeast: 8, rarity: "Mythic" }),
  species("voidborn", "Voidborn", "VB", "Civilization", 3100, ["civilization", "space"], ["spacefarer"], ["spacefaring", "dormancy"], "forest", "A descendant raised between worlds treats vacuum, radiation, and distance as ordinary weather.", "Generations beyond the homeworld turn survival equipment into anatomy.", { knowledgeAtLeast: 13, worldAtLeast: 9, rarity: "Mythic" }),
  species("star_voyager", "Star Voyager", "SV", "Civilization", 4000, ["space", "flight"], ["voidborn"], ["spacefaring", "flight"], "forest", "An alien silhouette drifts between stars in a craft of its own design.", "Mastery of space turns a species into something the stars recognize.", { knowledgeAtLeast: 15, worldAtLeast: 10, rarity: "Mythic" })
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
  ambient("collar_colony", "Choanoflagellates form a feeding colony and briefly behave like one larger creature.", 20, "adaptation", ["choanoflagellate"]),
  ambient("quiet_decay", "Fungi recycle a fallen population. Nothing is wasted, merely reassigned.", 22, "energy", ["mold"]),
  ambient("mass_spawning", "The ocean briefly contains more eggs than water.", 1, "population", ["fish"]),
  ambient("predator_shadow", "A large shadow passes beneath the fish. The fish reconsider optimism.", 1, "clue", ["fish"]),
  ambient("spore_weather", "Spores drift across the forest like extremely patient weather.", 24, "adaptation", ["mushroom"]),
  ambient("insect_hatch", "Millions of insects hatch simultaneously. The forest notices.", 2, "population", ["insect"]),
  ambient("moss_rain", "A week of rain turns every stone into potential moss territory.", 20, "energy", ["moss"]),
  ambient("reef_shelter", "Young fish shelter among sponges, inconveniencing several predators.", 2, "population", ["sponge", "fish"]),
  ambient("lungfish_rain", "Rain reconnects isolated pools and the lungfish population surges through the reeds.", 1, "population", ["lungfish"]),
  ambient("feather_display", "Feathered theropods turn insulation into a competitive visual argument.", 1, "knowledge", ["theropod"]),
  ambient("wolf_song", "A wolf pack announces its borders with excellent acoustics.", 1, "knowledge", ["wolf"]),
  ambient("tool_spark", "A primate strikes two stones together and refuses to stop experimenting.", 1, "knowledge", ["primate"]),
  ambient("ape_lesson", "An ape teaches a younger relative a tool trick instead of making them rediscover it.", 1, "knowledge", ["ape"]),
  ambient("whale_fall", "A whale fall feeds an entire deep-ocean neighborhood for years.", 35, "adaptation", ["whale"]),
  ambient("void_signal", "A Voidborn colony hears a repeating signal between stars and answers carefully.", 2, "knowledge", ["voidborn"]),
  ambient("fossil_exposed", "Erosion exposes a fossil from a previous world. The rocks have kept receipts.", 1, "memory")
];

export const CHOICE_EVENTS = [
  choice("chicken_fox", "A Fox Entered The Chicken Coop", "A fox has broken into the coop while your chick is still developing. Roll to see whether it survives.", [], [
    option("roll_survival", "Roll the d20", "1-10: the chick dies. 11-20: development continues.", {
      roll: {
        difficulty: 11,
        successText: "The chick escapes the fox and continues developing.",
        failureText: "The fox catches the chick. This attempt is lost.",
        success: { adaptation: 40 },
        failure: { failAttempt: "the fox attack" }
      }
    })
  ], { lifeTarget: "chicken" }),
  choice("frog_heron", "A Heron Stalks The Shallows", "A heron wades into the pool where your froglet is finishing its legs. One careful strike could end the attempt.", [], [
    option("roll_dart", "Roll the d20: dart for cover", "1-9: the heron strikes. 10-20: the froglet vanishes into the weeds.", {
      roll: {
        difficulty: 10,
        successText: "The froglet slips beneath the lily pads and keeps growing.",
        failureText: "The heron strikes. This attempt is lost.",
        success: { adaptation: 45 },
        failure: { failAttempt: "the heron" }
      }
    })
  ], { lifeTarget: "frog" }),
  choice("eagle_storm", "A Storm Hits The Nest", "A violent storm batters the cliff ledge while your eaglet is still flightless. Roll to see whether the nest holds.", [], [
    option("roll_shelter", "Roll the d20: ride out the storm", "1-10: the nest fails. 11-20: the eaglet endures.", {
      roll: {
        difficulty: 11,
        successText: "The nest holds and the eaglet weathers the storm.",
        failureText: "The nest is torn from the cliff. This attempt is lost.",
        success: { adaptation: 50, knowledge: 1 },
        failure: { failAttempt: "the storm" }
      }
    })
  ], { lifeTarget: "eagle" }),
  choice("turtle_gauntlet", "The Dash To The Sea", "Your hatchling breaks from the nest at dawn as gulls patrol the beach. It must cross the open sand to reach the surf.", [], [
    option("roll_dash", "Roll the d20: race for the water", "1-9: a gull takes the hatchling. 10-20: it reaches the waves.", {
      roll: {
        difficulty: 10,
        successText: "The hatchling reaches the surf and disappears into the reef.",
        failureText: "A gull snatches the hatchling on the sand. This attempt is lost.",
        success: { adaptation: 45 },
        failure: { failAttempt: "the gulls" }
      }
    })
  ], { lifeTarget: "sea_turtle" }),
  choice("salmon_bear", "Bears At The Falls", "Your smolt has grown into a returning salmon, but bears line the rapids at the only way upstream. Roll to run the gauntlet.", [], [
    option("roll_leap", "Roll the d20: leap the falls", "1-10: a bear catches the salmon. 11-20: it clears the falls.", {
      roll: {
        difficulty: 11,
        successText: "The salmon clears the falls and reaches the spawning grounds.",
        failureText: "A bear plucks the salmon mid-leap. This attempt is lost.",
        success: { adaptation: 55, knowledge: 1 },
        failure: { failAttempt: "the bears" }
      }
    })
  ], { lifeTarget: "salmon" }),
  choice("lion_hyenas", "Hyenas Test The Pride", "A hyena clan circles while your lion cub strays from the pride. Roll to see whether the cub makes it back.", [], [
    option("roll_retreat", "Roll the d20: bolt for the pride", "1-10: the clan cuts the cub off. 11-20: it reaches safety.", {
      roll: {
        difficulty: 11,
        successText: "The cub scrambles back among the lionesses and survives.",
        failureText: "The hyenas reach the cub first. This attempt is lost.",
        success: { adaptation: 50 },
        failure: { failAttempt: "the hyena clan" }
      }
    })
  ], { lifeTarget: "lion" }),
  choice("penguin_blizzard", "A Blizzard Sweeps The Colony", "A polar storm engulfs the colony while your chick still depends on shared warmth. Roll to see whether it endures.", [], [
    option("roll_huddle", "Roll the d20: huddle for warmth", "1-9: the chick freezes. 10-20: the huddle holds.", {
      roll: {
        difficulty: 10,
        successText: "The huddle shifts and the chick keeps its warmth through the storm.",
        failureText: "The cold reaches the chick. This attempt is lost.",
        success: { adaptation: 50, knowledge: 1 },
        failure: { failAttempt: "the blizzard" }
      }
    })
  ], { lifeTarget: "penguin" }),
  choice("croc_drought", "The River Runs Dry", "A drought shrinks the wetland to scattered pools while your hatchling is still small. Roll to find safe water.", [], [
    option("roll_trek", "Roll the d20: cross to deeper water", "1-10: it is stranded in the open. 11-20: it reaches a deep pool.", {
      roll: {
        difficulty: 11,
        successText: "The hatchling reaches a deep pool and waits out the drought.",
        failureText: "The hatchling is stranded and lost. This attempt is over.",
        success: { adaptation: 45 },
        failure: { failAttempt: "the drought" }
      }
    })
  ], { lifeTarget: "crocodile" }),
  choice("shark_orcas", "An Orca Pod Hunts The Reef", "An orca pod drives your juvenile shark into the open while it is still growing. Roll to escape the ambush.", [], [
    option("roll_flee", "Roll the d20: dive deep and scatter", "1-10: the pod corners the shark. 11-20: it slips into the deep.", {
      roll: {
        difficulty: 11,
        successText: "The shark dives beyond the pod and vanishes into the dark water.",
        failureText: "The pod corners the shark. This attempt is lost.",
        success: { adaptation: 55 },
        failure: { failAttempt: "the orca pod" }
      }
    })
  ], { lifeTarget: "shark" }),
  choice("whale_ship", "A Ship Crosses The Migration", "A fast vessel cuts across the lane where your whale calf is still learning to surface. Roll to avoid the strike.", [], [
    option("roll_sound", "Roll the d20: sound and dive", "1-9: the calf is struck. 10-20: it dives clear.", {
      roll: {
        difficulty: 10,
        successText: "The calf sounds and the hull passes harmlessly overhead.",
        failureText: "The calf cannot dive in time. This attempt is lost.",
        success: { adaptation: 55, knowledge: 1 },
        failure: { failAttempt: "the ship strike" }
      }
    })
  ], { lifeTarget: "whale" }),
  choice("fox_winter", "A Hard Winter", "Snow buries the field mice while your fox kit is still small and the den's stores run thin. Roll to find enough food.", [], [
    option("roll_hunt", "Roll the d20: hunt under the snow", "1-10: the kit starves. 11-20: it finds enough to last.", {
      roll: {
        difficulty: 11,
        successText: "The kit learns to pounce through snow and makes it to spring.",
        failureText: "The winter outlasts the den's stores. This attempt is lost.",
        success: { adaptation: 50 },
        failure: { failAttempt: "the hard winter" }
      }
    })
  ], { lifeTarget: "fox" }),
  choice("bear_rival", "A Rival Male Arrives", "A large rival male enters the territory where your bear cub still depends on its mother. Roll to keep the cub safe.", [], [
    option("roll_hide", "Roll the d20: tree the cub and stand guard", "1-9: the rival reaches the cub. 10-20: the cub is kept safe.", {
      roll: {
        difficulty: 10,
        successText: "The cub climbs high and the rival moves on.",
        failureText: "The rival reaches the cub. This attempt is lost.",
        success: { adaptation: 50 },
        failure: { failAttempt: "the rival male" }
      }
    })
  ], { lifeTarget: "bear" }),
  choice("dolphin_net", "Nets In The Bay", "A drifting net fills the bay where your dolphin calf is feeding. Roll to keep the pod clear of it.", [], [
    option("roll_lead", "Roll the d20: lead the calf around it", "1-10: the calf is entangled. 11-20: the pod skirts the net.", {
      roll: {
        difficulty: 11,
        successText: "The pod reads the danger and guides the calf around the net.",
        failureText: "The calf drifts into the net. This attempt is lost.",
        success: { adaptation: 50, knowledge: 1 },
        failure: { failAttempt: "the drifting net" }
      }
    })
  ], { lifeTarget: "dolphin" }),
  choice("human_fever", "A Dangerous Fever", "Your child develops a high fever before modern medicine exists. Roll to see whether the body fights it off.", [], [
    option("roll_recover", "Roll the d20: weather the fever", "1-9: the fever wins. 10-20: the child pulls through.", {
      roll: {
        difficulty: 10,
        successText: "The fever breaks and the child recovers.",
        failureText: "The fever proves too much. This attempt is lost.",
        success: { adaptation: 55, knowledge: 1 },
        failure: { failAttempt: "the fever" }
      }
    })
  ], { lifeTarget: "human" }),
  choice("elephant_drought", "The Waterholes Dry Up", "A long dry season empties the savanna's waterholes while your calf still nurses. Roll to reach water with the herd.", [], [
    option("roll_march", "Roll the d20: march with the herd", "1-10: the calf cannot keep up. 11-20: it reaches water.", {
      roll: {
        difficulty: 11,
        successText: "The matriarch leads the herd to water and the calf survives.",
        failureText: "The calf falls behind on the long march. This attempt is lost.",
        success: { adaptation: 55 },
        failure: { failAttempt: "the drought" }
      }
    })
  ], { lifeTarget: "elephant" }),
  choice("wolf_rival", "A Rival Pack Crosses In", "A rival pack pushes into the territory while your wolf pup is still small. Roll to see whether the pack holds its ground.", [], [
    option("roll_defend", "Roll the d20: hold the den", "1-10: the den is overrun. 11-20: the pack drives them off.", {
      roll: {
        difficulty: 11,
        successText: "The pack defends the den and the pup is safe.",
        failureText: "The rival pack overruns the den. This attempt is lost.",
        success: { adaptation: 50 },
        failure: { failAttempt: "the rival pack" }
      }
    })
  ], { lifeTarget: "wolf" }),
  choice("kangaroo_dingo", "A Dingo On The Plain", "A dingo singles out your young-at-foot joey on the open plain. Roll to bound back to the mob.", [], [
    option("roll_bound", "Roll the d20: bound for the mob", "1-10: the dingo runs it down. 11-20: it reaches the mob.", {
      roll: {
        difficulty: 11,
        successText: "The joey bounds back into the mob and the dingo gives up.",
        failureText: "The dingo runs the joey down. This attempt is lost.",
        success: { adaptation: 50 },
        failure: { failAttempt: "the dingo" }
      }
    })
  ], { lifeTarget: "kangaroo", encounterStage: 3 }),
  choice("snake_hawk", "A Hawk Above The Dunes", "A hawk circles low over the dunes where your juvenile snake is basking in the open. Roll to reach cover.", [], [
    option("roll_burrow", "Roll the d20: race for the rocks", "1-9: the hawk stoops first. 10-20: it reaches cover.", {
      roll: {
        difficulty: 10,
        successText: "The snake pours into a crevice before the hawk strikes.",
        failureText: "The hawk strikes in the open. This attempt is lost.",
        success: { adaptation: 45 },
        failure: { failAttempt: "the hawk" }
      }
    })
  ], { lifeTarget: "snake" }),
  choice("octopus_eel", "A Moray In The Reef", "A moray eel probes the crevice where your juvenile octopus is hiding. Roll to escape the reef predator.", [], [
    option("roll_ink", "Roll the d20: ink and jet away", "1-10: the eel catches it. 11-20: it escapes in a cloud of ink.", {
      roll: {
        difficulty: 11,
        successText: "A burst of ink and the octopus jets to a new den.",
        failureText: "The moray strikes home. This attempt is lost.",
        success: { adaptation: 50, knowledge: 1 },
        failure: { failAttempt: "the moray eel" }
      }
    })
  ], { lifeTarget: "octopus" }),
  choice("butterfly_wasp", "A Parasitic Wasp", "A wasp hunts the leaf where your caterpillar is feeding, seeking a host for its eggs. Roll to avoid being found.", [], [
    option("roll_hide", "Roll the d20: freeze and blend in", "1-9: the wasp finds it. 10-20: it goes unnoticed.", {
      roll: {
        difficulty: 10,
        successText: "The caterpillar holds still and the wasp moves on.",
        failureText: "The wasp finds its host. This attempt is lost.",
        success: { adaptation: 45 },
        failure: { failAttempt: "the parasitic wasp" }
      }
    })
  ], { lifeTarget: "butterfly", encounterStage: 1 }),
  choice("owl_marten", "A Marten Climbs The Tree", "A pine marten scales the trunk toward the hollow where your owlet waits alone. Roll to see whether it is found.", [], [
    option("roll_still", "Roll the d20: stay silent in the hollow", "1-10: the marten reaches the nest. 11-20: it climbs past.", {
      roll: {
        difficulty: 11,
        successText: "The owlet stays silent and the marten moves on.",
        failureText: "The marten finds the hollow. This attempt is lost.",
        success: { adaptation: 50 },
        failure: { failAttempt: "the pine marten" }
      }
    })
  ], { lifeTarget: "owl" }),
  choice("deer_wolves", "Wolves On The Trail", "A wolf pack picks up the scent of your fawn while it is still slow. Roll to reach the herd ahead of them.", [], [
    option("roll_run", "Roll the d20: bolt for the herd", "1-10: the pack runs it down. 11-20: it reaches the herd.", {
      roll: {
        difficulty: 11,
        successText: "The fawn reaches the herd and the wolves break off.",
        failureText: "The pack runs the fawn down. This attempt is lost.",
        success: { adaptation: 50 },
        failure: { failAttempt: "the wolf pack" }
      }
    })
  ], { lifeTarget: "deer" }),
  choice("rabbit_hawk", "A Hawk Over The Meadow", "A hawk hangs over the meadow where your young rabbit is grazing far from the warren. Roll to reach the burrow.", [], [
    option("roll_dash", "Roll the d20: dash for the burrow", "1-9: the hawk stoops first. 10-20: it reaches the burrow.", {
      roll: {
        difficulty: 10,
        successText: "The rabbit zigzags into the burrow as the hawk pulls up.",
        failureText: "The hawk stoops first. This attempt is lost.",
        success: { adaptation: 45 },
        failure: { failAttempt: "the hawk" }
      }
    })
  ], { lifeTarget: "rabbit" }),
  choice("camel_sandstorm", "A Sandstorm Rises", "A wall of sand sweeps the dunes while your camel calf travels with the caravan. Roll to weather the storm.", [], [
    option("roll_endure", "Roll the d20: shelter and endure", "1-10: the calf is lost in the storm. 11-20: it endures.", {
      roll: {
        difficulty: 11,
        successText: "The calf folds down and breathes through the storm until it passes.",
        failureText: "The calf is lost in the blinding sand. This attempt is lost.",
        success: { adaptation: 50, knowledge: 1 },
        failure: { failAttempt: "the sandstorm" }
      }
    })
  ], { lifeTarget: "camel" }),
  choice("goat_eagle", "An Eagle Works The Ledge", "A golden eagle sweeps the cliff, trying to knock your kid from a narrow ledge. Roll to keep its footing.", [], [
    option("roll_brace", "Roll the d20: brace against the rock", "1-10: the kid is swept off. 11-20: it holds the ledge.", {
      roll: {
        difficulty: 11,
        successText: "The kid presses to the rock and the eagle breaks off.",
        failureText: "The eagle knocks the kid from the ledge. This attempt is lost.",
        success: { adaptation: 55 },
        failure: { failAttempt: "the golden eagle" }
      }
    })
  ], { lifeTarget: "mountain_goat" }),
  choice("gorilla_leopard", "A Leopard In The Canopy", "A leopard shadows the troop while your gorilla infant clings to its mother. Roll to see whether the silverback drives it off.", [], [
    option("roll_guard", "Roll the d20: shelter behind the silverback", "1-10: the leopard reaches the infant. 11-20: it is driven off.", {
      roll: {
        difficulty: 11,
        successText: "The silverback charges and the leopard melts back into the trees.",
        failureText: "The leopard slips past the troop. This attempt is lost.",
        success: { adaptation: 55 },
        failure: { failAttempt: "the leopard" }
      }
    })
  ], { lifeTarget: "gorilla" }),
  choice("otter_flood", "A Flash Flood", "A sudden flood tears down the river while your otter pup is still a weak swimmer. Roll to reach the bank.", [], [
    option("roll_swim", "Roll the d20: ride the current to shore", "1-9: the pup is swept away. 10-20: it reaches the bank.", {
      roll: {
        difficulty: 10,
        successText: "The pup rides the surge and scrambles onto the bank.",
        failureText: "The flood sweeps the pup downstream. This attempt is lost.",
        success: { adaptation: 50 },
        failure: { failAttempt: "the flood" }
      }
    })
  ], { lifeTarget: "otter" }),
  choice("crab_gull", "Soft-Shell Molt", "Your juvenile crab must molt to grow, and for a few hours its new shell is soft while a gull patrols the tide pool. Roll to stay hidden.", [], [
    option("roll_bury", "Roll the d20: bury in the sand", "1-10: the gull finds it. 11-20: it stays buried and hardens.", {
      roll: {
        difficulty: 11,
        successText: "The crab buries down until its shell hardens and the gull moves on.",
        failureText: "The gull finds the soft-shelled crab. This attempt is lost.",
        success: { adaptation: 50 },
        failure: { failAttempt: "the gull" }
      }
    })
  ], { lifeTarget: "crab" }),
  choice("tortoise_raven", "Ravens At The Nest", "Your hatchling digs out of the sand into the open as ravens patrol the dunes. Roll to reach cover.", [], [
    option("roll_scrub", "Roll the d20: scramble for the scrub", "1-9: a raven takes it. 10-20: it reaches the brush.", {
      roll: {
        difficulty: 10,
        successText: "The hatchling reaches the scrub and disappears beneath a bush.",
        failureText: "A raven snatches the hatchling. This attempt is lost.",
        success: { adaptation: 45 },
        failure: { failAttempt: "the ravens" }
      }
    })
  ], { lifeTarget: "tortoise" }),
  choice("bat_snake", "A Snake In The Roost", "A snake climbs the cave wall toward the cluster where your bat pup roosts. Roll to see whether it is reached.", [], [
    option("roll_climb", "Roll the d20: shuffle deeper into the cluster", "1-10: the snake reaches the pup. 11-20: it climbs past.", {
      roll: {
        difficulty: 11,
        successText: "The pup shuffles deep into the roost and the snake finds nothing.",
        failureText: "The snake reaches the roost. This attempt is lost.",
        success: { adaptation: 50 },
        failure: { failAttempt: "the snake" }
      }
    })
  ], { lifeTarget: "bat" }),
  choice("seal_orca", "An Orca Patrols The Ice", "An orca cruises the ice edge where your young seal must enter the water to feed. Roll to time the dive.", [], [
    option("roll_time", "Roll the d20: wait, then slip in", "1-10: the orca is waiting. 11-20: the seal feeds safely.", {
      roll: {
        difficulty: 11,
        successText: "The seal reads the lull and slips in and out before the orca returns.",
        failureText: "The orca is waiting at the ice edge. This attempt is lost.",
        success: { adaptation: 55 },
        failure: { failAttempt: "the orca" }
      }
    })
  ], { lifeTarget: "seal" }),
  choice("parrot_snake", "A Snake At The Hollow", "A tree snake winds toward the nest hollow where your parrot chick waits. Roll to see whether the flock raises the alarm in time.", [], [
    option("roll_alarm", "Roll the d20: trust the flock's alarm", "1-10: the snake reaches the chick. 11-20: the flock mobs it off.", {
      roll: {
        difficulty: 11,
        successText: "The flock erupts and drives the snake from the tree.",
        failureText: "The snake reaches the hollow first. This attempt is lost.",
        success: { adaptation: 50 },
        failure: { failAttempt: "the tree snake" }
      }
    })
  ], { lifeTarget: "parrot" }),
  choice("scorpion_owl", "An Owl Hunts The Dunes", "An owl quarters the moonlit dunes where your juvenile scorpion forages in the open. Roll to reach a burrow.", [], [
    option("roll_dig", "Roll the d20: back into a burrow", "1-9: the owl drops on it. 10-20: it reaches cover.", {
      roll: {
        difficulty: 10,
        successText: "The scorpion backs into a burrow as the owl's talons close on sand.",
        failureText: "The owl drops out of the dark. This attempt is lost.",
        success: { adaptation: 45 },
        failure: { failAttempt: "the owl" }
      }
    })
  ], { lifeTarget: "scorpion" }),
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
    option("warm_blood", "Favor warm blood", "Reveal the Synapsid bridge and gain Dormancy.", { clue: "synapsid", trait: "dormancy", adaptation: 75 }),
    option("giant_reptiles", "Favor giant reptiles", "Reveal Dinosaur and gain Predation.", { clue: "dinosaur", trait: "predation", adaptation: 75 })
  ]),
  choice("fox_coop", "A Fox At The Chicken Coop", "A ground-nesting bird colony has become a rough chicken coop. A fox tests the fence after dark.", ["bird"], [
    option("roll_guard", "Roll d20: guard the coop", "Roll against difficulty 11. Predation grants +2; failure wipes out the bird population.", {
      roll: {
        difficulty: 11,
        bonusTrait: "predation",
        successText: "The fox is driven off and the flock survives.",
        failureText: "The defense fails. The flock dies and enters the Fossil Collection.",
        success: { adaptation: 90, knowledge: 1 },
        failure: { eliminatePopulation: true, targetSpecies: "bird", pressure: 8 }
      }
    }),
    option("reinforce_coop", "Reinforce the coop", "Spend Energy for a certain defense instead of trusting the die.", { energy: -220, adaptation: 45, story: "fox_proof_coop" })
  ]),
  choice("first_breath", "The Water Is Disappearing", "A seasonal pool shrinks around the lungfish. Air above the surface has become the largest unexplored habitat.", ["lungfish"], [
    option("crawl", "Push toward the reeds", "Protect the boldest fish and reveal the Amphibian route.", { energy: -120, adaptation: 95, clue: "amphibian" }),
    option("burrow", "Wait beneath the mud", "Gain resilience and preserve the current population.", { adaptation: 55, trait: "dormancy" })
  ]),
  choice("ape_tools", "A Useful Stone", "One ape keeps a sharp stone instead of discarding it. Others watch, imitate, and improve the idea.", ["ape"], [
    option("teach", "Teach the whole troop", "Gain Knowledge and prepare the Human route.", { energy: -180, knowledge: 2, story: "culture_shared" }),
    option("hoard", "Keep the advantage", "Gain immediate Energy but less shared knowledge.", { energy: 260, knowledge: 1 })
  ]),
  choice("designed_body", "Evolution Becomes A Choice", "Humanity can now alter inherited biology deliberately. The next descendant will be authored as much as born.", ["human"], [
    option("adapt_world", "Adapt bodies to the world", "Reveal the Post-Human route and gain resilience.", { adaptation: 180, knowledge: 2, clue: "post_human", trait: "dormancy" }),
    option("adapt_worlds", "Prepare for many worlds", "Spend Energy on a spaceward research program.", { energy: -300, knowledge: 3, trait: "spacefaring" })
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
    preparationDetails: {
      "Shelter burrowing life": { description: "Favor dormant and soil-dwelling survivors.", survival: 0.08, trait: "dormancy" },
      "Preserve ocean genomes": { description: "Give marine lineages an extra chance to survive.", survival: 0.06, biome: "ocean" },
      "Diversify food webs": { description: "Carry more species through the bottleneck.", survival: 0.14 }
    },
    resistantTraits: ["dormancy"],
    stamp: "Impact Survivor"
  },
  {
    id: "ice_age",
    name: "Ice Age",
    omens: ["Winters linger beyond their invitation.", "Glaciers begin moving with geological confidence.", "Migration routes shift toward the equator."],
    crisis: "Ice advances while habitats contract.",
    preparation: ["Migrate populations", "Favor insulation", "Store seasonal energy"],
    preparationDetails: {
      "Migrate populations": { description: "Favor mobile lineages as habitats contract.", survival: 0.07, trait: "flight" },
      "Favor insulation": { description: "Dormant and warm-blooded lineages receive priority.", survival: 0.09, trait: "dormancy" },
      "Store seasonal energy": { description: "Improve survival broadly through the long winter.", survival: 0.12 }
    },
    resistantTraits: ["dormancy"],
    stamp: "Ice Survivor"
  },
  {
    id: "solar_flare",
    name: "Solar Flare",
    omens: ["Auroras reach latitudes that have never heard of them.", "Migration briefly follows magnetic north in several directions.", "The daylight carries a faint electrical hiss."],
    crisis: "Radiation tears through exposed habitats and fragile technology.",
    preparation: ["Seek deep water", "Enter dormancy", "Shield the genome"],
    preparationDetails: {
      "Seek deep water": { description: "Marine populations gain shelter from radiation.", survival: 0.08, biome: "ocean" },
      "Enter dormancy": { description: "Dormant lineages wait out the worst exposure.", survival: 0.08, trait: "dormancy" },
      "Shield the genome": { description: "Protect a wider sample of the fossil record.", survival: 0.13 }
    },
    resistantTraits: ["dormancy", "spacefaring"],
    stamp: "Flare Survivor"
  },
  {
    id: "supervolcano",
    name: "Supervolcano",
    omens: ["The ground vibrates beneath otherwise reasonable forests.", "Sulfur haze turns sunsets theatrical and breathing unpopular.", "Hot springs begin expanding their territory."],
    crisis: "Ash darkens the sky while food webs lose their foundations.",
    preparation: ["Bank fungal stores", "Protect producers", "Build underground refuges"],
    preparationDetails: {
      "Bank fungal stores": { description: "Spore-bearing species thrive on the coming decay.", survival: 0.08, trait: "spores" },
      "Protect producers": { description: "Photosynthetic lineages receive scarce light and shelter.", survival: 0.08, trait: "photosynthesis" },
      "Build underground refuges": { description: "Improve survival across the whole ecosystem.", survival: 0.12, trait: "dormancy" }
    },
    resistantTraits: ["spores", "dormancy"],
    stamp: "Ash Survivor"
  },
  {
    id: "pandemic",
    name: "Pandemic",
    omens: ["Closely packed populations begin sharing more than food.", "Migration routes carry an invisible passenger.", "The healthiest habitats become suspiciously quiet."],
    crisis: "A fast-changing pathogen follows every successful lineage.",
    preparation: ["Separate populations", "Accelerate variation", "Preserve isolated biomes"],
    preparationDetails: {
      "Separate populations": { description: "Reduce transmission by favoring smaller isolated groups.", survival: 0.1 },
      "Accelerate variation": { description: "Evolutionary diversity produces more resistant survivors.", survival: 0.13 },
      "Preserve isolated biomes": { description: "Wetland refuges shelter disconnected populations.", survival: 0.08, biome: "wetland" }
    },
    resistantTraits: ["dormancy", "spores"],
    stamp: "Plague Survivor"
  },
  {
    id: "ocean_anoxia",
    name: "Ocean Anoxia",
    omens: ["Deep currents slow and the water darkens.", "Fish crowd the surface where oxygen remains.", "Coastlines collect unfamiliar blooms."],
    crisis: "The ocean loses oxygen from the bottom upward.",
    preparation: ["Move life ashore", "Protect photosynthesis", "Favor air-breathers"],
    preparationDetails: {
      "Move life ashore": { description: "Forest and wetland species escape the dying sea.", survival: 0.09, biome: "forest" },
      "Protect photosynthesis": { description: "Producer lineages rebuild oxygen sooner.", survival: 0.08, trait: "photosynthesis" },
      "Favor air-breathers": { description: "Land-capable descendants gain priority.", survival: 0.11, biome: "wetland" }
    },
    resistantTraits: ["photosynthesis", "dormancy"],
    stamp: "Anoxia Survivor"
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
  ach("crowded_world", "Crowded World", "Keep 8 species alive in one world.", g => g.livingDiversity >= 8),
  ach("survivor", "Survivor", "Live through your first extinction.", g => g.knownExtinctions.size >= 1),
  ach("both_ends", "Both Ends", "Survive an Asteroid Impact and an Ice Age.", g => g.knownExtinctions.size >= 2),
  ach("deep_time", "Deep Time", "Reach World 5.", g => g.worldNumber >= 5),
  ach("ancient_one", "Ancient One", "Reach World 10.", g => g.worldNumber >= 10),
  ach("whole_biosphere", "Whole Biosphere", "Reach a world where Ocean, Wetland, and Forest coexist.", g => g.worldBiomes.length >= 3),
  ach("took_to_sky", "Took To The Sky", "Evolve a flying lifeform.", g => g.activeTraits.has("flight")),
  ach("apex", "Apex", "Evolve a dedicated predator.", g => g.activeTraits.has("predation")),
  ach("self_aware", "Self Aware", "Evolve intelligence.", g => g.activeTraits.has("intelligence")),
  ach("became_human", "Became Human", "Discover the Human lineage.", g => g.known.has("human")),
  ach("left_the_planet", "Left The Planet", "Evolve a spacefaring species.", g => g.activeTraits.has("spacefaring")),
  ach("among_the_stars", "Among The Stars", "Become a Star Voyager.", g => g.known.has("star_voyager"), true),
  ach("decision_maker", "Decision Maker", "Resolve 10 ecosystem decisions.", g => g.totalChoiceEvents >= 10),
  ach("geneticist", "Geneticist", "Buy 5 genome upgrades.", g => g.genomeUpgradesBought >= 5),
  ach("master_naturalist", "Master Naturalist", "Earn 10 total species Mastery levels.", g => g.totalMastery >= 10),
  ach("hoarder", "Energy Hoarder", "Hold 5,000 Energy at once.", g => g.energy >= 5000),
  ach("mythic_hunter", "Mythic Hunter", "Discover a Mythic species.", g => [...g.known].some(id => SPECIES_BY_ID[id]?.rarity === "Mythic"), true),

  // Life Form Collection achievements — the milestones the reshaped loop actually
  // produces (the species-tree achievements above never trigger in collection play).
  ach("first_life", "First Life Form", "Grow your first life form all the way to adulthood.", g => g.lifeCollection.size >= 1),
  ach("menagerie", "Menagerie", "Collect 5 different life forms.", g => g.lifeCollection.size >= 5),
  ach("noahs_ark", "Noah's Ark", "Collect 15 different life forms.", g => g.lifeCollection.size >= 15),
  ach("globetrotter", "Globetrotter", "Collect life forms native to 6 different worlds.", g => new Set([...g.lifeCollection].map(id => LIFE_TARGETS_BY_ID[id]?.biome).filter(Boolean)).size >= 6),
  ach("living_planet", "Living Planet", "Complete the entire Life Form Collection.", g => g.lifeCollection.size >= LIFE_TARGETS.length, true),
  ach("first_legend", "Legend In The Making", "Collect your first Legendary life form.", g => [...g.lifeCollection].some(id => LIFE_TARGETS_BY_ID[id]?.rarity === "Legendary")),
  ach("legend_keeper", "Keeper Of Legends", "Collect every Legendary life form.", g => {
    const legendary = LIFE_TARGETS.filter(t => t.rarity === "Legendary");
    return legendary.length > 0 && legendary.every(t => g.lifeCollection.has(t.id));
  }, true)
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

function lifeTarget(id, name, glyph, group, biome, stages, description, extra = {}) {
  return { id, name, glyph, group, biome, stages, description, encounter: null, encounterStage: 2, ...extra };
}
