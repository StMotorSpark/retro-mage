---
feature: polygon-scene-transport
tags: [architecture, rendering, wasm, polygons, materials]
summary: Retro Mage transports authored polygon render content through a fixed-capacity renderer-neutral WASM scene boundary with explicit material, UV, transform, publication, and overflow rules.
relates-to:
  - "[Material Contract](./material-contract.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Scene Capacity](./scene-capacity.md)"
  - "[Rendering](./rendering.md)"
  - "[World Model](../features/world-model.md)"
---

# Polygon Scene Transport

Retro Mage transports authored polygon render content from engine-owned world instances into the renderer through the same global scene publication boundary used by tile content. The transport remains renderer-neutral: application material identity and surface metadata cross the boundary, while texture descriptors and GPU resources remain outside engine-core and WASM.

## Polygon Record

Each submitted polygon has a stable scene entry containing:

- global placement or transformed vertex positions
- vertex count and index/triangle data according to the fixed transport representation
- material registry reference
- UV mode and UV data
- renderer-neutral render flags
- instance identity or source metadata required for diagnostics
- active/publication state through the scene snapshot

The exact vertex/index packing follows the existing fixed-capacity scene conventions selected by the implementation task. The public contract does not expose WebGL buffers, shader objects, texture URLs, or application material descriptor objects.

## Material Metadata

Polygon material metadata follows [Material Contract](./material-contract.md):

- material identity uses a stable numeric scene reference resolved by the application/render boundary
- UV mode uses the shared encoded values: tile-repeat, explicit, or billboard where applicable
- UV data carries the minimum values required by the selected representation
- render flags use the shared opaque, cutout, lit, unlit, emissive, water, and sky capability encoding

Missing polygon metadata uses explicit compatibility defaults: material reference `0`, tile-repeat UV mode, zero UV data, and opaque/lit-compatible render flags defined by the transport schema.

## Capacity and Publication

Polygon capacity is application-configured with the other scene capacities. Submission is atomic per world snapshot: if a polygon category exceeds capacity, the renderer receives no partial polygon publication from the rejected snapshot. Overflow remains observable through the existing diagnostics contract and does not silently drop geometry.

A committed polygon snapshot preserves global transforms, instance ordering, and material metadata together. Renderer culling can later reject draw work without changing transport ownership or gameplay awareness.

## Ownership

Engine-core owns polygon content validity, global transformation, active residency, and publication timing. The application owns material descriptors, texture asset keys, LUT configuration, and source authoring data. The renderer owns GPU allocation, upload, batching, shader execution, and polygon draw passes.

Collision geometry remains separate from polygon render geometry. A polygon can be visual-only, while collision-only geometry does not require a polygon render entry.

## Compatibility and Failure

Older content without polygon render metadata receives documented defaults. Invalid polygon geometry or metadata is rejected before publication with an observable diagnostic. Capacity overflow preserves the source world state and reports the requested count and configured capacity.

## Related Docs

- [Material Contract](./material-contract.md) — material identity and ownership
- [WASM Bridge](./wasm-bridge.md) — cross-boundary representation rules
- [Scene Capacity](./scene-capacity.md) — fixed capacities and overflow
- [Rendering](./rendering.md) — global scene execution
- [World Model](../features/world-model.md) — local definitions and global instances
