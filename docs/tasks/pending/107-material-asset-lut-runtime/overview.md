---
task: "107"
slug: material-asset-lut-runtime
status: pending
depends-on: ["105"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: ""
---

# Wire Material Assets and Runtime LUT

Implement renderer-side texture resource resolution and app-configured runtime LUT generation for the material contract.

## Desired Changes

- Connect application asset keys to renderer texture resources using existing asset-pipeline ownership.
- Support KTX2/UASTC and existing fallback behavior without moving asset ownership into the engine.
- Generate runtime LUT textures from app-owned palette/configuration.
- Support warm dungeon and cool castle configurations through app configuration.
- Add observable missing-asset diagnostics and focused tests.

## Definition of Done

- [ ] Material texture keys resolve through an app-owned asset boundary.
- [ ] Renderer owns GPU texture/LUT resources and cleanup.
- [ ] Runtime LUT generation is deterministic and configurable.
- [ ] Optional baked LUT override boundary is documented or explicitly deferred without ambiguity.
- [ ] Missing asset behavior is visible and tested.
- [ ] Render tests and demo build/typecheck pass.

## Out of Scope

- New world geometry.
- Dynamic day/night.
- Shadows, transparency, PBR, or water animation.
- WASM material schema changes.

## Implementation Steps

1. Read material, lighting, and asset-pipeline docs plus current render loaders.
2. Reuse existing texture loader boundary; do not add app URL policy to render.
3. Implement LUT generation/configuration within the lighting slice.
4. Resolve material descriptors to render resources and fallback diagnostics.
5. Add unit tests for asset success/failure, LUT determinism, and warm/cool configs.

## Context

- Depends on task:105.
- Read: `docs/architecture/material-contract.md`.
- Read: `docs/architecture/lighting.md`.
- Read: `docs/architecture/asset-pipeline.md`.
- Key files: `packages/render/src/lighting/`, `packages/render/src/`, `examples/demo/`.
