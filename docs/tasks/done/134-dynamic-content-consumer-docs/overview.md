---
task: "134"
slug: dynamic-content-consumer-docs
status: done
depends-on: ["132", "133"]
blocked-by: ""
assigned-to: ""
created: 2026-08-25
outcome: "Updated consumer integration contract, quickstart, and troubleshooting with the complete supported dynamic-content transport surface, stable result/diagnostic handling, and game-owned door save/restore flow. Chose WorldTransport.tick_engine(...) as the sole commit path and explicitly prohibits manual render/collision workarounds; pnpm --filter demo typecheck and documentation link validation pass."
---

# Publish Dynamic-Content Consumer Guidance

Document the supported consumer surface, ownership, lifecycle ordering, restore use, and diagnostics after the transport and proof are complete.

## Desired Changes

- Reconcile consumer guides and integration references with the implemented public API names and result codes.
- Include a concise door-style generic dynamic-content example.
- Document stable identity, world-frame ordering, lifecycle validity, persistence/restore behavior, and failure diagnostics.

## Definition of Done

- [x] Consumer documentation names only implemented supported public APIs.
- [x] Guidance makes game and engine ownership explicit and forbids manual render/collision synchronization.
- [x] The example opens a per-instance slot and restores game-owned selected state without reloading or teleporting.
- [x] Diagnostics and invalid lifecycle behavior are documented with actionable remediation.
- [x] Documentation links and `docs/_map.md` remain complete and present-tense.

## Out of Scope

- New engine behavior or test fixtures.
- Avendal-specific save schemas, interaction mechanics, UI, or assets.
- Demo source as a consumer dependency.

## Implementation Steps

1. Read the implemented public surface and task 132/133 outcomes against `docs/architecture/runtime-dynamic-content.md`.
2. Update consumer-facing docs with exact API/result/diagnostic names and a generic slot-variant example.
3. Confirm ownership and lifecycle wording remains aligned with world runtime, collision bridge, and persistence restore docs.
4. Run documentation-link and relevant package checks.

## Context

- Depends on: task:132 — implemented public API.
- Depends on: task:133 — verified lifecycle and restore proof.
- Read: `docs/architecture/runtime-dynamic-content.md`, `docs/consumer/integration-contract.md`, and `docs/consumer/quickstart.md`.
