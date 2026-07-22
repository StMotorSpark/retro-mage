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
  - "[Test-Driven Development](../principles/test-driven-development.md)"
---

# Known Gaps / Next Steps

This doc tracks design questions the current docs leave open — decisions not yet made, called out so future work doesn't silently assume an answer. Entries are added as new gaps surface and removed (or resolved into the relevant design doc) once answered. This doc does not describe target state itself; it points at where target state is still undecided.

## Open Questions

### Visibility Algorithm

[Rendering](../architecture/rendering.md) defers this explicitly. Indoor dungeon visibility could use portal culling, BSP, or a simpler radius/line-of-sight cull; outdoor visibility needs a chunk-distance approach. No algorithm is chosen yet.

- Blocks: `world-tiles` and outdoor chunk rendering tasks
- Relates to: [Rendering](../architecture/rendering.md), [World Model](../features/world-model.md)

### LUT Format and Generation

Lighting lookup tables are specified conceptually in [Rendering](../architecture/rendering.md) but their dimensions, authoring method (baked offline vs. generated at runtime), and file format are undecided.

- Blocks: `lighting` slice tasks in `render`
- Relates to: [Rendering](../architecture/rendering.md)

### Asset Pipeline

Texture, tile, and sprite file formats, folder conventions, how Vite ingests static assets, and the outdoor chunk file format are all undecided.

- Blocks: any task that adds real game assets rather than placeholder geometry
- Relates to: [Tech Stack](../architecture/tech-stack.md), [Rendering](../architecture/rendering.md)

### Example Demo Scope

The exact content of the `examples/demo` minimal dungeon (room count, enemy sprite count, light source count) is undefined beyond "minimal, playable, proves the pipeline."

- Blocks: sizing the first playable-slice task in `examples/demo`
- Relates to: [Repo Structure](../architecture/repo-structure.md), [World Model](../features/world-model.md)

## Related Docs

- [Tech Stack](../architecture/tech-stack.md)
- [Rendering](../architecture/rendering.md)
- [Repo Structure](../architecture/repo-structure.md)
- [World Model](../features/world-model.md)
- [WASM Bridge](../architecture/wasm-bridge.md) — resolves the WASM ↔ JS bridge shape gap
- [Input Event Schema](../architecture/input-schema.md) — resolves the normalized input event shape gap
- [Test-Driven Development](../principles/test-driven-development.md) — the testing discipline applied to future gap resolutions
