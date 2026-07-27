---
task: "45"
slug: world-contracts
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Added engine-core world contracts for local level definitions, global instances, transforms, bounds, anchors, runtime state, and persistence. Added explicit validation, local-to-global point and bounds transforms, yaw construction, and deterministic unit tests; no loading or generation logic included."
---

# Define World Runtime Contracts

Implement the shared data contracts for local level definitions, global level instances, transforms, bounds, anchors, and runtime state.

## Desired Changes

- Add engine-owned representations for `LevelDefinition`, `LevelInstance`, `Transform`, `Bounds`, and `LevelAnchor`.
- Represent local content separately from global instance placement.
- Validate finite bounds, uniform non-negative scale, stable IDs, and anchor references.
- Add unit tests for transform and bounds behavior.

## Definition of Done

- [ ] Contracts represent all fields required by `docs/features/world-model.md`.
- [ ] Full transform shape exists; translation, yaw, and vertical placement work.
- [ ] Invalid scale, bounds, and identity inputs fail explicitly.
- [ ] Tests cover local-to-global transform and world-bound derivation.
- [ ] No procedural generation logic exists in engine contracts.

## Out of Scope

- Provider loading.
- Manifest registration.
- Streaming or eviction.
- Collision implementation.
- Renderer integration.

## Implementation Steps

1. Read world-model and level-transitions docs.
2. Add contracts in the engine's world/level vertical slice.
3. Keep definitions immutable and instances runtime-owned.
4. Add deterministic pure tests for transforms, bounds, and validation.
5. Document any implementation-specific wire decisions in the slice.

## Context

- Read: `docs/features/world-model.md`
- Read: `docs/features/level-transitions.md`
- Read: `docs/architecture/world-runtime.md`
- Related: task 46 consumes these contracts.
