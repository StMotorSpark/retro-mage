---
task: "100"
slug: vertical-movement-solver
status: done
depends-on: ["99"]
blocked-by: ""
assigned-to: ""
created: 2026-07-30
outcome: "Implemented vertical movement logic in global_collision.rs with gravity, slopes, landing, and ceiling checks. All tests pass."
---

# Implement Vertical Movement Solver

Extend engine-core movement with ramp support, gravity, landing, static ceiling clearance, and deterministic bounded stepping.

## Desired Changes

- Resolve upright player movement over explicit flat/ramp support surfaces.
- Apply gravity when support is absent; allow walking off ledges and falling.
- Select highest valid support below the body when surfaces overlap.
- Apply descending-only support snap within configured tolerance.
- Reject support above the configured 35-degree slope limit and block uphill movement on too-steep surfaces.
- Prevent body/head penetration into static ceilings.
- Preserve horizontal wall collision and sliding.
- Expose grounded state and vertical velocity through existing engine state/diagnostics boundaries as needed.

## Definition of Done

- [x] Ramp ascent/descent changes Y continuously while body remains upright.
- [x] Ledge departure enters falling state; landing clears downward velocity and restores grounded state.
- [x] Highest valid support selection is deterministic for overlapping floors.
- [x] Too-steep support never produces grounded state and uphill movement is blocked.
- [x] Ceiling checks cover full body interval and prevent penetration.
- [x] Large frame deltas use clamping/bounded substeps and do not tunnel through tested floors/ceilings.
- [x] Rust tests cover grounded movement, falling, landing, slope rejection, ceiling clearance, seams, and failure-safe edge cases.
- [x] Existing flat collision, crossing, and world-aware tick tests pass.

## Out of Scope

- WASM/browser API changes.
- Demo ramps or visual stairs.
- Jumping, crouching, slope sliding, moving platforms, elevators, ladders, actor collision, and fall damage.

## Implementation Steps

1. Read task:99 outcome and use its exact support-surface/config contract.
2. Trace `EngineState`, world-aware tick ordering, and read-only runtime collision query behavior.
3. Implement vertical state and deterministic resolution without mutating runtime lifecycle during movement.
4. Keep crossing evaluation post-resolution; preserve global pose and existing source-continuity behavior.
5. Add focused unit/integration tests before modifying bridge or demo consumers.

## Context

- Read: `docs/architecture/vertical-movement.md`.
- Read: `docs/architecture/collision-bridge.md`.
- Depends on: task:99.
- Key files: `packages/engine-core/src/collision.rs`, `packages/engine-core/src/lib.rs`, `packages/engine-core/src/world_transport.rs`, `packages/engine-core/src/world_runtime.rs`.
