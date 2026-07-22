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

Tile and sprite folder conventions, how Vite ingests static assets, and the outdoor chunk file format are still undecided.

**Texture compression format is resolved**: PNG stays the committed source-of-truth format; production builds compress to KTX2 (UASTC mode, Basis Universal, no supercompression), transcoded to native GPU format at load time. Confirmed viable via a manual spike (`docs/tasks/done/16-texture-compression-spike/`) on desktop Chrome and physical iPhone Safari — Safari exposes `WEBGL_compressed_texture_astc` on Apple GPUs, textures transcode and render correctly with no errors. Two carry-forward constraints for the production pipeline task:

- Do **not** enable Zstandard supercompression on UASTC KTX2 files — it broke transcoding silently (rendered solid black) with the transcoder library used in the spike. Ship plain (no supercompression) UASTC.
- Mipmap upload needs a real dimension/block-alignment strategy before `LINEAR_MIPMAP_LINEAR` filtering is enabled — the spike hit incomplete-mip-chain failures at small mip sizes (samples as solid black per WebGL spec) and fell back to base-mip-only for the spike. Production pipeline must solve this properly.
- Still open: automating this compression via a Vite plugin (spike did it by hand), and whether a fallback uncompressed-texture path ships for devices/browsers without a compressed-texture extension.

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
