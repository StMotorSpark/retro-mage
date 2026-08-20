---
task: "123"
slug: outdoor-texture-coverage-proof
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-06
outcome: "Published all authored outdoor and castle textures to public asset URLs, added per-material and billboard GPU-registration proof, and recorded the procedural sky texture gap. Demo typecheck, render tests, focused texture coverage, and mountain route browser proof pass."
---

# Prove Outdoor Material Texture Coverage

Verify every authored demo material is resolved and bound to the renderer at representative outdoor and castle viewpoints.

## Desired Changes

- Inspect material-to-scene-ID-to-asset mapping across dungeon, forest, stream, castle, mountain, sky, and billboards.
- Capture representative Playwright views and diagnose any material that is absent, unbound, or rendered as fallback.
- Add focused observable diagnostics or browser proof coverage if required to make per-material texture binding verifiable.

## Definition of Done

- [ ] Each authored surface material ID maps to its intended asset key and renderer texture registration.
- [ ] Representative outdoor, stream, castle, and mountain viewpoints show their authored texture rather than fallback color.
- [ ] Sky and billboard texture behavior is explicitly verified or recorded as an implementation gap.
- [ ] Relevant tests/typechecks pass.

## Out of Scope

- New art, layout redesign, or texture asset replacement.
- Content-addressed asset URLs and cache deployment changes.

## Implementation Steps

1. Inventory material IDs in `demo-world.ts`, descriptor asset keys in `main.ts`, and renderer texture lookup behavior.
2. Drive/teleport Playwright through representative outdoor positions and take screenshots from controlled orientations.
3. Repair any binding omissions and add deterministic diagnostics/proof where needed.
4. Run the renderer and demo verification suite.

## Context

- Read: `docs/features/demo-experience.md`, `docs/features/demo-scope.md`, and `docs/architecture/material-contract.md`.
- Related: task:119 and task:120 established material-ID texture lookup and initial demo registration.
- Key files: `examples/demo/src/main.ts`, `examples/demo/src/demo-world.ts`, `packages/render/src/world-tiles/index.ts`.
