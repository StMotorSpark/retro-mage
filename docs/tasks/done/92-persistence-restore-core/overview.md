---
task: "92"
slug: persistence-restore-core
status: done
depends-on: ["90"]
blocked-by: ""
assigned-to: "antigravity"
created: 2026-07-28
outcome: "Implemented acknowledge_handoff boundary, added HandoffStatus tracking, ensured Persistent policies delay content release until handoff acknowledged, and added tests covering pinning/eviction content retention."
---

# Implement Persistence Restore Core

Implement the engine-owned lifecycle boundary that restores application-owned instance state after base content reload while preserving identity, placement, and activation safety.

## Desired Changes

- Reconcile existing eviction/reload handoff behavior with `docs/architecture/persistence-restore.md`.
- Represent persistence policy behavior needed for runtime retention, including persistent-save acknowledgment before release.
- Preserve instance ID, topology identity, definition ID/version, transform, link placement, and persistence identity across eviction/reload.
- Add an explicit restore lifecycle separate from provider definition resolution.
- Keep base geometry render-resident while restore is pending, while suppressing stateful gameplay-dependent content as required by the runtime boundary.
- Gate collision and gameplay activation on successful restore when restored state affects simulation.
- Represent restore failure as render-available but inactive, with explicit retry support and diagnostics.
- Enforce stale/cancelled restore safety and idempotent restore behavior for the same instance, state handle, and state version.
- Expose diagnostics for handoff, restore status, state version, attempt count, and activation blocking reason.

## Definition of Done

- [x] Persistent instances cannot release transient content until application handoff acknowledgment succeeds.
- [x] Session, regenerate, and application-managed policies follow documented retention semantics.
- [x] Reload resolves base content through the existing provider request/validation path and uses a fresh request identity.
- [x] Restore is a separate lifecycle operation after validated base content acceptance.
- [x] Base render residency can exist while restore is pending without enabling gameplay activation.
- [x] Collision and gameplay activation occur only after successful restore when state affects simulation.
- [x] Missing, corrupt, incompatible, rejected, and thrown restore outcomes leave the instance render-available but inactive and retryable.
- [x] Repeating a restore for the same instance, handle, and state version is idempotent.
- [x] Stale and cancelled provider or restore completions cannot mutate lifecycle, collision, render, topology, or gameplay state.
- [x] Instance identity, transform, links, and definition identity/version remain stable across eviction/reload.
- [x] Diagnostics expose persistence policy, handoff status, restore status, state version, attempts, failure reason, and activation block reason without exposing payload contents.
- [x] Core Rust/package tests pass; no browser/demo proof changes are included.

## Out of Scope

- Application serialization formats, storage backends, encryption, cloud sync, or migration algorithms.
- Actor transfer between instances.
- Geometry or topology mutation during restore.
- Browser/demo fixture and Playwright coverage; task:93 owns it.
- Byte-accurate memory accounting, GPU budgets, browser pressure APIs, or new eviction heuristics.
- New provider transport mechanisms; existing provider lifecycle is consumed as-is.

## Implementation Steps

1. Read `docs/architecture/persistence-restore.md`, `docs/architecture/eviction-reload.md`, `docs/architecture/provider-lifecycle.md`, and task:90 outcome. Trace current handoff, residency, activation, collision-index, and reload paths.
2. Identify the existing persistence policy and opaque handoff surfaces. Extend them only where needed to represent acknowledgment, restore status, state version, retry identity, and activation gating.
3. Implement the restore boundary as application-owned state handling after provider definition validation. Keep payload interpretation outside engine-core and preserve authoritative transform/topology data in runtime.
4. Ensure lifecycle updates are atomic at frame boundaries: no partial collision or gameplay activation, no duplicate restore application, and no stale completion mutation.
5. Add focused Rust/integration tests for policy retention, handoff acknowledgment, restore ordering, idempotency, all failure classes, cancellation/staleness, identity preservation, and diagnostics.
6. Run relevant engine-core, render/package, typecheck, and build checks. Confirm no demo/browser files change.

## Context

- Read: `docs/architecture/persistence-restore.md` — source of truth for ownership and lifecycle.
- Read: `docs/architecture/eviction-reload.md` — eviction/reload authority.
- Read: `docs/architecture/provider-lifecycle.md` — request identity and stale-result rules.
- Read: `docs/architecture/collision-bridge.md` — collision and activation synchronization.
- Related: task:90 — completed eviction/reload core prerequisite.
- Related: task:93 — browser proof consumes this core.
- Key files: `packages/engine-core/src/residency.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_transport.rs`, `packages/engine-core/src/level_provider.rs`, `packages/engine-core/src/lib.rs`.
