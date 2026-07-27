---
feature: level-transitions
tags: [features, levels, transitions, seamless-world]
summary: Retro Mage connects reusable level instances through explicit anchors and application-owned links while rendering both sides as one continuous global scene.
relates-to:
  - "[World Model](./world-model.md)"
  - "[World Runtime](../architecture/world-runtime.md)"
  - "[World Streaming](../architecture/world-streaming.md)"
  - "[Rendering](../architecture/rendering.md)"
  - "[Collision](../architecture/collision.md)"
  - "[Crossing Policy](../architecture/crossing-policy.md)"
---

# Level Transitions

Level transitions connect content units without presenting a load screen or a visual level swap. A source level instance and target level instance become resident together, occupy global coordinates, and render as one scene.

## Anchors

A `LevelAnchor` is a named local-space transform and connection volume inside a level definition. Anchors identify doors, portals, stairs, elevators, cave exits, and spawn points. The anchor transform provides position and orientation; the connection volume and crossing direction define where traversal occurs.

Definitions own anchors. An anchor does not contain a world position or a link to one particular instance.

## Links

An application-owned world manifest connects source and target anchor references through a `LevelLink`. Links can be one-way or bidirectional. A link can target an existing instance or request that the application create an instance from a definition provider.

Links contain:

- stable link identity
- source instance and anchor reference
- target instance or target request
- preload policy
- crossing policy
- directionality

Crossing policy separates target preload relevance from traversal activation. The default doorway policy uses the authored anchor volume without padding, requires movement toward the destination, and re-arms only after the player leaves the connection volume by 0.5 world units.

The same reusable definition can connect to different destinations in different manifests.

## Target Placement

For a spatial connection, the engine aligns the target anchor's world transform to the source anchor's world transform and derives the target instance transform. The player preserves continuous global motion across a normal doorway, stair, or cave opening.

Teleporters and other non-spatial links use an explicit target transform and spawn offset. The target anchor supplies a safe arrival pose.

## Seamless Continuity

A target is preloaded while it can become relevant or visible from the source. If target geometry is visible through an open connection, it is submitted to the same global render scene as source geometry. The player can see the target before crossing.

A crossing becomes legal only when the player is inside the active endpoint's crossing volume, movement points toward the destination when directional crossing is enabled, and target content, transformed geometry, render data, collision data, and safe arrival data are resident. A successful crossing disarms the link until the player clears its re-arm distance. The source remains playable if target loading fails.

Connected levels may touch at a boundary or intentionally overlap. Overlap uses explicit collision ownership when multiple solids occupy the same space; it never relies on an implicit nearest-level rule.

## Runtime Activation

Rendering residency and gameplay activation are separate. A preloaded target can render without simulating all of its actors. Crossing activates the target's collision and simulation context. The source remains resident briefly as needed for return visibility and then becomes evictable according to world runtime policy.

Actors do not migrate between instances automatically. Application gameplay explicitly transfers an actor when that behavior is required.

## Related Docs

- [World Model](./world-model.md) — global instances and local definitions
- [World Runtime](../architecture/world-runtime.md) — link loading and lifecycle
- [World Streaming](../architecture/world-streaming.md) — preload, failure, and eviction
- [Rendering](../architecture/rendering.md) — one global scene and depth handling
- [Collision](../architecture/collision.md) — active geometry and overlap ownership
- [Crossing Policy](../architecture/crossing-policy.md) — preload separation, direction, and re-arm behavior
