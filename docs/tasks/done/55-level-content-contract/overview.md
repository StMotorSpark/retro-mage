---
task: "55"
slug: level-content-contract
status: done
depends-on: ["54"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Expanded LevelDefinition with immutable tile, actor, light, and polygon content contracts; transformed every field into isolated GlobalLevelContent snapshots. Collision now uses tile solidity, with tests covering openings, materials, metadata preservation, and global transforms."
---

# Complete Level Content Contract

Expand resolved level content so runtime data can represent actual textured geometry, collision, actors, lights, and future polygons.

## Desired Changes

- Add tile identity/material, variant/orientation, solidity, openings, and stair metadata.
- Add actor identity, sprite, facing, and active/spawn data.
- Add light color, intensity, and active data.
- Preserve local definitions and transformed global instance content.
- Define an extension point for simple polygon geometry.

## Definition of Done

- [ ] Content contract carries all data required by renderer and collision.
- [ ] Global transforms preserve every content field.
- [ ] Floors/openings/stairs are distinguishable from solid walls.
- [ ] Runtime content remains immutable per definition and isolated per instance.
- [ ] Unit tests cover transformation and collision/material semantics.

## Out of Scope

- WASM serialization.
- WebGPU.
- Full polygon renderer.
- Multi-floor movement physics.

## Implementation Steps

1. Read world-model, rendering, collision, and WASM bridge docs.
2. Update definition/global content types and validation.
3. Migrate existing tests and fixture providers.
4. Add representative dungeon/outdoor content fixtures.

## Context

- Read: `docs/features/world-model.md`
- Read: `docs/architecture/rendering.md`
- Read: `docs/architecture/collision.md`
- Depends on task 54.
