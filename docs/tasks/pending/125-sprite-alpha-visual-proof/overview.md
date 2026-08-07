---
task: "125"
slug: sprite-alpha-visual-proof
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-07
outcome: ""
---

# Prove Sprite Alpha Cutouts End to End

Every authored demo cutout sprite preserves source alpha through decode, WebGL upload, and billboard rendering without an opaque rectangular matte.

## Desired Changes

- Diagnose the reported opaque/incorrect transparency appearance for tree, torch, dungeon decoration, statue, and cloud billboards.
- Verify source PNG alpha values, decoded image alpha, texture-upload behavior, and sprite fragment output as one end-to-end path.
- Repair the failing stage while preserving authored artwork, dimensions, cutout shader semantics (`alpha < 0.1` discard), depth testing, and depth writing.
- Add an automated visual proof that fails when a representative sprite renders an opaque rectangular matte or its texture path falls back.

## Definition of Done

- [ ] Each declared cutout asset (`torch`, `tree`, `dungeon_deco`, `statue`, `cloud`) has non-opaque background alpha appropriate to the renderer cutout threshold, verified by reproducible metadata/pixel inspection.
- [ ] Each corresponding sprite ID resolves to its intended texture and renders through the textured billboard path, not fallback color.
- [ ] Browser screenshot/pixel assertions cover representative tree plus at least one non-tree cutout sprite and reject rectangular opaque background regression.
- [ ] Sprite rendering remains cutout/depth-tested/depth-writing with blending disabled; translucent blending is not added.
- [ ] `pnpm --filter render test`, `pnpm --filter demo typecheck`, and focused Playwright proof pass.

## Out of Scope

- Replacing or artistically redrawing supplied sprite art.
- Translucent sprites, alpha sorting, animated sprites, or general material-system redesign.
- World placement/collision changes, except minimal deterministic test positioning required to view a sprite.

## Implementation Steps

1. Read asset mapping, material descriptors, `resolveMaterialResources`, and `SpriteRenderer`. Reproduce visual issue with controlled browser camera/screenshot evidence.
2. Inspect raw PNG alpha distribution and decoded/uploaded texture behavior. Determine whether source alpha, decode/upload, UV orientation, shader, or test camera is responsible.
3. Apply smallest repair at responsible boundary. Preserve application asset ownership and existing cutout contract.
4. Add deterministic inspection and browser visual assertions. Do not treat texture registration alone as alpha proof.
5. Run specified tests and clean transient screenshots/traces unless they are intentional checked-in fixtures.

## Context

**Read first:**
- `docs/architecture/material-contract.md` — sprite alpha-cutout contract.
- `docs/features/demo-experience.md` — billboard content requirement.
- `examples/demo/assets/README.md` — authored asset mapping and alpha expectations.

**Key files:**
- `examples/demo/src/main.ts`
- `packages/render/src/sprites/index.ts`
- `packages/render/src/materials/resources.ts`
- `examples/demo/assets/sprite/`
- `examples/demo/tests/texture-coverage.spec.ts`
