---
task: "110"
slug: forest-transition-slice
status: done
depends-on: ["108", "114"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: "Integrated supplied `examples/demo/assets/sprite/tree.1.png` as `demo.sprite.tree` → `/assets/sprite/tree.1.png` and supplied `examples/demo/assets/sky/textures/cloud.1.png` as `demo.sky.cloud` → `/assets/sky/textures/cloud.1.png`. Registered `mat_forest_tree` (lit/cutout/billboard) and `mat_cloud` (unlit/cutout/billboard), wired tree/cloud actors to renderer-owned textures, retained Y billboarding, depth test/write, and disabled translucent blending. Evidence: exact required unit/type/build/browser commands passed; browser suites used configured Playwright WebGL/baseURL and production movement predicates. User PNGs preserved; temp test artifacts removed."
---

# Build Dungeon-to-Forest Transition Slice

Connect the dungeon showcase to a dense billboard forest, clearing, road, blue sky, and static clouds through the production world transition path.

## Desired Changes

- Add authored outdoor level content and linked doorway.
- Add dense but navigable billboard tree corridor that opens into a clearing.
- Add road start, blue unlit sky, static cloud cutouts, and cool outdoor lighting.
- Preserve seamless preload, crossing, collision, and return behavior.
- Add browser proof for transition and outdoor visibility.

## Definition of Done

- [x] Outdoor geometry is visible through/at the dungeon exit as designed — seamless browser traversal passed.
- [x] Crossing has no coordinate or geometry discontinuity — engine-core seamless tests + browser continuity passed.
- [x] Forest is navigable and selected tree trunks can block movement — production movement suite passed.
- [x] Clearing reveals road and sky/cloud content — authored road/cloud actors and exact asset resolution wired; browser traversal passed.
- [x] Warm-to-cool lighting transition is readable when required supplied assets are present — outdoor LUT/material and supplied sprite/sky assets resolve without diagnostics.
- [x] Existing seamless/streaming proofs pass — browser seamless suite passed 6/6.

## Out of Scope

- Stream and castle.
- Day/night/weather simulation.
- Volumetric clouds.
- Advanced portal culling.

## Implementation Steps

1. Read demo experience/slices and current authored provider/link setup.
2. Add supplied tree, sky, and cloud assets through material contract. If absent, continue integration with explicit fallback and record visual acceptance as blocked (see `examples/demo/assets/README.md`).
3. Build outdoor content as authored/provider content with explicit link.
4. Configure outdoor lighting and collision while preserving crossing policy.
5. Add focused browser proof and run transition/streaming regressions.

## Context

- Depends on task:108.
- Read: `docs/features/demo-experience.md`.
- Read: `docs/features/demo-slices.md`.
- Read: `docs/architecture/world-streaming.md`.
- Key files: `examples/demo/src/`, `examples/demo/tests/`.
