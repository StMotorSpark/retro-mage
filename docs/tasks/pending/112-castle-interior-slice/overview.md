---
task: "112"
slug: castle-interior-slice
status: pending
depends-on: ["111", "114"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: ""
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

- [ ] Player enters castle through open doorway without seam discontinuity.
- [ ] Three distinct vertical layers render and collide correctly.
- [ ] Player reaches balcony and sees entry hall below.
- [ ] Columns/statues render with correct cutout/depth behavior.
- [ ] Castle lighting is visibly brighter/cooler with broad falloff when required supplied assets are present.
- [ ] Existing vertical, transition, and runtime proofs pass.

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
