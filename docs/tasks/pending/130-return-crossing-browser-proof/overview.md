---
task: "130"
slug: return-crossing-browser-proof
status: pending
depends-on: ["129"]
blocked-by: ""
assigned-to: ""
created: 2026-08-20
outcome: ""
---

# Prove Return Crossing at Browser Consumer Boundary

Prove corrected spatial bidirectional traversal through public WASM transport APIs and publish concise consumer API guidance.

## Desired Changes

- Add or strengthen browser-facing regression coverage for one public `register_bidirectional_link(...)`, provider request completion with matching request/instance identities, and exactly one `WorldTransport.tick_engine(engine, dt)` per frame.
- Drive forward and return traversal through normalized production input/browser path; assert active instance, collision flags, pose continuity, and grounded support after each crossing.
- Document public API guidance adjacent to the browser-facing transport registration API or existing consumer integration guidance: target instance transforms for `Spatial` links are provisional, engine aligns anchors before residency, anchor volumes/direction/re-arm own crossing behavior, and callers must not add threshold/teleport/collision-sync workarounds.
- Keep guidance consistent with existing design docs; do not redefine topology contract.

## Definition of Done

- [ ] Browser/WASM proof uses only public package APIs and no demo-source imports in its consumer-shaped fixture.
- [ ] Proof asserts source → target and target → source active-instance transitions, destination collision activation, source collision deactivation, grounded support, clean overflow state, and continuous spatial pose behavior.
- [ ] Proof uses provider request ID plus instance ID for completion acceptance and one world-aware tick per frame.
- [ ] Test does not use game-owned coordinate crossing thresholds, direct camera teleportation, or manual collision synchronization.
- [ ] Consumer-facing guidance states spatial placement, directional crossing, anchor-volume, and re-arm responsibilities accurately.
- [ ] Relevant package tests/builds pass; exact commands/results recorded in task outcome.

## Out of Scope

- Changing core crossing semantics; task:129 owns that prerequisite.
- Editing Avendal or requiring any Avendal adaptation.
- Renderer/material visual changes, scheduler capacity tuning, or new public debugging/diagnostic APIs.
- Revising FaM design docs unless implementation reveals their target-state contract is incomplete or contradictory.

## Implementation Steps

1. Read task:129 outcome and verify its core regression passes before claiming this task.
2. Read `docs/architecture/collision-bridge.md`, `docs/features/level-transitions.md`, and `docs/architecture/crossing-policy.md`. Trace existing WASM/browser transport tests and public TypeScript package exports.
3. Add smallest deterministic browser fixture/proof at existing engine demo or package test boundary. It must model provider lifecycle through public transport APIs, not direct runtime mutation.
4. Use touch/normalized input equivalent to normal consumer movement. Verify both directions and collision lifecycle from public diagnostics/accessors.
5. Add concise public guidance where TypeScript/WASM consumers discover `WorldTransport`; link existing design docs if appropriate. Do not create game-specific topology rules.
6. Run focused browser proof plus affected package build/typecheck/test commands. Remove generated traces/screenshots/artifacts before completion.

## Context

- Depends on task:129 — core direction/re-arm behavior and engine regression.
- Read: `docs/architecture/collision-bridge.md` — canonical tick ownership.
- Read: `docs/features/level-transitions.md` — spatial link placement and activation contract.
- Read: `docs/architecture/crossing-policy.md` — direction, anchor volume, re-arm semantics.
- Key files: `packages/engine-core/src/world_transport.rs`, `packages/engine-core/tests/`, `examples/demo/tests/`, `examples/demo/src/`, package TypeScript declaration/export paths.
- Consumer proof context: Avendal production-touch repro. Preserve consumer working tree; no consumer changes belong here.
