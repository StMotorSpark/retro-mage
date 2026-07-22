---
feature: rendering
tags: [architecture, rendering, webgl, lighting, dungeon-crawler]
summary: Retro Mage renders a tile/polygon hybrid world with sprite-based actors, painter's-algorithm sorting, and lookup-table lighting, extended with longer draw distances and dynamic outdoor rendering for a modern-scale retro look.
relates-to:
  - "[Tech Stack](./tech-stack.md)"
  - "[Repo Structure](./repo-structure.md)"
  - "[World Model](../features/world-model.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
---

# Rendering

Retro Mage's renderer reproduces the visual language of early-90s tile-and-sprite immersive sims — thin texture mapping, fixed-point math, low-poly geometry, no Z-buffer — while extending it with longer draw distances, dynamic lighting, and dynamic outdoor environments than the hardware of that era allowed.

## Overview

The renderer draws a hybrid world made of grid-aligned tiles and simple polygon geometry, populates it with sprite-based actors and effects, sorts everything back-to-front with a painter's algorithm instead of a Z-buffer, and lights it using lighting lookup tables (LUTs) rather than per-pixel physically based lighting. Indoor dungeon spaces and outdoor chunked terrain both render through this same pipeline.

## World Geometry — Tile/Polygon Hybrid

The world is represented as a hybrid of grid-aligned tiles (floors, ceilings, walls) and simple polygon geometry for non-grid-aligned structure. Geometry is low-poly throughout, shaded with simple shaders rather than complex material graphs. Texture mapping is thin — textures apply directly to tile and polygon surfaces without multi-layer material blending.

## Math — Fixed-Point Where Possible

Simulation and geometry math in `engine-core` uses fixed-point representations where possible instead of floating point, matching the numerical approach of the era this engine draws from and keeping world coordinates deterministic and cheap to compute on WASM.

## Actors and Effects — Sprite-Based

Characters, enemies, and the player's visible held-item are billboard sprites, not true 3D meshes. Special effects (impacts, projectiles, magic effects) are also sprite-based, with emissive lighting lookup tables applied so effects read as bright light sources against the tile/polygon world rather than flat-shaded sprites.

## Depth Sorting — Painter's Algorithm

The renderer holds no Z-buffer. Draw order is determined by a painter's algorithm: geometry and sprites are sorted back-to-front per frame and drawn in that order, matching the depth-sorting approach of the tile/sprite engines this project draws from.

## Lighting — Lookup Tables (LUTs)

Lighting is computed via lighting lookup tables rather than per-pixel physically-based shading. A LUT maps a surface's base color and a light intensity/color input to a final shaded color, giving fast, stylistically consistent lighting that supports dynamic light sources (moving light, flickering light, colored light) without the cost of full dynamic PBR lighting. Sprite effects apply an emissive LUT variant so they read as self-lit against ambient-lit surroundings.

## Draw Distance and Scale

Draw distance is longer than the reference era's engines allowed, giving the world a modern sense of scale while retaining the retro tile/sprite/LUT visual language. Longer draw distance is supported by the low-poly geometry budget and LUT-based lighting keeping per-pixel cost low even at range.

## Outdoor Rendering

Outdoor areas extend the same rendering pipeline with additions specific to open-sky environments:

- **Chunked terrain**: outdoor world geometry streams and renders in chunks, so draw distance and memory cost scale with visible chunks rather than the whole outdoor map at once.
- **Dynamic skybox**: the sky renders via atmospheric scattering, giving time-of-day and weather-reactive sky color rather than a static skybox texture.
- **Procedural clouds**: cloud cover renders procedurally over the skybox, moving and varying independently of any single fixed texture.

## Related Docs

- [Tech Stack](./tech-stack.md) — the WebGL2/WebGPU and Rust/WASM stack this pipeline runs on
- [Repo Structure](./repo-structure.md) — how rendering feature slices are organized inside the `render` package
- [World Model](../features/world-model.md) — the dungeon and outdoor world structure this pipeline renders
- [WASM Bridge](./wasm-bridge.md) — the per-frame data contract this pipeline reads from `engine-core`
