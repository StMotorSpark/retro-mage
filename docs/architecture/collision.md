---
feature: collision
tags: [architecture, collision, movement, engine-core, physics]
summary: Retro Mage resolves player movement with facing-relative input and circle-vs-AABB tile collision with sliding, running inside engine-core's tick loop as a single XZ-plane check against the master tile buffer.
relates-to:
  - "[World Model](../features/world-model.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Rendering](./rendering.md)"
  - "[Input Event Schema](./input-schema.md)"
  - "[Repo Structure](./repo-structure.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Collision

`engine-core` owns simulation truth, which includes player movement and collision. The `collision` module applies facing-relative movement from input and resolves the resulting position change against solid tiles, so the player cannot walk through walls.

## Overview

Two things happen in `tick()` that previously had no implementation: look input is applied to the camera's yaw and pitch, and movement input is translated into a world-space position change and checked against the tile grid. The result is written back into the camera buffer, where `render` reads it each frame.

Collision is circle-vs-AABB: the player is a circle (radius `r` tiles) in the horizontal XZ plane, and each solid tile is a 1×1 unit axis-aligned bounding box centred at the tile's world position. Sliding resolution means the player moves along wall surfaces rather than stopping dead.

## Coordinate System

The engine's 3D world uses:
- **X** — right (east)
- **Y** — vertical (elevation / floor level)
- **Z** — depth (camera at yaw=0 looks toward −Z)

Player movement is in the **XZ plane**. Camera Y is the player's elevation and is constant in Phase 1 (single flat floor). Collision is computed in XZ only; the Y-axis is not considered during movement resolution. This `camera.y` elevation coordinate is engine-owned and must match the tile grid's `y` values (visibility culling rounds it to the same integer floor layer as the tiles) — it is not a literal render-time eye height. `render` applies a separate, render-only eye-height offset on top of this value when constructing the view matrix; see [Rendering — Camera Elevation vs. Render Eye Height](./rendering.md#camera-elevation-vs-render-eye-height).

### Movement direction

Forward and strafe-right vectors are derived from camera yaw at the time of the tick, matching `mat4CameraView` in `packages/render`:

```
forward  = ( sin(yaw),  0, −cos(yaw) )   in XZ
right    = ( cos(yaw),  0, −sin(yaw) )   in XZ
```

At yaw=0 the camera looks −Z, so forward is −Z and right is +X. At yaw=π/2 the camera looks +X, forward is +X and right is −Z.

Desired movement delta per frame:

```
dx = (move_y × forward_x + move_x × right_x) × speed × dt
dz = (move_y × forward_z + move_x × right_z) × speed × dt
```

where `move_y` is forward/back (positive = forward) and `move_x` is strafe (positive = right), both normalised to −1…1 by the `input` package.

## Collision Shape — Circle

The player's footprint is a circle of radius `player_radius` centred at `(camera.x, camera.z)`. For each solid tile at world position `(tx, ty, tz)`, the tile AABB in XZ is `[tx−0.5, tx+0.5] × [tz−0.5, tz+0.5]`. The overlap test:

```
closest_x = clamp(px, tx − 0.5, tx + 0.5)
closest_z = clamp(pz, tz − 0.5, tz + 0.5)
dist²     = (px − closest_x)² + (pz − closest_z)²
overlap   = dist² < radius²
```

All solid tiles in `master_tiles` are checked. In Phase 1 (single floor), ceiling and floor tiles are not marked solid, so only wall tiles participate in collision. Phase 2 multi-floor collision requires Y-level filtering (see [Known Gaps — Multi-Floor Collision](../research/known-gaps.md#multi-floor-collision)).

## Sliding Resolution

Stopping dead at walls is rejected. The resolution order is:

1. **Full move** `(dx, dz)` — if clear, apply both.
2. **X-only** `(dx, 0)` — if clear, accept X movement.
3. **Z-only** `(0, dz)` — if clear, accept Z movement.
4. **Combined** `(accepted_x, accepted_z)` — check combined result; if still clear, apply.
5. **Fallback** — stay at current position.

This produces wall-sliding: moving diagonally into a wall succeeds in the parallel axis and stops in the perpendicular one.

## CollisionConfig — App-Overridable Defaults

```
player_speed     f32   4.0 tiles/second   How fast the player moves
player_radius    f32   0.3 tiles           Player circle footprint
look_sensitivity f32   2.0 rad/s/unit      Camera look rotation speed
```

`CollisionConfig` follows the same pattern as `StreamingConfig` and `max_sight_distance`: the engine ships these defaults, a consuming game overrides them via `EngineState::set_collision_config`, `set_player_speed`, `set_player_radius`, or `set_look_sensitivity`. They are tunable per level or per game.

**`player_radius` at 0.3:** a 1-tile-wide doorway leaves ~0.35 tiles of clearance on each side. Narrower corridors are not possible; wider passages feel appropriately tight.

**`player_speed` at 4.0 t/s:** a 4-tile-wide room takes ~1 second to cross at full input. Feels snappy without being frantic.

**`look_sensitivity` at 2.0 rad/s/unit:** with stick input normalised to −1…1, the camera rotates one full turn in ~π/2 ≈ 1.57 seconds at maximum deflection. Adjustable via the touch overlay's swipe zone or gamepad stick scale.

## Integration in tick()

`EngineState::tick(dt)` applies collision in this order before visibility recomputes:

1. `collision::apply_look` — update `camera.yaw` and `camera.pitch` from `input.look_x/y`, pitch clamped to ±85°.
2. `collision::compute_movement_delta` — compute `(dx, dz)` from `input.move_x/y`, current yaw, speed, and dt.
3. `collision::resolve_movement` — test `(dx, dz)` against `master_tiles` solid set, return resolved `(new_x, new_z)`.
4. Write `camera.x`, `camera.z` with resolved position.
5. Update streaming (seam check, chunk/room resident set).
6. `recompute_visibility`.

`set_camera` (direct position override, used by app setup and tests) bypasses collision resolution — it sets position unconditionally. This is intentional: initial placement must be unconditional, and tests need to position the camera freely.

## What This Does Not Cover

- **Multi-floor collision**: stairwells, ramps, vertical level changes. Phase 1 only; tracked in [Known Gaps](../research/known-gaps.md#multi-floor-collision).
- **Actor-vs-tile collision**: actors (NPCs, enemies) do not collide with tiles yet. Phase 2.
- **Actor-vs-actor collision**: no entity-to-entity collision. Phase 2.
- **Physics responses** (bouncing, friction, mass): out of scope for a dungeon-crawler; simple stop/slide is the intended model indefinitely.
- **Shared indoor/outdoor coordinate space**: collision checks every solid tile in `master_tiles` regardless of which world structure (indoor/outdoor) is currently active — there is no structure-based partitioning. An outdoor area's tiles can be blocked by indoor walls (or vice versa) if their authored coordinates fall close enough together. Tracked in [Known Gaps](../research/known-gaps.md#shared-indooroutdoor-coordinate-space).

## Related Docs

- [World Model](../features/world-model.md) — the grid-aligned tile world and real-time movement this collision system operates in
- [WASM Bridge](./wasm-bridge.md) — the `master_tiles` solid field this collision check reads; the camera buffer this module writes
- [Input Event Schema](./input-schema.md) — the `move_x/y` and `look_x/y` fields this module consumes
- [Repo Structure](./repo-structure.md) — why collision lives in `engine-core` (simulation truth) not `render` or `input`
- [Known Gaps](../research/known-gaps.md) — multi-floor collision and the shared indoor/outdoor coordinate space tracked as future work
