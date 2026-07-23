# Demo Sprite Assets

This directory contains human-provided source PNG sprites for `examples/demo` Phase 1.

## Sprite Inventory

| Asset | Format | Dimensions | Used by | Purpose |
|-------|--------|------------|---------|---------|
| `tree-sprite.png` | PNG → KTX2/UASTC | 64×128 | Task 38 | Outdoor tree actors (single frame billboard) |

## Build Note & Plugin Coverage Flag

`vite-plugin-ktx2` in `examples/demo/vite.config.ts` currently configures `assetsDir: 'assets/textures'`.
As a result, source files in `assets/sprites/` are **NOT** automatically processed by `vite-plugin-ktx2`.

> **Attention Task 38:** Task 38 must address sprite KTX2 compression — either by moving sprite assets under `assets/textures/`, or by updating `vite-plugin-ktx2` config in `examples/demo/vite.config.ts` to include `assets/sprites`. Do not resolve this in Task 34.
