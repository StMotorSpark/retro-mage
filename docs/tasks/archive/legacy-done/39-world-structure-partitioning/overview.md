---
task: "39"
slug: world-structure-partitioning
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-24
outcome: "Split master_tiles and actors into indoor and outdoor arrays. Updated tests and removed OUTDOOR_OFFSET."
---

# World Structure Partitioning

Split engine-core's `master_tiles` and `actors` buffers into separate indoor and outdoor arrays to isolate the two world structures, removing the shared-coordinate-space limitation.

## Desired Changes

- Split `master_tiles` into `indoor_tiles` and `outdoor_tiles` in `EngineState`
- Split `actors` into `indoor_actors` and `outdoor_actors` in `EngineState`
- Replace `set_tile` and `set_actor` with structure-specific setters (e.g. `set_indoor_tile`)
- Branch `collision::resolve_movement` and `visibility::recompute_visibility` to only read from the buffers corresponding to the `active_world_structure`
- Remove `OUTDOOR_OFFSET` workaround in `examples/demo/src/main.ts` now that coords don't overlap

## Definition of Done

- [ ] All Rust tests pass (test coverage updated for split buffers)
- [ ] Demo dungeon and outdoor terrain still render and collide correctly
- [ ] `OUTDOOR_OFFSET` is removed from demo; seam exit tile uses local-like coordinates without collision bleed
- [ ] `render` package remains unchanged (WASM bridge schema for output visible buffers remains intact)

## Out of Scope

- Outdoor chunk rendering bridge (see task 40)
- Room transition primitives (see task 41)
- Multi-floor Y-axis collision
- Any changes to `packages/render` JS

## Implementation Steps

1. **Update `EngineState` Struct (`packages/engine-core/src/lib.rs`)**
   - Replace `master_tiles` and `actors` with `indoor/outdoor` variants.
   - Update `EngineState::new()` default initialization.

2. **Update Write APIs (`packages/engine-core/src/lib.rs`)**
   - Expose `set_indoor_tile`, `set_outdoor_tile`, `set_indoor_actor`, `set_outdoor_actor` to WASM/JS.
   - Remove generic `set_tile`/`set_actor`.

3. **Update Core Subsystems**
   - Update `collision::resolve_movement` to accept/branch on the active tile array.
   - Update `visibility::recompute_visibility` to accept/branch on active tile and actor arrays.

4. **Update Demo (`examples/demo/src/main.ts`)**
   - Change `set_tile` / `set_actor` calls to structure-specific methods.
   - Remove `OUTDOOR_OFFSET` constant and shift outdoor coordinates to overlap indoor bounds safely.

## Context

**Read first:**
- `docs/architecture/world-structure-partitioning.md` — design doc
- `docs/research/known-gaps.md` (Shared Indoor/Outdoor Coordinate Space section resolved)

**Key files:**
- `packages/engine-core/src/lib.rs`
- `packages/engine-core/src/collision.rs`
- `packages/engine-core/src/visibility.rs`
- `examples/demo/src/main.ts`
