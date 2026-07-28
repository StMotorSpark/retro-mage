---
task: "89"
slug: provider-browser-integration
status: done
depends-on: ["88"]
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: "Migrated demo provider orchestration to scheduler request polling. Verified delayed success, failure, cancellation, stale completion, and retry. Added browser tests for cancellation."
---

# Prove Provider Lifecycle in Browser

Connect demo application provider execution to scheduler-emitted requests and prove async success, failure, cancellation, stale completion, and retry through the browser boundary.

## Desired Changes

- Migrate demo provider orchestration from direct application `begin_load` calls to scheduler request polling/draining.
- Keep timers/Promises and abort handles application-owned.
- Route every provider result through runtime/transport acceptance.
- Expose deterministic demo configuration for delayed success, failure, cancellation, stale completion, and retry.
- Add browser diagnostics for request state, identity, terminal result, and source continuity.

## Definition of Done

- [ ] Demo consumes scheduler-emitted requests with no app-side lifecycle mutation bypass.
- [ ] Delayed success makes target resident and crossing-ready.
- [ ] Failure preserves source render/collision/gameplay state.
- [ ] Cancellation aborts app work when supported and late result is ignored.
- [ ] Replacement/retry uses new request identity; old result is stale.
- [ ] Playwright proof is deterministic and serial-safe.
- [ ] Demo typecheck/build and serial browser tests pass.

## Out of Scope

- Engine provider lifecycle changes; task:88 owns them.
- Eviction/reload; task:90 and task:91 own it.
- Real network/worker/provider formats, persistence, memory budgets, topology mutation, and parallel Playwright hardening.

## Implementation Steps

1. Read provider lifecycle design and task:88 outcome. Trace `WorldTransport` request APIs and demo provider code.
2. Add demo polling/draining of queued requests and application-owned async resolution.
3. Add deterministic query/test controls and diagnostics for all request outcomes.
4. Extend browser tests for pending, success, failure, cancel, stale, and retry paths.
5. Run demo build/typecheck and documented serial Playwright proof.

## Context

- Read: `docs/architecture/provider-lifecycle.md` — source of truth.
- Related: task:88 — engine boundary prerequisite.
- Related: task:91 — browser eviction proof may reuse provider fixtures.
- Key files: `packages/render/src/world-state/transport.ts`, `examples/demo/src/main.ts`, `examples/demo/src/demo-world.ts`, `examples/demo/tests/browser-seamless.spec.ts`.
