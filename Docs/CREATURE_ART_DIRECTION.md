# Evolution Idle Creature Art Direction

## Purpose

This document is the visual and technical contract for every creature in Evolution Idle. It exists to support more than 1,000 forms without turning the collection into unrelated models from different sources.

The central promise is simple:

> Every new form looks exciting on its own and visibly inherits something from its ancestors.

No production creature should begin before its lineage role, rig family, inherited visual DNA, silhouette target, and runtime budget are defined.

## Product View

The camera usually presents creatures at mobile scale. Recognition must survive:

- A 96 px encyclopedia portrait.
- A 140 to 220 px evolution-stage presentation.
- A small population silhouette in the living world.
- Low brightness, color-blind modes, and busy biome backgrounds.
- Animation played at 30 fps on low-end mobile hardware.

The style is stylized low-poly science fantasy. It favors broad shapes, readable motion, controlled exaggeration, and personality over anatomical detail.

## Visual DNA System

Every creature is assembled from inherited visual channels. A child keeps at least three channels from its parent and changes one or two strongly enough to feel new.

### Inheritance Channels

1. **Core mass**: orb, spindle, teardrop, barrel, wedge, or upright torso.
2. **Locomotion line**: drift, undulate, paddle, crawl, stride, hop, flap, or hover.
3. **Face language**: eye placement, brow plane, mouth line, snout, or sensory cluster.
4. **Appendage rhythm**: paired fins, repeated segments, four limbs, wing fan, digits, or tools.
5. **Surface motif**: membrane, plates, scales, feathers, fur tufts, skin panels, or geometric light.
6. **Lineage accent**: a stable color channel inherited across a branch.
7. **Signature motion**: pulse, tail beat, head tilt, chest rise, feather settle, or energy flicker.

### Era Grammar

| Era | Shape language | Eyes | Surface | Motion |
| --- | --- | --- | --- | --- |
| Atomic | circles, orbit arcs | none | emissive core | pulse and orbit |
| Molecular | linked lobes | none | soft facets | bond stretch |
| Cellular | rounded asymmetry | one sensory spot | translucent membrane cues | squash, divide, drift |
| Marine | spindle and teardrop | lateral, simple | smooth skin and fin planes | tail-led swimming |
| Amphibious | low body with retained tail | raised slightly | wet skin with fin remnants | paddle to crawl |
| Reptilian | angular wedge forms | guarded brow | plates and scale blocks | deliberate stride |
| Dinosaur/Bird | powerful hips, feather fans | alert | scales transitioning to feather planes | stride, hop, flap |
| Mammalian | warmer rounded masses | forward personality | fur clumps, ears, flexible tails | breathing and weight shift |
| Primate/Human | upright center of gravity | expressive and forward | simplified skin/hair masses | hand-led gestures |
| Future | familiar inherited anatomy plus impossible geometry | controlled glow | luminous seams and floating elements | precise, low-gravity motion |

### Lineage Accent Colors

Lineage accents are not full-body uniforms. They occupy approximately 10 to 25 percent of the visible creature and persist through descendants.

| Lineage | Accent range | Meaning |
| --- | --- | --- |
| Origin/cellular | mint and cyan | replication and internal energy |
| Fish | teal and ocean blue | aquatic ancestry |
| Amphibian | teal transitioning to spring green | water-to-land bridge |
| Reptile | olive, jade, and amber | armor and dry-land adaptation |
| Bird | inherited reptile accent plus gold or sky highlights | feathers and flight |
| Mammal | ochre, rust, cream, and warm gray | metabolism and insulation |
| Primate | warm brown plus hand/face contrast | dexterity and social focus |
| Civilization | lineage color plus controlled white/metal | constructed order |
| Future life | ancestral accent plus violet/cyan emission | engineered transcendence |

Rarity changes accent treatment, not anatomy. Rare forms may receive a secondary accent. Mythic forms may add restrained emission or a unique idle effect.

## Creature Design Rules

Every design must pass all of these checks:

1. The black silhouette is recognizable at 96 px.
2. The largest three masses explain the creature before texture or color.
3. The creature differs from its parent through one major anatomical innovation.
4. At least three inherited visual DNA channels remain visible.
5. The face has one clear emotional read: curious, patient, wary, proud, social, or alien.
6. The idle loop communicates breathing, buoyancy, balance, or internal activity.
7. The active loop has a readable anticipation, action, and settle phase.
8. Thin geometry is avoided unless it is a lineage-defining feature.
9. Details are grouped into two or three clusters instead of spread uniformly.
10. Color supports silhouette and never carries recognition alone.

### Proportion Standard

- Head or sensory mass: 20 to 35 percent of body length for most animal forms.
- Eyes: deliberately oversized, but scaled by lineage and maturity.
- Limbs: thick enough to remain at least 2 px wide in the smallest gameplay view.
- Feet, fins, hands, wings, and tails: exaggerated 15 to 30 percent when they define the form.
- Avoid realistic micro-proportions that disappear at gameplay distance.
- Large creatures should gain mass and slower timing, not simply uniform scale.

### Evolution Moment Standard

The reveal should communicate three beats within two seconds:

1. **Inheritance**: briefly show the parent silhouette or pose.
2. **Transformation**: emphasize the new anatomical innovation.
3. **Ownership**: settle into the child's signature idle and accent color.

## Rig Families

Use 18 production rig families. A family is a shared skeleton, animator controller, avatar policy, socket set, and animation library. It is not a species category.

| ID | Family | Core forms | Required shared bones/features |
| --- | --- | --- | --- |
| RF01 | Microform | atoms, molecules, cells, bacteria | root, core lobes, membrane deformers, orbit sockets |
| RF02 | Frond Colony | algae, moss, fern, fungi, sponge | base, stem chain, radial branches, cap/frond sockets |
| RF03 | Softbody | worm, mollusk, larvae | 8 to 12 segment chain, head, optional shell socket |
| RF04 | Arthropod | arthropods, insects, arachnids | segmented body, 3 to 4 leg pairs, antenna and wing sockets |
| RF05 | Crustacean | crabs, shrimp, armored marine forms | carapace, claws, swimmerets, antennae |
| RF06 | Basic Fish | early fish, flying fish | spine chain, jaw, tail, paired fin sockets |
| RF07 | Cartilaginous Fish | sharks, rays | wide head, jaw, pectoral fins, asymmetric tail support |
| RF08 | Amphibian | salamander, frog-like forms | spine, retained tail socket, four limbs, flexible head |
| RF09 | Small Reptile | lizards, early reptiles | low spine, four limbs, tail chain, jaw |
| RF10 | Serpentine | snakes, eels, limbless future forms | 16 to 24 segment chain, jaw, optional fin sockets |
| RF11 | Theropod | biped dinosaurs, ground birds | hips, tail, digitigrade legs, arms/wings, jaw/beak |
| RF12 | Heavy Dinosaur | quadruped dinosaurs, megafauna reptiles | heavy spine, four pillar limbs, neck and tail chains |
| RF13 | Avian | flying and perching birds | breast root, wing chains, tail fan, legs, beak |
| RF14 | Small Quadruped | basal mammals, rodents, small canids/felines | flexible spine, four limbs, ears, tail, jaw |
| RF15 | Large Quadruped | whales, ungulates, heavy mammals | heavy spine, four limb/flipper sockets, neck, tail |
| RF16 | Primate | monkeys and apes | upright-capable spine, long arms, hands, expressive head |
| RF17 | Humanoid | humans and post-humans | humanoid avatar, hands, face sockets, equipment anchors |
| RF18 | Constructed/Transcendent | civilization avatars, engineered life | modular root, floating sockets, humanoid compatibility where possible |

Create a new rig family only when an existing family cannot produce the silhouette or locomotion without broken deformation. Color, horns, fins, ears, shells, and most proportions do not justify a new family.

## Animation Standard

### Shared Clip Set

Every animal rig family ships with:

- `Idle_A`: neutral breathing or buoyancy, 2.5 to 5 seconds.
- `Idle_B`: personality variation, 3 to 7 seconds.
- `Move_Loop`: family locomotion at gameplay speed.
- `Move_Burst`: short energetic locomotion.
- `React_Positive`: evolution, food, or tap response.
- `React_Threat`: extinction or predator response.
- `Sleep_Dormant`: survival and offline presentation.
- `Spawn_In`: population entry.
- `Exit_Out`: migration or population loss.

### Timing Rules

- Idle movement should remain inside 8 percent of the framing area.
- The signature motion must read with audio muted.
- Avoid constant high-frequency motion; idle animation should not exhaust the eye.
- Animation curves use strong pose holds and clean ease-in/ease-out.
- Root motion is disabled for idle presentation and population agents unless explicitly required.
- Animation events use stable IDs, never direct scene references.

### Retargeting

- Humanoid forms use Unity Humanoid only where it improves reuse.
- Animal families use Generic rigs with consistent bone names and rest poses.
- Mesh variants may change bone scale within approved limits, but may not reorder or remove required bones.
- Optional bones are disabled by scale or renderer state, not deleted per variant.

## Geometry and LOD

### Triangle Budgets

| Asset | LOD0 | LOD1 | LOD2 |
| --- | ---: | ---: | ---: |
| Microform | 500 | 250 | billboard/icon |
| Small creature | 2,500 | 1,200 | 450 |
| Standard creature | 4,000 | 2,000 | 700 |
| Hero/mythic creature | 5,000 | 2,500 | 900 |

- One skinned mesh renderer is preferred; two are allowed for eyes or a shared accessory layer.
- Maximum four bone weights per vertex; prefer two on mobile-critical forms.
- Avoid alpha-cutout fur and feathers in the base roster. Model broad clumps and feather planes.
- Use mirrored topology where asymmetry is not a defining feature.
- Keep silhouette geometry in the mesh; keep minor markings in palette masks.

### LOD Policy

- LOD0: evolution reveal, encyclopedia inspection, and hero stage.
- LOD1: normal gameplay stage and nearby population agents.
- LOD2: distant population simulation.
- Impostor/icon: dense population displays and encyclopedia grids.
- LOD transitions use cross-fade only when the target device tier permits it.

## Texture Standard

Use a small library of shared texture arrays or atlases rather than unique texture sets per species.

### Base Maps

- `TX_CreaturePalette_01`: 256 x 256 nearest/bilinear palette lookup.
- `TX_CreaturePattern_01`: 1024 x 1024 shared masks for spots, stripes, bands, plates, and gradients.
- `TX_CreatureNormalSoft_01`: 512 x 512 optional shared soft-form normal details.
- `TX_CreatureFX_01`: 512 x 512 emission, dissolve, and evolution masks.

### Channel Packing

- Base color comes from material properties and a palette lookup.
- Pattern mask R: primary markings.
- Pattern mask G: secondary markings.
- Pattern mask B: roughness variation.
- Pattern mask A: emission or special-effect mask.

### Texture Rules

- No baked lighting.
- No species-specific 2K textures for standard forms.
- Avoid tiny painted eyes; use shared eye meshes/materials.
- Keep texel density consistent within a rig family.
- Use trim sheets for civilization equipment and future geometry.

## Material Standard

Use one URP Shader Graph family named `CreatureLit` with feature keywords kept deliberately small.

Required properties:

- `_ColorPrimary`
- `_ColorSecondary`
- `_ColorAccent`
- `_ColorUnderbody`
- `_PatternIndex`
- `_PatternScale`
- `_Roughness`
- `_RimColor`
- `_RimStrength`
- `_EmissionColor`
- `_EmissionStrength`
- `_WorldStress`
- `_EvolutionBlend`

Material variants:

- `MAT_Creature_Soft`
- `MAT_Creature_Scale`
- `MAT_Creature_FurClump`
- `MAT_Creature_Feather`
- `MAT_Creature_Shell`
- `MAT_Creature_Future`

Prefer `MaterialPropertyBlock` for species colors and state. Do not instantiate materials at runtime. All population renderers must remain GPU-instancing compatible when they are not skinned; skinned crowds use LOD2 impostors or baked animation strategies.

## Color and State

### Base Palette Roles

- Primary: 60 percent of visible area.
- Secondary: 25 percent.
- Underbody/neutral: 10 percent.
- Lineage accent: 5 to 15 percent.
- Emission: 0 percent for ordinary forms, maximum 8 percent for future/mythic forms.

### World-State Response

Creature materials respond consistently to the simulation:

- High Karma: slightly higher saturation, relaxed idle, bright eye highlight.
- Low Karma: reduced saturation, sharper breathing, dirt/stress mask, guarded pose.
- High population: more background agents, not a larger hero creature.
- Low population: fewer agents and more cautious spacing.
- High extinction risk: world-light response, wind or current reaction, threat animation frequency.
- Extinction survivor: one subtle fossil scar, pattern, or accessory stamp; never a total redesign.

## Naming Convention

Use lowercase content IDs in data and PascalCase asset names.

```text
Content ID:          wolf_gray
Prefab:              PF_Creature_WolfGray
Model source:         SM_WolfGray_Source
Skinned mesh:         SK_WolfGray_LOD0
Skeleton prefab:      RIG_RF14_SmallQuadruped
Avatar:               AV_RF17_Humanoid
Animation clip:       AN_RF14_MoveLoop
Animator controller:  AC_RF14_SmallQuadruped
Material preset:      MP_WolfGray_Default
Texture:              TX_CreaturePattern_01
Icon:                 IC_Creature_WolfGray
Definition asset:     CD_WolfGray
Evolution VFX:        VFX_Evolve_WolfGray
Addressable label:    creature.family.rf14
Addressable address:  creature/wolf_gray
```

Never encode rarity, balance values, version numbers, or biome restrictions in asset filenames.

## Unity Folder Structure

```text
Assets/_Game/Art/Creatures/
  _Shared/
    Materials/
    Shaders/
    Textures/
    Eyes/
    VFX/
  RigFamilies/
    RF01_Microform/
      Rigs/
      Animations/
      Controllers/
      TestScenes/
    ...
    RF18_Constructed/
  Species/
    microbial/bacteria/
      Models/
      Prefabs/
      Icons/
      Definitions/
    fish/shark/
    mammal/wolf/
  EvolutionFX/
  Validation/
  Editor/
```

Do not organize source art primarily by artist, sprint, store package, or platform.

## Addressables and Runtime Loading

- One Addressables group per delivery tier, not per species.
- Labels: rig family, era, biome, and release pack.
- Creature definitions reference stable content IDs and Addressable addresses.
- Base install contains current-run common families and low-resolution icons.
- Later eras and seasonal forms may download as remote groups.
- Shared skeletons, shaders, and atlases belong to a shared dependency group.
- No prefab may directly reference another delivery pack's unique asset.
- Catalog validation must fail on missing address, rig-family mismatch, absent LOD, or duplicate content ID.

## Creature Definition Contract

The eventual Unity `CreatureVisualDefinition` should include:

```text
Id
ParentVisualIds[]
RigFamilyId
PrefabAddress
IconAddress
PrimaryColor
SecondaryColor
AccentColor
PatternIndex
ScaleClass
SilhouetteTags[]
InheritedMotifs[]
NewInnovation
AnimationProfile
MaterialProfile
LodProfile
PopulationAgentProfile
EvolutionEffectProfile
```

Gameplay content remains authoritative for progression. Visual definitions decorate stable species IDs and must never contain economy costs or route logic.

## Review Gates

Every creature passes these gates in order:

1. **Lineage brief**: parent, inherited motifs, new innovation, personality.
2. **Silhouette sheet**: parent and child shown together at 96 px and 192 px.
3. **Rig-family proof**: deformation test using the shared animation set.
4. **Flat-color review**: no texture detail; validates shape and palette.
5. **Gameplay camera review**: mobile portrait and landscape captures.
6. **World-state review**: high/low Karma, population, and extinction risk.
7. **Performance validation**: triangles, bones, materials, overdraw, memory, and load time.
8. **Addressables validation**: dependency and remote-pack test.

A failed silhouette or lineage gate returns to concept. It is not repaired with more texture detail.

## Scaling Plan

### 0 to 50 Creatures

- Build and validate the 18 families only as needed by the launch roster.
- Produce one hero species and two variants per active family.
- Establish automated import validation and mobile capture scenes.

### 50 to 250 Creatures

- Expand through mesh modules, proportion presets, palette sets, patterns, and appendage sockets.
- Introduce controlled procedural variant generation inside family limits.
- Add remote Addressables packs by era and biome.

### 250 to 1,000 Creatures

- Treat each species as a recipe over approved family components.
- Automate icon framing, LOD generation checks, material preset creation, and silhouette comparison.
- Reserve bespoke rigs for major branch innovations and mythic forms.
- Maintain a visual-distance report that detects overly similar neighboring species.

### Beyond 1,000

- Separate canonical species from cosmetic ecotypes and seasonal mutations.
- Version visual definitions independently from gameplay balance.
- Preserve old prefabs while save data or screenshots may reference them.
- Use aliases and tombstones for renamed or retired visual IDs.

## First Production Slice

No bulk creature generation should begin yet. The first art slice should prove continuity across one difficult transition:

```text
Fish -> Amphibian -> Reptile -> Basal Mammal -> Wolf
```

The slice requires five LOD0 models, four shared rigs at most, complete idle/move/react clips, one material family, evolution transitions, mobile captures, and measured URP performance. Approval of this slice unlocks broader production.

