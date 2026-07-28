---
feature: world-runtime
tags: [architecture, world, levels, streaming, providers]
summary: Retro Mage manages application-supplied level definitions as transformed runtime instances with explicit loading, residency, activation, persistence, and eviction states.
relates-to:
  - "[World Model](../features/world-model.md)"
  - "[Level Transitions](../features/level-transitions.md)"
  - "[World Streaming](./world-streaming.md)"
  - "[Collision Bridge](./collision-bridge.md)"
  - "[Streaming Scheduler](./streaming-scheduler.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Repo Structure](./repo-structure.md)"
  - "[Crossing Policy](./crossing-policy.md)"
---

# World Runtime

The world runtime joins application-owned topology and content providers to engine-owned level instances. It keeps content loading, render residency, gameplay activation, persistence, and scheduling intent distinct.

## World Manifest

The consuming application owns the `WorldManifest`. It describes starting locations, known instances, and links between anchors. A manifest can be authored, generated, fetched, or assembled from multiple sources.

The engine accepts an initial manifest and supports explicit runtime registration for generated or dynamically discovered instances and links. The engine does not generate world topology.

## Level Provider

The consuming application owns `LevelProvider`. It resolves a level request to a `LevelDefinition` through authored loading, procedural generation, worker computation, network data, or a hybrid source. The provider may return ready, pending, cancelled, or failed results.

The engine treats generator IDs, seeds, generator versions, and source metadata as opaque application data. It validates the resolved definition but does not interpret its generation process.

## Instance Lifecycle

Each instance follows this lifecycle:

```text
known → loading → resident → active → evictable → evicted
                      ↘ failed
```

- `known`: topology identifies the instance.
- `loading`: the provider resolves its definition.
- `resident`: definition, transformed geometry, render data, and required collision data are available.
- `active`: gameplay systems simulate the instance.
- `evictable`: the instance is no longer required immediately but remains retained under hysteresis.
- `evicted`: runtime content is released while application persistence remains available.
- `failed`: loading or validation fails; the source remains playable and retry is possible.

A pending request can be cancelled. Late provider results are ignored when their request identity is stale.

## Residency and Activation

The runtime tracks three independent concerns:

- render residency
- collision activity
- gameplay simulation activity

A preload target is normally render-resident without full actor simulation. A crossed target becomes collision-active and simulation-active. A source instance remains resident while return visibility or transition safety requires it, then becomes evictable.

The current instance and any immediately traversable transition pair are pinned. Applications can pin additional instances and provide priority hints through the streaming scheduler; scheduling priority does not activate gameplay or override runtime safety.

## Preload and Crossing Gate

The scheduler and application keep preload intent separate from crossing policy. The scheduler evaluates coarse global relevance, transformed bounds, link preload policy, and application priority, then submits bounded provider work through the runtime. Explicit application loads can satisfy the same readiness contract. Crossing uses the active endpoint's narrow anchor volume, directional movement, and link re-arm hysteresis. A target is loaded before its geometry can become visually relevant when possible.

Crossing requires:

- target instance resident
- target transform resolved
- render data ready
- collision data ready
- safe arrival pose validated
- crossing policy accepts the player's position and movement direction
- link is armed after its previous traversal

If loading fails, the source remains playable and the application receives the failure. The transition can remain closed, retry, or present application-owned fallback content.

## Persistence Boundary

The engine owns transient instance state while an instance is resident. The application owns durable persistence and decides whether an instance is persistent, session-only, or regenerated on reload. Eviction exposes runtime state for application storage; reload combines resolved base content with application-restored state.

## Related Docs

- [World Model](../features/world-model.md) — definitions and instances
- [Level Transitions](../features/level-transitions.md) — anchor and link semantics
- [World Streaming](./world-streaming.md) — residency policies
- [Collision Bridge](./collision-bridge.md) — runtime-owned collision and world tick integration
- [Streaming Scheduler](./streaming-scheduler.md) — relevance, request scheduling, and retention intent
- [WASM Bridge](./wasm-bridge.md) — simulation data crossing into rendering
- [Repo Structure](./repo-structure.md) — package ownership boundaries
- [Crossing Policy](./crossing-policy.md) — narrow directional traversal and re-arm hysteresis
