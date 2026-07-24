---
feature: world-streaming
tags: [architecture, streaming, world-model, memory, chunks]
summary: Retro Mage streams indoor rooms and outdoor terrain chunks in and out as the player moves using distance/proximity triggers, hop-based load-ahead, and per-seam coordinate translation, so the two data structures behind the seamless world of Visibility never require a load screen or level swap.
relates-to:
  - "[Visibility](./visibility.md)"
  - "[World Model](../features/world-model.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Asset Pipeline](./asset-pipeline.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# World Streaming

[Visibility](./visibility.md) asserts that indoor and outdoor space are two distinct data structures with an invisible handoff between them. This doc defines the mechanics behind that assertion: chunk/room shape, what triggers loading, how far ahead the engine loads, how coordinates translate across the indoor/outdoor seam, how resident data is bounded and evicted, and how outdoor chunk data is sourced.

## Overview

The player never sees a load screen or level transition while moving through the world. That experience is produced by two independent streaming strategies — dense/bounded for indoor rooms, sparse/distance-based for outdoor chunks — each streaming its own structure in ahead of the player and evicting what's no longer needed, with a translation step at the seam where the two meet.

## Chunk Shape and Size

**Outdoor** terrain streams as fixed-size square chunks on a global grid, sized 32×32 tiles per chunk. A fixed square size keeps chunk-coordinate math simple (chunk index = tile position / chunk size) and gives streaming/eviction a uniform unit to reason about. 32×32 is coarse enough that a sparse, distance-based load radius stays cheap, and fine enough to tune load-ahead distance in whole-chunk increments without large pop-in jumps.

**Indoor** space has no fixed dimension — a dungeon room *is* the chunk. Room boundaries (walls, closed doors) are chunk boundaries. Rooms connect to each other through a room graph: edges represent doorways or other traversable connections, not spatial adjacency in a shared coordinate space. This mirrors the room-as-unit model in [World Model](../features/world-model.md) and means indoor rooms carry no inherent world-space position — they exist only as nodes reachable through graph edges, which matters directly for coordinate translation below.

## Streaming Trigger and Load-Ahead

Streaming decisions split into three control tiers, matching the fixed-rule/tunable-knob split established in [Visibility](./visibility.md):

- **Fixed engine rule (not app-configurable):** streaming is always automatic and distance/proximity driven. No app can force full-world-resident load or disable streaming outright. The load/evict hysteresis mechanism itself (a load radius and a wider evict radius, not a single threshold) is fixed engine behavior — a single shared threshold would cause load/unload thrashing right at the boundary as the player moves back and forth across it.
- **Engine-default, app-tunable knobs:** the specific radii and depths are configurable per application, and even per level within an application, with sane engine defaults:
  - Outdoor load radius (chunks around the player to keep resident) and evict radius (wider than load radius, defining the hysteresis band).
  - Indoor neighbor depth — how many graph hops out from the player's current room to keep resident (default: 1 hop, i.e. the current room plus every room directly connected to it).
  - Seam trigger distance — how close (in tiles) to a linked indoor/outdoor exit point the player must be before the far side of that seam preloads.
- **Engine-internal, not exposed:** the actual resident-set bookkeeping, LRU tracking, and eviction execution are implementation detail no application code touches directly.

Load-ahead distance is not independent of [Visibility](./visibility.md)'s sight-distance tuning — the load radius (outdoor) and seam trigger distance must each cover at least the current sight-distance setting, otherwise geometry could become visible before it has streamed in. This is a validation constraint on top of the two systems' otherwise-independent tuning, not a shared calculation.

Indoor rooms use graph-hop depth rather than a distance calculation because room-graph connectivity, not spatial distance, is the only adjacency notion that exists indoors — there is no shared coordinate space to measure distance in until a room is placed relative to a specific seam.

The engine has no automatic detection of which room the player currently occupies — rooms are graph nodes, not spatial regions, so nothing in `engine-core` infers a room change from player position. Advancing `current_room_id` (via `set_indoor_current_room`) as the player crosses a doorway is an application responsibility; the seam manager only evaluates seams attached to whichever room is currently marked as current, not merely resident rooms, so a stale `current_room_id` silently disables every seam attached to a different room. See [Known Gaps — Indoor Room-Transition Detection](../research/known-gaps.md#indoor-room-transition-detection).

## Coordinate Translation at the Seam

Outdoor chunks tile one global coordinate grid — chunk and tile coordinates are globally meaningful by construction, which is what makes the load-radius and eviction math above work. Indoor rooms do not share that grid: because rooms exist only as room-graph nodes (see above), a room has no inherent world position, and the same room could in principle be reached via more than one door leading to different outdoor locations, or reused in more than one place. Giving rooms global coordinates would fight the graph model rather than simplify it.

Instead, each indoor/outdoor seam carries an explicit **seam transform** — an offset and rotation pinned to that specific door/exit, mapping room-local tile coordinates to outdoor global tile coordinates (or vice versa) only at that link point. Crossing a seam means:

1. Player position is converted from the source structure's local coordinates through that seam's transform into the destination structure's coordinates.
2. The destination structure (already preloaded per the seam trigger distance above) is now the active data structure driving visibility and movement.
3. No global coordinate reconciliation happens elsewhere — the transform is a lookup local to that seam, not a step toward unifying indoor and outdoor into one coordinate space.

This keeps indoor and outdoor genuinely independent data models, per [Visibility](./visibility.md)'s "two data structures" framing, while still producing a seamless crossing.

## Memory Budget and Eviction

Resident data is bounded by count, not raw byte size — counts are simpler to reason about and tune than a byte budget, and map directly onto the radii/depths above:

- Outdoor: maximum resident chunks derived from the evict radius (e.g. an evict radius of 1 chunk beyond a 2-chunk load radius yields a 5×5 resident window).
- Indoor: maximum resident rooms derived from neighbor depth (current room plus all rooms within the configured hop depth).

Eviction is **LRU beyond the evict band**: once a chunk or room falls outside its structure's evict radius/depth, it's a candidate for eviction, and the least-recently-resident candidate is dropped first if a hard cap is reached before natural distance-based eviction catches up. There is no priority or pinning system — every chunk and room is evicted on the same rule, with no mechanism (yet) for an application to mark specific data as always-resident. If a future need for pinning (e.g. a persistent hub room) emerges, it's a distinct addition to this doc, not an assumed feature of it today.

## Outdoor Chunk Data — Contract and Source

Two separate concerns are deliberately kept apart here, following the split/ownership pattern in [Asset Pipeline](./asset-pipeline.md):

- **Engine-owned: the chunk data contract.** The engine defines a fixed shape every resident outdoor chunk must resolve to at runtime — a tile/height grid at the chunk's fixed dimensions, a tile-type table, and an entity/decoration placement list. Streaming, eviction, and rendering all depend on this shape being uniform regardless of where the chunk's data came from.
- **Application-owned: the chunk data source.** The engine exposes a `ChunkProvider` interface — given a chunk coordinate, return chunk data conforming to the contract above — and does not mandate a file format, authoring tool, or generation method. An application can implement this as a prebaked-file loader (any binary or text format the application chooses), a procedural generator (seeded, computed on demand), or a hybrid (handcrafted chunks in specific locations, procedural generation filling the rest). This mirrors how texture compression format is application-owned while transcode/upload is engine-owned in [Asset Pipeline](./asset-pipeline.md).

This resolves the outdoor chunk file format question previously tracked as an open gap: there is no single engine-mandated format, by design, so applications can choose handcrafted, procedural, or mixed authoring per their needs.

A resident chunk's tile data is not automatically copied into the render-visible tile buffer — `ChunkProvider`/`OutdoorChunkStreamer` track chunk residency, but the engine's visibility cull reads from `master_tiles`, a separate, hand-authored tile buffer. An application must currently author outdoor terrain as ordinary tiles alongside its indoor rooms for that terrain to render; see [Known Gaps — Outdoor Chunk Rendering Bridge](../research/known-gaps.md#outdoor-chunk-rendering-bridge).

Indoor and outdoor tiles also share that same `master_tiles` coordinate space with no partitioning by active structure, so an application must keep its indoor and outdoor authored coordinate ranges far enough apart that neither structure's tiles fall within the other's sight radius or collision range; see [Known Gaps — Shared Indoor/Outdoor Coordinate Space](../research/known-gaps.md#shared-indooroutdoor-coordinate-space).

The same engine-owned-contract/application-owned-source split applies to indoor rooms and the room graph that connects them: the engine defines what a resident room must resolve to (its tile/geometry data plus its graph edges to other rooms and to outdoor seams), and the application decides how rooms and their connections are authored — hand-built level data, a level editor's export format, or procedural generation — the same way it decides outdoor chunk sourcing.

## Related Docs

- [Visibility](./visibility.md) — the "two data structures, invisible handoff" decision this doc provides the mechanics for, and the sight-distance tuning that constrains load-ahead distance here
- [World Model](../features/world-model.md) — the room-as-unit indoor model and chunked outdoor terrain this streaming design operates on
- [WASM Bridge](./wasm-bridge.md) — the buffer contract streamed chunk/room data ultimately crosses into render/engine-core through
- [Asset Pipeline](./asset-pipeline.md) — the engine-owned/application-owned split pattern this doc's chunk data contract/source split follows
- [Known Gaps](../research/known-gaps.md) — indoor room-transition detection, the outdoor chunk rendering bridge, and the shared indoor/outdoor coordinate space tracked as open gaps against this doc's design
