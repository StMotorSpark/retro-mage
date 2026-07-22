---
feature: wasm-bridge
tags: [architecture, wasm, rust, rendering, memory, data-model]
summary: Retro Mage crosses the WASM boundary via fixed-size typed-array buffers that engine-core writes and render reads as zero-copy views into WASM linear memory.
relates-to:
  - "[Tech Stack](./tech-stack.md)"
  - "[Rendering](./rendering.md)"
  - "[Repo Structure](./repo-structure.md)"
---

# WASM ↔ JS Bridge

`engine-core` (Rust/WASM) is the source of truth for world state. `render` (TypeScript) draws it every frame. This doc defines the exact shape of the data that crosses that boundary, so both sides can be implemented against a shared, explicit contract rather than an assumed one.

## Overview

The bridge is a set of fixed-size, preallocated buffers living in WASM linear memory. `engine-core` writes into these buffers; `render` reads them as `Float32Array`/`Uint16Array` views over that same memory, with no per-frame copying or object allocation. Each buffer covers one category of world data, updates at the rate that category actually changes, and has a fixed maximum entry count decided up front. This is a hand-maintained wire format — the schema below is the single source of truth both `engine-core`'s Rust structs and `render`'s TypeScript reader code are written against.

## Buffer Categories

Data is split by update frequency, not bundled into one blob:

| Buffer | Updates | Max entries |
|--------|---------|-------------|
| Tile geometry | Once per room load / on room change | 1024 visible tiles |
| Actors | Every frame | 64 actors |
| Lights | Every frame | 32 lights |
| Camera / player pose | Every frame | 1 (single struct, not an array) |

Static geometry is pushed once per room rather than every frame — it does not change mid-room, so re-sending it every tick wastes bandwidth for no benefit. Actors, lights, and camera pose are live simulation state and are re-read every frame.

## Numeric Format — f32

All positional and numeric fields in these buffers are `f32`. `engine-core`'s internal simulation math may use fixed-point representations per [Rendering](./rendering.md)'s math guidance, but the wire format itself uses plain floats — WebGL consumes floats natively, and this keeps the bridge schema simple and decoupled from internal simulation math decisions.

## Schema

Each buffer is Struct-of-Arrays (SoA): one flat array per field, not an array of structs, so `render` can construct one typed-array view per field and index by a fixed stride. All buffers are preallocated at their max size — `engine-core` never grows them at runtime.

### Actors (max 64)

| Field | Type | Notes |
|-------|------|-------|
| `x`, `y`, `z` | `f32` | World position |
| `facing` | `f32` | Radians |
| `sprite_id` | `f32` | Identifies which sprite sheet/frame set to draw |
| `active` | `f32` | `0`/`1` — whether this slot is a live actor (slots beyond the live count, and inactive slots below it, are ignored) |

### Lights (max 32)

| Field | Type | Notes |
|-------|------|-------|
| `x`, `y`, `z` | `f32` | World position |
| `r`, `g`, `b` | `f32` | Color, 0–1 |
| `intensity` | `f32` | Feeds the lighting LUT lookup once [LUT format](./rendering.md) is decided |
| `active` | `f32` | Same convention as actors |

### Tile Geometry (max 1024 visible tiles)

| Field | Type | Notes |
|-------|------|-------|
| `x`, `y`, `z` | `f32` | Tile-space or world-space position (grid-aligned) |
| `tile_id` | `f32` | Identifies texture/tile type |
| `variant` | `f32` | Rotation/flip variant, if needed |

This buffer's exact field set is expected to grow once the [Visibility Algorithm](../research/known-gaps.md) and [Asset Pipeline](../research/known-gaps.md) gaps are resolved — the shape above covers only what's needed to draw a flat, textured tile floor/wall/ceiling.

### Camera / Player Pose (single entry, not an array)

| Field | Type | Notes |
|-------|------|-------|
| `x`, `y`, `z` | `f32` | Position |
| `yaw`, `pitch` | `f32` | Orientation |

## Memory Access Pattern

`engine-core` exposes, per buffer field, a pointer getter (byte offset into WASM linear memory) and an element count getter via plain `#[wasm_bindgen]` methods — following the `<buffer>_<field>_ptr()` and `<buffer>_<field>_count()` convention (e.g. `actors_x_ptr()`, `actors_x_count()`). Each buffer category also exposes a `<buffer>_count()` method returning the current count of live/active entries. `render` wraps each pointer in a typed-array view over `memory.buffer` (the `WebAssembly.Memory` instance `wasm-bindgen` exposes) once, then re-wraps it each frame only if the underlying memory has grown, since a memory growth event invalidates existing views.

Because buffers are fixed-size and preallocated once at `EngineState` construction, WASM memory does not need to grow to accommodate world-state changes during normal play — reallocation is only a concern if `engine-core`'s own heap usage (e.g. incidental allocations elsewhere) forces a memory grow. `render` re-fetches its buffer views defensively at the start of each frame to guard against this rather than assuming views stay valid forever.

## Direction — Read-Only

The bridge is one-way: `engine-core` writes, `render` only reads. `render` holds no gameplay logic and never writes back into these buffers, per [Repo Structure](./repo-structure.md).

## Schema Ownership

This document is the single source of truth for buffer layout. Changes to a buffer's field set, order, or type are made here first, then mirrored into both the Rust struct definitions in `engine-core` and the TypeScript reader code in `render`. No runtime schema validation exists between the two sides — this is a low-ceremony, hand-synchronized contract, matching the project's agent-driven, low-overhead development approach.

## Related Docs

- [Tech Stack](./tech-stack.md) — the Rust/WASM and WebGL2 stack this bridge connects
- [Rendering](./rendering.md) — the rendering pipeline that consumes these buffers, and the fixed-point math guidance this bridge's f32 wire format sits alongside
- [Repo Structure](./repo-structure.md) — the `engine-core`/`render` package split this bridge crosses
