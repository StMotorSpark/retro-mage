---
task: "110"
slug: forest-transition-slice
status: pending
depends-on: ["108", "114"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: ""
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

- [ ] Outdoor geometry is visible through/at the dungeon exit as designed.
- [ ] Crossing has no coordinate or geometry discontinuity.
- [ ] Forest is navigable and selected tree trunks can block movement.
- [ ] Clearing reveals road and sky/cloud content.
- [ ] Warm-to-cool lighting transition is readable when required supplied assets are present.
- [ ] Existing seamless/streaming proofs pass.

## Out of Scope

- Stream and castle.
- Day/night/weather simulation.
- Volumetric clouds.
- Advanced portal culling.

## Implementation Steps

1. Read demo experience/slices and current authored provider/link setup.
2. Add supplied tree, sky, and cloud assets through material contract. If absent, continue integration with explicit fallback and record visual acceptance as blocked.
3. Build outdoor content as authored/provider content with explicit link.
4. Configure outdoor lighting and collision while preserving crossing policy.
5. Add focused browser proof and run transition/streaming regressions.

## Context

- Depends on task:108.
- Read: `docs/features/demo-experience.md`.
- Read: `docs/features/demo-slices.md`.
- Read: `docs/architecture/world-streaming.md`.
- Key files: `examples/demo/src/`, `examples/demo/tests/`.
