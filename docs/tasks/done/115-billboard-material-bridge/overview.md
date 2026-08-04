---
task: "115"
slug: billboard-material-bridge
status: done
depends-on: ["105"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: "Added numeric billboard material, UV, and render-flag SoA lanes from LevelActor through WorldTransport WASM pointers into TypeScript actor/scene views. Legacy adapters default material 0, billboard UV 2/zero data, flags 6; no GPU/app descriptor data crosses bridge. Tests: pnpm --filter engine-core test (116+5 Rust), pnpm --filter render test -- --run (40), pnpm --filter render typecheck, git diff --check."
---

# Add Billboard Material Metadata

Extend existing actor/billboard scene transport with renderer-neutral material identity and surface metadata.

## Desired Changes

- Add material reference, UV metadata, and render flags to existing billboard/actor transport.
- Preserve sprite identity, facing, active state, capacity, and overflow behavior.
- Carry fields through engine-core/WASM views/TypeScript render scene submission.
- Use explicit defaults for legacy actors without material metadata.
- Add producer/consumer boundary tests.

## Definition of Done

- [x] Billboard material metadata survives engine producer → WASM → render consumer.
- [x] Existing sprite identity and actor behavior remain intact.
- [x] Legacy actors receive documented defaults.
- [x] No texture URLs, material descriptor objects, or GPU resources cross the bridge.
- [x] Capacity/overflow and atomic publication remain correct.
- [x] Focused Rust/TypeScript tests pass.

## Out of Scope

- Polygon transport.
- Texture loading or LUT generation.
- New sprite art or demo layout.
- Interactable actor behavior.

## Implementation Steps

1. Read material, WASM bridge, scene capacity, and polygon transport docs.
2. Trace current actor/billboard producer and render consumer.
3. Add shared encoded metadata with explicit legacy defaults.
4. Update bridge views and scene submission without parallel transport.
5. Add focused producer/consumer, compatibility, and capacity tests.
6. Run bounded tests/typechecks and update task evidence.

## Context

- Depends on task:105.
- Read: `docs/architecture/material-contract.md`.
- Read: `docs/architecture/wasm-bridge.md`.
- Read: `docs/architecture/scene-capacity.md`.
- Key files: `packages/engine-core/src/world_transport.rs`, `packages/render/src/world-state/`, `packages/render/src/sprites/`.
