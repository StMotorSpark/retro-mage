# Demo Texture Assets

This directory contains human-provided source PNG textures for `examples/demo` Phase 1.

Build-time compression: `vite-plugin-ktx2` compresses source PNG files in this directory (`assets/textures`) to `.ktx2` format in `public/assets/` during the build process.

## Texture Inventory

| Asset | Format | Dimensions | Used by | Purpose |
|-------|--------|------------|---------|---------|
| `stone-wall.png` | PNG → KTX2/UASTC | 64×64 | Task 36 | Indoor wall tiles in dungeon rooms |
| `stone-floor.png` | PNG → KTX2/UASTC | 64×64 | Task 36 | Indoor floor tiles in dungeon rooms |
| `grass.png` | PNG → KTX2/UASTC | 64×64 | Task 37 | Outdoor terrain tiles |

*Note: Existing `wall.png` is preserved for legacy/placeholder texture-demo usage.*
