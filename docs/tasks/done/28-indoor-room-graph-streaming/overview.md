---
task: "28"
slug: indoor-room-graph-streaming
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2025-06-17
outcome: "Implemented indoor room graph topology and hop-depth room streaming in packages/engine-core. Added RoomNode, RoomGraph, RoomProvider, and IndoorRoomStreamer with hop-depth resident set computation and LRU-beyond-band fallback eviction. Integrated with EngineState and verified with cargo test and wasm-pack build."
---

# Indoor Room Graph Streaming (Room-as-Chunk / Hop-Depth Load-Ahead)

Implement the indoor half of `docs/architecture/world-streaming.md`'s streaming design: rooms as the indoor chunk unit, connected by a room graph, streamed in/out by graph-hop depth rather than spatial distance.

## Desired Changes

- Add a room-graph data structure in `packages/engine-core`: room nodes (each room's own local tile/geometry data, following existing `TilesBuffer`-style conventions per `docs/architecture/wasm-bridge.md`) and edges representing doorway/traversable connections between rooms
- Implement resident-room-set logic: current room plus all rooms within the configured hop depth (default: 1 hop) are resident; rooms outside that depth are eviction candidates
- Eviction follows the same LRU-beyond-band rule as task:27's outdoor eviction, applied to hop-depth instead of spatial radius
- Hop depth is an engine-default, overridable value (hardcode a sane default now; task:30 wires the app-facing config surface) — expose it as a plain field/function for task:30 to attach config to
- Add engine-core functions/getters exposing the current resident room set for `render`/tests to inspect

## Definition of Done

- [ ] A test fixture with several rooms connected in a graph (including a branching topology, not just a straight line) proves: the current room plus all 1-hop neighbors are resident, rooms beyond 1 hop are not, and moving to an adjacent room updates the resident set to that room's own 1-hop neighborhood
- [ ] A test proves LRU-beyond-band eviction triggers correctly when a hard cap on resident room count is reached, mirroring task:27's fallback behavior
- [ ] Rust unit tests cover graph traversal, resident-set computation, and eviction with concrete fixtures
- [ ] `cargo test` passes; `wasm-pack build` still succeeds

## Out of Scope

- Outdoor chunk streaming — that's task:27
- Seam crossing / coordinate translation to outdoor space — that's task:29
- App-facing tuning config surface — that's task:30, this task only needs the hop-depth value to be overridable
- Room/level authoring format or tooling — this task assumes room graph data is already constructed (e.g. via test fixtures); how it's authored is out of scope per `docs/architecture/world-streaming.md`'s app-owned room authoring split

## Implementation Steps

1. Read `docs/architecture/world-streaming.md`'s "Chunk Shape and Size" (indoor section) and "Streaming Trigger and Load-Ahead" sections in full
2. Design the room-graph structure (room nodes + edges) in `packages/engine-core`
3. Implement resident-room-set computation by hop depth from the player's current room
4. Implement LRU-beyond-band eviction, mirroring task:27's pattern
5. Expose hop depth and resident-set inspection via engine-core functions
6. Write Rust unit tests covering graph traversal, resident-set computation (including a branching topology), and eviction
7. Run `cargo test` and `wasm-pack build`, confirm both pass

## Context

**Read first:**
- `docs/architecture/world-streaming.md` — source of truth for room-as-chunk model and hop-depth streaming rule
- `docs/architecture/wasm-bridge.md` — existing tile-buffer conventions a room's local geometry data should follow

**Related work:**
- task:29 (seam coordinate translation) depends on this task's resident room set existing
- task:30 (streaming tuning config) attaches app-facing config to the hop-depth field this task exposes

**Key files:**
- `packages/engine-core/src/`
