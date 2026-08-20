---
feature: demo-slices
tags: [features, demo, planning, rendering, playtesting]
summary: The Retro Mage showcase demo advances through bounded playable slices that expose engine gaps while preserving alignment with the target experience.
relates-to:
  - "[Demo Experience](./demo-experience.md)"
  - "[Demo Scope](./demo-scope.md)"
  - "[Material Contract](../architecture/material-contract.md)"
  - "[Rendering](../architecture/rendering.md)"
  - "[World Streaming](../architecture/world-streaming.md)"
  - "[Vertical Movement](../architecture/vertical-movement.md)"
  - "[Test-Driven Development](../principles/test-driven-development.md)"
---

# Demo Slices

The showcase demo advances through bounded playable slices. Each slice adds one coherent portion of the target route, uses supplied content assets, and exposes engine or renderer gaps through playtesting. Existing deterministic runtime fixtures remain separate from showcase content.

## Slice Rules

Each slice has:

- a playable route and clear player goal
- required content assets
- engine capabilities exercised
- acceptance checks
- explicit non-scope
- recorded gaps discovered during playtesting

A slice remains independently buildable and testable. Runtime architecture does not change implicitly to accommodate demo content. A missing contract becomes a documented design or implementation gap before code relies on it.

## Slice 1: Dungeon Visual Slice

The player starts in the small torch-lit sub-room, exits through the open doorway, and reaches the vaulted hallway. One side room contains billboard decorative items and an additional light source.

Exercises:

- supplied texture loading
- tile-repeat materials
- opaque depth-tested dungeon geometry
- warm ambient-plus-strongest-light LUT shading
- cutout billboard sprites
- existing first-person movement

Acceptance focuses on readable material detail, tight warm torch falloff, correct doorway depth, and stable movement through the room and hallway.

Out of scope: castle content, outdoor terrain, water, interactive actors, shadows, and translucent materials.

## Slice 2: Dungeon Vertical Slice

The player traverses the hallway ramp or stair to an upper balcony and looks down toward the starting sub-room. A second side room remains available as authored content or a visual shell.

Exercises:

- authored support surfaces
- taller walls and vaulted ceilings
- balcony floor and guard geometry
- multi-height global rendering
- downward camera sightlines
- vertical collision and safe support behavior

Acceptance focuses on continuous ramp movement, correct balcony collision, clear look-down visibility, and consistent material/light treatment across elevations.

Out of scope: elevators, moving platforms, jumping, ladders, dynamic supports, and advanced actor simulation.

## Slice 3: Dungeon-to-Forest Transition

The player crosses the far dungeon doorway into a dense forest corridor. The forest gradually opens into a clearing with blue sky, static clouds, and a road.

Exercises:

- linked level-instance rendering
- visible indoor/outdoor transition
- billboard tree density
- unlit sky layer
- cloud cutouts
- outdoor global lighting
- forest collision selection

Acceptance focuses on no coordinate or geometry pop, readable warm-to-cool lighting change, navigable forest movement, and stable outdoor visibility.

Out of scope: day/night progression, volumetric clouds, advanced portal culling, and dynamic weather.

## Slice 4: Clearing, Road, and Stream

The player follows the road across varied grass terrain toward the castle. An opaque textured stream crosses the route. The stream has a slight downward visual slope and an invisible collision barrier; a cobblestone path provides the crossing.

Exercises:

- terrain and explicit polygon UVs
- road and cobblestone materials
- opaque water material
- collision-only stream blocking geometry
- outdoor support surfaces
- long-distance landmark visibility

Acceptance focuses on clear road/path readability, visible stream slope, blocked water entry, traversable cobblestone crossing, and consistent terrain collision.

Out of scope: water transparency, reflections, animated water, and swimming.

## Slice 5: Castle Exterior Approach

The player reaches the clearing and sees the textured castle exterior as the destination landmark. Dense forest limits earlier views; the clearing and road provide the primary reveal. The open castle entry remains visible before entry.

Exercises:

- textured exterior polygon geometry
- large global-scale structure
- long-distance depth and visibility
- outdoor-to-indoor doorway sightline
- castle material identity separate from dungeon stone

Acceptance focuses on stable castle placement, readable exterior materials, correct depth ordering, and no seam discontinuity at the entry.

Out of scope: complete castle exterior traversal, destructible architecture, and interactive doors.

## Slice 6: Castle Interior Vertical Slice

The player enters the castle entry hall, passes columns and billboard statues, climbs the grand staircase, and reaches the balcony. The balcony surrounds the entry space and leads toward a throne-room approach. Flanking rooms can remain visual shells.

Exercises:

- three distinct vertical layers
- columns and sprite cutouts
- broad cool lighting
- balcony look-down sightlines
- multiple stair/support surfaces
- indoor/outdoor continuity through the entry

Acceptance focuses on brighter cool illumination, broad falloff, stable stair movement, clear entry-hall sightlines, and correct balcony collision.

Out of scope: combat, NPCs, interactable statues, complete side-room traversal, and throne-room gameplay.

## Slice 7: Full Route Integration

The slices compose into one bounded route from the dungeon sub-room through the forest, stream crossing, castle exterior, and castle interior. Existing runtime proofs continue to use deterministic fixtures where showcase content would reduce test precision.

Acceptance focuses on route continuity, streaming and residency behavior, transition readiness, collision activity, render capacity, and browser playtest stability.

## Slice 8: Visual and Performance Tuning

The integrated route receives content and renderer tuning against supplied assets and representative mobile workloads.

Tuning covers:

- material readability
- LUT palette and intensity bands
- texture filtering and internal resolution
- sprite density
- forest and castle visibility
- scene capacity
- provider and residency budgets
- browser/mobile frame behavior

Measured results update the relevant architecture and research docs.

## Playtest Gap Loop

Each slice follows this loop:

```text
build bounded slice
  → playtest through production input/render path
  → record observed gap
  → classify gap
  → update design when contract is unclear
  → implement smallest aligned fix
  → rerun slice and regression proofs
```

Gap classes are material, geometry, transport, collision, streaming, camera, asset pipeline, or performance. Showcase code does not silently invent a new cross-package contract.

## Related Docs

- [Demo Experience](./demo-experience.md) — target route and player experience
- [Demo Scope](./demo-scope.md) — overall showcase boundary
- [Material Contract](../architecture/material-contract.md) — visual data and ownership
- [Rendering](../architecture/rendering.md) — global scene rendering
- [World Streaming](../architecture/world-streaming.md) — residency and preload behavior
- [Vertical Movement](../architecture/vertical-movement.md) — ramps and support surfaces
- [Test-Driven Development](../principles/test-driven-development.md) — slice proof expectations
