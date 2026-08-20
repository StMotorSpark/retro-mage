---
task: "119"
slug: material-texture-render-binding
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-06
outcome: "Tile textures now use scene material IDs and retain tile-ID lookup only for legacy views. Added mocked-WebGL coverage for both paths; render tests and typecheck pass."
---

# Bind Render Textures by Scene Material

Make the renderer select textures from each scene tile's material ID rather than its authored tile-shape ID.

## Desired Changes

- Change the tile-renderer texture registration and lookup contract to use the optional `TilesView.material_id` field when supplied.
- Preserve the existing `tile_id` behavior as a deterministic legacy fallback when material metadata is absent.
- Add unit coverage proving distinct tile shapes with distinct material IDs bind their corresponding registered texture.

## Definition of Done

- [ ] A material-bound scene tile samples the texture registered for its material ID.
- [ ] A legacy tile view without `material_id` continues to use its `tile_id` texture key.
- [ ] Render package unit tests and typecheck pass.

## Out of Scope

- Demo asset URL fetching or material-descriptor changes.
- Lighting/LUT shader changes.
- Sprite texture binding and sprite source-asset alpha repair.

## Implementation Steps

1. Update the public `TileRenderer` texture-registration API in `packages/render/src/world-tiles/index.ts` so its key semantics are explicitly material-oriented while retaining legacy fallback behavior.
2. During `render`, derive the lookup key from `tiles.material_id[i]` whenever that view exists; otherwise use `tiles.tile_id[i]`.
3. Add a focused mocked-WebGL test in the render package that verifies the bound texture for both paths.
4. Run render tests and typecheck.

## Context

- Read: `docs/architecture/material-contract.md` — materials are the application-owned visual identity carried by scene geometry.
- Read: `docs/architecture/polygon-scene-transport.md` — scene tile material metadata crosses the WASM boundary.
- Related: task:106 — scene material bridge; task:107 — asset runtime; task:118 — mountain slice exposed the tile-ID-only binding defect.
- Key files: `packages/render/src/world-tiles/index.ts`, `packages/render/src/world-state/types.ts`.
