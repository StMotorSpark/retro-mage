---
feature: world-model
tags: [features, world-model, levels, coordinates]
summary: Retro Mage represents one continuous global 3D world made from reusable authored or application-generated level definitions placed as runtime instances.
relates-to:
  - "[Level Transitions](./level-transitions.md)"
  - "[World Runtime](../architecture/world-runtime.md)"
  - "[Rendering](../architecture/rendering.md)"
  - "[World Streaming](../architecture/world-streaming.md)"
  - "[Runtime Dynamic Content](../architecture/runtime-dynamic-content.md)"
  - "[Tech Stack](../architecture/tech-stack.md)"
---

# World Model

Retro Mage presents one continuous global 3D world. The world is assembled from reusable level definitions, but runtime systems operate on placed level instances in shared world coordinates.

## Level Definitions

A `LevelDefinition` is immutable local-space content supplied by the consuming application. It can come from authored data, an application-owned procedural generator, or another application-owned provider.

A definition contains:

- finite local bounds
- grid-aligned tiles and simple polygon geometry
- actor placements
- light definitions
- named local anchors
- local metadata
- named dynamic-content slots with authored variant contributions and defaults

A definition contains no world position, per-instance dynamic-content selection, runtime actor state, residency state, or engine-owned generation rules. Definitions are reusable across multiple instances.

## Level Instances

A `LevelInstance` places one definition into the global world. It contains:

- stable instance identity
- definition identity and version
- global transform
- mutable runtime state, including per-instance dynamic-content overrides
- persistence policy
- residency and simulation state

The same definition can appear at multiple global locations with different transforms. Runtime rendering, collision, lighting, and visibility use the transformed instance data rather than the definition's local coordinates.

## Global Coordinates

The runtime world uses a shared right-handed 3D coordinate system:

- `X` — horizontal east/right
- `Y` — elevation
- `Z` — horizontal depth

Level definitions use local coordinates. The engine applies each instance transform when content becomes resident. The transform contract stores position, quaternion rotation, and uniform scale. Initial content uses translation, yaw, and vertical placement; the full transform shape remains available for rotated and multi-floor spaces.

Non-uniform and negative scale are invalid. Level bounds transform into world-space bounds for culling and streaming.

## Indoor and Outdoor Content

Indoor rooms and outdoor regions are content and streaming categories, not separate runtime coordinate systems. Both become ordinary level instances in the global scene. Indoor content remains grid-ish by default; outdoor content uses terrain regions or chunks supplied by the application.

This permits geometry to overlap physically. Windows, balconies, cave mouths, vertical transitions, and outdoor vistas use the same world-space model rather than a seam-specific coordinate bridge.

## Application-Owned Content Generation

The engine consumes resolved definitions. The application owns authored loaders, procedural generators, seeds, generator versions, persistence, and source metadata. A seed is opaque to the engine; the engine does not assume numeric seeds, deterministic generation, or regeneration behavior.

A generated definition follows the same runtime contract as authored content.

## Simulation Depth

The world supports real-time movement, actors, lights, interaction, multi-floor spaces, and later simulation systems. Multi-floor transforms and elevation are core world capabilities; full multi-floor movement physics is a separately scoped implementation slice.

## Related Docs

- [Level Transitions](./level-transitions.md) — anchors and links connect placed instances
- [World Runtime](../architecture/world-runtime.md) — manifest, providers, lifecycle, and residency
- [Rendering](../architecture/rendering.md) — global scene rendering
- [World Streaming](../architecture/world-streaming.md) — loading and eviction of instances
- [Runtime Dynamic Content](../architecture/runtime-dynamic-content.md) — named per-instance mutable authored-content variants
- [Tech Stack](../architecture/tech-stack.md) — runtime technology foundation
