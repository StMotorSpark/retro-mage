---
feature: known-gaps
tags: [research, open-questions, planning]
summary: Tracks unresolved design questions that block specific implementation tasks, to be resolved in future design conversations as work reaches them.
relates-to:
  - "[Tech Stack](../architecture/tech-stack.md)"
  - "[Rendering](../architecture/rendering.md)"
  - "[Repo Structure](../architecture/repo-structure.md)"
  - "[WASM Bridge](../architecture/wasm-bridge.md)"
  - "[Input Event Schema](../architecture/input-schema.md)"
  - "[Visibility](../architecture/visibility.md)"
  - "[World Streaming](../architecture/world-streaming.md)"
  - "[Test-Driven Development](../principles/test-driven-development.md)"
---

# Known Gaps / Next Steps

This doc tracks design questions the current docs leave open — decisions not yet made, called out so future work doesn't silently assume an answer. Entries are added as new gaps surface and removed (or resolved into the relevant design doc) once answered. This doc does not describe target state itself; it points at where target state is still undecided.

## Open Questions

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

The exact content of the `examples/demo` minimal dungeon (room count, enemy sprite count, light source count) is undefined beyond "minimal, playable, proves the pipeline."

- Blocks: sizing the first playable-slice task in `examples/demo`
- Relates to: [Repo Structure](../architecture/repo-structure.md), [World Model](../features/world-model.md)

### World Streaming — ChunkData Contract Field Spec

[World Streaming](../architecture/world-streaming.md) defines the shape a resident outdoor chunk must resolve to (tile/height grid, tile-type table, entity/decoration placement list) conceptually, but exact field types/sizes (tile-id encoding, height precision, entity list layout/max count) are undecided.

- Blocks: task:26 in `engine-core`
- Relates to: [World Streaming](../architecture/world-streaming.md), [WASM Bridge](../architecture/wasm-bridge.md)

### World Streaming — ChunkProvider Transport Shape

[World Streaming](../architecture/world-streaming.md)'s `ChunkProvider` interface is decided in principle (app-owned chunk source behind an engine-defined contract), but how a chunk request/response actually crosses the WASM boundary is undecided — [WASM Bridge](../architecture/wasm-bridge.md)'s existing buffers are fixed-size, synchronous, per-frame reads, which doesn't obviously fit a chunk load that may involve file I/O or procedural generation spanning multiple frames.

- Blocks: task:26 in `engine-core`
- Relates to: [World Streaming](../architecture/world-streaming.md), [WASM Bridge](../architecture/wasm-bridge.md)

## Related Docs

- [Tech Stack](../architecture/tech-stack.md)
- [Rendering](../architecture/rendering.md)
- [Repo Structure](../architecture/repo-structure.md)
- [World Model](../features/world-model.md)
- [WASM Bridge](../architecture/wasm-bridge.md) — resolves the WASM ↔ JS bridge shape gap
- [Input Event Schema](../architecture/input-schema.md) — resolves the normalized input event shape gap
- [Asset Pipeline](../architecture/asset-pipeline.md) — resolves the texture compression format gap
- [Visibility](../architecture/visibility.md) — resolves the visibility algorithm gap
- [World Streaming](../architecture/world-streaming.md) — resolves the outdoor chunk file format gap; tracks the ChunkData contract field spec and ChunkProvider transport shape gaps
- [Test-Driven Development](../principles/test-driven-development.md) — the testing discipline applied to future gap resolutions
