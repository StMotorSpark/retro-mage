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

# Harden Provider Lifecycle

Implement scheduler-driven provider request handling with pull-based application execution, explicit cancellation, terminal request cleanup, retry identity, and stale-result safety.

## Desired Changes

- Expose queued and active provider request records from the scheduler through a browser-safe pull/drain boundary.
- Keep one current request per instance; replacing a request invalidates the previous request.
- Remove ready, failed, and cancelled requests from active coordination while retaining terminal diagnostics.
- Expose cancellation records so application providers can abort timers, fetches, workers, or generators using request identity.
- Add explicit retry that creates a new request ID and preserves application-selected metadata.
- Route demo provider execution through scheduler-emitted requests instead of direct application `begin_load` calls.
- Preserve runtime ownership of lifecycle, validation, transformed content, collision, render residency, and simulation state.

## Definition of Done

- [ ] Scheduler queue exposes enough request data for an application provider to resolve work without reading Rust internals.
- [ ] One active request per instance is enforced and replacement makes the old request stale.
- [ ] `Ready`, `Failed`, and `Cancelled` outcomes remove active request state; late results are stale.
- [ ] Pending results keep matching requests active and accept a later matching terminal result.
- [ ] Scheduler cancellation exposes request identity and reason to the application; provider abort remains application-owned.
- [ ] Explicit retry creates a new request ID and does not retry in a tight loop.
- [ ] Definition ID/version validation and resolved-definition validation remain enforced.
- [ ] Failed or cancelled target loading leaves current source content, collision, and gameplay unchanged.
- [ ] Demo/browser proof consumes scheduler requests and covers delayed success, failure, cancellation, stale completion, and retry.
- [ ] Rust, package, typecheck/build, and serial Playwright tests pass.
- [ ] Diagnostics expose request status, priority/reason, cancellation/failure reason, retry identity, and terminal completion.

## Out of Scope

- Eviction/reload state restoration; task:89 owns that slice.
- Persistence serialization or actor transfer.
- Byte budgets, GPU resource accounting, or browser memory-pressure signals.
- Provider file formats, network protocols, worker APIs, or generator schemas.
- Topology mutation, crossing-policy changes, or new gameplay simulation.
- Parallel Playwright worker hardening.

## Implementation Steps

1. Read `docs/architecture/provider-lifecycle.md`, `docs/architecture/streaming-scheduler.md`, `docs/architecture/world-runtime.md`, and existing provider/scheduler task outcomes.
2. Trace `LevelProviderCoordinator`, `StreamingScheduler`, `WorldRuntime`, `WorldTransport`, and the demo provider path. Identify the browser-facing request/result types and current direct-load calls.
3. Add the smallest pull/drain API that exposes request ID, instance/definition identity, metadata, priority, and scheduling reason without moving lifecycle ownership into TypeScript.
4. Harden coordinator terminal transitions. Ensure failed and cancelled requests cannot accept later results, while replacement requests invalidate older identities.
5. Add scheduler cancellation records and explicit retry entry points. Preserve stable queue ordering and concurrency limits.
6. Migrate demo provider orchestration to consume scheduler-emitted requests. Keep provider execution application-owned and route every result through `WorldRuntime.accept`/transport acceptance.
7. Extend Rust, TypeScript, integration, and browser diagnostics/tests for pending, ready, failed, cancelled, stale, replacement, and retry paths.
8. Run Rust/package tests, regenerate WASM artifacts if required by the repo, run typecheck/build, then execute the documented serial Playwright proof.
9. Record implementation decisions and any provider boundary limitations in the task outcome.

## Context

- Read: `docs/architecture/provider-lifecycle.md` — source of truth for request ownership and lifecycle.
- Read: `docs/architecture/streaming-scheduler.md` — intent, queue, concurrency, and diagnostics.
- Read: `docs/architecture/world-runtime.md` — authoritative runtime/provider boundary.
- Related: task:70 — initial async provider proof.
- Related: task:76 — bounded provider scheduler.
- Related: task:78 — browser scheduler integration.
- Related: task:89 — consumes terminal provider lifecycle for eviction/reload.
- Key files: `packages/engine-core/src/level_provider.rs`, `packages/engine-core/src/streaming_scheduler.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_transport.rs`, `examples/demo/src/main.ts`, `examples/demo/tests/browser-seamless.spec.ts`.
