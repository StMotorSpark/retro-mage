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
  - "[WASM Bridge](../architecture/wasm-bridge.md)"
  - "[Input Event Schema](../architecture/input-schema.md)"
  - "[Visibility](../architecture/visibility.md)"
  - "[World Streaming](../architecture/world-streaming.md)"
  - "[Test-Driven Development](../principles/test-driven-development.md)"
---

# Known Gaps / Next Steps

This doc tracks design questions the current docs leave open — decisions not yet made, called out so future work doesn't silently assume an answer. Entries are added as new gaps surface and removed (or resolved into the relevant design doc) once answered. This doc does not describe target state itself; it points at where target state is still undecided.

## Open Questions

### Collision System

The engine has no collision module. `engine-core` tracks tile solidity via the `solid` field on tiles (see [WASM Bridge](../architecture/wasm-bridge.md)) but never uses it to prevent player or actor movement. Without collision, the player walks through walls — not acceptable for a playable dungeon demo.

Decisions needed:
- **Algorithm**: basic axis-aligned tile collision (AABB vs solid tile grid) is the obvious choice for a grid-ish world; confirm this is sufficient or whether polygon-face collision is needed for non-grid geometry.
- **Owner**: `engine-core` owns simulation truth per [Repo Structure](../architecture/repo-structure.md), so collision logic lives in Rust as a new `collision` module. `render` and `input` have no collision concern.
- **Scope for demo**: player-vs-solid-tile only. Actor-vs-actor and projectile collision are future additions.
- **Integration point**: collision runs inside `tick()`, consuming the player's input-driven movement intent and the current tile solidity grid, and resolving the final player position before visibility recomputes.

- Blocks: any demo task where the player navigates a dungeon room
- Relates to: [World Model](../features/world-model.md), [WASM Bridge](../architecture/wasm-bridge.md), [Input Event Schema](../architecture/input-schema.md)

### Demo Scope — Phase 2

The current [Demo Scope](../features/demo-scope.md) defines the first playable demo: textured dungeon rooms, basic collision, torch lighting, one indoor→outdoor seam transition, outdoor terrain with sprite actors and a skybox. This is intentionally scoped to what the resolved design gaps support today.

Phase 2 demo additions are deferred because they each require design work not yet done:
- **Combat and game loop**: attack mechanics, enemy AI behavior, health/death — no feature doc exists for any of these.
- **HUD and inventory**: on-screen health, held-item display, item pickup — no feature doc exists.
- **Animated sprites**: multi-frame actor animations (walking cycles, attack frames) — sprite sheet layout and animation state machine undefined.
- **Audio**: ambient dungeon sound, footsteps, effects — no feature doc exists.
- **Time-of-day and weather**: dynamic ambient light cycle, precipitation — outdoor rendering doc scopes skybox but not full time-of-day simulation.
- **More content variety**: additional biomes, dungeon tilesets, structured level data format beyond the demo's hand-placed fixtures.

Phase 2 work begins after Phase 1 demo is complete and running, resolved incrementally as each gap above gets its own design doc.

- Blocks: nothing currently in flight
- Relates to: [Demo Scope](../features/demo-scope.md), [World Model](../features/world-model.md), [Rendering](../architecture/rendering.md)

### LUT Format and Generation

Lighting lookup tables are specified conceptually in [Rendering](../architecture/rendering.md) but their dimensions, authoring method (baked offline vs. generated at runtime), and file format are undecided.

- Blocks: `lighting` slice tasks in `render`
- Relates to: [Rendering](../architecture/rendering.md)

### Asset Pipeline

Texture compression format, transcode/upload ownership, fallback behavior, and mipmap handling are resolved and implemented — see [Asset Pipeline](../architecture/asset-pipeline.md). `packages/render` owns KTX2 transcode/upload via its `loadKtx2Texture` function (bytes-in, ASTC-probe fallback, block-aligned mip upload, throw-on-failure), and `examples/demo` consumes it directly rather than transcoding inline.

Still undecided: tile/sprite source folder conventions per consuming game. The outdoor chunk file format question is resolved in [World Streaming](../architecture/world-streaming.md) — the engine mandates a chunk data contract, not a file format, and leaves chunk data sourcing (prebaked, procedural, or hybrid) to the consuming application.

- Blocks: any task that adds real game assets rather than placeholder geometry
- Relates to: [Asset Pipeline](../architecture/asset-pipeline.md), [Tech Stack](../architecture/tech-stack.md), [Rendering](../architecture/rendering.md)

### Example Demo Scope

_Resolved._ See [Demo Scope](../features/demo-scope.md) for room count, actor count, light count, and content spec of the first playable demo.

## Related Docs

- [Tech Stack](../architecture/tech-stack.md)
- [Rendering](../architecture/rendering.md)
- [Repo Structure](../architecture/repo-structure.md)
- [World Model](../features/world-model.md)
- [Demo Scope](../features/demo-scope.md) — the first playable demo this doc's gaps block or scope
- [WASM Bridge](../architecture/wasm-bridge.md) — resolves the WASM ↔ JS bridge shape gap, ChunkData field spec, and ChunkProvider transport shape
- [Input Event Schema](../architecture/input-schema.md) — resolves the normalized input event shape gap
- [Asset Pipeline](../architecture/asset-pipeline.md) — resolves the texture compression format gap
- [Visibility](../architecture/visibility.md) — resolves the visibility algorithm gap
- [World Streaming](../architecture/world-streaming.md) — resolves the outdoor chunk file format, ChunkData contract field spec, and ChunkProvider transport shape gaps
- [Test-Driven Development](../principles/test-driven-development.md) — the testing discipline applied to future gap resolutions
