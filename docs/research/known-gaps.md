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




### Unified World Coordinate Space (Option B)

The current world model partitions indoor and outdoor space into independent coordinate grids (see [World Structure Partitioning](../architecture/world-structure-partitioning.md)), using seam-local coordinate injection to render across seams ([Seam Rendering](../architecture/seam-rendering.md)). 

While this prevents coordinate bleeding and solves far-side visibility, it limits physical overlap between indoor spaces (e.g. windows looking from an indoor room down onto the outdoor chunk). A long-term goal is to explore **Option B: Unified World Coordinate Space**, resolving the mechanical isolation into a single contiguous world map without sacrificing the performance benefits of independent structure streaming.

Undecided:
- **Origin shift and precision loss**: large contiguous outdoor worlds eventually suffer floating point precision issues; how are origins managed?
- **Global Z-fighting and overlap**: how to guarantee procedurally generated dungeons don't naturally collide with height-mapped outdoor terrain in global space?

- Blocks: deep integrations between indoors/outdoors (e.g. windows looking out onto outdoor chunks)
- Relates to: [World Structure Partitioning](../architecture/world-structure-partitioning.md), [Seam Rendering](../architecture/seam-rendering.md)


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

### Multi-Floor Collision
_Resolved._ See [Collision](../architecture/collision.md). Collision now evaluates Y-elevation and a cylindrical `player_height` dynamically based on the tile beneath the player (`floor(x), floor(z)`). The player's base Y matches flat tiles, smoothly interpolates across stair tiles (governed by directional metadata), and subjects the player to gravitational acceleration in `vertical_opening` holes. Configurable `player_height` guarantees head bumps stop movement, and configurable `gravity`/`max_fall_speed` dictate fall mechanics.

### Shared Indoor/Outdoor Coordinate Space
_Resolved._ See [World Structure Partitioning](../architecture/world-structure-partitioning.md). The engine mechanically isolates indoor and outdoor space by maintaining separate `indoor_tiles`/`outdoor_tiles` and `indoor_actors`/`outdoor_actors` buffers. The active world structure branches array reads in `tick()`, entirely preventing cross-structure coordinate bleed.

_Resolved._ Streaming, seam crossing, and player position all use `(camera.x, camera.z)` as the outdoor ground-plane coordinates — `camera.y` is elevation only and is never read as a horizontal axis. See [World Streaming](../architecture/world-streaming.md) and [Collision](../architecture/collision.md).

### Outdoor Chunk Rendering Bridge
_Resolved._ See [World Streaming](../architecture/world-streaming.md) and `chunk.rs`. When `OutdoorChunkStreamer` loads a chunk it immediately writes every tile into `outdoor_tiles` (the partitioned buffer that `recompute_visibility` culls from). Evicting a chunk zeros those tile slots. Outdoor terrain from `ChunkProvider`-sourced data is visible geometry without any app-level hand-placement.

### Indoor Room-Transition Detection
_Resolved._ `engine-core` provides a doorway primitive: `register_indoor_doorway(min_x, max_x, min_z, max_z, from_room_id, to_room_id)`. During `tick()`, the engine checks the player's XZ position against registered doorway volumes and automatically calls `set_indoor_current_room` on crossing. Applications author doorway volumes alongside the tile grid; no hand-rolled bounding-box logic is needed in app code.

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
