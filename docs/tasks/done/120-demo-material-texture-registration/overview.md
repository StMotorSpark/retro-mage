---
task: "120"
slug: demo-material-texture-registration
status: done
depends-on: ["119"]
blocked-by: ""
assigned-to: ""
created: 2026-08-06
outcome: "All demo surface assets now register against scene material IDs. Playwright screenshots show textured dungeon walls, floor, and ceiling at start and after a 90-degree turn; render tests, demo typecheck, and demo production build pass."
---

# Register Demo Textures by Material

Connect every resolved demo surface texture to the material-keyed tile renderer and prove the starting scene draws authored world textures.

## Desired Changes

- Update demo material resource registration to bind each resolved surface texture by its renderer material ID.
- Keep sprite binding and material diagnostics intact.
- Add a browser proof that starts the demo and verifies material texture registration reaches the renderer.

## Definition of Done

- [ ] Dungeon, outdoor, castle, water, and mountain surface textures are registered using their scene material IDs.
- [ ] The demo's starting screenshot contains authored dungeon texture pixels rather than an all-fallback/void view.
- [ ] Demo typecheck and the relevant browser proof pass.

## Out of Scope

- Renderer API design (task:119).
- Generating or editing source artwork.
- Sprite alpha repair.

## Implementation Steps

1. Consume task:119's material-keyed `TileRenderer` registration API in `examples/demo/src/main.ts`.
2. Use each registered descriptor's stable numeric material ID for surface texture binding; do not infer visual identity from `tile_id`.
3. Extend an existing or new focused Playwright proof to assert the successful material registration/render result.
4. Run demo typecheck and browser proof with SwiftShader WebGL flags.

## Context

- Depends on task:119 because the renderer must consume material keys first.
- Read: `docs/architecture/material-contract.md` and `docs/features/demo-experience.md`.
- Key files: `examples/demo/src/main.ts`, `examples/demo/tests/`, `packages/render/src/world-tiles/index.ts`.
