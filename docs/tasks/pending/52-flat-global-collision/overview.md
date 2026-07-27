---
task: "52"
slug: flat-global-collision
status: pending
depends-on: ["48", "49", "50"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Add Initial Global Collision

Implement the grounded XZ movement slice against collision-active transformed level geometry while preserving 3D-capable coordinates.

## Desired Changes

- Resolve facing-relative movement in global XZ space.
- Apply circle-vs-AABB solid collision with sliding.
- Activate target collision only when residency is ready.
- Preserve global player pose across spatial links.
- Keep vertical data available without implementing full multi-floor physics.

## Definition of Done

- [ ] Player moves and slides against transformed level geometry.
- [ ] Source and target collision do not require coordinate seam conversion.
- [ ] Crossing cannot enter a target lacking collision data.
- [ ] Tests cover rotated/translated instances and link crossing.
- [ ] Multi-floor-capable pose data remains intact.

## Out of Scope

- Stairs, ramps, gravity, elevators, or falling.
- Actor collision.
- Full physics.
- Gameplay interaction.

## Implementation Steps

1. Read collision, world-model, and level-transitions docs.
2. Integrate active instance collision geometry.
3. Keep movement math separate from loading and rendering.
4. Add deterministic collision and crossing tests.

## Context

- Read: `docs/architecture/collision.md`
- Read: `docs/features/level-transitions.md`
- Depends on: tasks 48, 49, and 50.
