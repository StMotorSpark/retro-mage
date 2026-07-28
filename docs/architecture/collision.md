---
feature: collision
tags: [architecture, collision, movement, engine-core, physics, levels]
summary: Retro Mage resolves player movement against active transformed level geometry while preserving a 3D-capable world and simple sliding movement for the initial ground-plane slice.
relates-to:
  - "[World Model](../features/world-model.md)"
  - "[Level Transitions](../features/level-transitions.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[Collision Bridge](./collision-bridge.md)"
  - "[Input Event Schema](./input-schema.md)"
  - "[Rendering](./rendering.md)"
  - "[Repo Structure](./repo-structure.md)"
---

# Collision

`engine-core` owns movement and collision truth. Collision operates on transformed global geometry belonging to collision-active level instances.

## Coordinate Capability

The world collision model is 3D-capable:

- `X` and `Z` describe horizontal movement
- `Y` describes elevation
- actors and player bodies have vertical extent
- level transforms place local collision geometry globally
- transitions can connect spaces at different elevations

The initial movement slice uses a grounded XZ plane with circle-vs-AABB tile collision and sliding. The data model does not restrict later stairs, ramps, drops, elevators, or multi-floor movement.

## Active Geometry

Render residency does not automatically make all geometry collision-active. The runtime activates collision for the current instance and any explicitly required transition overlap. Overlapping instances use explicit collision ownership or masks; collision never selects a level implicitly from coordinate proximity.

A target becomes collision-active only after its transformed collision data and safe arrival pose are ready. A failed target leaves source collision fully playable.

## Movement

Movement is facing-relative. At yaw zero, forward points toward negative Z and right points toward positive X. The initial grounded delta is resolved against active solid geometry with sliding rather than a dead stop.

The player pose remains in global coordinates across spatial transitions. Non-spatial links apply an explicit target transform and spawn offset.

## Multi-Floor Capability

The model supports vertical support surfaces, body height, gravity, stairs, ramps, openings, and head clearance. Full multi-floor movement, slope handling, and falling behavior are separate implementation slices from the initial flat movement proof.

## Related Docs

- [World Model](../features/world-model.md) — global coordinates and level instances
- [Level Transitions](../features/level-transitions.md) — crossing and overlap
- [World Runtime](./world-runtime.md) — collision activation lifecycle
- [Collision Bridge](./collision-bridge.md) — runtime-to-movement integration
- [Input Event Schema](./input-schema.md) — movement input
- [Rendering](./rendering.md) — global geometry representation
- [Repo Structure](./repo-structure.md) — engine ownership
