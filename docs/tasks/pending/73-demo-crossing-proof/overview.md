---
task: "73"
slug: demo-crossing-proof
status: pending
depends-on: ["72"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Prove Doorway Crossing Timing

Configure the dungeon/outdoor demo link with the recommended crossing policy and prove visual-state changes occur at intentional doorway traversal rather than preload distance.

## Desired Changes

- Configure demo link crossing policy with zero padding, 0.5 world-unit re-arm distance, and directional crossing enabled.
- Keep explicit async target preload independent from crossing activation.
- Ensure active instance, skybox, ambient state, and collision state remain source-owned while the player approaches the doorway.
- Ensure target becomes visible/resident during approach without changing active gameplay instance.
- Verify forward crossing, reverse crossing, and failed target preload behavior through browser tests.
- Add debug state needed to distinguish target residency from active-instance selection and crossing readiness.

## Definition of Done

- [ ] Target render residency appears during approach while active instance remains dungeon.
- [ ] Active instance does not change in the pre-doorway approach region.
- [ ] Forward crossing changes active instance only after entering the narrow doorway volume while moving outward.
- [ ] Reverse crossing changes active instance only after deliberate return traversal.
- [ ] No immediate forward/reverse oscillation occurs at the shared boundary.
- [ ] Failure mode keeps source lighting, skybox, collision, and active instance intact.
- [ ] Browser proof passes repeatedly under CI serial worker policy.
- [ ] Demo docs/tests describe preload visibility and crossing activation as separate observations.

## Out of Scope

- General runtime-driven preload scheduling.
- Parallel Playwright execution.
- Pixel-perfect screenshot comparison.
- New level content or renderer lighting changes.
- Teleporters, stairs, or multi-floor movement.

## Implementation Steps

1. Read `docs/architecture/crossing-policy.md`, `docs/features/level-transitions.md`, and task:72 outcome.
2. Update demo topology registration to submit the crossing policy through the browser transport API.
3. Keep demo provider load timing deterministic and independent from crossing policy.
4. Extend debug snapshots with any policy/arming/readiness fields needed for unambiguous assertions.
5. Add browser assertions for pre-doorway active-instance stability, target visibility, forward/reverse traversal, failure preservation, and no immediate flip.
6. Run typecheck/build and repeated `CI=1` serial Playwright proof.

## Context

- Read: `docs/architecture/crossing-policy.md` — source of truth.
- Read: `docs/architecture/world-runtime.md` — runtime readiness and active state.
- Related: task:72 — engine policy implementation.
- Key files: `examples/demo/src/demo-world.ts`, `examples/demo/src/main.ts`, `examples/demo/tests/browser-seamless.spec.ts`, `packages/engine-core/src/world_transport.rs`.
