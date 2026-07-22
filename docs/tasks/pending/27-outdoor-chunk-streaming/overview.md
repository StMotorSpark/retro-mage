---
task: "27"
slug: outdoor-chunk-streaming
status: pending
depends-on: ["26"]
blocked-by: ""
assigned-to: ""
created: 2025-06-17
outcome: ""
---

# Outdoor Chunk Streaming (Load Radius / Evict Radius / LRU)

Implement the outdoor half of `docs/architecture/world-streaming.md`'s streaming design: a resident set of 32×32-tile chunks around the player, kept current via a load radius and evicted via a wider evict radius with LRU as fallback.

## Desired Changes

- Add a resident-chunk-set structure in `packages/engine-core` keyed by global chunk coordinate, backed by `ChunkProvider`/`ChunkData` from task:26
- Implement load logic: every tick (or on player chunk-boundary crossing, worker's choice as long as it stays correct every frame per the design doc), request any chunk within the current load radius that isn't already resident
- Implement evict logic: any resident chunk outside the evict radius is a candidate for eviction; evict the least-recently-resident candidate first if a hard cap on resident chunk count is reached before natural distance-based eviction catches up
- Load radius and evict radius are engine-default, overridable values (hardcode sane defaults now; task:30 wires the actual app-facing config surface) — expose them as plain fields/functions on the streaming structure so task:30 has something to attach config to
- Add engine-core functions/getters exposing the current resident chunk set (or enough of it) for `render`/tests to inspect

## Definition of Done

- [ ] A test simulating player movement across several chunk boundaries proves: chunks within load radius become resident, chunks that fall outside evict radius are evicted, no chunk is evicted and reloaded repeatedly from a single back-and-forth crossing right at the boundary (hysteresis holds)
- [ ] A test proves the resident-chunk hard cap + LRU fallback triggers correctly when constructed to force it (e.g. artificially small cap in test)
- [ ] Resident chunk count stays within the derived count budget from `docs/architecture/world-streaming.md`'s "Memory Budget and Eviction" section under normal continuous movement
- [ ] Rust unit tests cover load, evict, and hysteresis behavior with concrete fixtures
- [ ] `cargo test` passes; `wasm-pack build` still succeeds

## Out of Scope

- Indoor room streaming — that's task:28
- Seam crossing / coordinate translation between indoor and outdoor — that's task:29
- App-facing tuning config surface (config schema, per-level override plumbing) — that's task:30, this task only needs the underlying radius values to be overridable fields
- Rendering of streamed chunk data — this task only manages the resident data set in `engine-core`

## Implementation Steps

1. Read `docs/architecture/world-streaming.md`'s "Chunk Shape and Size", "Streaming Trigger and Load-Ahead", and "Memory Budget and Eviction" sections in full
2. Design the resident-chunk-set structure in `packages/engine-core`, using `ChunkData`/`ChunkProvider` from task:26
3. Implement load-radius request logic and evict-radius/LRU eviction logic
4. Expose load radius, evict radius, and resident-set inspection via engine-core functions
5. Write Rust unit tests covering load, evict, hysteresis, and hard-cap+LRU fallback
6. Run `cargo test` and `wasm-pack build`, confirm both pass

## Context

**Read first:**
- `docs/architecture/world-streaming.md` — source of truth for load/evict radii and eviction rules
- task:26's `ChunkData`/`ChunkProvider` (dependency)

**Related work:**
- task:26 (dependency: chunk data contract + provider)
- task:29 (seam coordinate translation) depends on this task's resident outdoor chunk set existing
- task:30 (streaming tuning config) attaches app-facing config to the radius fields this task exposes

**Key files:**
- `packages/engine-core/src/`
