---
task: "34"
slug: demo-asset-folder-scaffold
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-23
outcome: "Created source asset folder structure for examples/demo with examples/demo/assets/sprites/ (.gitkeep included) and README.md files for textures/ and sprites/ detailing asset inventory specs (dimensions, format, purpose) and build-time KTX2 plugin coverage notes."
---

# Demo Asset Folder Scaffold

Create the source asset folder structure for `examples/demo`'s Phase 1 demo textures and sprites, per the Asset Inventory in `docs/features/demo-scope.md`, so real art assets have a known place to land.

## ⚠️ Human-Provided Assets Flag

The real PNG source files (`stone-wall.png`, `stone-floor.png`, `grass.png`, `tree-sprite.png`) are **not** created by this task. A human will supply them after this task lands. This task only creates the folder structure, naming convention, and placeholder/README so the human knows exactly where to drop files and what dimensions/format each needs.

## Desired Changes

- Create `examples/demo/assets/textures/` subfolder entries (folder already exists with one unrelated `wall.png` — leave it, do not delete)
- Create `examples/demo/assets/sprites/` folder (does not exist yet)
- Add `examples/demo/assets/textures/README.md` documenting expected filenames, dimensions, and source format for each of: `stone-wall.png` (64×64), `stone-floor.png` (64×64), `grass.png` (64×64)
- Add `examples/demo/assets/sprites/README.md` documenting expected filenames/dimensions for: `tree-sprite.png` (64×128, single frame billboard)
- Do not add placeholder image binaries — only the README + folder structure (use a `.gitkeep` if the sprites folder would otherwise be empty and untracked by git)

## Definition of Done

- [ ] `examples/demo/assets/textures/README.md` exists listing `stone-wall.png`, `stone-floor.png`, `grass.png` with exact dimensions and note that `vite-plugin-ktx2` compresses these to `.ktx2` at build time
- [ ] `examples/demo/assets/sprites/` folder exists, tracked in git (via `.gitkeep` if empty), with `README.md` listing `tree-sprite.png` (64×128)
- [ ] Existing `examples/demo/assets/textures/wall.png` (used by current placeholder texture-demo) is untouched
- [ ] No new binary image files added by this task

## Out of Scope

- Sourcing, drawing, or generating the actual texture/sprite art
- Wiring these textures into the render pipeline (see task:36, task:38)
- Changing `vite-plugin-ktx2` config

## Implementation Steps

1. Create `examples/demo/assets/sprites/` folder with a `.gitkeep`.
2. Write `examples/demo/assets/textures/README.md` — table of filename, dimensions, format, purpose (copy the Asset Inventory table structure from `docs/features/demo-scope.md`, textures rows only).
3. Write `examples/demo/assets/sprites/README.md` — same structure, `tree-sprite.png` row only.
4. Confirm `vite-plugin-ktx2`'s `assetsDir: 'assets/textures'` config in `examples/demo/vite.config.ts` — note in the textures README that sprites live in a separate folder (`assets/sprites`) and are NOT currently covered by that plugin's `assetsDir` (flag this as something task:38 must address — either move sprites under `assets/textures` or extend the plugin config — do not resolve it in this task).

## Context

- Read: `docs/features/demo-scope.md` — Asset Inventory table, source of truth for filenames/dimensions/formats
- Read: `docs/architecture/asset-pipeline.md` — KTX2 compression pipeline these assets flow through
- Related: task:36 (indoor dungeon scene) consumes `stone-wall.png`/`stone-floor.png`; task:37 consumes `grass.png`; task:38 consumes `tree-sprite.png`
- Key files: `examples/demo/assets/textures/`, `examples/demo/assets/sprites/` (new), `examples/demo/vite.config.ts`
