---
task: "89"
slug: eviction-reload-hardening
status: pending
depends-on: ["88"]
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: ""
---

# Harden Eviction and Reload

Implement protected deterministic level-instance eviction, application-owned persistence handoff, and safe reload through the hardened provider lifecycle.

## Desired Changes

- Prevent eviction of current, active, explicitly pinned, transition-critical, loading, or required instances.
- Reject direct `Active → Evictable`; require explicit gameplay/collision deactivation through runtime-owned lifecycle.
- Preserve topology identity, definition identity/version, transform, persistence policy, and link placement across eviction.
- Release transformed definition/content, render participation, and collision participation without mutating topology or moving the player.
- Expose an application persistence handoff with opaque state ownership; do not define an engine save format.
- Apply deterministic eligible-victim ordering using protection, retention eligibility, scheduler priority, global distance, relevance age, and stable instance ID.
- Reload evicted instances through the normal scheduler/provider request and validation path.
- Preserve spatial placement across reload and expose a separate application state-restoration boundary ahead of simulation activation.
- Keep failed, cancelled, and stale reloads from damaging current or retained source content.

## Definition of Done

- [ ] Current instance remains pinned and cannot become evictable through scheduler intent changes.
- [ ] Active instances reject direct eviction and protected transition endpoints remain retained.
- [ ] Explicit application pins and active provider requests prevent eviction until released/terminal.
- [ ] Eligible instances transition through observable `Evictable` state with a reason before release.
- [ ] Eviction removes render/collision/transformed content while preserving descriptor, topology, transform, and persistence identity.
- [ ] Persistence handoff exposes required identity/policy/reason data plus an opaque application state handle or payload reference without serializing it in engine code.
- [ ] Victim ordering is deterministic and covered by tests.
- [ ] Reload uses scheduler/provider request identity and definition validation; no alternate direct reload path exists.
- [ ] Spatial link transform remains stable across eviction/reload.
- [ ] Application state restoration is separate from definition resolution and occurs ahead of simulation activation when required.
- [ ] Failed, cancelled, and stale reload results preserve current and retained source content.
- [ ] Rust, package, typecheck/build, and serial browser lifecycle tests pass.

## Out of Scope

- Provider request queue, cancellation, terminal cleanup, or retry implementation; task:88 owns that boundary.
- Byte-accurate memory budgets, GPU texture accounting, or browser memory-pressure APIs.
- Persistence serialization formats, storage backends, actor transfer, inventory, or combat state.
- Infinite procedural regions, topology mutation, or new relevance/planner rules.
- Full multi-floor physics, gameplay simulation scheduling, or renderer culling.
- Parallel Playwright worker hardening.

## Implementation Steps

1. Read `docs/architecture/eviction-reload.md`, `docs/architecture/world-runtime.md`, `docs/architecture/world-streaming.md`, and the completed residency/scheduler task outcomes. Verify task:88 is done before claiming this task.
2. Trace `ResidencyStore`, `WorldRuntime`, `StreamingScheduler`, `LevelProviderCoordinator`, and browser transport state publication. Map existing pins, transition pairs, persistence handoff, eviction, and reload behavior.
3. Enforce lifecycle protection and explicit deactivation boundaries. Ensure scheduler intent cannot evict current/active/required/crossing-critical/loading content.
4. Add deterministic eviction eligibility/reason/victim diagnostics while preserving existing relevance and hysteresis semantics.
5. Define and expose the opaque application persistence handoff. Keep durable payload interpretation and storage outside engine/runtime ownership.
6. Ensure eviction clears transient definition/global/render/collision state while retaining topology identity and authoritative placement metadata.
7. Route reload through scheduler-emitted provider requests. Apply placement at load initiation, validate accepted definitions, and expose state restoration separately from optional activation.
8. Add Rust and integration tests for protection, deterministic ordering, release, transform preservation, successful reload, failed reload, cancellation, stale completion, and source safety.
9. Add deterministic browser proof for resident → evictable/evicted → reload → resident, including diagnostics and source continuity. Run package tests, typecheck/build, regenerated WASM as required, and serial Playwright tests.
10. Record persistence boundary and lifecycle decisions in the task outcome.

## Context

- Read: `docs/architecture/eviction-reload.md` — source of truth for protection, release, persistence, and reload.
- Read: `docs/architecture/provider-lifecycle.md` — prerequisite request/result semantics.
- Read: `docs/architecture/streaming-scheduler.md` — intent, retention, and candidate ordering.
- Read: `docs/architecture/world-runtime.md` — lifecycle and persistence ownership.
- Related: task:77 — initial retention/eviction implementation.
- Related: task:78 — initial browser scheduler integration.
- Related: task:88 — provider lifecycle hardening prerequisite.
- Key files: `packages/engine-core/src/residency.rs`, `packages/engine-core/src/streaming_scheduler.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_transport.rs`, `packages/engine-core/src/level_provider.rs`, `examples/demo/src/main.ts`, `examples/demo/tests/browser-seamless.spec.ts`.
