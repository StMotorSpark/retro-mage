---
feature: crossing-policy
tags: [architecture, transitions, world, traversal]
summary: Retro Mage separates link preload relevance from narrow directional crossing and explicit re-arm hysteresis so active-world state changes only during intentional traversal.
relates-to:
  - "[Level Transitions](../features/level-transitions.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[World Streaming](./world-streaming.md)"
  - "[World Model](../features/world-model.md)"
  - "[Collision](./collision.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Crossing Policy

Link preload and link crossing use separate spatial policies. Content can become resident at a useful visibility distance while active-instance state changes only when the player intentionally traverses a narrow anchor volume in the direction of the destination.

## Policy Data

Each `LevelLink` carries a `CrossingPolicy`:

- `padding` expands the anchor connection volume for crossing tests.
- `rearm_distance` defines the distance outside the connection volume required before the same link can trigger again.
- `require_direction` requires movement through the anchor toward the destination.

Recommended doorway defaults are:

```text
padding = 0
rearm_distance = 0.5 world units
require_direction = true
```

The anchor's authored connection volume is the crossing zone. Padding is zero unless a link explicitly needs a wider traversal zone for a large portal, elevator, or accessibility path.

## Preload Separation

Preload policy controls when target content requests resolution and residency. Crossing policy controls when the player changes active instance. Preload distance can exceed crossing distance by any amount without changing gameplay state.

The application can explicitly request provider loads. Runtime-driven relevance scheduling remains a separate streaming responsibility, but any scheduler consumes preload policy rather than crossing padding.

## Direction

A directional crossing test uses the source anchor's forward axis from its local transform and the player's movement delta. A crossing is valid when the player is inside the connection volume and movement points toward the target. Bidirectional links evaluate the active endpoint and reverse the direction for return traversal.

A stationary player inside an anchor does not repeatedly trigger links. A player moving away from the active endpoint cannot activate the link in that direction.

## Re-arm Hysteresis

A successful crossing disarms the link for the current active endpoint. The link re-arms after the player leaves the endpoint's connection volume by at least `rearm_distance`. This prevents a shared spatial boundary from immediately triggering the reverse link while the player is still occupying doorway space.

Re-arm state belongs to runtime traversal state, not level definitions. Eviction or link replacement clears stale re-arm state safely.

## Crossing Gate

A directional volume match is necessary but not sufficient. The normal readiness gate still requires:

- target instance resident
- target transform resolved
- target render data ready
- target collision data ready
- safe arrival pose validated

A failed or pending target never changes active instance state. The source remains playable and its active collision remains authoritative.

## Spatial Continuity

Spatial links preserve the player's global pose. Crossing policy changes which instance is active; it does not teleport a player through a normal doorway. Explicit links retain their authored arrival transform behavior.

## Related Docs

- [Level Transitions](../features/level-transitions.md) — anchors, links, and readiness semantics
- [World Runtime](./world-runtime.md) — runtime ownership of crossing state
- [World Streaming](./world-streaming.md) — preload relevance remains separate
- [World Model](../features/world-model.md) — global transforms and coordinates
- [Collision](./collision.md) — active transformed geometry during traversal
- [Known Gaps](../research/known-gaps.md) — remaining transition work
