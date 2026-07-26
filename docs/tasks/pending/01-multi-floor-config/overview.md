---
task: "01"
slug: multi-floor-config
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-26
outcome: ""
---

# Multi-Floor Config and Schema

Update engine-core configuration and tile schema to support multi-floor collision mechanics.

## Desired Changes

- Add `player_height`, `gravity`, and `max_fall_speed` to `CollisionConfig` in `engine-core`
- Update tile data structures to include `direction` metadata for stair tiles

## Definition of Done

- [ ] `CollisionConfig` struct contains new fields with correct defaults (height 1.6, gravity 9.8, max_fall_speed 15.0)
- [ ] `EngineState` provides setters for the new config fields
- [ ] Tile schema supports a `direction` field (North, South, East, West) to indicate stair slope
- [ ] Compiles successfully without breaking existing configuration logic

## Out of Scope

- Actually applying gravity or ceiling checks (this is handled in Task 02)
- Changing rendering logic

## Implementation Steps

1. **Update CollisionConfig**
   - Locate the config module in `engine-core`.
   - Add the fields `player_height`, `gravity`, and `max_fall_speed`.
   - Set the default values as described in `collision.md`.

2. **Update EngineState Setters**
   - Add new `set_player_height`, `set_gravity`, and `set_max_fall_speed` methods to `EngineState` so the consuming application can override defaults.

3. **Update Tile Schema**
   - Identify where tile types are defined in `engine-core`.
   - Ensure the tile definition can hold a `direction` metadata field for stair slopes.

## Context

- Read: `docs/architecture/collision.md`
- Read: `docs/research/known-gaps.md`
