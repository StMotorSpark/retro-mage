---
task: "133"
slug: dynamic-content-restore-proof
status: parked
depends-on: ["132"]
blocked-by: "serial browser persistence proof fails: touch traversal stalls before pose.x > 20"
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

Task 132 remains complete and was not modified. A new focused core proof, `dynamic_content_opening_changes_scene_and_world_aware_player_passage`, verifies the public authored closed/open slot through `WorldTransport.tick_engine(...)`: closed scene tile `41` is solid and blocks the normal route; accepted `open` publishes tile `42` as non-solid and permits that same route without collision synchronization.

The completion gate is blocked by `pnpm test:demo:persistence:proof`, run after rebuilding WASM and clearing the demo Vite cache through that command. On 2026-08-25, two serial tests fail: `failed handoff retains content` and `pending handoff delays eviction but retains content`. Both time out after 10 seconds in synthetic-touch `strafe(page, 180, snapshot => snapshot.pose.x > 20)`. Exact final states are respectively pose `{x:16.130393981933594,y:0,z:4}` and `{x:16.1995906829834,y:0,z:4}`, active instance `outdoor-instance`, dungeon lifecycle `2` resident/inactive with collision inactive, outdoor lifecycle `3` collision active, no evictions, and no console/page diagnostics. The test helper now reports that exact state on a traversal timeout; it does not relax timing or assertions.

An `origin/main` comparison was attempted in a detached worktree using the same command and SwiftShader configuration. It could not produce a valid behavioral comparison because the worktree's linked demo dependencies resolved WASM to the primary worktree and Vite rejected it with HTTP 403 (`outside of Vite serving allow list`); all six browser tests then failed during WASM startup. Re-run origin/main in an independently installed worktree (without cross-worktree `node_modules` links), determine whether the `x≈16.2` route stall reproduces, and repair it as a regression only if it does not. Do not mark this task done until that comparison and the full serial proof pass.
