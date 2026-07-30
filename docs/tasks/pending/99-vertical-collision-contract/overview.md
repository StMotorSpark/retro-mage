---
task: "99"
slug: vertical-collision-contract
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-30
outcome: ""
---

# Define Vertical Collision Contract

Add engine-owned configuration and resolved support-surface data needed by ramp-based vertical movement.

## Desired Changes

- Extend collision configuration with player body height, gravity, maximum fall speed, maximum walkable slope, support snap distance, and bounded substep controls.
- Define explicit local support surfaces for flat planes and planar ramps, including bounded horizontal region, height function, normal, and walkability metadata.
- Ensure support surfaces survive level-definition ingestion, instance transforms, and runtime collision-index projection.
- Preserve existing tile/wall collision and standalone movement compatibility.
- Define stable API names/types consumed by the solver, WASM bridge, and demo provider.

## Definition of Done

- [ ] Config defaults match the vertical-movement design, including 35-degree maximum slope and 0.02 support snap distance.
- [ ] Support surfaces represent flat and planar ramp geometry without deriving collision from render buffers.
- [ ] Global transforms correctly transform support position, height, and normals.
- [ ] Invalid surfaces/configuration are rejected deterministically.
- [ ] Rust unit tests cover config defaults, ramp height/normal queries, bounds, and transform projection.
- [ ] Existing engine-core tests pass unchanged.

## Out of Scope

- Gravity or movement resolution behavior.
- WASM export/read mapping.
- Demo content or browser tests.
- Decorative stairs and visual polish.

## Implementation Steps

1. Read `docs/architecture/vertical-movement.md`, `docs/architecture/collision.md`, and existing level-content/runtime contracts.
2. Trace collision geometry from `LevelDefinition` through `WorldRuntime` and the runtime-owned collision index.
3. Add the smallest shared support-surface contract at the producer/consumer boundary. Keep local definitions immutable and runtime transforms authoritative.
4. Add validation and projection tests, including overlapping bounded surfaces and transformed ramps.
5. Record exact public field/type names in task outcome for downstream tasks.

## Context

- Read: `docs/architecture/vertical-movement.md` — source of truth.
- Read: `docs/architecture/collision-bridge.md` — ownership and frame boundary.
- Related consumers: task:100 (solver), task:101 (bridge).
- Key files: `packages/engine-core/src/collision.rs`, `packages/engine-core/src/level_provider.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/global_collision.rs`.
