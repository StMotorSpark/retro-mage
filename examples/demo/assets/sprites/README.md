# Demo Sprite Assets

This directory contains human-provided source PNG sprites for `examples/demo` Phase 1.

## Sprite Inventory

| Asset | Format | Dimensions | Used by | Purpose |
|-------|--------|------------|---------|---------|
| `tree-sprite.png` | PNG → KTX2/UASTC | 64×128 | Task 38 | Outdoor tree actors (single frame billboard) |

## Build Note & Plugin Coverage

`vite-plugin-ktx2` in `examples/demo/vite.config.ts` includes a plugin instance for `assets/sprites`.
Source PNG files in `assets/sprites/` are automatically compressed to `.ktx2` at build time.
