---
task: "84"
slug: scene-capacity-contract
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: "Added missing instance capacity to TypeScript render scene to mirror the Rust contract, exposed values, updated defaults, and removed stale max capacity docstrings from typed arrays."
---

# Establish Scene Capacity Contract

Align Rust/WASM and TypeScript scene capacity configuration around one application-configured fixed-buffer contract.

## Desired Changes

- Define one shared capacity contract for tiles, actors, lights, and instances.
- Keep engine defaults aligned across `WorldTransport`, render adapters, comments, and tests.
- Keep capacity fixed for a transport lifetime and configurable at construction.
- Expose capacity values through the browser-facing transport and render-facing types where needed.
- Preserve zero-capacity support for boundary tests.
- Keep Rust `WorldTransport` as production capacity authority; retain TypeScript submission only as adapter/test support.
- Remove stale capacity documentation that conflicts with the global scene contract.

## Definition of Done

- [x] `WorldTransport::with_capacity` configures all four categories and rejects invalid capacity values according to the contract.
- [x] Engine defaults are documented and consistent across Rust, TypeScript, and tests.
- [x] Capacity values are observable through the browser-facing API or equivalent typed view.
- [x] No runtime path silently reallocates or changes capacity during a frame.
- [x] TypeScript adapter validates and reports capacity using equivalent category names and semantics.
- [x] Unit tests cover defaults, custom capacities, zero capacities, invalid values, and capacity observability.
- [x] `cargo test` and relevant package tests pass.

## Out of Scope

- Atomic overflow publication.
- Crossing behavior when a target overflows.
- Polygon capacity or polygon transport.
- Dynamic resizing, chunked submission, or GPU primitive budgeting.
- Browser overflow proof scene.

## Implementation Steps

1. Read `docs/architecture/scene-capacity.md`, `docs/architecture/wasm-bridge.md`, and existing `WorldTransport` and scene adapter code.
2. Identify every capacity/default declaration and stale comment across `packages/engine-core` and `packages/render`.
3. Implement the agreed construction-time capacity surface without adding per-frame allocation or implicit resizing.
4. Align TypeScript adapter types and validation with Rust category names and defaults.
5. Add boundary tests for configuration and observability.
6. Run Rust and render package tests; record any remaining integration gap for task 85.

## Context

- Read: `docs/architecture/scene-capacity.md` — source of truth.
- Read: `docs/architecture/wasm-bridge.md` — bridge ownership rules.
- Related: task:85 — atomic scene publication consumes this capacity contract.
- Key files: `packages/engine-core/src/world_transport.rs`, `packages/render/src/world-state/scene.ts`, `packages/render/src/world-state/types.ts`.
