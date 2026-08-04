---
task: "117"
slug: polygon-scene-transport
status: done
depends-on: ["115", "116"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: "Implemented polygon SoA transport: fixed record/vertex/index buffers, global transforms, metadata, WASM pointers/counts, TS typed views, validation, defaults, atomic capacity rejection. Tests: pnpm --filter engine-core test passed (123 unit + 5 integration), pnpm --filter render test -- --run passed (41), pnpm --filter render typecheck passed, git diff --check passed."
---

# Implement Polygon Scene Transport

Implement the fixed-capacity renderer-neutral polygon scene boundary defined by the polygon transport design.

## Desired Changes

- Add polygon record, packed vertex, and packed index SoA buffers to engine-core world transport.
- Add configured polygon record/vertex/index capacities and observable overflow diagnostics.
- Transform authored polygon positions and normals into global coordinates at engine submission.
- Carry material reference, UV mode/data, render flags, placement identity, and source identity.
- Expose typed WASM pointers/counts and TypeScript render views.
- Submit polygon content through atomic global scene publication.
- Reject malformed polygon instances deterministically without partial publication.
- Add producer/consumer boundary tests across Rust and TypeScript.

## Definition of Done

- [x] Polygon fields and packing match `polygon-scene-transport.md`.
- [x] Engine publishes validated global polygon data through WASM.
- [x] Renderer receives polygon data with material/UV/flags and no GPU/app descriptor leakage.
- [x] Capacity, overflow, invalid geometry, and atomic publication behavior are tested.
- [x] Legacy/default behavior is explicit and tested.
- [x] Existing tile, billboard, actor, crossing, and scene-capacity behavior remains passing.
- [x] Focused Rust/TypeScript tests and typechecks pass.
- [x] No demo geometry/assets or shader work is included.

## Out of Scope

- Material texture loading.
- LUT generation.
- Polygon shaders or final draw batching.
- Collision behavior for polygons.
- Demo showcase layout.
- Advanced culling.

## Implementation Steps

1. Read the polygon transport design and inspect existing tile/billboard transport implementation.
2. Add fixed capacities and renderer-neutral polygon storage using existing publication conventions.
3. Add authored polygon submission and global transform/normal validation.
4. Add WASM pointer/count exports and TypeScript typed views.
5. Add scene submission, defaults, diagnostics, and atomic rejection behavior.
6. Add focused Rust/TypeScript boundary tests.
7. Run bounded tests/typechecks and verify every DoD item before completion.

## Context

- Depends on task:115 for shared actor/material bridge conventions.
- Depends on task:116 for the authoritative polygon transport contract.
- Read: `docs/architecture/polygon-scene-transport.md`.
- Read: `docs/architecture/material-contract.md`.
- Read: `docs/architecture/wasm-bridge.md`.
- Read: `docs/architecture/scene-capacity.md`.
- Key files: `packages/engine-core/src/world.rs`, `packages/engine-core/src/world_transport.rs`, `packages/render/src/world-state/`.
