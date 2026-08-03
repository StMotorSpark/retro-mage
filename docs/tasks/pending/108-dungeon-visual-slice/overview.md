---
task: "108"
slug: dungeon-visual-slice
status: pending
depends-on: ["106", "107"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: ""
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

- [ ] Player starts in small torch-lit sub-room.
- [ ] Player traverses doorway, vaulted hallway, and side room.
- [ ] Textured opaque materials render with correct depth and UV behavior.
- [ ] Billboard decorative sprites render as cutouts.
- [ ] Warm dim light has tight falloff and no shadow/blend path.
- [ ] Existing runtime/browser proofs remain passing.
- [ ] Supplied asset list and any missing assets are recorded.

## Out of Scope

- Balcony/ramp slice.
- Outdoor scene.
- Castle.
- Interactable actors.
- New material capabilities beyond tasks 105–107.

## Implementation Steps

1. Read demo experience/slices and inspect current demo world/runtime setup.
2. Inventory supplied assets; do not generate replacement art.
3. Build authored dungeon content through existing provider/world paths.
4. Wire material IDs, textures, sprites, lights, and collision.
5. Run focused browser proof plus relevant regression tests; record gaps.

## Context

- Depends on tasks:106,107.
- Read: `docs/features/demo-experience.md`.
- Read: `docs/features/demo-slices.md`.
- Key files: `examples/demo/src/`, `examples/demo/tests/`, `packages/render/`.
