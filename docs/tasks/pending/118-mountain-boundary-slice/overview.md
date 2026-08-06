---
task: "118"
slug: mountain-boundary-slice
status: pending
depends-on: ["113"]
blocked-by: ""
assigned-to: ""
created: 2026-08-06
outcome: ""
---

# Add Supplied Mountain Route Boundary

Wire supplied mountain texture into authored outdoor boundary geometry and production collision proof.

## Desired Changes

- Register `demo.outdoor.mountain` from `examples/demo/assets/outdoor/textures/mountain.rock.png` in the demo asset resolver and `mat_mountain_rock` material descriptor.
- Add authored mountain render geometry and collision boundary around the outdoor route without changing dungeon, stream crossing, or castle route coordinates.
- Prove supplied mountain material resolves without fallback and terrain boundary blocks production touch movement.

## Definition of Done

- [ ] Mountain asset key, resolver path, and material descriptor match `examples/demo/assets/README.md`.
- [ ] Mountain geometry is visible from the outdoor route and remains in global coordinates with castle sightlines intact.
- [ ] Collision blocks travel beyond authored outdoor boundary while road, cobblestone, and castle entry remain playable.
- [ ] Focused serial browser proof uses production input zones and asserts zero material diagnostics.
- [ ] Existing streaming, persistence, overflow, cancellation, vertical movement, build, typecheck, and browser proofs pass.

## Out of Scope

- New art, generated textures, terrain generation, weather, and renderer optimization.
- Changing level-instance, material, or collision contracts.

## Implementation Steps

1. Read `docs/features/demo-experience.md`, `docs/architecture/material-contract.md`, and `docs/architecture/collision.md`.
2. Inspect `examples/demo/assets/README.md`, `examples/demo/src/main.ts`, and `examples/demo/src/demo-world.ts`; use only supplied mountain source.
3. Add the material/resolver binding and authored boundary content through existing world transport APIs.
4. Add a focused browser proof using `.retro-input-move-zone`; assert material ID/key, collision outcome, global continuity, diagnostics, and frame health.
5. Run serial focused and required regression commands; remove generated browser artifacts.

## Context

- Read: `docs/features/demo-experience.md` — mountain terrain is outdoor route boundary.
- Read: `docs/architecture/material-contract.md` — app owns asset keys and descriptors.
- Read: `docs/architecture/collision.md` — active transformed collision owns movement truth.
- Related: task:113 — verified supplied mountain source is unresolved in route material/geometry wiring.
- Key files: `examples/demo/assets/README.md`, `examples/demo/src/main.ts`, `examples/demo/src/demo-world.ts`, `examples/demo/tests/`.
