---
feature: demo-scope
tags: [features, demo, content, rendering, transitions]
summary: The Retro Mage demo proves a continuous global scene by connecting a small authored dungeon level to an outdoor level with visible preloading, traversal, collision, sprites, sky, and stylized lighting.
relates-to:
  - "[World Model](./world-model.md)"
  - "[Level Transitions](./level-transitions.md)"
  - "[World Runtime](../architecture/world-runtime.md)"
  - "[Rendering](../architecture/rendering.md)"
  - "[World Streaming](../architecture/world-streaming.md)"
  - "[Collision](../architecture/collision.md)"
  - "[Lighting](../architecture/lighting.md)"
  - "[Asset Pipeline](../architecture/asset-pipeline.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Demo Scope

`examples/demo` is the engine proof scene. It demonstrates a small authored dungeon level connected to an outdoor level instance. The two instances occupy one global coordinate system and render together across the transition.

## Player Experience

A player can:

1. Walk through a textured dungeon with torch lighting.
2. See the outdoor region through the dungeon exit before crossing.
3. Cross without a loading screen, geometry pop, or coordinate discontinuity.
4. Walk through outdoor terrain under an atmospheric sky.
5. See billboard tree actors at distance.
6. Return through the same connection.

The proof requires source and target level content to be resident together near the transition. The source remains playable if target loading fails.

## Content

### Dungeon Level

One finite authored level contains:

- entry and gate spaces
- stone wall and floor textures
- solid collision geometry
- four warm point lights
- one outdoor transition anchor

Additional rooms may be represented as local geometry or separate instances once the transition contract is proven. The demo does not require a room-specific coordinate system.

### Outdoor Level

One finite authored or application-generated level contains:

- grass terrain
- atmospheric sky
- six billboard tree actors
- outdoor ambient lighting
- one return transition anchor

The outdoor content enters the engine through the application-owned level provider. Its generation method is not an engine concern.

## Systems Exercised

| System | Demonstration |
|---|---|
| Level definitions | Separate dungeon and outdoor content units |
| Level instances | Global transforms and runtime identity |
| World manifest | Explicit bidirectional link |
| Preloading | Outdoor content resident before reveal |
| Seamless transition | Shared global scene across doorway |
| Collision | Active transformed geometry blocks movement |
| LUT lighting | Warm dungeon point lights |
| Global rendering | Indoor and outdoor geometry in one scene |
| Billboard actors | Outdoor trees |
| Sky rendering | Outdoor atmospheric sky |
| Input | Touch and gamepad paths |
| PWA | Installable app shell and cached assets |

## Explicitly Deferred Capabilities

The demo does not require:

- combat or enemy AI
- HUD or inventory
- animated sprites
- audio
- full multi-floor movement physics
- WebGPU backend
- procedural clouds
- advanced portal culling
- adaptive resolution
- complex persistence UI

These remain documented capabilities or known gaps rather than hidden assumptions.

## Related Docs

- [World Model](./world-model.md) — definitions and global instances
- [Level Transitions](./level-transitions.md) — visible connection behavior
- [World Runtime](../architecture/world-runtime.md) — provider and lifecycle
- [Rendering](../architecture/rendering.md) — shared global scene
- [World Streaming](../architecture/world-streaming.md) — preload and eviction
- [Collision](../architecture/collision.md) — active transformed geometry
- [Lighting](../architecture/lighting.md) — stylized point lights
- [Asset Pipeline](../architecture/asset-pipeline.md) — texture loading
- [Known Gaps](../research/known-gaps.md) — deferred capabilities
