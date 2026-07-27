---
feature: world-structure-partitioning
tags: [architecture, world, levels, storage]
summary: Retro Mage permits separate storage and streaming strategies for indoor and outdoor content while composing both through one global runtime coordinate space.
relates-to:
  - "[World Model](../features/world-model.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[World Streaming](./world-streaming.md)"
  - "[Rendering](./rendering.md)"
  - "[Collision](./collision.md)"
---

# World Structure Partitioning

Indoor rooms and outdoor regions can use different application-owned content representations and streaming providers. This is a storage and residency distinction, not a second spatial runtime.

## Runtime Composition

Every resident content unit becomes a `LevelInstance` with a global transform. Indoor geometry, outdoor terrain, actors, and lights enter the same global render, collision, and lighting systems after transformation.

The engine does not maintain isolated indoor and outdoor coordinate systems. Geometry can overlap across categories for windows, balconies, cave mouths, terrain edges, and vertical spaces.

## Provider and Storage Freedom

An application can store indoor content as room fixtures and outdoor content as terrain regions or chunks. A provider can resolve either representation into the same engine-consumable `LevelDefinition` contract. The engine does not require one file format or one authoring tool.

Providers may partition data internally for loading efficiency. That partition is invisible to world-space transforms and transition semantics.

## Active Systems

Residency determines which instances have runtime resources. Separate policies can prioritize indoor and outdoor content, but rendering, collision, and lighting consume transformed global data. Collision activity and simulation activity remain explicit runtime state rather than automatic consequences of content category.

## Related Docs

- [World Model](../features/world-model.md) — global coordinate model
- [World Runtime](./world-runtime.md) — instance lifecycle
- [World Streaming](./world-streaming.md) — provider and residency policy
- [Rendering](./rendering.md) — global scene composition
- [Collision](./collision.md) — active transformed geometry
