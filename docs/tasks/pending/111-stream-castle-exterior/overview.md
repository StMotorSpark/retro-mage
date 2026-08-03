---
task: "111"
slug: stream-castle-exterior
status: pending
depends-on: ["110"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: ""
---

# Build Stream and Castle Exterior Slice

Extend the outdoor route across varied grass, an opaque sloped stream with collision barrier, cobblestone crossing, and visible textured castle exterior.

## Desired Changes

- Add varied grass terrain, road continuation, and cobblestone path materials.
- Add opaque textured stream surface with slight downward visual slope.
- Add invisible stream collision barrier while keeping cobblestone traversable.
- Add textured castle exterior landmark and open entry sightline.
- Preserve global placement, depth, streaming, and collision ownership.

## Definition of Done

- [ ] Road leads toward visible castle.
- [ ] Stream surface renders opaque with correct slope/material.
- [ ] Player cannot enter stream.
- [ ] Cobblestone path crosses stream without blockage.
- [ ] Castle exterior is visible from clearing and road.
- [ ] Castle entry sightline has no seam or coordinate discontinuity.
- [ ] Focused browser proof and relevant regressions pass.

## Out of Scope

- Water transparency/reflection/animation.
- Castle interior.
- Swimming or stream interaction.
- Dynamic weather.

## Implementation Steps

1. Read material, demo-slice, collision, and seam docs.
2. Add supplied terrain, water, cobblestone, and castle assets.
3. Build visual stream and separate collision-only barrier.
4. Place castle exterior and entry through global level-instance content.
5. Prove route in browser and record collision/material/scale gaps.

## Context

- Depends on task:110.
- Read: `docs/architecture/material-contract.md`.
- Read: `docs/features/demo-slices.md`.
- Read: `docs/architecture/seam-rendering.md`.
- Key files: `examples/demo/src/`, `examples/demo/tests/`, `packages/engine-core/src/`.
