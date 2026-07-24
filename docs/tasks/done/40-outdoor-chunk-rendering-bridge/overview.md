---
task: "40"
slug: outdoor-chunk-rendering-bridge
status: done
depends-on: ["39"]
blocked-by: ""
assigned-to: ""
created: 2026-07-24
outcome: "Bridged chunk streaming to outdoor_tiles, replaced array with Vec to handle 32768 limit, removed demo tile loop."
---

# Outdoor Chunk Rendering Bridge

Bridge `OutdoorChunkStreamer`'s resident chunk tile data into `outdoor_tiles` so streamed outdoor chunks automatically render without requiring hand-placed tiles in the demo application.

## Desired Changes

- `OutdoorChunkStreamer` copies `ChunkData` tiles into `outdoor_tiles` (provided by `EngineState`) when a chunk becomes resident.
- `OutdoorChunkStreamer` clears/zeros out those tiles from `outdoor_tiles` when a chunk is evicted.
- Remove the manual grass tile placement loop in `examples/demo/src/main.ts`.

## Definition of Done

- [ ] Resident chunk tiles successfully populate `outdoor_tiles` buffer automatically
- [ ] Evicted chunk tiles are successfully removed from `outdoor_tiles` buffer automatically
- [ ] Demo outdoor terrain renders strictly from the streaming chunk provider
- [ ] No visible pop-in regression (streaming load-ahead remains responsive)

## Out of Scope

- Chunk data generation or file format (remains app-owned via `ChunkProvider`)
- Actor streaming bridge (focus strictly on tiles for this task)
- Any changes to indoor room graph streaming

## Implementation Steps

1. **Update `OutdoorChunkStreamer` Interface (`packages/engine-core/src/chunk.rs`)**
   - Add a method/mechanism to synchronize a single `ChunkData` block into the linear `outdoor_tiles` buffer.
   - Maintain a mapping of which `ChunkData` indices correspond to which `outdoor_tiles` block so they can be cleared on eviction.

2. **Wire Sync into `EngineState::tick` (`packages/engine-core/src/lib.rs`)**
   - When the `seam_manager` updates chunks in the `tick()` streaming loop, trigger the chunk-to-buffer sync for any newly loaded or evicted chunks.

3. **Update Demo (`examples/demo/src/main.ts`)**
   - Remove the `for x... for z... set_outdoor_tile` block that manually authored the grass terrain.
   - Verify that the `FlatChunkProvider` successfully streams the grass tiles in its place.

## Context

**Read first:**
- `docs/architecture/world-streaming.md`
- `docs/research/known-gaps.md` (Outdoor Chunk Rendering Bridge gap)

**Key files:**
- `packages/engine-core/src/chunk.rs`
- `packages/engine-core/src/lib.rs`
- `examples/demo/src/main.ts`
