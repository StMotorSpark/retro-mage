---
feature: known-gaps
tags: [research, open-questions, planning, reset]
summary: Tracks intentionally deferred capabilities and unresolved implementation details around the global level-instance runtime and seamless transition proof.
relates-to:
  - "[World Model](../features/world-model.md)"
  - "[Level Transitions](../features/level-transitions.md)"
  - "[World Runtime](../architecture/world-runtime.md)"
  - "[Provider Lifecycle](../architecture/provider-lifecycle.md)"
  - "[Eviction and Reload](../architecture/eviction-reload.md)"
  - "[Persistence and Restore](../architecture/persistence-restore.md)"
  - "[World Streaming](../architecture/world-streaming.md)"
  - "[Collision Bridge](../architecture/collision-bridge.md)"
  - "[Rendering](../architecture/rendering.md)"
  - "[WASM Bridge](../architecture/wasm-bridge.md)"
  - "[Collision](../architecture/collision.md)"
  - "[Demo Scope](../features/demo-scope.md)"
  - "[Crossing Policy](../architecture/crossing-policy.md)"
  - "[Test-Driven Development](../principles/test-driven-development.md)"
---

# Known Gaps

This doc records unresolved implementation details and deliberately deferred capabilities. It prevents deferred work from becoming accidental architecture.

## World Runtime

- The application-owned level file format and authoring tool are undecided; the engine consumes resolved definitions and does not prescribe either.
- Runtime topology mutation is supported by contract but lacks an implementation slice for creating and linking instances during play.
- Detailed persistence serialization remains application-owned; production save formats, storage, encryption, and migration algorithms lack implementations.
- Infinite procedural regions are outside the initial finite-bounds runtime contract.
- Memory budgets and platform-specific eviction heuristics require measurement against representative content.
- Link overlap collision ownership needs a concrete policy implementation beyond explicit masks/ownership metadata.
- Legacy indoor/outdoor runtime paths remain contained for standalone compatibility (e.g., `examples/bench`). Global-runtime consumers use world-aware integration via `WorldTransport`.

## Rendering and Bridge

- WebGPU is an optional backend after the WebGL2 scene/material contract proves stable and measured workload justifies it.
- Advanced portal or room occlusion is an optimization layered over frustum, distance, residency, and depth testing.
- Procedural clouds and richer atmospheric weather are separate sky-rendering work.
- Adaptive internal resolution remains separate from the static framebuffer cap.
- The final LUT color mapping and material contract require visual validation against representative dungeon and outdoor scenes.

## Physics and Simulation

- Advanced multi-floor movement remains separate from the ramp slice: elevators, moving platforms, ladders, jumping, crouching, slope sliding, and dynamic support are undefined.
- Actor-vs-actor collision and richer actor physics remain undefined.
- Persistent actor transfer across level instances remains application-controlled and lacks a concrete gameplay slice.
- Combat, enemy behavior, health, death, inventory, and interaction systems lack feature definitions.

## Content and Platform

- Parallel Playwright workers intermittently destroy the browser execution context during the seamless proof; CI enforces one worker for deterministic proof execution. Parallel hardening remains deferred until suite size justifies the investigation.

- Consuming-game texture and level source folder conventions remain application-owned.
- Audio, animated sprites, additional biomes, and structured content authoring lack feature docs.
- PWA installability, service-worker caching, and offline demo behavior remain app integration work that requires revalidation on the reset demo.
- Advanced cache invalidation, background sync, and install UX are not engine requirements.

## Established Constraints

These decisions are recorded in their authoritative design docs:

- reusable local-space level definitions
- runtime level instances in one global 3D coordinate system
- anchors in definitions and links in application-owned world manifests
- authored and application-generated providers share one resolved definition contract
- target levels preload and render before crossing when visible
- render residency, collision activity, and gameplay simulation remain separate
- target failure leaves source gameplay intact
- opaque seeds and generator metadata remain application-owned
- WebGL2 is the baseline renderer; WebGPU is optional
- multi-floor world coordinates are core capability; full movement physics is deferred

## Related Docs

- [World Model](../features/world-model.md) — global spatial model
- [Level Transitions](../features/level-transitions.md) — connection contract
- [World Runtime](../architecture/world-runtime.md) — lifecycle and provider boundaries
- [Provider Lifecycle](../architecture/provider-lifecycle.md) — request execution and result acceptance
- [Eviction and Reload](../architecture/eviction-reload.md) — protected release and reload boundary
- [Persistence and Restore](../architecture/persistence-restore.md) — state handoff, restore, and activation safety
- [Example Deployment](../architecture/example-deployment.md) — PWA and deployed demo behavior
- [World Streaming](../architecture/world-streaming.md) — residency behavior
- [Collision Bridge](../architecture/collision-bridge.md) — runtime-owned collision integration contract
- [Streaming Scheduler](../architecture/streaming-scheduler.md) — scheduling contract and implementation boundary
- [Rendering](../architecture/rendering.md) — renderer capabilities
- [WASM Bridge](../architecture/wasm-bridge.md) — scene transport boundary
- [Scene Capacity](../architecture/scene-capacity.md) — configured buffers and overflow behavior
- [Collision](../architecture/collision.md) — multi-floor capability boundary
- [Demo Scope](../features/demo-scope.md) — first proof scene
- [Crossing Policy](../architecture/crossing-policy.md) — traversal activation and hysteresis contract
- [Test-Driven Development](../principles/test-driven-development.md) — testing expectations
