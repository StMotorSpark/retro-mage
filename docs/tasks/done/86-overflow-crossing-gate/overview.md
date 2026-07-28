---
task: "86"
slug: overflow-crossing-gate
status: done
depends-on: ["85"]
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: "Implemented crossing rejection on scene overflow with block_on_overflow toggle and diagnostics."
---

# Gate Crossing on Render Overflow

Prevent default traversal into a target instance that cannot be atomically published into the global render scene, while preserving source playability.

## Desired Changes

- Feed target scene-publication overflow into the crossing readiness decision.
- Block crossing into an overflowing target by default.
- Keep source pose, source collision, source lifecycle, and source gameplay intact on rejection.
- Preserve retry behavior when capacity or relevant scene content becomes valid.
- Keep overflow policy configurable for applications that provide an explicit fallback experience.
- Keep render overflow distinct from collision truth and provider failure.
- Expose rejection reason through runtime/transport diagnostics.

## Definition of Done

- [x] A target that overflows scene capacity cannot become the active instance under default policy.
- [x] Source remains playable and unchanged after the rejected crossing.
- [x] A later successful publication permits crossing without manual state reconstruction.
- [x] Configured fallback policy can allow application-owned handling without changing core lifecycle ownership.
- [x] Provider failure, target-not-ready, and scene-overflow reasons remain distinguishable.
- [x] Unit tests cover default rejection, source preservation, retry, and policy configuration.
- [x] Existing successful seamless crossing tests remain green.

## Out of Scope

- Capacity configuration (task 84).
- Atomic scene publication (task 85).
- Browser proof and diagnostics overlay (task 87).
- New fallback UI or content-loading UX.
- Collision policy changes unrelated to crossing readiness.

## Implementation Steps

1. Read `docs/architecture/scene-capacity.md`, `docs/architecture/crossing-policy.md`, and `docs/architecture/collision-bridge.md`.
2. Locate the runtime crossing readiness gate and transport publication ordering.
3. Add an explicit render-publication readiness/overflow reason without moving crossing authority into TypeScript.
4. Apply default blocking and application-configurable fallback policy.
5. Verify rejected crossing leaves source state untouched and successful retry uses current runtime state.
6. Add Rust/WASM integration tests alongside existing seamless traversal tests.

## Context

- Read: `docs/architecture/scene-capacity.md` — source of truth.
- Related: task:85 — provides atomic overflow diagnostics.
- Related: task:87 — proves behavior in browser.
- Key files: `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_transport.rs`, `packages/engine-core/tests/seamless_demo.rs`, `examples/demo/src/main.ts`.
