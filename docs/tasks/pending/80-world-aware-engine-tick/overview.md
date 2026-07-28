---
task: "80"
slug: world-aware-engine-tick
status: pending
depends-on: ["79"]
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: ""
---

# Add World-Aware Engine Tick

Make `WorldTransport` drive one ordered world frame using runtime-owned collision and engine-owned player pose.

## Desired Changes

- Add world-aware tick orchestration through `WorldTransport`.
- Keep `EngineState` as input, camera, player-pose, and movement owner.
- Order movement, crossing, scheduler evaluation, provider completion, and render publication per the collision bridge design.
- Apply explicit crossing arrival poses to `EngineState`.

## Definition of Done

- [ ] World-aware tick resolves movement against runtime-owned collision state.
- [ ] Crossing runs after movement using post-movement pose and delta.
- [ ] Scheduler runs after crossing using authoritative active instance and pose.
- [ ] Explicit link arrival pose reaches engine camera state.
- [ ] Lifecycle mutation cannot occur halfway through movement resolution.
- [ ] Rust tests cover frame ordering and crossing integration.

## Out of Scope

- Browser/demo caller migration.
- Removal of `sync_collision()`.
- Legacy API removal.
- Full multi-floor physics or new collision primitives.

## Implementation Steps

1. Read collision bridge, crossing policy, runtime, scheduler, and WASM bridge docs.
2. Trace `EngineState.tick()`, `WorldRuntime::try_crossing()`, and `WorldTransport` scheduler methods.
3. Add minimal engine helpers or orchestration API needed for pose and movement integration.
4. Implement documented world-aware frame ordering.
5. Preserve standalone `EngineState.tick()` behavior.
6. Add integration tests for movement → crossing → scheduler ordering and failure preservation.

## Context

- Read: `docs/architecture/collision-bridge.md` — source of truth.
- Depends: task:79 (runtime-owned collision index).
- Key files: `packages/engine-core/src/lib.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_transport.rs`, `packages/engine-core/src/streaming_scheduler.rs`.
- Follow-up: task:81 (WASM/demo integration).
