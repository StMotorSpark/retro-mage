---
task: "101"
slug: vertical-movement-bridge
status: pending
depends-on: ["100"]
blocked-by: ""
assigned-to: ""
created: 2026-07-30
outcome: ""
---

# Expose Vertical Movement Through Runtime Bridge

Connect vertical movement state and support-surface content through the Rust/WASM and TypeScript world transport boundary.

## Desired Changes

- Export required vertical movement configuration, pose, grounded state, vertical velocity, and diagnostics through existing typed transport boundaries.
- Import/submit support-surface content through the production level-definition path.
- Preserve runtime-owned collision activation and immutable per-resolution collision queries.
- Keep browser consumers free of caller-managed collision snapshots.
- Add adapter/schema tests proving values map correctly without changing ownership semantics.

## Definition of Done

- [ ] Fresh generated WASM bindings expose all required vertical operations/fields.
- [ ] TypeScript transport types and readers map vertical state without lossy conversion.
- [ ] Support surfaces reach runtime collision through normal provider acceptance, not test-only mutation.
- [ ] Activation, eviction, failure, and stale provider completion retain correct vertical collision behavior.
- [ ] Bridge tests cover default config, custom config, grounded/falling state, and transformed support surfaces.
- [ ] Existing build, typecheck, and transport tests pass.

## Out of Scope

- Core solver algorithm (task:100).
- Demo geometry and browser movement scenario (tasks:102–103).
- New renderer features.

## Implementation Steps

1. Read task:100 outcome and identify exact exported fields/types.
2. Trace `WorldTransport`, generated `engine_core` bindings, render world-state transport, and demo provider ingestion.
3. Add only boundary APIs required by the design; preserve compatibility APIs and world-aware tick ownership.
4. Regenerate bindings through the repository build path and add mapping/diagnostic tests.
5. Verify stale/cancelled lifecycle paths cannot reactivate released vertical collision content.

## Context

- Read: `docs/architecture/vertical-movement.md`.
- Read: `docs/architecture/wasm-bridge.md`.
- Depends on: task:100.
- Key files: `packages/engine-core/src/world_transport.rs`, `packages/render/src/world-state/`, `examples/demo/src/demo-world.ts`.
