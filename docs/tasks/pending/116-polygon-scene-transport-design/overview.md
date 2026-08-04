---
task: "116"
slug: polygon-scene-transport-design
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: ""
---

# Design Polygon Scene Transport

Resolve the fixed-capacity renderer-neutral polygon scene boundary required by material-bound authored geometry.

## Desired Changes

- Define polygon representation across engine content, WASM transport, TypeScript views, and render scene submission.
- Resolve vertex/index packing, capacity configuration, material identity, UV data, render flags, global transforms, and publication semantics.
- Define overflow, invalid geometry, legacy defaults, diagnostics, and ownership.
- Update `docs/architecture/polygon-scene-transport.md`, `docs/architecture/wasm-bridge.md`, `docs/architecture/scene-capacity.md`, and `docs/_map.md` as needed.
- Produce implementation-ready contracts for a follow-up code task.

## Definition of Done

- [ ] Polygon record and buffer fields are concrete and implementation-ready.
- [ ] Capacity and atomic publication behavior are concrete.
- [ ] Material/UV/render metadata encoding matches the shared material contract.
- [ ] Engine/app/renderer ownership boundaries are explicit.
- [ ] Legacy/default/error behavior is explicit.
- [ ] Related docs and map are reconciled.
- [ ] No runtime implementation is included.

## Out of Scope

- Rust/WASM implementation.
- TypeScript renderer implementation.
- New demo geometry/assets.
- Shader, texture, LUT, or culling work.

## Implementation Steps

1. Read material contract, WASM bridge, scene capacity, rendering, and world model docs.
2. Inspect existing tile/actor transport constraints and polygon content models.
3. Select a fixed-capacity representation compatible with existing publication and overflow rules.
4. Document exact fields, encodings, limits, defaults, diagnostics, and ownership.
5. Update related docs/map and run link/format checks.

## Context

- Blocks completion of parked task:106 polygon path.
- Read: `docs/architecture/polygon-scene-transport.md`.
- Read: `docs/architecture/wasm-bridge.md`.
- Read: `docs/architecture/scene-capacity.md`.
- Read: `docs/architecture/material-contract.md`.
