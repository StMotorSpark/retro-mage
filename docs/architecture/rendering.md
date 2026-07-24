---
feature: rendering
tags: [architecture, rendering, webgl, lighting, dungeon-crawler]
summary: Retro Mage renders a tile/polygon hybrid world with sprite-based actors, painter's-algorithm sorting, and lookup-table lighting, extended with longer draw distances and dynamic outdoor rendering for a modern-scale retro look.
relates-to:
  - "[Tech Stack](./tech-stack.md)"
  - "[Repo Structure](./repo-structure.md)"
  - "[World Model](../features/world-model.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Collision](./collision.md)"
  - "[Known Gaps](../research/known-gaps.md)"
  - "[Asset Pipeline](./asset-pipeline.md)"
  - "[Lighting](./lighting.md)"
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

## Internal Render Resolution and Upscaling

The 3D view renders to an offscreen framebuffer at a capped internal resolution, then upscales that framebuffer to the device's actual canvas backing store via a fullscreen-quad blit pass using linear filtering. This is a deliberate middle ground between two rejected approaches: rendering natively at full device pixel ratio (no perf headroom on phone GPUs once LUT lighting and painter's-algorithm overdraw are in the frame) and the fixed-low-res-plus-chunky-upscale look of some reference-era engines (fights the longer-draw-distance, modern-scale goal this project pairs with the retro technique).

The internal resolution cap is a **static** decision made once at context/viewport setup, not an adaptive per-frame resolution scaler. There is no runtime feedback loop that lowers resolution mid-session in response to measured frame time. If a device falls below the performance target at the chosen cap, it simply runs below target — a future adaptive-scaling gap can be opened later if that's ever needed, but it is explicitly out of scope now.

- **Two resolution domains**: canvas CSS size tracks the full device viewport (so UI/HUD reads crisp and at true modern scale); the 3D framebuffer renders at a separate, smaller capped resolution.
- **Cap rule**: internal resolution is derived from canvas CSS size times a capped device-pixel-ratio multiplier (not the device's full DPR), further bounded by a hard maximum pixel budget so large high-density screens don't exceed it either. **The cap is set to 0.70** (70% of native effective device pixel ratio), benchmarked against real hardware (see Performance Target below) rather than guessed.
- **The cap must be implemented as a single named, tunable configuration value** (e.g. an exported constant or a config parameter passed into context/viewport setup) — never hardcoded inline into framebuffer sizing math. The engine ships **0.70 as its default**, chosen from reference-device benchmark data, but the config value remains overridable — owning this as engine-default-with-app-override responsibility means a consuming game repo can raise the cap for a lighter scene or lower it for a heavier one without forking the engine's rendering pipeline. Determining the *right* default for a specific game's actual content is that game's responsibility; the engine's job is to ship a validated, safe baseline.
- **Upscale filtering is linear, not nearest-neighbor.** This project's retro reference (Ultima Underworld-, Elder Scrolls Arena-era first-person dungeon/outdoor crawlers) is treated as a rendering *technique* reference — tile/polygon hybrid geometry, sprite actors, LUT lighting, painter's algorithm — not a pixelated-nostalgia aesthetic. Nearest-neighbor upscaling (visible pixel grid, deliberately chunky look) is explicitly rejected as the look target.
- **HUD and touch controls render outside the capped 3D framebuffer**, composited over the upscaled 3D layer at native canvas resolution, so on-screen controls and text stay sharp regardless of the 3D internal resolution cap.
- **The canvas element's backing store is kept in sync with its CSS display size every frame.** A `<canvas>` element's drawing buffer (`canvas.width`/`canvas.height`, and therefore `gl.drawingBufferWidth`/`gl.drawingBufferHeight`) does not automatically track its CSS layout size — left unset, it defaults to 300×150 regardless of how large the element is stretched via CSS, silently degenerating the final blit target (and thus the whole visible canvas) to a tiny, blurry upscaled image with no thrown error. `render`'s loop resizes the canvas's backing store to its CSS size times device pixel ratio each frame before computing the final blit pass's target dimensions, so the on-screen canvas stays crisp at the device's actual display resolution independent of the separately-capped internal 3D framebuffer resolution described above.

## Camera Elevation vs. Render Eye Height

`engine-core`'s `camera.y` is the player's floor-plane elevation — an engine-owned coordinate that must line up with the tile grid's `y` values for visibility culling and (future) multi-floor collision to work (see [Collision](./collision.md)). Tile geometry (`world-tiles`) renders every tile, floor included, as a full 1-unit-tall block spanning from its `y` to `y + 1`, so a rendered view positioned at that same `y` sits at the tile's base, embedded in the block. `render`'s loop adds a fixed, render-only eye-height offset on top of `camera.y` when building the view matrix each frame, lifting the visible camera to a believable standing height above the floor plane without altering `camera.y` itself. Engine-core's visibility, collision, and world-streaming logic all keep reading and writing the unmodified elevation coordinate; only the render package's view matrix construction applies the offset, so consuming games set `camera.y` to the floor's grid elevation (matching the tile data they authored at that `y`), not to a literal eye-height world position.

### Performance Target

The engine targets a **flat minimum of 60 FPS** on the iPhone 16e reference device (see [Tech Stack](./tech-stack.md)), with higher framerates welcomed but not specifically pursued. This is a fixed target, not a scaling range — the internal resolution cap is chosen so this device clears 60 FPS with headroom, rather than the engine adjusting resolution to chase a variable target at runtime.

Benchmarking on iPhone 16e against a representative stress scene (tile/polygon corridor, 8 sprite actors, one dynamic light, long draw distance) showed average and p95 frame time pinned at the display's 60Hz vsync floor (~16.67ms) at every cap tested — average/p95 are not useful signal at or above this floor. **p99 frame time was the differentiating metric**, showing dropped-frame spikes shrinking as the cap lowered: 29ms at 100% cap, 26ms at 85%, 22ms at 70%, 18ms (near-clean) at 50%. 0.70 was chosen as the shipped default because it meaningfully reduces spike severity versus 100%/85% while retaining more sharpness than the more conservative 50% cap.

## Outdoor Rendering

Outdoor areas extend the same rendering pipeline with additions specific to open-sky environments:

- **Chunked terrain**: outdoor world geometry streams and renders in chunks, so draw distance and memory cost scale with visible chunks rather than the whole outdoor map at once.
- **Dynamic skybox**: the sky renders via atmospheric scattering, giving time-of-day and weather-reactive sky color rather than a static skybox texture.
- **Procedural clouds**: cloud cover renders procedurally over the skybox, moving and varying independently of any single fixed texture.

## Related Docs

- [Known Gaps](../research/known-gaps.md) — the internal render resolution decision recorded here resolves that doc's open question; the exact pixel-budget cap number still needs a benchmark pass
- [Tech Stack](./tech-stack.md) — the WebGL2/WebGPU and Rust/WASM stack this pipeline runs on
- [Repo Structure](./repo-structure.md) — how rendering feature slices are organized inside the `render` package
- [World Model](../features/world-model.md) — the dungeon and outdoor world structure this pipeline renders
- [WASM Bridge](./wasm-bridge.md) — the per-frame data contract this pipeline reads from `engine-core`
- [Collision](./collision.md) — the engine-owned `camera.y` elevation coordinate this pipeline offsets for render-only eye height
- [Asset Pipeline](./asset-pipeline.md) — the texture format this pipeline's texture-loading path consumes
- [Visibility](./visibility.md) — the occlusion/sight-radius cull that determines what this pipeline draws each frame
