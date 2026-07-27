---
feature: visibility
tags: [architecture, rendering, visibility, culling, world]
summary: Retro Mage separates renderer culling from gameplay awareness and uses global-world frustum, distance, depth, residency, and optional occlusion checks to limit draw work.
relates-to:
  - "[Rendering](./rendering.md)"
  - "[World Model](../features/world-model.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[World Streaming](./world-streaming.md)"
  - "[Level Transitions](../features/level-transitions.md)"
---

# Visibility

Visibility limits render work in one global 3D scene. It does not define indoor and outdoor coordinate modes, determine gameplay knowledge, or make darkness remove geometry from the world.

## Render Culling

The renderer considers:

- resident level instances
- transformed world bounds
- camera frustum
- maximum draw distance
- object-level bounds
- depth testing
- optional occlusion optimizations

A target level instance can be resident and rendered before the player crosses its link. Culling cannot hide geometry that the strong transition contract requires to be visible through an open connection.

## Lighting Separation

Ambient and dynamic light affect surface appearance. Low light can motivate an application-specific gameplay awareness radius or an optional render optimization, but light-driven disappearance is not mandatory visibility behavior. Emissive surfaces, sky openings, silhouettes, and authored exceptions remain renderable.

## Occlusion

Opaque geometry uses GPU depth testing for correctness. Room, portal, or coarse occlusion culling can reduce submissions, especially in bounded dungeon content. Such culling is an optimization layered over the global scene; it does not create a second world model.

## Gameplay Awareness

Gameplay field-of-view, enemy awareness, interaction range, and fog-of-war are separate systems. They can use tile or portal algorithms where useful without constraining renderer visibility.

## Multi-Floor Spaces

Global Y coordinates and resident level transforms allow geometry to span floors, balconies, stairwells, and vertical openings. Multi-floor gameplay visibility and advanced occlusion remain separate implementation slices.

## Update Frequency

Culling updates as camera, transforms, residency, or relevant object bounds change. The renderer can recompute cheap camera and distance tests every frame and cache static instance bounds. No tile-boundary trigger is required.

## Related Docs

- [Rendering](./rendering.md) — global scene and depth behavior
- [World Model](../features/world-model.md) — transformed instances
- [World Runtime](./world-runtime.md) — residency states
- [World Streaming](./world-streaming.md) — preload and eviction
- [Level Transitions](../features/level-transitions.md) — visible target content
