---
task: "108"
slug: dungeon-visual-slice
status: done
depends-on: ["106", "107", "114"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: "Implemented the authored dungeon visual slice with torch-lit sub-room start, doorway/vaulted-hall/side-room route, supplied dungeon textures and sprites, opaque material depth/UV transport, billboard cutouts, warm tight-falloff lights, and authored ramp support. Verified lifecycle diagnostics, asset/provider resolution, renderer-owned resources, material and polygon/billboard transport, cancellation/stale rejection, eviction/reload, and movement wiring. Browser proof: 6/6 passed; engine-core: 118 unit + 5 integration passed; render: 46 passed; render typecheck, demo build/typecheck, and git diff --check passed. Temporary hooks are retained only where deterministic browser proofs require them; generated artifacts were removed."
---

# Build Dungeon Visual Slice

Replace placeholder showcase content with the first authored dungeon route: torch-lit sub-room, doorway, vaulted hallway, and one decorated side room.

## Desired Changes

- Add supplied dungeon textures and sprites using the documented asset keys.
- Build start sub-room, open doorway, taller/vaulted hallway, and one side room.
- Assign material IDs and warm torch lighting through production paths.
- Preserve current input, world runtime, collision, and transition contracts.
- Add deterministic browser/manual diagnostics only where needed to prove the slice.

## Definition of Done

- [x] Player starts in small torch-lit sub-room.
- [x] Player traverses doorway, vaulted hallway, and side room.
- [x] Textured opaque materials render with correct depth and UV behavior.
- [x] Billboard decorative sprites render as cutouts.
- [x] Warm dim light has tight falloff and no shadow/blend path.
- [x] Existing runtime/browser proofs remain passing.
- [x] Required supplied assets are present, or missing assets are explicitly recorded as visual-acceptance blockers.

## Out of Scope

- Balcony/ramp slice.
- Outdoor scene.
- Castle.
- Interactable actors.
- New material capabilities beyond tasks 105–107.

## Implementation Steps

1. Read demo experience/slices and inspect current demo world/runtime setup.
2. Inventory supplied assets; do not generate replacement art. If required assets are absent, continue non-visual integration only and record the visual blocker (see `examples/demo/assets/README.md`).
3. Build authored dungeon content through existing provider/world paths.
4. Wire material IDs, textures, sprites, lights, and collision.
5. Run focused browser proof plus relevant regression tests; record gaps.

## Context

- Depends on tasks:106,107.
- Read: `docs/features/demo-experience.md`.
- Read: `docs/features/demo-slices.md`.
- Key files: `examples/demo/src/`, `examples/demo/tests/`, `packages/render/`.
