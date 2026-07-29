---
task: "94"
slug: restore-lifecycle-core
status: in-flight
depends-on: ["92"]
blocked-by: ""
assigned-to: "antigravity"
created: 2026-07-28
outcome: ""
---

# Implement Restore Lifecycle Core

Implement the engine-owned application-state restore state machine that follows validated base content and gates activation safely.

## Desired Changes

- Add explicit restore operations separate from provider definition resolution.
- Track restore status, state version, attempt count, failure reason, and activation block reason.
- Support `None → Pending → Restored` and retryable `Failed` outcomes.
- Keep validated base content render-resident while restore is pending or failed.
- Prevent collision/gameplay activation when restore-required state is pending or failed.
- Make restore completion idempotent for the same instance, opaque handle, and state version.
- Reject stale or cancelled restore completions without mutating runtime state.
- Preserve instance identity, definition identity/version, transform, topology, and persistence identity.
- Add focused Rust/integration tests for success, failure, retry, idempotency, stale completion, cancellation, and activation gating.

## Definition of Done

- [ ] Public runtime boundary starts restore after accepted base content and records attempt/version metadata.
- [ ] Successful restore reaches `Restored` and permits documented activation.
- [ ] Pending, missing, corrupt, incompatible, rejected, and thrown restore outcomes remain render-available but inactive.
- [ ] Restore retry is explicit and idempotent; duplicate completion cannot duplicate state application.
- [ ] Stale/cancelled restore completion cannot mutate lifecycle, render, collision, topology, or gameplay state.
- [ ] Activation rejects or remains blocked until restore succeeds when the instance requires restoration.
- [ ] Identity, transform, topology, and definition identity/version remain stable across restore.
- [ ] Diagnostics expose status, state version, attempts, failure reason, and activation block reason without payload contents.
- [ ] Core tests cover all listed transitions and pass.
- [ ] No browser/demo or TypeScript bridge changes are included.

## Out of Scope

- WASM/TypeScript bindings; task:95 owns the bridge.
- Browser/demo fixtures and Playwright tests; task:96 owns proof.
- Application serialization, storage, encryption, migration, actor transfer, geometry mutation, or cloud sync.
- New provider transport or eviction heuristics.

## Implementation Steps

1. Read `docs/architecture/persistence-restore.md`, `docs/architecture/eviction-reload.md`, `docs/architecture/collision-bridge.md`, and outcomes for tasks:90 and :92. Inspect current `LevelInstance`, `ResidencyManager`, `WorldRuntime`, and handoff APIs.
2. Define the smallest engine-facing restore operation and completion identity needed by the bridge task. Keep opaque payload interpretation outside engine-core.
3. Implement restore transitions and activation gates at runtime frame boundaries. Ensure base render state remains separate from collision/gameplay activation.
4. Add Rust tests for policy/state transitions, identity preservation, failures, retries, duplicate completion, stale/cancelled results, diagnostics, and source continuity.
5. Run engine-core tests and confirm only engine-core files/tests changed.

## Context

- Read: `docs/architecture/persistence-restore.md` — source of truth.
- Read: `docs/architecture/eviction-reload.md` — base reload and handoff contract.
- Read: `docs/architecture/collision-bridge.md` — activation/collision ownership.
- Related: task:92 — handoff/persistence core prerequisite.
- Related: task:95 — consumes the stable bridge boundary.
- Key files: `packages/engine-core/src/world.rs`, `packages/engine-core/src/residency.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_transport.rs`.
