---
feature: known-gaps
tags: [research, open-questions, planning, reset]
summary: Tracks design and implementation capabilities that remain intentionally deferred while the global level-instance runtime and seamless transition proof are established.
relates-to:
  - "[World Model](../features/world-model.md)"
  - "[Level Transitions](../features/level-transitions.md)"
  - "[World Runtime](../architecture/world-runtime.md)"
  - "[World Streaming](../architecture/world-streaming.md)"
  - "[Rendering](../architecture/rendering.md)"
  - "[Collision](../architecture/collision.md)"
  - "[Demo Scope](../features/demo-scope.md)"
  - "[Test-Driven Development](../principles/test-driven-development.md)"
---

# Known Gaps

This doc records capabilities that remain intentionally outside the first reset implementation slices. It prevents deferred work from becoming accidental architecture.

## Rendering

- WebGPU backend is a planned optional backend after the WebGL2 scene/material contract proves stable.
- Advanced portal or room occlusion is an optimization layered over frustum, distance, residency, and depth testing.
- Procedural clouds and richer atmospheric weather are separate sky-rendering work.
- Adaptive internal resolution remains separate from the static framebuffer cap.

## Physics and Simulation

- Full multi-floor movement physics includes stairs, ramps, vertical support, falling, elevators, and head clearance.
- Actor-vs-actor collision and actor physics remain undefined.
- Rich combat, enemy behavior, health, and death remain undefined.
- Persistent actor transfer across level instances remains application-controlled.

## World Runtime

- Infinite procedural regions are not part of the initial finite-bounds runtime contract.
- Detailed persistence serialization is application-owned and lacks an engine format.
- Runtime topology mutation is supported by contract but lacks a concrete implementation slice.
- Memory budgets and platform-specific eviction heuristics require measurement against representative content.

## Content and Assets

- The application-owned level file format is undecided; the engine consumes resolved definitions rather than prescribing authoring tools.
- Consuming-game texture and level source folder conventions remain application-owned.
- Combat content, inventory, audio, animated sprites, and additional biomes lack feature docs.

## Platform

- PWA installability, service-worker caching, and offline demo behavior remain supported app concerns.
- Advanced cache invalidation, background sync, and install UX are not engine requirements.

## Resolved Direction

The following principles are established:

- reusable local-space level definitions
- runtime level instances in one global 3D coordinate system
- anchors in definitions and links in application-owned world manifests
- authored and application-generated providers share one resolved definition contract
- target levels preload and render before crossing when visible
- render residency, collision activity, and gameplay simulation remain separate
- target failure leaves source gameplay intact
- opaque seeds and generator metadata remain application-owned
- WebGL2 is the baseline renderer; WebGPU is optional

## Related Docs

- [World Model](../features/world-model.md) — global spatial model
- [Level Transitions](../features/level-transitions.md) — connection contract
- [World Runtime](../architecture/world-runtime.md) — lifecycle and provider boundaries
- [World Streaming](../architecture/world-streaming.md) — residency behavior
- [Rendering](../architecture/rendering.md) — renderer capabilities
- [Collision](../architecture/collision.md) — multi-floor capability boundary
- [Demo Scope](../features/demo-scope.md) — first proof scene
- [Test-Driven Development](../principles/test-driven-development.md) — testing expectations
