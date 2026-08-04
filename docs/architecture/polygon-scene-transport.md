---
feature: polygon-scene-transport
tags: [architecture, rendering, wasm, polygons, materials]
summary: Retro Mage transports authored polygon geometry through fixed-capacity renderer-neutral WASM buffers with explicit packing, validation, transforms, publication, and ownership.
relates-to:
  - "[Material Contract](./material-contract.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Scene Capacity](./scene-capacity.md)"
  - "[Rendering](./rendering.md)"
  - "[World Model](../features/world-model.md)"
---

# Polygon Scene Transport

Engine-core publishes validated authored polygon instances as one global, renderer-neutral scene snapshot. Polygon render geometry stays separate from collision geometry.

## Fixed Representation

Transport uses fixed-capacity SoA buffers. `polygon_count` counts records; `vertex_count` and `index_count` count packed lanes for accepted records. Each polygon record stores:

```text
polygon_instance_id : u32   // stable runtime instance identity
source_id            : u32   // authored polygon identity; diagnostic only
vertex_start         : u32
vertex_count         : u32
index_start          : u32
index_count          : u32   // multiple of 3
material_id          : u32   // application registry ID; 0 = fallback
uv_mode              : f32   // 0 tile-repeat, 1 explicit, 2 billboard
uv_start             : u32   // index into uv lanes; 0 when tile-repeat
render_flags         : f32   // opaque=1, cutout=2, lit=4, unlit=8, emissive=16, water=32, sky=64
placement_id         : u32   // stable level-instance placement identity
```

Packed vertex lanes are interleaved `f32` records, exactly 8 lanes each:
`position_x, position_y, position_z, normal_x, normal_y, normal_z, uv_u, uv_v`.
Indices are `u32` triangle indices, local to that polygon's vertex range. UVs duplicate vertex lanes in the vertex buffer for explicit mode; `uv_start` is therefore reserved and always zero in initial transport. Tile-repeat uses zero UV lanes and renderer/material-defined mapping. Billboard mode is legal in metadata but polygon transport does not create billboards.

`polygon_count`, `vertex_count`, and `index_count` are published scalar counts. No sentinel or implicit stride exists. All starts/counts are validated against those counts. TypeScript views use little-endian WASM `Uint32Array`/`Float32Array` lanes and refresh views after memory growth.

Configured defaults: `polygon_instances = 4096`, `polygon_vertices = 65536`, `polygon_indices = 98304` (32,768 triangles). Capacities are non-negative, fixed for transport lifetime, independently overridable by application at `WorldTransport` creation. Zero is valid.

## Material, UV, Flags

`material_id` is stable numeric reference into application material registry; it is not a string, descriptor pointer, texture key, or GPU handle. Encoding matches [Material Contract](./material-contract.md). Flags are the shared bit values above; incompatible combinations (both lit and unlit, or neither opaque/cutout where required) reject geometry. Initial compatibility default is material `0`, tile-repeat (`uv_mode=0`), zero UV lanes, `opaque|lit` (`render_flags=5`). Missing metadata never shifts buffer layout.

## Transform and Identity

Authored positions and normals are local to level content. Engine-core owns local-to-global conversion during instance submission: positions use placement transform; normals use the corresponding inverse-transpose direction transform then normalization. Renderer receives global positions only and performs no level/seam transform. `placement_id` identifies placed level instance; `polygon_instance_id` identifies one submitted polygon occurrence; `source_id` identifies authored source. IDs are diagnostic/batching metadata, not app-owned object references.

## Validation and Publication

Before writing a snapshot, engine-core validates every candidate polygon: at least 3 vertices; index count divisible by 3; each index within polygon vertex range; finite positions, normals, and UVs; non-degenerate triangles; valid UV mode and flags; checked integer arithmetic for starts/counts. Invalid geometry rejects its containing instance and emits deterministic diagnostic `(frame_id, placement_id, source_id, reason, field/index)`. No partial instance or partial snapshot publishes.

Submission follows scene-capacity instance ordering. Runtime preflights polygon record, vertex, and index capacity plus all other categories. Any failure rejects whole instance, records requested counts and configured limits, and leaves prior published snapshot unchanged. A frame publishes only after all accepted writes and counts complete; publication swaps one immutable snapshot/token atomically. Renderer sees previous complete snapshot or new complete snapshot, never mixed counts. Accepted instances remain visible candidates; renderer may later frustum/distance/depth/occlusion-cull them without mutating transport or gameplay. Rejected instance is absent from renderer visibility; default crossing policy blocks target as defined by [Scene Capacity](./scene-capacity.md).

## Ownership and Compatibility

Engine-core owns authored geometry validation, transformed packed data, residency, identity, and atomic publication. Application owns material descriptors, texture asset keys/URLs, palette/LUT config, and authoring data. Renderer owns GPU buffers, upload, batching, shaders, passes, and fallback material resolution. No WebGL object, shader, texture URL, descriptor object, or GPU handle crosses WASM.

Unknown/missing material is renderer-diagnostic plus deterministic fallback appearance, not transport rejection. Malformed geometry, non-finite values, invalid indices, invalid metadata, and capacity overflow reject deterministically before publication. Legacy polygon content without render metadata uses defaults above. Content without polygon geometry produces no polygon record. Collision-only geometry remains collision-only.

## Related Docs

- [Material Contract](./material-contract.md)
- [WASM Bridge](./wasm-bridge.md)
- [Scene Capacity](./scene-capacity.md)
- [Rendering](./rendering.md)
- [World Model](../features/world-model.md)
