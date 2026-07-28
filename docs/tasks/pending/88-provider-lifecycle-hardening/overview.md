---
task: "88"
slug: provider-lifecycle-hardening
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: ""
---

# Harden Provider Lifecycle Core

Implement engine-owned provider request lifecycle with pull-queue records, terminal cleanup, cancellation identity, explicit retry, and stale-result safety.

## Desired Changes

- Enforce one current provider request per instance; replacement invalidates predecessor.
- Expose queued/active request records through a browser-safe transport-neutral API.
- Remove ready, failed, and cancelled requests from active coordination while retaining diagnostics.
- Preserve pending requests until matching terminal result.
- Expose cancellation records with request ID and reason; app-owned abort remains outside engine.
- Add explicit retry with a new request ID and selected metadata.
- Preserve runtime ownership of lifecycle, validation, transformed content, collision, render residency, and simulation.

## Definition of Done

- [ ] Queue records expose request ID, instance/definition identity, metadata, priority, and scheduling reason.
- [ ] One active request per instance and stale replacement behavior are tested.
- [ ] Ready/failed/cancelled outcomes clean active coordinator state.
- [ ] Pending keeps request active; late terminal result with matching identity succeeds.
- [ ] Cancellation and explicit retry APIs preserve scheduler concurrency/order rules.
- [ ] Definition identity/version and resolved-definition validation remain enforced.
- [ ] Failed/cancelled target load preserves current source state.
- [ ] Rust and package tests cover all request states, stale results, cancellation, and retry.
- [ ] Typecheck/build pass; regenerated WASM artifacts are updated when required.

## Out of Scope

- Demo/provider browser integration; task:89 owns it.
- Eviction/reload; task:90 and task:91 own it.
- Persistence serialization, provider file/network/worker formats, memory budgets, topology mutation, and gameplay changes.

## Implementation Steps

1. Read provider lifecycle, scheduler, runtime, and WASM bridge design docs. Trace `LevelProviderCoordinator`, `StreamingScheduler`, `WorldRuntime`, and `WorldTransport`.
2. Add request queue inspection/drain types without moving lifecycle authority into TypeScript.
3. Harden terminal coordinator transitions and stale identity checks.
4. Add cancellation records and explicit retry entry points.
5. Extend Rust/integration tests; run Rust/package tests and typecheck/build.
6. Record API and ownership decisions in task outcome.

## Context

- Read: `docs/architecture/provider-lifecycle.md` — source of truth.
- Read: `docs/architecture/streaming-scheduler.md` — queue/concurrency contract.
- Related: task:70, task:76 — existing provider/scheduler proofs.
- Related: task:89 — consumes browser-facing queue.
- Key files: `packages/engine-core/src/level_provider.rs`, `packages/engine-core/src/streaming_scheduler.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_transport.rs`.
