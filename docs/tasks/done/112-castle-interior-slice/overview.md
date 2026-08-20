---
task: "112"
slug: castle-interior-slice
status: done
depends-on: ["111", "114"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: "Added the castle interior vertical slice, supplied-material/statue wiring, and focused production-touch browser proof. Contact-stable global collision preserves the unchanged stream-bank displacement assertion while a separate cobblestone route proves the authored opening remains passable."
---

# Build Castle Interior Vertical Slice

Build the castle entry hall, three vertical layers, columns/statue billboards, grand stairs, balcony, and throne-room approach.

## Desired Changes

- Add open castle entry and interior global geometry.
- Add entry-level columns and supplied statue billboard sprites.
- Add grand staircase, balcony ring, and upper route.
- Add flanking room shells and throne-room approach.
- Configure bright cool broad-falloff lighting.
- Add browser proof for entry, stair, balcony, and look-down visibility.

## Definition of Done

- [x] Player enters castle through open doorway without seam discontinuity.
- [x] Three distinct vertical layers render and collide correctly.
- [x] Player reaches balcony and sees entry hall below.
- [x] Columns/statues render with correct cutout/depth behavior.
- [x] Castle lighting is visibly brighter/cooler with broad falloff when required supplied assets are present.
- [x] Existing vertical, transition, and runtime proofs pass.

## Out of Scope

- Combat, NPCs, and interactable statues.
- Complete side-room traversal.
- Throne-room gameplay.
- Dynamic shadows or transparent materials.

## Implementation Steps

1. Read demo experience/slices and vertical movement docs.
2. Add supplied castle interior assets/material assignments. If absent, continue non-visual integration only and record the visual blocker (see `examples/demo/assets/README.md`).
3. Build entry, stairs, balcony, layers, and shell rooms through existing content contracts.
4. Configure castle lighting without inventing multi-light blending.
5. Add focused browser proof and run route regressions.

## Context

- Depends on task:111.
- Read: `docs/features/demo-experience.md`.
- Read: `docs/features/demo-slices.md`.
- Read: `docs/architecture/vertical-movement.md`.
- Key files: `examples/demo/src/`, `examples/demo/tests/`.

## Verification

- `CI=1 pnpm test:demo:e2e -- examples/demo/tests/browser-seamless.spec.ts --workers=1` — 7 passed.
- `CI=1 pnpm test:demo:e2e -- examples/demo/tests/movement.spec.ts --workers=1` — 7 passed.
- `pnpm --filter engine-core test` — 124 tests passed; `pnpm --filter render test -- --run` — 46 passed.
- `pnpm --filter render typecheck`, `pnpm --filter demo build`, and `pnpm --filter demo typecheck` passed; `git diff --check` passed.
- The browser route uses normal `.retro-input-move-zone` touch events, approaches the real stream-bank AABB through a small-dispatch waypoint, preserves `Math.abs(afterBlocked.pose.x - blocked.pose.x) < 0.75`, and separately crosses the cobblestone opening. No fixed waits, teleport, debug bypass, geometry changes, or task 113 changes are included.
