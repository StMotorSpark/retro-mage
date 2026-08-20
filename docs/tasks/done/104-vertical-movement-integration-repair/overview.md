---
task: "104"
slug: vertical-movement-integration-repair
status: done
depends-on: ["100", "101"]
blocked-by: ""
assigned-to: ""
created: 2026-07-30
outcome: "Fixed vertical movement desynchronization at the global collision/world-aware tick boundary in `packages/engine-core/src/world_transport.rs` and `global_collision.rs`, and corrected synthetic touch movement handling. Added production movement browser coverage; engine and demo build/typecheck evidence recorded in commit 299dd5e."
---

# Repair Vertical Movement Integration

Trace and fix the engine/demo integration defects preventing player movement, support detection, and vertical pose updates from being observed through the production browser path.

## Desired Changes

- Identify why demo player movement remains at `(0, 0, 4)` under synthetic input.
- Ensure initial pose/support handling respects authored platform elevation.
- Ensure world-aware tick consumes movement input and vertical collision state through the runtime bridge.
- Preserve existing horizontal, crossing, streaming, persistence, and standalone movement behavior.
- Add focused regression tests at the failing producer/consumer boundary.

## Definition of Done

- [x] Root cause identified in task outcome with exact module/API boundary.
- [x] Demo movement changes X/Z under supported input path.
- [x] Initial/support pose uses valid authored elevation or explicit safe-arrival behavior.
- [x] Vertical state reaches browser diagnostics through production transport.
- [x] Focused engine/bridge/demo tests pass.
- [x] No temporary test specs, traces, result directories, or generated artifacts remain.

## Out of Scope

- New demo geometry beyond task:102.
- Browser proof suite assertions owned by task:103.
- New gameplay mechanics.

## Implementation Steps

1. Read task:102 blocker notes plus `vertical-movement.md`, `collision-bridge.md`, and existing demo input/debug code.
2. Reproduce with bounded engine tests and the supported Playwright/WebGL harness.
3. Fix the smallest integration defect; do not bypass runtime ownership or directly mutate test state.
4. Add regression coverage at the failing boundary.
5. Run relevant engine, bridge, demo build/typecheck, and browser smoke checks. Clean artifacts.

## Context

- Related: task:100, task:101, task:102.
- Read: `docs/architecture/vertical-movement.md`.
- Key files: `packages/engine-core/src/global_collision.rs`, `packages/engine-core/src/world_transport.rs`, `examples/demo/src/main.ts`, `examples/demo/src/demo-world.ts`, `examples/demo/tests/`.
