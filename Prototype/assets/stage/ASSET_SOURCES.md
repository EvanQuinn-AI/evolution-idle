# Wildlife Art Sources

The shipped wildlife artwork is generated locally from the measurements and palettes in `manifest.js`. No remote files are hotlinked and no third-party artwork is copied directly into the runtime bundle.

The following CC0 collections were used as visual, locomotion, and environment references:

- Kenney, **Animal Pack**: https://kenney.nl/assets/animal-pack
- Kenney, **Background Elements**: https://kenney.nl/assets/background-elements
- Kenney, **Foliage Sprites**: https://kenney.nl/assets/foliage-sprites
- Quaternius, **Ultimate Animated Animal Pack**: https://quaternius.com/packs/ultimateanimatedanimals.html
- Quaternius, **Animated Fish Pack**: https://quaternius.com/packs/animatedfish.html
- Smithsonian Institution, **Open Access Animals**: https://www.si.edu/spotlight/open-access-animals

## Resulting Files

- `manifest.js`: original animal proportions, palettes, rig-part declarations, stage scenes, habitat layers, and ambient rosters.
- `../../wildlife-stage.js`: original Canvas2D animation and local SVG-part generation code.

All generated SVG cutout parts are created at runtime from project-owned code and data. The sources above remain useful references if an artist later replaces generated parts with hand-authored SVG files.
