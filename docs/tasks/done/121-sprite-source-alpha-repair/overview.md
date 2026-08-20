---
task: "121"
slug: sprite-source-alpha-repair
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-06
outcome: "Converted the opaque light checkerboard mattes in torch.1.png and dungeon.deco.png to alpha while retaining the supplied artwork and dimensions. All cutout sprites now report alpha; source-image inspection confirms transparent backgrounds. Render tests and demo typecheck pass."
---

# Repair Demo Sprite Cutout Alpha

Correct supplied demo billboard source files that lack cutout alpha without inventing or replacing their artwork.

## Desired Changes

- Inspect demo sprite PNG metadata and visible background colors.
- For supplied sprites missing alpha, convert only the uniform matte/background pixels to transparent alpha while preserving visible artwork and dimensions.
- Verify cutout sprite rendering has no opaque rectangular matte in the demo.

## Definition of Done

- [ ] Every asset declared `cutout` in `examples/demo/assets/README.md` has an alpha channel appropriate for the renderer's `alpha < 0.1` cutout rule.
- [ ] Visual source content, dimensions, and asset ownership remain intact; no replacement/generated artwork is introduced.
- [ ] A screenshot or automated image-metadata check documents the repaired alpha.

## Out of Scope

- Changing sprite geometry, billboard sizing, blending, or shader cutout threshold.
- Changing opaque surface textures.
- Artistic retouching beyond removal of a demonstrably uniform source matte.

## Implementation Steps

1. Inspect alpha channels and palette/transparency metadata for every cutout sprite.
2. Confirm any opaque background is a uniform matte rather than intentional visible content before editing.
3. Apply a lossless alpha-only conversion to confirmed matte pixels and retain PNG dimensions/color data.
4. Verify the result with image metadata and a Playwright screenshot.

## Context

- Read: `docs/architecture/material-contract.md` — billboard sprites are depth-tested alpha cutouts.
- Read: `examples/demo/assets/README.md` — the source assets remain human supplied and cannot be replaced with invented art.
- Key files: `examples/demo/assets/sprite/`, `examples/demo/assets/sky/textures/cloud.1.png`, `packages/render/src/sprites/index.ts`.
