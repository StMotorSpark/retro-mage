---
feature: demo-scope
tags: [features, demo, content, rendering, streaming]
summary: The Phase 1 demo for examples/demo is a minimal but complete dungeon scene that exercises every major engine system — textured rooms, collision, LUT lighting, a seam transition to an outdoor area, sprite actors, and a skybox — proving the full retro rendering pipeline end to end.
relates-to:
  - "[World Model](./world-model.md)"
  - "[Rendering](../architecture/rendering.md)"
  - "[Visibility](../architecture/visibility.md)"
  - "[World Streaming](../architecture/world-streaming.md)"
  - "[Collision](../architecture/collision.md)"
  - "[WASM Bridge](../architecture/wasm-bridge.md)"
  - "[Asset Pipeline](../architecture/asset-pipeline.md)"
  - "[Input Event Schema](../architecture/input-schema.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Demo Scope — Phase 1

`examples/demo` is the engine's proof of concept: a small but complete scene where every major system contributes visibly to the result. The Phase 1 demo is scoped to what the current resolved design gaps support — no combat, no HUD, no audio — but it demonstrates the full retro rendering pipeline, the indoor/outdoor seam transition with streaming preload, and basic player navigation with collision.

Phase 2 additions (combat, HUD, inventory, animated sprites, audio, time-of-day) are deferred in [Known Gaps — Demo Scope Phase 2](../research/known-gaps.md#demo-scope--phase-2) until each has its own design doc.

## Goal

A player opens the demo and can:
1. Walk through a small dungeon (3 rooms, torch lighting, textured walls and floors)
2. Pass through a door that triggers a seam transition into an outdoor area
3. Stand in the outdoor area, see a sky, see grass terrain, see tree actors in the distance
4. Walk back through the door into the dungeon

That loop exercises: textured tile rendering, LUT lighting, collision, visibility culling with occlusion, seam transition with streaming preload, outdoor chunk rendering, billboard sprite actors, and the atmospheric skybox.

## Indoor — 3 Rooms

Three rooms connected by doorways, authored as hand-placed tile fixtures in `examples/demo`:

| Room | Name | Purpose |
|------|------|---------|
| 0 | Entry Hall | Starting room. Wide, stone-textured walls and floor. Two torch lights. |
| 1 | Armory | Narrower side room connected to Entry Hall. Stone walls, darker ambient. One torch light. |
| 2 | Gate Room | Connected to Entry Hall. Contains the door/seam exit to the outdoor area. One torch light. |

**Tile textures**: stone wall, stone floor. Two KTX2 textures, authored as 64×64 PNG, compressed at build time by `vite-plugin-ktx2`.

**Lights**: 4 total torch point lights (Entry Hall has two, each other room has one). Each light has a warm orange-yellow color (`r=1.0, g=0.7, b=0.3`), intensity sufficient to illuminate its room when ambient light is low. Ambient light for the indoor space is set low (`ambient_light ≈ 0.05`) so torch lights are the primary illumination — demonstrating the sight-radius-collapses-toward-light-sources behavior described in [Visibility](../architecture/visibility.md).

**Collision**: player cannot walk through solid tiles. Implemented as circle-vs-AABB collision against the master tile grid in `engine-core`'s `collision` module, with sliding resolution — see [Collision](../architecture/collision.md).

**Room streaming**: indoor streamer with default hop depth (1) keeps Entry Hall + its direct neighbors resident. Walking from Entry Hall into Armory or Gate Room triggers neighbor update with no visible load event, per [World Streaming](../architecture/world-streaming.md).

## Seam — Door to Outdoor

One seam is registered in `examples/demo` connecting Gate Room's exit tile to the outdoor chunk grid origin. The seam carries a `SeamTransform` with zero rotation and an offset that maps the room-local exit tile position to outdoor world coordinates.

The seam trigger distance is set to cover at least the indoor sight radius so the outdoor chunk is loaded before the player reaches the door — no pop-in at the crossing. The seam crossing threshold is one tile width so the transition feels responsive without false triggers.

The engine only evaluates a seam while its owning room is the current room, and `engine-core` never infers room changes from player position on its own (see [Known Gaps — Indoor Room-Transition Detection](../research/known-gaps.md#indoor-room-transition-detection)). `examples/demo` tracks the current room itself each tick with a simple x-coordinate bounds check against each room's known footprint, calling `set_indoor_current_room` when the player's position crosses into a different room — this is what lets the Gate Room's seam become active once the player physically walks there from Entry Hall.

## Outdoor — Terrain, Sky, Trees

A 3×3 chunk area (each chunk 32×32 tiles, total ~96×96 tiles of visible terrain) provided by a `FlatChunkProvider` variant that fills all tiles with tile ID matching the grass texture, and additionally authored as ordinary hand-placed grass tiles alongside the indoor rooms (see Seam section above and [Known Gaps](../research/known-gaps.md#outdoor-chunk-rendering-bridge)). Outdoor ambient light is high (`ambient_light = 1.0`), giving full draw-distance sight radius and demonstrating the contrast with the dark dungeon interior.

**Terrain texture**: grass tile. One KTX2 texture, 64×64 PNG source.

**Skybox**: atmospheric scattering sky rendered over the outdoor area, giving a visible horizon and sky color. Demonstrates the dynamic skybox slice in `render`.

**Tree actors**: 6 tree sprite actors placed at fixed positions scattered across the outdoor chunk area. Each tree is a single-frame billboard sprite (no animation). Demonstrates the sprite rendering slice: actor billboard drawn facing the camera, painter's-algorithm sorted behind nearer geometry.

**Sprite texture**: one tree sprite sheet (single frame). PNG source, KTX2 at build time.

**Outdoor chunk streaming**: load radius 2, evict radius 3 (engine defaults). Player movement in the outdoor area triggers chunk resident-set updates transparently. Until the outdoor chunk-to-render-tile bridge exists (see [Known Gaps — Outdoor Chunk Rendering Bridge](../research/known-gaps.md#outdoor-chunk-rendering-bridge)), the visible grass terrain itself is authored as ordinary hand-placed tiles the same way indoor rooms are, at a coordinate range offset far (+1000 tiles on both axes) from the indoor rooms' coordinates — this keeps the two spaces from falling within each other's sight radius or collision range, per [Known Gaps — Shared Indoor/Outdoor Coordinate Space](../research/known-gaps.md#shared-indooroutdoor-coordinate-space).

## Player Controls

Input wired per [Input Event Schema](../architecture/input-schema.md):
- `move_x/y` → player translation (forward/back/strafe), facing-relative via camera yaw
- `look_x/y` → camera yaw/pitch rotation
- Touch overlay default layout (virtual thumbstick + swipe look zone) active on mobile; physical gamepad active on desktop

No interaction button needed for the seam door — the player walks through it. The seam crossing is proximity-triggered automatically by the engine.

## Asset Inventory

| Asset | Format | Dimensions | Used by |
|-------|--------|------------|---------|
| `stone-wall.png` → `stone-wall.ktx2` | KTX2/UASTC | 64×64 | Indoor wall tiles |
| `stone-floor.png` → `stone-floor.ktx2` | KTX2/UASTC | 64×64 | Indoor floor tiles |
| `grass.png` → `grass.ktx2` | KTX2/UASTC | 64×64 | Outdoor terrain tiles |
| `tree-sprite.png` → `tree-sprite.ktx2` | KTX2/UASTC | 64×128 | Outdoor tree actors |

All assets authored in `examples/demo/assets/textures/`, compressed to `public/assets/` at build time by `vite-plugin-ktx2`.

## Systems Exercised

| System | How demo exercises it |
|--------|-----------------------|
| Textured tile rendering | Stone walls/floor indoors, grass outdoors |
| LUT lighting | Torch point lights in low-ambient dungeon rooms |
| Visibility / shadowcasting | Occlusion as player moves through doorways and rooms |
| Collision | Player blocked by solid wall tiles, slides along walls |
| Indoor room streaming | 3-room graph, hop-depth adjacency load/evict |
| Seam transition | Door in Gate Room crossing to outdoor chunk grid |
| Streaming preload | Outdoor chunk resident before player reaches door |
| Outdoor chunk rendering | 3×3 grass terrain chunks |
| Billboard sprite actors | 6 tree sprites, painter's-algorithm sorted |
| Atmospheric skybox | Visible over outdoor terrain |
| Touch + gamepad input | Both input paths active |
| PWA shell | Demo installs and runs offline after first load |

## What Phase 1 Does Not Demonstrate

These are explicitly out of scope and tracked as [Demo Scope Phase 2](../research/known-gaps.md#demo-scope--phase-2):

- Combat, enemy AI, health/death
- HUD or inventory display
- Animated sprites (multi-frame walking/attack cycles)
- Audio (ambient, footstep, effects)
- Time-of-day cycle or weather
- More than one biome or tileset variety beyond stone + grass

## Related Docs

- [World Model](./world-model.md) — the indoor/outdoor world structure this demo instantiates
- [Rendering](../architecture/rendering.md) — the tile/sprite/LUT/painter's-algorithm pipeline the demo exercises
- [Collision](../architecture/collision.md) — the movement and collision system the player uses to navigate
- [Visibility](../architecture/visibility.md) — the shadowcasting cull and light-driven sight radius the demo exercises
- [World Streaming](../architecture/world-streaming.md) — the indoor room graph and outdoor chunk streaming the demo exercises
- [WASM Bridge](../architecture/wasm-bridge.md) — the per-frame buffer contract carrying demo world state to render
- [Asset Pipeline](../architecture/asset-pipeline.md) — how demo's PNG textures compress to KTX2 at build time
- [Input Event Schema](../architecture/input-schema.md) — the normalized input the demo's player controls emit
- [Known Gaps](../research/known-gaps.md) — LUT and remaining gaps that must be resolved before this demo is fully implemented
