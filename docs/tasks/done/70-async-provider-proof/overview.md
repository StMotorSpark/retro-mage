---
task: "70"
slug: async-provider-proof
status: done
depends-on: ["69"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Demo now registers topology separately from content, starts explicit async provider loads, and commits ready/failed results through request IDs. Browser proof covers delayed success, failed target preservation, engine-gated forward/reverse traversal, and source collision activation; Rust, typecheck, build, and serial Playwright tests pass."
---

# Prove Async Level Provider Lifecycle

Exercise the existing provider request/result contract through a deterministic asynchronous demo provider, proving pending, ready, failed, cancellation, and stale-result behavior without adding a general streaming scheduler.

## Desired Changes

- Keep `WorldRuntime` authoritative for provider request identity, lifecycle, accepted definitions, and render/collision projections.
- Expose or complete browser transport operations for explicit `begin_load`, asynchronous `accept` of a matching provider result, and `cancel_load`.
- Change demo registration so topology and definition metadata are registered without making every instance synchronously resident.
- Add a deterministic `DemoLevelProvider` async path using a timer/Promise, with configurable delay and failure behavior.
- Explicitly preload the start instance and linked target from the demo application; do not implement runtime-emitted relevance requests or a general streaming scheduler.
- Keep target content non-resident/non-visible until provider completion is accepted.
- Preserve source playability and crossing denial when target resolution fails or remains pending.
- Add deterministic browser proof for pending-to-ready traversal, pending-to-failed source preservation, and stale/cancelled completion safety.
- Update `docs/research/known-gaps.md` to mark the synchronous-fixture gap resolved and describe any remaining explicit-preload boundary.

## Definition of Done

- [ ] Demo provider returns a pending result before its deterministic asynchronous completion.
- [ ] Successful completion is accepted only with the active request identity and makes target render-resident before crossing.
- [ ] Failed completion leaves source render/collision/gameplay state active and target unavailable.
- [ ] A cancelled or superseded request's late result cannot replace the current request or definition.
- [ ] Demo crossing remains engine-gated; no app-side coordinate threshold or direct active-instance mutation is added.
- [ ] Browser tests observe target loading/non-resident state before completion, successful forward/reverse traversal after completion, and source playability after failure.
- [ ] Rust and TypeScript tests cover request lifecycle/result identity and demo provider behavior.
- [ ] Existing Rust, package, and serial Playwright tests pass.
- [ ] Docs describe explicit app-triggered preload as the current boundary; no claim implies a general runtime streaming scheduler exists.

## Out of Scope

- Runtime-emitted preload/relevance requests or a general streaming scheduler.
- Network fetching, workers, real asset streaming, or production provider integration.
- Retry UI or user-facing loading screens.
- Memory budgets, eviction heuristics, or topology mutation.
- Parallel Playwright CI policy changes.
- Pixel-perfect visual regression or deployed-site validation.
- WebGPU, multi-floor physics, actor transfer, or new gameplay systems.

## Implementation Steps

1. Read `docs/architecture/world-runtime.md`, `docs/architecture/world-streaming.md`, `docs/features/level-transitions.md`, and `docs/research/known-gaps.md`. Trace `WorldRuntime`, `ResidencyStore`, `WorldTransport`, and current demo registration before editing.
2. Preserve the existing Rust provider contract: request IDs remain engine-assigned, `Pending` leaves the active request open, `accept` validates instance/request/content identity, and stale results are ignored. Add only browser-facing result encoding/API required to deliver resolved definitions or failures asynchronously.
3. Separate demo topology/definition metadata registration from instance loading. Ensure explicit load calls create active requests and do not synchronously resolve target content.
4. Implement deterministic demo provider orchestration. Use a controlled delay and query/test configuration for success or failure; retain an abort/cancel path so late completions can be intentionally tested.
5. Start explicit loads for dungeon and outdoor instances from the app. Send `Pending` immediately, then send `Ready` or `Failed` through transport when the provider Promise settles. Keep all lifecycle/state changes routed through `WorldRuntime`.
6. Update debug state so tests can distinguish loading, resident, failed, render residency, collision activity, and source playability without relying on timing-only guesses.
7. Add unit/integration coverage for pending, ready, failed, cancellation, superseded requests, and target readiness gating. Add/adjust serial Playwright tests with deterministic waits and existing page diagnostics.
8. Run package tests, Rust tests, build regenerated WASM/package artifacts as required by the repo, then run the documented serial browser proof.
9. Update `docs/research/known-gaps.md` and relevant task outcome notes to reflect that real pending-provider completion is proven while general runtime-driven preload remains deferred.

## Context

- Read: `docs/architecture/world-runtime.md` — provider and lifecycle source of truth.
- Read: `docs/architecture/world-streaming.md` — explicit preload and failure behavior.
- Read: `docs/features/level-transitions.md` — crossing readiness contract.
- Read: `docs/architecture/wasm-bridge.md` — browser transport boundary.
- Read: `docs/research/known-gaps.md` — gap being closed and remaining boundaries.
- Related: task:69 — legacy global-path boundary completed.
- Key files: `packages/engine-core/src/level_provider.rs`, `packages/engine-core/src/residency.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_transport.rs`, `examples/demo/src/demo-world.ts`, `examples/demo/src/main.ts`, `examples/demo/tests/browser-seamless.spec.ts`.
