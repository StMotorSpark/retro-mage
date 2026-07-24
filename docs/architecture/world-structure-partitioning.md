---
feature: world-structure-partitioning
tags: [architecture, world-model, memory, streaming, collision]
summary: Retro Mage isolates indoor and outdoor space mechanically by maintaining separate tile and actor buffers in engine-core, preventing coordinate overlap between the two structures.
relates-to:
  - "[World Model](../features/world-model.md)"
  - "[World Streaming](./world-streaming.md)"
  - "[Collision](./collision.md)"
  - "[Visibility](./visibility.md)"
---

# World Structure Partitioning

[World Model](../features/world-model.md) asserts that indoor rooms (graph-based, local coordinates) and outdoor chunks (grid-based, global coordinates) are two distinct data structures. This doc defines the mechanical isolation that enforces that separation in memory.

## Overview

`engine-core` maintains strict separation between indoor and outdoor entities. Instead of a single shared `master_tiles` or `actors` buffer where coordinates might accidentally overlap, the engine physically partitions these buffers by world structure. `collision` and `visibility` only ever iterate over the buffers matching the player's `active_world_structure`.

## Buffer Separation

The `EngineState` defines separate static arrays for each structure:

- `indoor_tiles` and `outdoor_tiles`
- `indoor_actors` and `outdoor_actors`

Write APIs (`set_tile`, `set_actor`) specify which structure they populate:
- `set_indoor_tile(...)` / `set_outdoor_tile(...)`
- `set_indoor_actor(...)` / `set_outdoor_actor(...)`

This completely eliminates the possibility of indoor wall tiles rendering in the outdoor sky or blocking outdoor movement, even if an indoor room is authored at coordinates that numerically match the outdoor terrain.

## Execution in tick()

During `tick()`, engine sub-systems (`visibility::recompute_visibility`, `collision::resolve_movement`) no longer iterate over all authored data. They branch once on `active_world_structure`:

1. If `active_world_structure == 0` (Indoor): read from `indoor_tiles` and `indoor_actors`.
2. If `active_world_structure == 1` (Outdoor): read from `outdoor_tiles` and `outdoor_actors`.

This ensures zero CPU cycles are wasted iterating over inactive structure data, and strictly enforces the isolation established by the seam transform (see [World Streaming](./world-streaming.md)).

## Rendering Implications

The WASM bridge to `render` remains unchanged. `packages/render` only reads the output buffers populated by `recompute_visibility` (`visible_tiles_x_ptr`, etc.). Because `visibility` only culls from the active structure's buffers, the visible output buffer inherently only contains active geometry. `render` never needs to know whether the player is indoors or outdoors to draw the tiles.

## No "Always Active" Global Entities

There is no "Global" or "Always Active" structure layer (e.g., a shared buffer). Any entity that conceptually persists across a seam crossing (like a companion pet or persistent status effect) must be actively despawned from the source buffer and respawned in the destination buffer by the application logic during the seam transition. The engine does not carry entities across structure boundaries automatically.

## Related Docs

- [World Model](../features/world-model.md) — the philosophical framing of indoor vs outdoor spaces
- [World Streaming](./world-streaming.md) — the seam transforms that teleport the player between these partitioned spaces
- [Collision](./collision.md) — the movement resolution system that relies on this partitioned isolation
- [Visibility](./visibility.md) — the occlusion system that drives the output render buffers from these partitioned inputs
