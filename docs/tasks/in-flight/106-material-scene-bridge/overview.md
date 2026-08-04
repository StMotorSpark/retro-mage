---
task: "106"
slug: material-scene-bridge
status: in-flight
depends-on: ["105"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: "Verified commit f5961e9: engine-core writes tile material_id, UV mode/data, and render_flags through typed WASM pointers; render transport refreshes views and scene submission consumes them. git diff --check passes; pnpm --filter engine-core test passes 116 unit + 5 integration; pnpm --filter render test -- --run passes 40 tests; pnpm --filter render typecheck passes. Legacy adapters default material 0, UV mode/data 0, render flags 5; descriptors/texture keys remain app-owned and no WebGL/GPU resource crosses bridge. Tile path proven; polygon/billboard material transport is not implemented, so task remains in-flight."
---

# Add Material Data to Scene Transport

Carry material identity and required surface metadata from engine-owned world content into renderer scene views without leaking renderer resources into WASM.

## Desired Changes

- Extend the world scene transport with stable material IDs or numeric registry references, UV mode/data, and required render flags.
- Preserve global transforms and atomic scene publication.
- Keep texture keys and material descriptors app-owned at the TypeScript/render boundary.
- Add producer/consumer tests across engine-core, WASM views, and render transport.

## Definition of Done

- [x] Bridge schema documents material fields and ownership.
- [ ] World content can submit material-bound tile/polygon/billboard data.
- [x] Renderer receives material identity without receiving WebGL objects.
- [x] Old content remains compatible through explicit default/fallback behavior.
- [x] Rust and TypeScript boundary tests pass.

## Out of Scope

- Shader implementation.
- Texture loading/transcoding.
- New showcase layout.
- LUT generation.
- Dynamic material mutation during gameplay.

## Implementation Steps

1. Read material contract, WASM bridge, scene capacity, and world transport docs.
2. Trace current scene producer/consumer types and fixed-capacity publication.
3. Add only fields required by the material contract; define defaults explicitly.
4. Update Rust transport, generated/accessed TypeScript views, and render scene types.
5. Add boundary tests for IDs, UV data, flags, defaults, and atomic publication.

## Context

- Depends on task:105.
- Read: `docs/architecture/material-contract.md`.
- Read: `docs/architecture/wasm-bridge.md`.
- Read: `docs/architecture/scene-capacity.md`.
- Key files: `packages/engine-core/src/world_transport.rs`, `packages/render/src/world-state/`, `packages/render/src/`.
