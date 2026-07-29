---
task: "96"
slug: persistence-browser-proof
status: parked
depends-on: ["89", "91", "95", "98"]
blocked-by: ""
assigned-to: "agent"
created: 2026-07-28
outcome: "Implemented basic harness but blocked on restore collision activation not enabling after successful restore. Parked for investigation."
---

# Prove Persistence Restore in Browser

Build deterministic demo and Playwright coverage for the complete application-state handoff, reload, restore, and activation lifecycle.

## Desired Changes

- Add a deterministic app-owned test store using opaque handles and versioned state.
- Drive resident → evictable → pending handoff → evicted → reload → restore pending → restored → active.
- Assert persistent handoff pending retains content and failed acknowledgment retains content.
- Assert successful acknowledgment releases render/collision content while preserving topology identity and placement.
- Assert valid restore enables activation and corrupt/missing/incompatible/rejected restore remains render-available but inactive.
- Assert restore is applied exactly once and retry is idempotent.
- Assert stale/cancelled provider and restore results cannot revive or damage content.
- Assert source remains playable across target handoff/reload/restore failures.
- Expose diagnostics needed by tests without exposing opaque payload contents.

## Definition of Done

- [ ] Tests assert exact lifecycle states and render/collision/simulation flags, not only instance existence.
- [ ] Pending, failed, and successful handoff behavior is each proven.
- [ ] Placement, topology identity, provider request identity, and source continuity are proven across reload.
- [ ] Restore success, pending, failure, retry, duplicate completion, stale completion, and cancellation are proven.
- [ ] Activation ordering is proven: restore success precedes collision/gameplay activation.
- [ ] Serial persistence, seamless, provider, eviction/reload, PWA, and overflow proofs pass.
- [ ] No test artifacts or weak placeholder assertions remain.
- [ ] Task uses production browser/world-transport APIs, not direct lifecycle mutation.

## Out of Scope

- Engine restore implementation; task:94 owns it.
- WASM/TypeScript bridge; task:95 owns it.
- Production persistence format/storage/encryption/migration/cloud sync.
- Actor transfer, geometry/topology mutation, parallel Playwright hardening, and visual polish.

## Implementation Steps

1. Read `docs/architecture/persistence-restore.md` and outcomes for tasks:94 and :95. Inspect existing demo provider, debug hooks, and completed provider/eviction browser fixtures.
2. Replace superseded task:93 stubs with a deterministic persistence store and explicit controls for ack, restore outcome, retry, stale, and cancellation.
3. Wire controls through production `WorldTransport` restore/handoff APIs. Keep application payload interpretation in the fixture.
4. Add strong Playwright assertions for every Definition of Done criterion, using bounded polling and serial execution.
5. Run focused persistence proof, then regression browser/package checks. Remove generated artifacts before commit.

## Context

- Read: `docs/architecture/persistence-restore.md` — source of truth.
- Read: `docs/architecture/provider-lifecycle.md` — provider request safety.
- Read: `docs/architecture/eviction-reload.md` — handoff/reload contract.
- Related: task:89 — provider browser boundary.
- Related: task:91 — eviction/reload browser fixture.
- Related: task:94 — restore core.
- Related: task:95 — restore bridge.
- Key files: `examples/demo/src/main.ts`, `examples/demo/tests/`, `packages/render/src/world-state/transport.ts`.

