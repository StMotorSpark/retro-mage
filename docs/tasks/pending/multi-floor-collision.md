# Multi-Floor Collision Tasks

This document breaks down the implementation tasks for the Multi-Floor Collision design (up-down hit check).

- [ ] **1. Add new config values to CollisionConfig**
  - Add `player_height`, `gravity`, and `max_fall_speed` to `CollisionConfig` in `engine-core`.
  - Set defaults (`player_height = 1.6`, `gravity = 9.8`, `max_fall_speed = 15.0`).
  - Expose setters in `EngineState`.

- [ ] **2. Add Stair Direction Metadata**
  - Update the tile schema or data model to support a `direction` tag/metadata for stair tiles (North, South, East, West) so the collision logic knows which way the slope goes up.

- [ ] **3. Implement Base Y and Stair Interpolation**
  - Update `collision::resolve_movement` to find the tile directly under the player: `(floor(x), floor(z))`.
  - If flat tile, set base Y to tile's Y.
  - If stair tile, interpolate the player's Y between the tile's base Y and Y+1 based on their XZ progress along the tile's `direction`.

- [ ] **4. Implement Gravity and Holes**
  - If the tile under the player is a `vertical_opening` (hole), do not provide base support.
  - Apply downward acceleration using `gravity` and `dt` (capped by `max_fall_speed`) to the player's Y velocity.
  - Stop falling when the player intersects a solid tile below.

- [ ] **5. Implement Ceiling Head Bump**
  - In `collision::resolve_movement`, add a vertical overlap check.
  - If `player_y + player_height` intersects a solid tile above, stop XZ movement (or block movement entirely in that direction) to prevent passing through low ceilings.

- [ ] **6. Write Unit Tests**
  - Add `engine-core` unit tests for:
    - Normal flat movement.
    - Smoothly walking partway up a stair and stopping.
    - Falling into a hole and hitting the ground.
    - Bumping head on a low ceiling.
