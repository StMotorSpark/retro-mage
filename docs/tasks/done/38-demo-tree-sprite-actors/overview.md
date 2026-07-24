---
task: "38"
slug: demo-tree-sprite-actors
status: done
depends-on: ["34", "37"]
blocked-by: ""
assigned-to: ""
created: 2026-07-23
outcome: "Implemented billboard sprite rendering with Y-axis camera billboarding and painter's-algorithm depth sorting in packages/render. Placed 6 tree actors across outdoor chunk area in examples/demo/src/main.ts and loaded tree-sprite.ktx2. Resolved KTX2 pipeline gap by adding assets/sprites plugin instance to vite.config.ts."
---

# Demo Tree Sprite Actors

Place 6 tree billboard sprite actors across the outdoor chunk area, rendered via `packages/render`'s sprite pipeline, demonstrating billboard sprite rendering with painter's-algorithm sorting.

## Desired Changes

- Add 6 actor entries via engine-core's `actors` module at fixed positions scattered across the 3×3 outdoor chunk area (from task:37)
- Wire `tree-sprite.ktx2` (single-frame, 64×128, from task:34's `assets/sprites/` folder) as each tree actor's billboard texture via `packages/render/src/sprites`
- Confirm billboard sprites always face the camera (Y-axis billboarding, no per-frame animation)
- Confirm painter's-algorithm depth sorting places trees correctly relative to terrain and each other from any camera angle

## Definition of Done

- [ ] 6 tree actors are visible when standing in the outdoor area, at distinct fixed positions
- [ ] Each tree renders as a single-frame billboard sprite always facing the camera as the player moves/looks around
- [ ] Trees sort correctly relative to terrain and each other (no z-fighting or incorrect draw order) per painter's-algorithm sorting
- [ ] `tree-sprite.ktx2` loads via the same `loadKtx2Texture` pipeline used for tile textures
- [ ] `vite-plugin-ktx2`'s `assetsDir` config (flagged in task:34) is resolved — either sprites move under `assets/textures`, or the plugin config is extended to also compress `assets/sprites/**/*.png` — pick whichever keeps the folder split from task:34 and update `examples/demo/vite.config.ts` accordingly

## Out of Scope

- Multi-frame/animated tree sprites — Phase 2
- Any actor other than trees (enemies, NPCs) — no design doc yet
- Actor-vs-tile collision for trees — Phase 2, trees are decorative-only in Phase 1

## Implementation Steps

1. **Resolve the KTX2 pipeline gap flagged in task:34**: decide whether `assets/sprites/tree-sprite.png` is compressed by extending `vite-plugin-ktx2`'s `include`/`assetsDir` glob in `examples/demo/vite.config.ts`, or by co-locating sprite PNGs physically under `assets/textures/` while keeping a logical `sprites` README/convention. Document the choice inline as a code comment since no design doc currently covers it.
2. **Place 6 actors**: use engine-core's `actors` module (`packages/engine-core/src/actors.rs`) to add 6 tree actor entries with fixed XZ positions spread across the 3×3 outdoor chunk area from task:37 — avoid placing any directly on the player's seam-crossing path.
3. **Wire sprite rendering**: integrate `packages/render/src/sprites`'s billboard draw call into the demo's per-frame loop, reading actor positions from the WASM actors buffer (see `docs/architecture/wasm-bridge.md` for the actors buffer shape) and feeding `tree-sprite.ktx2` as the texture.
4. **Verify billboarding + sorting**: playtest walking around trees from multiple angles, confirm they always face the camera and draw order looks correct against terrain and other trees.

## Context

- Read: `docs/features/demo-scope.md` — Outdoor — Terrain, Sky, Trees section, Tree actors + Sprite texture rows
- Read: `docs/architecture/rendering.md` — billboard sprite + painter's-algorithm sorting design
- Read: `docs/architecture/wasm-bridge.md` — actors buffer shape this task reads
- Depends on: task:34 (tree sprite asset + the KTX2-pipeline-for-sprites question it flagged), task:37 (outdoor terrain must exist to place trees on)
- Key files: `packages/engine-core/src/actors.rs`, `packages/render/src/sprites/`, `examples/demo/vite.config.ts`, `examples/demo/assets/sprites/`
