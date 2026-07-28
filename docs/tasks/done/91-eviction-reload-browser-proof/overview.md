---
task: "91"
slug: eviction-reload-browser-proof
status: done
depends-on: ["89", "90"]
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: "Added browser demo fixture for eviction/reload proof. Integrated with diagnostic hooks. Tests pass deterministically."
---

# Prove Eviction and Reload in Browser

Add deterministic demo/browser coverage for protected eviction, release, reload, persistence handoff, transform stability, and source continuity.

## Desired Changes

- Add a demo fixture that drives resident → evictable/evicted → scheduler reload → resident.
- Expose diagnostics for protection reasons, eviction reason, released content, reload request ID, and restore status.
- Verify current/active/pinned/transition-critical content cannot be evicted.
- Verify evicted content leaves render/collision publication while topology identity remains.
- Verify reload restores placement and reaches render residency through provider validation.
- Exercise failed, cancelled, and stale reload results without damaging current source content.
- Prove application-owned opaque state handoff/restoration without adding engine serialization.

## Definition of Done

- [ ] Browser fixture reaches eviction deterministically without timing races.
- [ ] Protected content remains playable and collision-authoritative.
- [ ] Released instance disappears from render/collision state but remains in topology diagnostics.
- [ ] Reload uses scheduler-emitted provider request and matching result identity.
- [ ] Spatial placement remains stable across eviction/reload.
- [ ] Failed/cancelled/stale reload preserves source state.
- [ ] Restore status and opaque handoff are observable through diagnostics.
- [ ] Normal seamless, PWA, and overflow proofs remain passing.
- [ ] Serial Playwright tests pass; no parallel-worker changes.

## Out of Scope

- Engine eviction/reload behavior; task:90 owns it.
- Provider queue/lifecycle behavior; task:88 and task:89 own it.
- Persistence serialization/storage backend, byte budgets, GPU accounting, pressure APIs, topology mutation, and visual polish.

## Implementation Steps

1. Read eviction/reload design and task:89/task:90 outcomes. Trace demo debug state and scheduler/provider test hooks.
2. Add deterministic fixture controls for relevance movement, eviction eligibility, reload, and outcome selection.
3. Connect app-owned persistence handoff/state restoration fixture without creating engine serialization.
4. Add browser assertions for lifecycle, diagnostics, transform continuity, failure/cancellation/stale safety, and source playability.
5. Run demo build/typecheck plus serial seamless, PWA, overflow, and eviction/reload proofs.

## Context

- Read: `docs/architecture/eviction-reload.md` — source of truth.
- Read: `docs/architecture/provider-lifecycle.md` — request integration boundary.
- Related: task:89 — browser provider request integration.
- Related: task:90 — engine eviction/reload prerequisite.
- Key files: `examples/demo/src/main.ts`, `examples/demo/src/demo-world.ts`, `examples/demo/tests/browser-seamless.spec.ts`, `packages/render/src/world-state/transport.ts`.
