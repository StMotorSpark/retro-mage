---
task: "133"
slug: dynamic-content-restore-proof
status: parked
depends-on: ["132"]
blocked-by: "task:132 dynamic-content transport contract repair"
assigned-to: ""
created: 2026-08-25
outcome: ""
---

# Prove Dynamic Content Across Restore and Links

Verify per-instance dynamic-content selections preserve lifecycle authority across linked residency, eviction, reload, and application restore.

## Desired Changes

- Add engine and browser-facing fixtures that exercise an authored closed/open dynamic slot.
- Restore application-owned selected state while resident-inactive before collision/gameplay activation.
- Exercise active and resident linked instances, eviction/reload, invalid lifecycle use, and source continuity.

## Definition of Done

- [ ] A closed variant blocks player passage and publishes its render contribution.
- [ ] An accepted open variant publishes its render contribution and removes its collision contribution together; player passage succeeds without manual synchronization.
- [ ] A resident linked target accepts a selection without activation and preserves normal crossing authority.
- [ ] Save/restore reapplies the selected variant before activation; eviction retains no transient override as persistence remains application-owned.
- [ ] Invalid lifecycle and stale/failed paths preserve the last valid scene, collision, source playability, and diagnostics.
- [ ] Serial browser and focused package proofs pass without generated debug artifacts.

## Out of Scope

- Production game save backends, door UI, keys, locks, sounds, or toggle policy.
- Demo-specific consumer integration as a public contract.
- New topology or crossing policies.

## Implementation Steps

1. Read `docs/architecture/runtime-dynamic-content.md` and `docs/architecture/persistence-restore.md`.
2. Build deterministic engine-owned fixtures around the public transport only; do not mutate collision or renderer state directly.
3. Exercise closed/open passage, active/resident linked instances, lifecycle rejection, eviction/reload, and restore ordering.
4. Assert exact render, collision, lifecycle, revision, and diagnostic states rather than only object existence or screenshots.
5. Run focused package checks and serial browser proof suites.

## Context

- Depends on: task:132 — public transport and atomic world-frame behavior.
- Read: `docs/architecture/collision-bridge.md`, `docs/architecture/persistence-restore.md`, and `docs/consumer/integration-contract.md`.
- Key files: `packages/engine-core/src/world_transport.rs`, `examples/demo/`, `packages/render/src/world-state/`.

## Parking Notes

Task 133 has a focused core restore/eviction proof and clears transient dynamic overrides on eviction. It remains blocked because task 132’s public command contract is not yet review-complete: override clearing does not remove its override entry, non-empty invalid commands report queued acceptance instead of immediate rejection, diagnostics omit actionable reason/lifecycle detail and can produce malformed JSON, and capacity behavior has not been reconciled with the atomic render/collision guarantee. Resume after task 132 has repaired and proven the public transport contract.
