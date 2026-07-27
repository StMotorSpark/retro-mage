---
task: "43"
slug: multi-floor-movement
status: done
depends-on: ["42"]
blocked-by: ""
assigned-to: ""
created: 2026-07-26
outcome: "Implemented multi-floor collision logic: base Y calculation, stair interpolation, gravity over vertical openings, and ceiling bump prevention. Unit tests passed."
---

# Multi-Floor Movement

Implement 3D Y-elevation logic, stair interpolation, gravity, and ceiling collision in `collision::resolve_movement`.

## Desired Changes

- Calculate player base Y dynamically from the tile under `(floor(x), floor(z))`
- Interpolate Y when moving over stair tiles
- Apply gravity when over `vertical_opening` tiles
- Prevent movement if player's head (`y + player_height`) hits a solid tile above

## Definition of Done

- [ ] Player Y smoothly interpolates on stair tiles based on direction
- [ ] Player accelerates downward in vertical openings until hitting solid ground
- [ ] Movement is blocked if ceiling is lower than `player_y + player_height`
- [ ] Unit tests verify stairs, gravity, and ceiling bumps pass

## Out of Scope

- Multi-floor visibility/rendering (already supported by architecture)
- Actor-vs-tile collision

## Implementation Steps

1. **Calculate Base Y** (`engine-core/src/collision.rs`)
   - Read the tile directly underneath the player: `(floor(camera.x), floor(camera.z))`.
   - If flat tile, set `base_y` to the tile's Y elevation.
   - If stair tile, calculate `base_y` by interpolating across the tile's XZ footprint based on its `direction` metadata.

2. **Implement Gravity**
   - If the tile underneath is a `vertical_opening` (hole), it provides no base support.
   - Apply downward acceleration to the player's Y velocity using `config.gravity` and `dt`, capped by `config.max_fall_speed`.
   - Stop falling when the player intersects a solid tile below.

3. **Implement Ceiling Head Bump**
   - Inside `collision::resolve_movement`, add a vertical overlap check.
   - If `camera.y + config.player_height` overlaps a solid tile above, halt XZ movement in that direction to prevent passing through low ceilings.

4. **Write Unit Tests**
   - Add tests covering the flat tile movement, stair interpolation, gravity fall, and ceiling bump rules.

## Context

- Read: `docs/architecture/collision.md`
- Depends on: task 42 (provides the config and schema)
