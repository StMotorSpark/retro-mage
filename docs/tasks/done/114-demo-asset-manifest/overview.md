---
task: "114"
slug: demo-asset-manifest
status: done
depends-on: ["105"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: "Created asset folders and README/checklist for dungeon, castle, outdoor, sprite, and sky content. Documented asset keys, material roles, UV modes, alpha expectations, and human handoff/blocker rule. Updated dependent task prompts (108, 110, 111, 112) with explicit reference to the README. Verified git diff --check, pnpm test, link/format checks passed."
---

# Define Demo Asset Manifest

Create the application-owned demo asset folder structure, asset-key manifest, and human handoff checklist required by the showcase slices.

## Desired Changes

- Create `examples/demo/assets/` folders for dungeon, castle, outdoor, sprite, and sky content.
- Add `examples/demo/assets/README.md` listing required and optional assets.
- Define stable asset keys and intended material IDs for each required asset.
- Document expected dimensions, alpha mode, UV mode, and compression/build expectations.
- Record that image assets are human-supplied; do not generate replacement art.
- Update relevant demo slice task prompts with the asset handoff/blocker rule.

## Definition of Done

- [x] Folder structure exists under `examples/demo/assets/`.
- [x] README lists every required asset for dungeon, forest, outdoor route, and castle slices.
- [x] Each required asset has an asset key, role/material, UV mode, and alpha expectation.
- [x] README clearly separates required from optional assets.
- [x] Missing supplied assets are visible and cannot be mistaken for completed visual acceptance.
- [x] No image binaries are invented or added by this task.
- [x] Demo asset conventions do not move ownership into engine-core or render.

## Out of Scope

- Creating or editing image assets.
- Texture compression implementation.
- Material registry implementation beyond referencing task 105 IDs.
- Demo geometry or lighting.
- Renderer/WASM changes.

## Implementation Steps

1. Read `docs/features/demo-experience.md`, `docs/features/demo-slices.md`, and `docs/architecture/material-contract.md`.
2. Inventory asset roles required by tasks 108, 110, 111, and 112.
3. Create folders and README without placeholder image binaries.
4. Use stable asset keys and material IDs aligned with task 105.
5. Add the missing-asset handoff rule to dependent slice prompts.
6. Check links, formatting, and generated-artifact cleanliness.

## Context

- Depends on task:105 for material ID alignment.
- Read: `docs/features/demo-experience.md`.
- Read: `docs/features/demo-slices.md`.
- Read: `docs/architecture/material-contract.md`.
- Read: `docs/architecture/asset-pipeline.md`.
- Key files: `examples/demo/assets/`, `docs/tasks/pending/108-dungeon-visual-slice/overview.md`, `docs/tasks/pending/110-forest-transition-slice/overview.md`, `docs/tasks/pending/111-stream-castle-exterior/overview.md`, `docs/tasks/pending/112-castle-interior-slice/overview.md`.
