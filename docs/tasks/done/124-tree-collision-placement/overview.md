---
task: "124"
slug: tree-collision-placement
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-07
outcome: "Tree blockers use existing collision-only tile 9 at offset footprints; opaque balcony rail spans full elevated edge, restoring lateral guard. PASS: pnpm --filter demo typecheck; cargo test --manifest-path packages/engine-core/Cargo.toml (124 tests); pnpm exec playwright test -c playwright.config.ts examples/demo/tests/full-route.spec.ts (1); pnpm exec playwright test -c playwright.config.ts examples/demo/tests/browser-seamless.spec.ts (6)."
---

# Separate Tree Visual Placement From Collision

Forest trees render at their authored locations without billboard art intersecting opaque collision pillars.

## Desired Changes

- Inspect tree actor and solid-tile construction in `examples/demo/src/demo-world.ts`.
- Replace the shared-coordinate tree actor/solid wall construction with an authored representation that preserves a navigable forest corridor and blocks player traversal at tree trunks.
- Keep tree sprite actors camera-facing alpha-cutout billboards and keep collision separate from render geometry as required by the material contract.
- Add deterministic browser proof that a visible tree is not visually embedded in opaque pillar geometry while its trunk area still blocks traversal.

## Definition of Done

- [ ] No tree actor shares an identical global `(x, z)` center with a visible opaque solid tile used as its trunk blocker unless the visual geometry is deliberately shaped so it cannot protrude through the billboard.
- [ ] Forest route remains traversable through the intended corridor and a tree/trunk collision boundary still blocks direct traversal where expected.
- [ ] A focused browser proof validates actor and collision/render placement from the resolved scene, plus a screenshot or equivalent visual assertion that detects pillar-through-tree regression.
- [ ] Existing full-route and seamless browser tests remain valid or are updated only to assert the same documented route behavior.
- [ ] `pnpm --filter demo typecheck` and focused affected Playwright test(s) pass.

## Out of Scope

- New tree art, tree variation, vegetation editor UI, or general actor collision framework.
- Changing billboard alpha threshold, blending policy, or unrelated outdoor route geometry.
- Weakening route or collision assertions to accommodate incorrect placement.

## Implementation Steps

1. Read the demo experience, material contract, and current tree/tile definitions. Identify local-to-global coordinates after the outdoor instance transform.
2. Choose an app-authored collision representation independent from the billboard visual placement. Keep the resulting collision footprint explicit and keep the intended route coordinates stable where possible.
3. Update `outdoorTiles()` and outdoor actor construction together so render geometry, actor placement, and collision geometry express the chosen representation.
4. Extend an existing focused Playwright spec or add a dedicated one. It must assert resolved global positions and real movement blocking, not only that actor/tile arrays exist.
5. Run the specified focused checks and remove generated Playwright artifacts.

## Context

**Read first:**
- `docs/features/demo-experience.md` — dense navigable billboard forest requirement.
- `docs/architecture/material-contract.md` — billboard cutout and render/collision separation.
- `docs/architecture/collision.md` — transformed collision behavior.

**Key files:**
- `examples/demo/src/demo-world.ts`
- `examples/demo/src/main.ts`
- `examples/demo/tests/full-route.spec.ts`
- `examples/demo/tests/browser-seamless.spec.ts`


## Verification Failure

Independent verification on 2026-08-07 rejected completion:

```text
pnpm --filter demo typecheck                              PASS
cargo test --manifest-path packages/engine-core/Cargo.toml PASS (124 tests)
pnpm exec playwright test -c playwright.config.ts examples/demo/tests/full-route.spec.ts
FAIL: balcony guard expected x < 25.5; received x = 26.433883666992188
```

The added collision-only balcony guard does not preserve the existing upper-route lateral blocking behavior. Diagnose and repair this regression without weakening the assertion, then rerun focused browser proof before completion.
