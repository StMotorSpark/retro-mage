---
feature: world-streaming
tags: [architecture, streaming, world, levels, memory]
summary: Retro Mage streams application-supplied level instances by relevance, preloads linked targets before visual reveal, and evicts unneeded content without interrupting global-world traversal.
relates-to:
  - "[World Runtime](./world-runtime.md)"
  - "[World Model](../features/world-model.md)"
  - "[Level Transitions](../features/level-transitions.md)"
  - "[Visibility](./visibility.md)"
  - "[Rendering](./rendering.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# World Streaming

Streaming manages residency of transformed level instances. It does not create a second coordinate system, define gameplay semantics, or implement a special indoor/outdoor seam path.

## Streaming Units

A streaming unit is a `LevelInstance` or an application-defined terrain region represented by a level instance. Indoor rooms, outdoor regions, floors, caves, and generated spaces use the same lifecycle. Outdoor providers may internally divide a definition into chunks, but the runtime contract remains level content supplied by the application.

Every initial streaming unit has finite local bounds. The engine transforms those bounds into global coordinates and uses them for relevance, culling hints, and eviction. Infinite procedural regions are not part of the initial runtime contract.

## Relevance and Preload

The engine evaluates residency from:

- current player location
- transformed instance bounds
- visible/relevant distance
- active transition links
- application priority
- memory pressure

A transition's preload policy can request content earlier than ordinary distance relevance. The target is resident before crossing is legal and before visible target geometry is required. If target content cannot load in time, the source remains visually closed or otherwise application-controlled rather than exposing a missing scene.

## Request Handling

`LevelProvider` belongs to the consuming application. It can load authored data, generate content, use a worker, fetch data, or combine sources. The engine accepts ready, pending, cancelled, and failed outcomes. Requests carry stable identities so cancelled or stale results cannot replace newer instance state.

## Eviction

The engine keeps the current instance and active transition pair pinned. Content outside its relevance and hysteresis bands becomes evictable. Eviction releases transformed geometry and runtime resources while application persistence retains any state needed for reload.

Applications can explicitly pin instances. There is no automatic global pinning or priority system beyond link priority and explicit pins.

## Failure and Recovery

A failed target does not unload or disable the source instance. The application receives the failure, can retry, and can choose whether to keep a link closed, show fallback content, or redirect the link. No load failure causes an implicit player teleport.

## Related Docs

- [World Runtime](./world-runtime.md) — lifecycle and provider contract
- [World Model](../features/world-model.md) — global level instances
- [Level Transitions](../features/level-transitions.md) — preload and crossing behavior
- [Visibility](./visibility.md) — relevance and render culling
- [Rendering](./rendering.md) — one global scene
- [Known Gaps](../research/known-gaps.md) — deferred streaming capabilities
