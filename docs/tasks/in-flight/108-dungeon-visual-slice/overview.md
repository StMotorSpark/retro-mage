---
task: "108"
slug: dungeon-visual-slice
status: in-flight
depends-on: ["106", "107", "114"]
blocked-by: ""
assigned-to: "agent"
created: 2026-08-03
outcome: "Repaired demo GPU ownership: main.ts now resolves app asset URLs/bytes through render.resolveMaterialResources; no direct WebGL texture creation/upload remains. Explicit torch/decor billboard metadata preserves asset keys; decorative material no longer uses empty texture keys. Checks pass: git diff --check, render 46 tests, render typecheck, demo build/typecheck. Browser proof via production path reached start pose (-3,0,4) in dungeon and route pose (8,0,4), with renderer diagnostics exposing PNG/KTX2 asset mismatch for every current dungeon asset. Task remains in-flight: supplied dungeon source files are absent/temporary placeholders (including explicitly temporary flat ceiling), so visual acceptance blocked until human-supplied runtime-compatible art arrives; no generated art used."
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
- [ ] Required supplied assets are present, or missing assets are explicitly recorded as visual-acceptance blockers.

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
