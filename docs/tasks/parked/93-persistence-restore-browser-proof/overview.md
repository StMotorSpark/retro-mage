---
task: "93"
slug: persistence-restore-browser-proof
status: parked
depends-on: ["89", "91", "92"]
blocked-by: "task:95"
assigned-to: ""
created: 2026-07-28
outcome: "Superseded by tasks 94–97 after review found the engine restore lifecycle and browser bridge were not implemented."
---

# Prove Persistence Restore in Browser

Extend the demo/browser proof to exercise application-owned state handoff, reload, restore ordering, retry safety, and source continuity through the real world transport.

## Desired Changes

- Add a deterministic application persistence store using opaque state handles and versioned test state.
- Drive an instance through resident → evictable/evicted → provider reload → base render resident → restore pending → restored → active.
- Verify persistent-save acknowledgment controls release while the save is pending or fails.
- Verify base geometry can publish while stateful content remains inactive during restore.
- Verify restored actor/gameplay state survives eviction and reload without duplicate application.
- Exercise missing, corrupt, incompatible, rejected, and thrown restore outcomes.
- Exercise restore retry idempotency plus stale/cancelled provider and restore completions.
- Expose diagnostic hooks needed by Playwright without exposing opaque payload contents.
- Preserve existing seamless, PWA, overflow, provider, and eviction/reload proofs.

## Definition of Done

- [ ] Browser fixture reaches every persistence lifecycle state deterministically without timing races.
- [ ] Persistent handoff acknowledgment gates release and failed handoff retains content.
- [ ] Reload uses scheduler/provider request identity and preserves topology, transform, and placement.
- [ ] Base render publication is observable while restore remains pending.
- [ ] Collision/gameplay activation occurs only after successful restore.
- [ ] Restored state is applied exactly once and retry is idempotent.
- [ ] Missing, corrupt, incompatible, rejected, and thrown restore outcomes remain inactive and retryable.
- [ ] Stale/cancelled results cannot damage source content or revive released content.
- [ ] Diagnostics expose lifecycle status, attempt/version/failure metadata, and activation blocking reason without state payload leakage.
- [ ] Serial Playwright tests pass alongside existing seamless, PWA, overflow, provider, and eviction/reload proofs.

## Out of Scope

- Engine lifecycle implementation; task:92 owns it.
- Application production persistence format, durable storage backend, encryption, migration, or cloud synchronization.
- Actor transfer between instances.
- Geometry/topology mutation during restore.
- Parallel Playwright worker hardening.
- New renderer features or visual polish unrelated to lifecycle proof.

## Implementation Steps

1. Read `docs/architecture/persistence-restore.md` and task:92 outcome. Trace existing demo provider, persistence handoff, diagnostics, debug hooks, and browser test fixtures from tasks:89 and :91.
2. Add deterministic test-store controls and a versioned opaque handle fixture. Provide controls for save acknowledgment, restore outcome, retry, cancellation, and stale completion injection.
3. Connect the fixture through the production browser/world-transport boundary rather than direct lifecycle mutation or test-only state replacement.
4. Add Playwright assertions for lifecycle ordering, render/collision/gameplay separation, state restoration exactly once, placement continuity, failure safety, and source playability.
5. Run demo build/typecheck and serial provider, eviction/reload, persistence, seamless, PWA, and overflow proofs. Remove generated artifacts from the commit.

## Context

- Read: `docs/architecture/persistence-restore.md` — source of truth for browser-observable behavior.
- Read: `docs/architecture/eviction-reload.md` — release/reload contract.
- Read: `docs/architecture/provider-lifecycle.md` — browser provider request boundary.
- Related: task:89 — completed provider browser integration.
- Related: task:91 — completed eviction/reload browser proof and fixtures.
- Related: task:92 — persistence/restore core prerequisite.
- Key files: `examples/demo/src/main.ts`, `examples/demo/src/demo-world.ts`, `examples/demo/tests/browser-seamless.spec.ts`, `packages/render/src/world-state/transport.ts`, `packages/render/src/world-state/types.ts`.

## Parking Notes

This task is superseded by tasks 94–97. The earlier attempt exposed handoff acknowledgment and added weak browser stubs, but engine restore APIs, bridge exports, and complete lifecycle assertions were missing. Task 95 supplies the required browser boundary; task 96 owns the replacement proof; task 97 owns cleanup and known-gap reconciliation.

