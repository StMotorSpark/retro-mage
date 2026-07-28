---
task: "83"
slug: remove-frame-collision-snapshot
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: "Replaced full collision clone per frame with direct collision_world_ref read. Extracted tick_world_aware on EngineState to bypass legacy collision checks without copying data. pnpm test passed."
---

# Remove Per-Frame Collision Snapshot

Make world-aware movement read runtime-owned collision state without cloning and installing a full collision snapshot each frame.

## Desired Changes

- Replace `WorldTransport::tick_engine()` per-frame `sync_collision()` call with a read-only runtime collision view path.
- Add an `EngineState` movement helper that resolves movement against a supplied `&GlobalCollisionWorld` without replacing owned collision state.
- Keep runtime lifecycle updates authoritative and incremental.
- Retain clone/snapshot APIs only as explicit compatibility or test adapters, not world-aware tick internals.

## Definition of Done

- [ ] `tick_engine()` performs no full collision-world clone or replacement.
- [ ] World-aware movement queries current runtime collision index directly for the frame.
- [ ] Lifecycle activation, transform, eviction, failure, and cancellation behavior remains correct.
- [ ] Standalone `EngineState.tick()` compatibility remains intact.
- [ ] Tests prove movement sees runtime collision changes without explicit synchronization.
- [ ] `pnpm test` passes.
- [ ] Browser seamless proof passes with one worker.
- [ ] Task 82 docs/outcome remain accurate after correction.

## Out of Scope

- New collision primitives.
- Multi-floor physics.
- Renderer capacity changes.
- Persistence or topology changes.

## Implementation Steps

1. Read `docs/architecture/collision-bridge.md` and inspect `EngineState.tick()`, `GlobalCollisionWorld`, `ResidencyStore`, `WorldRuntime`, and `WorldTransport`.
2. Expose the smallest Rust helper needed for movement against a borrowed collision view while preserving input/look/visibility behavior.
3. Update `WorldTransport::tick_engine()` to use runtime collision directly and remove normal-flow `sync_collision()` invocation.
4. Preserve standalone tick and explicit test adapters where needed.
5. Add focused regression tests for no-snapshot world-aware movement and lifecycle visibility.
6. Run package and browser verification; update task outcome and docs only if behavior differs from design.

## Context

- Read: `docs/architecture/collision-bridge.md` — source of truth.
- Key files: `packages/engine-core/src/lib.rs`, `packages/engine-core/src/world_transport.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/residency.rs`, `packages/engine-core/src/global_collision.rs`.
