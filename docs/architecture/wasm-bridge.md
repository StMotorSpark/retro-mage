---
feature: wasm-bridge
tags: [architecture, wasm, rust, rendering, memory, data-model]
summary: Retro Mage crosses the Rust/WASM and TypeScript boundary through explicit typed render-state views while keeping level content local to engine-owned simulation and global after instance transforms.
relates-to:
  - "[Tech Stack](./tech-stack.md)"
  - "[World Model](../features/world-model.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[Rendering](./rendering.md)"
  - "[Visibility](./visibility.md)"
  - "[Input Event Schema](./input-schema.md)"
  - "[Test-Driven Development](../principles/test-driven-development.md)"
---

# WASM ↔ JS Bridge

`engine-core` owns simulation truth. `render` reads global transformed scene state and draws it. The bridge exposes explicit schemas and typed views rather than leaking level-definition ownership across the boundary.

## Direction

The simulation-to-render direction is read-only for `render`. Engine state includes:

- camera/player pose in global coordinates
- visible or render-relevant geometry instances
- actors in global coordinates
- lights in global coordinates
- ambient/material identifiers
- residency and active-state metadata where render needs it

The input-to-engine direction uses the normalized per-frame function-call schema defined in [Input Event Schema](./input-schema.md).

## Buffer Strategy

Bridge storage uses preallocated typed buffers where fixed-capacity SoA access provides a measured benefit. Variable scene content uses configurable capacities or instance/chunk submission units rather than one hidden tiny global visible-tile limit. Overflow is explicit and observable; silent geometry loss is invalid.

The exact field order, numeric types, capacity, and pointer/count contracts are documented with the implementation slice that owns each buffer. Boundary tests cover stride, pointer, count, active flags, and memory-growth view refresh.

## Global Coordinates

Level definitions remain application-owned local data. Once a level instance is resident, engine-core transforms its geometry, actor positions, light positions, and collision data into global world coordinates. Render reads global coordinates and does not perform level or seam transforms.

## Instance Metadata

Render may receive instance identity, material/geometry references, and render flags for debugging or batching. It does not decide level activation, persistence, streaming, or collision ownership.

## Schema Ownership

Each bridge schema has one documented owner and colocated tests. Changes update the design contract, Rust writer, TypeScript reader, and boundary tests together. No implicit field order or capacity assumption is valid.

## Related Docs

- [Tech Stack](./tech-stack.md) — Rust/WASM and TypeScript boundary
- [World Model](../features/world-model.md) — local definitions and global instances
- [World Runtime](./world-runtime.md) — residency and activation
- [Rendering](./rendering.md) — global scene consumer
- [Visibility](./visibility.md) — render relevance
- [Input Event Schema](./input-schema.md) — reverse-direction input contract
- [Test-Driven Development](../principles/test-driven-development.md) — boundary tests
