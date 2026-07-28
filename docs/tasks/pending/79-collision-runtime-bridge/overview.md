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

# Implement Runtime-Owned Collision Index

Move collision participation updates behind runtime lifecycle ownership without changing world tick orchestration.

## Desired Changes

- Add runtime-owned mutable collision index maintenance.
- Update affected collision entries on resident content, activation, transform, failure, cancellation, deactivation, and eviction changes.
- Preserve active-instance gating and transformed global-solid behavior.
- Keep explicit snapshot APIs only as compatibility/test adapters.

## Definition of Done

- [ ] Lifecycle changes update collision participation without caller invoking `sync_collision()`.
- [ ] Resident inactive content does not block movement.
- [ ] Activation and eviction update collision correctly.
- [ ] Transform changes update only affected collision content.
- [ ] Failed and cancelled loads contribute no collision.
- [ ] Existing movement behavior passes Rust collision tests.
- [ ] No world-aware tick or browser API migration is included.

## Out of Scope

- World-aware tick orchestration.
- Crossing and scheduler integration.
- WASM/demo caller migration.
- Full multi-floor movement physics.
- New collision primitives.
- Renderer capacity, persistence, and legacy API removal.

## Implementation Steps

1. Read `docs/architecture/collision-bridge.md`, `docs/architecture/collision.md`, and `docs/architecture/world-runtime.md`.
2. Trace `ResidencyStore`, `WorldRuntime`, `GlobalCollisionWorld`, and current `sync_collision()` behavior.
3. Introduce runtime-owned collision index maintenance at lifecycle mutation boundaries.
4. Preserve transformed global coordinates and per-instance activation flags.
5. Add focused unit/integration tests for lifecycle updates and stale collision prevention.
6. Record implementation outcome and any API constraints for task 80.

## Context

- Read: `docs/architecture/collision-bridge.md` — source-of-truth design.
- Read: `docs/architecture/collision.md` — collision ownership and movement model.
- Key files: `packages/engine-core/src/global_collision.rs`, `packages/engine-core/src/residency.rs`, `packages/engine-core/src/world_runtime.rs`.
- Follow-up: task:80 (world-aware engine tick).
