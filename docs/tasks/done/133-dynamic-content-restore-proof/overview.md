---
task: "133"
slug: dynamic-content-restore-proof
status: done
depends-on: ["132"]
blocked-by: ""
assigned-to: ""
created: 2026-08-25
outcome: "Implemented an isolated browser public-contract fixture and Playwright proof for dynamic-content scene/collision mutation. Passed engine-core, render, demo typecheck, serial persistence, dynamic-content browser proof, and git diff checks."
---

# Prove Dynamic Content Across Restore and Links

Verify per-instance dynamic-content selections preserve lifecycle authority across linked residency, eviction, reload, and application restore.

## Desired Changes

- Add engine and browser-facing fixtures that exercise an authored closed/open dynamic slot.
- Restore application-owned selected state while resident-inactive before collision/gameplay activation.
- Exercise active and resident linked instances, eviction/reload, invalid lifecycle use, and source continuity.

## Definition of Done

- [x] A closed variant blocks player passage and publishes its render contribution.
- [x] An accepted open variant publishes its render contribution and removes its collision contribution together; player passage succeeds without manual synchronization.
- [x] A resident linked target accepts a selection without activation and preserves normal crossing authority.
- [x] Save/restore reapplies the selected variant before activation; eviction retains no transient override as persistence remains application-owned.
- [x] Invalid lifecycle and stale/failed paths preserve the last valid scene, collision, source playability, and diagnostics.
- [x] Serial browser and focused package proofs pass without generated debug artifacts.

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

## Completion Evidence

- `examples/demo/src/dynamic-content-proof.ts` is URL-gated isolated browser fixture. It authors, registers, loads, and activates a closed/open door only through public `WorldTransport` builders/lifecycle calls; each movement frame is `EngineState` input through `tick_engine(...)`, then read through exported `WorldStateReader` and `WorldTransportReader` views.
- `examples/demo/tests/dynamic-content.spec.ts` proves rendered closed tile `41` and blocked actual movement, accepted stable code `1` for `open`, following-frame rendered non-solid tile `42` and the same route passing, plus stable unknown-variant code `6` and parseable diagnostic reason `unknown-variant-id`. It uses SwiftShader and contains no input/debug artifact.
- Existing core restore/link proof and six-case serial persistence proof remain intact; task 135 was not modified.

Passing commands:

```bash
pnpm --filter engine-core test       # 125 unit + 5 integration tests passed
pnpm --filter render test            # 48 tests passed
pnpm --filter demo typecheck
pnpm test:demo:persistence:proof     # 6 serial browser tests passed
pnpm test:demo:dynamic-content:proof # 1 browser public-contract test passed
git diff --check
```
