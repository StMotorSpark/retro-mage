---
feature: rendering
tags: [architecture, rendering, webgl, webgpu, lighting, retro]
summary: Retro Mage renders transformed level instances as one global retro 3D scene using depth-tested tile and polygon geometry, billboard sprites, stylized LUT lighting, and long-distance outdoor support.
relates-to:
  - "[World Model](../features/world-model.md)"
  - "[Level Transitions](../features/level-transitions.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[Tech Stack](./tech-stack.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Scene Capacity](./scene-capacity.md)"
  - "[Lighting](./lighting.md)"
  - "[Asset Pipeline](./asset-pipeline.md)"
  - "[Material Contract](./material-contract.md)"
  - "[Visibility](./visibility.md)"
---

# Rendering

Retro Mage uses the visual language of early-90s first-person dungeon and outdoor crawlers while adding longer draw distances, dynamic stylized lighting, outdoor terrain, and atmospheric sky rendering.

## Global Scene

The renderer receives transformed geometry from all resident level instances as one world-space scene. It does not branch on indoor versus outdoor coordinate systems and does not use a special seam-injection path.

A target level can render through an open doorway, window, portal, or terrain transition before the player crosses. Source and target geometry share camera, depth, lighting, and material evaluation.

## Geometry

The initial scene supports grid-aligned tiles, simple polygon geometry, low-poly surfaces, and billboard actors. Definitions remain local-space; instance transforms place their geometry in global coordinates.

Opaque geometry uses depth testing for correctness across long distances, overlapping level instances, terrain, windows, balconies, and multi-floor spaces. Painter ordering remains useful for transparent sprites and effects, but opaque visibility does not depend on a global painter's algorithm.

## Visibility and Culling

Renderer visibility is separate from gameplay awareness and lighting. The renderer uses camera frustum, distance, residency, and optional occlusion optimizations to decide draw submissions. Lighting changes appearance; it does not make geometry cease to exist as a mandatory rule.

A later portal or room cull can optimize known bounded spaces without changing the global scene contract.

## Lighting

Lighting uses stylized lookup tables, quantized intensity, dynamic point lights, ambient contribution, and emissive materials. LUT dimensions and color mapping are defined by the lighting slice. The lighting system may reduce work through culling, but render correctness does not depend on light-driven sight radius.

## Backends

WebGL2 is the baseline renderer backend. Scene, material, texture, camera, light, and pass contracts remain backend-neutral enough for a WebGPU backend to consume later. The engine does not require both backends during initial implementation.

WebGPU becomes an optional backend when browser support, batching needs, or GPU-driven culling justify its implementation. It does not change world, level, or transition semantics.

## Internal Resolution

The 3D scene can render to a capped internal framebuffer and upscale with linear filtering to the canvas backing store. The cap is a named, app-overridable renderer configuration. HUD and touch controls remain at native canvas resolution.

## Outdoor Rendering

Outdoor level instances use streamed terrain content, atmospheric sky rendering, and optional procedural cloud content. Outdoor geometry participates in the same global scene and depth pipeline as indoor geometry.

## Related Docs

- [World Model](../features/world-model.md) — global level instances
- [Level Transitions](../features/level-transitions.md) — visible source/target overlap
- [World Runtime](./world-runtime.md) — residency feeding the scene
- [Tech Stack](./tech-stack.md) — WebGL2 baseline and WebGPU path
- [WASM Bridge](./wasm-bridge.md) — simulation data transport
- [Scene Capacity](./scene-capacity.md) — configured buffers and overflow behavior
- [Lighting](./lighting.md) — LUT and dynamic light behavior
- [Asset Pipeline](./asset-pipeline.md) — runtime texture contract
- [Material Contract](./material-contract.md) — application assets and renderer material behavior
- [Visibility](./visibility.md) — culling responsibilities
