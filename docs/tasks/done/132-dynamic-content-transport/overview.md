---
task: "132"
slug: dynamic-content-transport
status: done
depends-on: ["131"]
blocked-by: ""
assigned-to: ""
created: 2026-08-25
outcome: "Repaired global-scene dynamic-capacity preflight, clear-operation rejection identity, and serde_json diagnostics. Added two-instance capacity, clear rejection, lifecycle, and escaped-identifier proofs; all required checks and git diff --check pass."
---

# Expose Atomic Dynamic-Content Transport

Expose authored slot construction, per-instance variant commands, result codes, and diagnostics through `WorldTransport` and its bindings.

## Desired Changes

- Add public transport operations equivalent to the dynamic-content contract.
- Commit accepted commands at the documented world-frame boundary.
- Publish render and collision changes from the same effective runtime revision.
- Preserve atomic scene-capacity semantics and expose diagnostics for rejected commands.

## Definition of Done

- [x] Public transport APIs expose slot building, variant selection, override clearing, result codes, and diagnostics without private-state access.
- [x] A command accepted before `tick_engine` updates render publication and collision consistently in that world frame.
- [x] Movement never resolves against a partially changed collision query and readers never observe partial scene content.
- [x] Invalid commands return stable submission-time rejection codes; global-scene capacity failures return `scene-capacity-overflow` at commit and retain the previous effective variant, render publication, collision contribution, and actionable JSON diagnostics.
- [x] Rust/WASM and TypeScript boundary tests cover the public contract and pointer/view safety where applicable.
- [x] Relevant engine-core, render, typecheck, and build checks pass.

## Out of Scope

- Authoring game interaction rules or save storage.
- Browser consumer proof and consumer-guide updates.
- Arbitrary runtime geometry input outside authored variants.

## Implementation Steps

1. Read `docs/architecture/runtime-dynamic-content.md`, `docs/architecture/wasm-bridge.md`, and `docs/architecture/scene-capacity.md`.
2. Consume task 131's validated core types; do not create a second mutation or collision authority.
3. Add the public `WorldTransport` command/build surface, stable result codes, and diagnostic accessors.
4. Integrate pending command commits with world-aware tick ordering, scene publication, collision-index replacement, and overflow behavior.
5. Add boundary tests demonstrating a closed solid contribution becomes an open non-solid contribution atomically.

## Context

- Depends on: task:131 — supplies the core slot and per-instance override model.
- Read: `docs/architecture/collision-bridge.md` — frame ordering.
- Key files: `packages/engine-core/src/world_transport.rs`, `packages/engine-core/src/lib.rs`, `packages/render/src/world-state/`.

## Review Notes

This task was reopened after review. Repair the public contract before completion:

- `clear_dynamic_content_override` removes the override entry rather than selecting and storing the default variant.
- Invalid instance/content/variant IDs and invalid lifecycle state return their stable rejection code at command submission; commit-time validation remains a safety backstop.
- JSON diagnostics safely escape public IDs and include rejection reason plus lifecycle state when applicable.
- Reconcile dynamic-mutation scene-capacity behavior with the atomic render/collision contract. Preflight the complete post-mutation global scene under ordinary submission ordering and reject an overflowing mutation while preserving the prior effective render and collision state.
- Add focused public transport tests for each repaired behavior and rerun engine-core, render, demo typecheck, and package build checks.
