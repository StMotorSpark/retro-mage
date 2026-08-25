---
task: "132"
slug: dynamic-content-transport
status: pending
depends-on: ["131"]
blocked-by: ""
assigned-to: ""
created: 2026-08-25
outcome: ""
---

# Expose Atomic Dynamic-Content Transport

Expose authored slot construction, per-instance variant commands, result codes, and diagnostics through `WorldTransport` and its bindings.

## Desired Changes

- Add public transport operations equivalent to the dynamic-content contract.
- Commit accepted commands at the documented world-frame boundary.
- Publish render and collision changes from the same effective runtime revision.
- Preserve atomic scene-capacity semantics and expose diagnostics for rejected commands.

## Definition of Done

- [ ] Public transport APIs expose slot building, variant selection, override clearing, result codes, and diagnostics without private-state access.
- [ ] A command accepted before `tick_engine` updates render publication and collision consistently in that world frame.
- [ ] Movement never resolves against a partially changed collision query and readers never observe partial scene content.
- [ ] Invalid commands and capacity failures retain the previous effective variant and actionable diagnostics.
- [ ] Rust/WASM and TypeScript boundary tests cover the public contract and pointer/view safety where applicable.
- [ ] Relevant engine-core, render, typecheck, and build checks pass.

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
