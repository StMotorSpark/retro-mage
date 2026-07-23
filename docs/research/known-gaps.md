---
feature: known-gaps
tags: [research, open-questions, planning]
summary: Tracks unresolved design questions that block specific implementation tasks, to be resolved in future design conversations as work reaches them.
relates-to:
  - "[Tech Stack](../architecture/tech-stack.md)"
  - "[Rendering](../architecture/rendering.md)"
  - "[Repo Structure](../architecture/repo-structure.md)"
  - "[World Model](../features/world-model.md)"
  - "[Demo Scope](../features/demo-scope.md)"
  - "[Collision](../architecture/collision.md)"
  - "[WASM Bridge](../architecture/wasm-bridge.md)"
  - "[Input Event Schema](../architecture/input-schema.md)"
  - "[Visibility](../architecture/visibility.md)"
  - "[World Streaming](../architecture/world-streaming.md)"
  - "[Test-Driven Development](../principles/test-driven-development.md)"
---

# Known Gaps / Next Steps

This doc tracks design questions the current docs leave open — decisions not yet made, called out so future work doesn't silently assume an answer. Entries are added as new gaps surface and removed (or resolved into the relevant design doc) once answered. This doc does not describe target state itself; it points at where target state is still undecided.

## Open Questions

### Asset Pipeline

Texture compression format, transcode/upload ownership, fallback behavior, and mipmap handling are resolved and implemented — see [Asset Pipeline](../architecture/asset-pipeline.md). `packages/render` owns KTX2 transcode/upload via its `loadKtx2Texture` function (bytes-in, ASTC-probe fallback, block-aligned mip upload, throw-on-failure), and `examples/demo` consumes it directly rather than transcoding inline.

Still undecided: tile/sprite source folder conventions per consuming game. The outdoor chunk file format question is resolved in [World Streaming](../architecture/world-streaming.md) — the engine mandates a chunk data contract, not a file format, and leaves chunk data sourcing (prebaked, procedural, or hybrid) to the consuming application.

- Blocks: any task that adds real game assets rather than placeholder geometry
- Relates to: [Asset Pipeline](../architecture/asset-pipeline.md), [Tech Stack](../architecture/tech-stack.md), [Rendering](../architecture/rendering.md)

### Multi-Floor Collision

Phase 1 collision is XZ-plane only — see [Collision](../architecture/collision.md). When the player crosses floors via stairwells, ramps, or level changes, collision must account for Y-axis (elevation): checking tiles on the player's current floor, transitioning between floors at stairwell geometry, and handling partial-floor openings like balconies.

Undecided:
- **Floor level detection**: how does `engine-core` know which floor the player is currently on? Fixed Y threshold per-room, continuous height sampling from tile heights, or explicit floor-level metadata on tiles?
- **Stairwell traversal**: smooth Y interpolation as the player moves over stair tiles, or discrete step-up/step-down on tile boundary crossing?
- **Interaction with vertical opening tiles**: `vertical_opening` tiles in the visibility system already track cross-floor sight — collision should respect the same geometry.

- Blocks: multi-floor dungeon rooms (stairs, balconies) — deferred post-Phase-1 demo
- Relates to: [Collision](../architecture/collision.md), [Visibility](../architecture/visibility.md), [World Model](../features/world-model.md)

### Outdoor Coordinate System

Outdoor chunk streaming uses `(camera.x, camera.y)` as the 2D ground-plane coordinates passed to `world_to_chunk_coord`. In the 3D world the ground plane is XZ (Y is elevation), but the streaming and seam code consistently treats Y as the second horizontal axis. This has no visible effect while the player is indoors (room-graph streaming ignores XY position), but would produce incorrect chunk loading if outdoor player movement is wired — moving along Z would not update the player's resident chunk set.

Resolution options:
- Remap streaming to use `(camera.x, camera.z)`, rename chunk Y to Z throughout, and update `set_player_pos` / seam transforms to the XZ convention.
- Keep XY as the outdoor map convention and map `camera.z` → `camera.y` at the outdoor rendering boundary.

- Blocks: outdoor player movement in the demo (deferred; Phase 1 demo crosses one seam but the outdoor area is small enough that chunk streaming mismatch has no visible effect)
- Relates to: [Collision](../architecture/collision.md), [World Streaming](../architecture/world-streaming.md), [WASM Bridge](../architecture/wasm-bridge.md)

### Demo Scope — Phase 2

The current [Demo Scope](../features/demo-scope.md) defines the first playable demo. Phase 2 additions are deferred because they each require design work not yet done:
- **Combat and game loop**: attack mechanics, enemy AI behavior, health/death — no feature doc exists.
- **HUD and inventory**: on-screen health, held-item display, item pickup — no feature doc exists.
- **Animated sprites**: multi-frame actor animations (walking cycles, attack frames) — sprite sheet layout and animation state machine undefined.
- **Audio**: ambient dungeon sound, footsteps, effects — no feature doc exists.
- **Time-of-day and weather**: dynamic ambient light cycle, precipitation — outdoor rendering doc scopes skybox but not full time-of-day simulation.
- **More content variety**: additional biomes, dungeon tilesets, structured level data format beyond the demo's hand-placed fixtures.

Phase 2 work begins after Phase 1 demo is complete, resolved incrementally as each gap above gets its own design doc.

- Blocks: nothing currently in flight
- Relates to: [Demo Scope](../features/demo-scope.md), [World Model](../features/world-model.md), [Rendering](../architecture/rendering.md)

## Resolved

### LUT Format and Generation
_Resolved._ See [Lighting](../architecture/lighting.md). 2D WebGL texture LUT (256×32 RGBA texels), generated procedurally at runtime in JavaScript from `LightingConfig` parameters, uploaded as `TEXTURE_2D` with `NEAREST` filtering. Consumes 32 WASM point lights per frame to evaluate distance attenuation and surface color quantization.

### Collision System
_Resolved._ See [Collision](../architecture/collision.md). Circle-vs-AABB sliding collision, `player_radius=0.3` / `player_speed=4.0` / `look_sensitivity=2.0` defaults (all app-overridable via `CollisionConfig`), single-floor XZ-plane only, `engine-core` owns the `collision` module, runs inside `tick()` before visibility recompute.

### Example Demo Scope
_Resolved._ See [Demo Scope](../features/demo-scope.md) for room count, actor count, light count, and content spec of the first playable demo.

### WASM Bridge Shape / ChunkData Contract / ChunkProvider Transport
_Resolved._ See [WASM Bridge](../architecture/wasm-bridge.md) and [World Streaming](../architecture/world-streaming.md).

### Visibility Algorithm
_Resolved._ See [Visibility](../architecture/visibility.md) — recursive shadowcasting with multi-floor extension via vertical opening tiles.

### Texture Compression Format
_Resolved._ See [Asset Pipeline](../architecture/asset-pipeline.md) — KTX2/UASTC, engine-owned transcode/upload, app-owned PNG→KTX2 compression.

### Normalized Input Event Shape
_Resolved._ See [Input Event Schema](../architecture/input-schema.md).

### Outdoor Chunk File Format
_Resolved._ See [World Streaming](../architecture/world-streaming.md) — engine mandates a chunk data contract, not a file format; sourcing is application-owned.

## Related Docs

- [Tech Stack](../architecture/tech-stack.md)
- [Rendering](../architecture/rendering.md)
- [Repo Structure](../architecture/repo-structure.md)
- [World Model](../features/world-model.md)
- [Demo Scope](../features/demo-scope.md) — the first playable demo this doc's gaps block or scope
- [Collision](../architecture/collision.md) — resolves the collision system gap
- [WASM Bridge](../architecture/wasm-bridge.md)
- [Input Event Schema](../architecture/input-schema.md)
- [Asset Pipeline](../architecture/asset-pipeline.md)
- [Visibility](../architecture/visibility.md)
- [World Streaming](../architecture/world-streaming.md)
- [Test-Driven Development](../principles/test-driven-development.md)
