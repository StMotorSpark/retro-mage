---
feature: Seam Rendering
tags: [engine-core, architecture, visibility, seam]
summary: Retro Mage renders seamless environments across coordinate seams by injecting transformed far-side tiles directly into the visibility and rendering pass.
relates-to:
  - docs/architecture/world-streaming.md
  - docs/architecture/visibility.md
  - docs/architecture/world-structure-partitioning.md
---

# Seam Rendering

Retro Mage maintains a seamless visual experience when crossing from indoor to outdoor space (or vice-versa), even though the underlying spaces use mechanically partitioned data structures and separate local coordinate systems.

To avoid immersion-breaking gaps at doorways and zone boundaries, the engine renders across seams by temporarily injecting far-side tiles into the active coordinate space.

## Option C: Seam-Local Coordinate Injection

Because `world-structure-partitioning` strictly isolates indoor and outdoor collision and streaming logic, the engine cannot rely on a single unified world space. Instead, when the player approaches a seam (within `seam_trigger_distance`), the engine constructs a transient composite view.

This is referred to as **Option C: Seam-Local Coordinate Injection**:
- The "active" structure (the structure currently dictating collision and streaming) owns the world origin for the frame.
- The engine iterates through the far-side structure's resident tiles and applies the `SeamTransform` associated with the nearby seam.
- The transformed tiles are injected into a transient buffer (`seam_injection_tiles`) strictly for the duration of the frame.

## Visibility and Rendering Integration

The visibility system (`recompute_visibility`) constructs its occlusion grid by reading both the active structure's tiles and the transformed injection tiles. 

- This ensures that a solid wall in an outdoor chunk correctly occludes geometry when viewed from an indoor room through a seam opening.
- The visibility output buffer merges both sets of visible tiles, allowing the renderer to draw the scene uniformly as if they originated from the same grid.

## Constraints and Performance

Because injection occurs per-seam, there is an upper bound on how many seams can be approached simultaneously without exceeding the tile budget or degrading performance. To mitigate this:
- The `seam_injection_tiles` buffer only accepts far-side tiles that fall within the current `max_sight_distance` of the player.
- Injection bypasses collision detection entirely. The collision system relies solely on the active structure's collision map, ensuring that seamless rendering does not introduce clipping artifacts or logic errors during structure handoff.
