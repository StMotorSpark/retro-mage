---
task: "79"
slug: collision-runtime-bridge
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: ""
---

# Implement Runtime-Owned Collision Bridge

Connect `WorldRuntime` collision authority to `EngineState` through one world-aware tick driven by `WorldTransport`.

## Desired Changes

- Add world-aware tick orchestration through `WorldTransport`.
- Keep `EngineState` as player pose and standalone movement owner.
- Replace caller-managed collision snapshot synchronization in normal world-aware flow.
- Maintain runtime-owned collision index updates across residency and transform lifecycle changes.
- Integrate movement, crossing, scheduler evaluation, provider completion, and render publication in documented frame order.
- Preserve standalone `EngineState.tick()` compatibility path.

## Definition of Done

- [ ] World-aware tick resolves movement against runtime-owned collision state.
- [ ] Lifecycle changes update collision participation without caller invoking `sync_collision()`.
- [ ] Crossing runs after movement and publishes explicit arrival pose when applicable.
- [ ] Scheduler runs after crossing using authoritative post-crossing pose.
- [ ] Render and collision observe the same transformed runtime content.
- [ ] Resident inactive content does not block movement; activation and eviction update collision correctly.
- [ ] Existing standalone engine movement remains functional.
- [ ] Rust unit tests and browser seamless proof cover integration behavior.
- [ ] Relevant architecture and gap docs remain consistent with implementation.

## Out of Scope

- Full multi-floor movement physics.
- New collision primitives beyond current transformed solid geometry.
- Renderer capacity changes.
- Persistence serialization.
- Removal of all legacy indoor/outdoor APIs.

## Implementation Steps

1. Read `docs/architecture/collision-bridge.md` and related collision, runtime, crossing, streaming, and WASM bridge docs.
2. Trace `EngineState.tick()`, `WorldRuntime`, `ResidencyStore`, `GlobalCollisionWorld`, and `WorldTransport` ownership and borrowing boundaries.
3. Move collision index maintenance behind runtime lifecycle operations while preserving active-instance gating.
4. Add world-aware tick API with documented ordering and minimal engine helpers for pose/input/movement integration.
5. Integrate crossing result and scheduler update without allowing mid-movement lifecycle mutation.
6. Remove normal-flow dependency on explicit collision snapshot sync while retaining compatibility/test adapters where required.
7. Add unit, integration, and browser tests for lifecycle collision updates, movement/crossing ordering, failure preservation, and standalone compatibility.
8. Update docs and task outcome after verification.

## Context

- Read: `docs/architecture/collision-bridge.md` — source-of-truth design.
- Read: `docs/architecture/collision.md` — collision ownership and movement model.
- Read: `docs/architecture/world-runtime.md` — lifecycle and crossing authority.
- Read: `docs/architecture/streaming-scheduler.md` — scheduler frame boundary.
- Read: `docs/architecture/wasm-bridge.md` — Rust/WASM boundary rules.
- Key files: `packages/engine-core/src/lib.rs`, `packages/engine-core/src/global_collision.rs`, `packages/engine-core/src/residency.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_transport.rs`.
