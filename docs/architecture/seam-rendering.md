---
feature: seam-rendering
tags: [architecture, rendering, transitions, global-world]
summary: Retro Mage renders connected level instances together in global coordinates so doorway, portal, terrain, and vertical transitions remain visually continuous.
relates-to:
  - "[Level Transitions](../features/level-transitions.md)"
  - "[World Model](../features/world-model.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[Rendering](./rendering.md)"
---

# Transition Rendering

Connected level instances render as one global scene. The renderer receives transformed geometry from every resident instance that falls within the current render relevance range. It does not inject far-side geometry into a special seam buffer or switch coordinate systems at a crossing.

## Visible Pre-Crossing Content

When a link is open and target content can be seen through a doorway, window, portal, cave opening, or terrain boundary, the target instance is preloaded and submitted alongside the source. Both sides share camera transforms, depth testing, lighting, materials, and sprite sorting rules.

## Spatial Alignment

The world runtime aligns target anchors to source anchors and produces the target instance's global transform. Rendering consumes that transform exactly. Normal spatial transitions preserve global player position and orientation; explicit portal transitions use the target anchor's arrival transform.

## Occlusion

Opaque geometry uses the normal depth buffer. Doorway and portal shapes can use ordinary geometry or clipping/material behavior owned by the renderer. Optional portal culling is an optimization and does not change the scene contract.

## Failure Behavior

A target that is not resident is not submitted as incomplete geometry. The source remains visible and playable while the application controls whether the link stays closed, retries, or supplies fallback content.

## Related Docs

- [Level Transitions](../features/level-transitions.md) — link and anchor behavior
- [World Model](../features/world-model.md) — global instances
- [World Runtime](./world-runtime.md) — residency gate
- [Rendering](./rendering.md) — global renderer behavior
