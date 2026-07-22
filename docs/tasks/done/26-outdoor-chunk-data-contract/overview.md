---
task: "26"
slug: outdoor-chunk-data-contract
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2025-06-17
outcome: "Implemented engine-owned ChunkData struct (32x32 tiles, heights, solidity, entity placement list) and ChunkProvider trait with reference FlatChunkProvider in engine-core/src/chunk.rs. Updated docs/architecture/wasm-bridge.md with out-of-band async chunk transport and resolved open gaps in docs/research/known-gaps.md."
---

# Outdoor Chunk Data Contract + ChunkProvider Interface

Define the engine-owned `ChunkData` shape every resident outdoor chunk resolves to at runtime, and the `ChunkProvider` interface applications implement to supply chunk data, per `docs/architecture/world-streaming.md`'s "Outdoor Chunk Data — Contract and Source" section.

## Desired Changes

- Add a `ChunkData` struct/type in `packages/engine-core` (32×32 tile/height grid, tile-type table, entity/decoration placement list) with concrete field types and sizes decided as part of this task — resolves the "ChunkData contract field spec" gap in `docs/research/known-gaps.md`
- Define a `ChunkProvider` trait/interface engine-core calls to request a chunk by coordinate and receive `ChunkData` back — decide and document the transport shape across the WASM boundary (sync vs. async, how a multi-frame load such as file I/O or procedural generation is represented without violating the fixed-size/per-frame conventions in `docs/architecture/wasm-bridge.md`) — resolves the "ChunkProvider transport shape" gap
- Update `docs/architecture/wasm-bridge.md` with whatever new buffer(s)/mechanism this introduces (doc first, per "Schema Ownership")
- Implement one minimal reference `ChunkProvider` (e.g. a simple deterministic procedural generator, flat/placeholder terrain) purely to prove the interface works end-to-end — not a real terrain generator
- Remove the two resolved gap entries from `docs/research/known-gaps.md` (or mark them resolved into this doc, per FaM conventions) once implemented

## Definition of Done

- [ ] `ChunkData` type exists in `packages/engine-core` with documented field types/sizes
- [ ] `ChunkProvider` trait/interface exists with a documented request/response shape that accounts for non-instant chunk generation/loading
- [ ] A minimal reference provider implementation compiles and returns valid `ChunkData` for arbitrary chunk coordinates
- [ ] `docs/architecture/wasm-bridge.md` reflects any new buffer/mechanism this introduces
- [ ] `docs/research/known-gaps.md` no longer lists the ChunkData field spec or ChunkProvider transport shape as open
- [ ] Rust unit tests cover `ChunkData` construction and at least one `ChunkProvider` round-trip
- [ ] `cargo test` passes; `wasm-pack build` still succeeds

## Out of Scope

- Actual streaming behavior (load/evict radius, resident set, LRU) — that's task:27
- Real terrain authoring, file formats, or procedural algorithms of production quality — the reference provider is a placeholder proving the interface, not a shipped feature
- Indoor room data contract — that's task:28

## Implementation Steps

1. Read `docs/architecture/world-streaming.md`'s "Outdoor Chunk Data — Contract and Source" section and `docs/architecture/wasm-bridge.md` in full
2. Design and implement `ChunkData` in `packages/engine-core` (suggest a new module, e.g. `packages/engine-core/src/chunk.rs`)
3. Design the `ChunkProvider` trait/interface and its cross-boundary transport shape; update `docs/architecture/wasm-bridge.md` first if it introduces new buffers or a new mechanism
4. Implement the minimal reference provider and wire it to be callable/testable
5. Write Rust unit tests for `ChunkData` and the reference provider
6. Update `docs/research/known-gaps.md` to remove/resolve the two gap entries this task addresses
7. Run `cargo test` and `wasm-pack build`, confirm both pass

## Context

**Read first:**
- `docs/architecture/world-streaming.md` — source of truth for the contract/source split this task implements
- `docs/architecture/wasm-bridge.md` — existing buffer conventions this task's transport shape must fit or extend
- `docs/research/known-gaps.md` — the two gaps this task resolves

**Related work:**
- task:27 (outdoor chunk streaming) depends on this task's `ChunkData`/`ChunkProvider`
- task:29 (seam coordinate translation) depends on this task's `ChunkData` existing

**Key files:**
- `packages/engine-core/src/`
- `docs/architecture/wasm-bridge.md`
- `docs/research/known-gaps.md`
