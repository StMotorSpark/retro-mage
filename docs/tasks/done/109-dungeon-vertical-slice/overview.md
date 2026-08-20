---
task: "109"
slug: dungeon-vertical-slice
status: done
depends-on: ["108"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: "Independently accepted the authored balcony slice. Production touch traversal reaches and remains grounded on the balcony, the guard constrains lateral movement, look-zone pitch change is paired with camera-frustum visibility evidence for lower-room geometry and the opening, and material/lighting diagnostics report the authored path with zero issues. Required unit, typecheck, build, and browser suites pass."
---

# Build Dungeon Vertical Slice

Extend the dungeon showcase with authored ramp/stair movement and an upper balcony overlooking the starting room.

## Desired Changes

- Add hallway-side ramp/stair and upper balcony geometry.
- Use authored support surfaces and existing vertical movement bridge.
- Ensure balcony and lower room share global scene/depth behavior.
- Add required decorative content without introducing interactable actors.
- Add browser proof for traversal and look-down visibility.

## Definition of Done

- [x] Player reaches balcony through supported movement.
- [x] Balcony collision prevents falling through intended boundaries.
- [x] Player can look down and see starting area correctly.
- [x] Materials and lighting remain coherent across elevations.
- [x] Existing vertical movement and runtime proofs pass.

## Out of Scope

- New elevator/jump/ladder mechanics.
- Outdoor/castle content.
- Dynamic shadows or advanced occlusion.

## Implementation Steps

1. Read vertical movement and demo-slices docs; inspect task 108 content.
2. Add showcase support surfaces and balcony through existing world content contracts.
3. Preserve test-only movement fixtures separately.
4. Add focused browser assertions through production input/render paths.
5. Run vertical and regression suites; record engine gaps without bypasses.

## Context

- Depends on task:108.
- Read: `docs/architecture/vertical-movement.md`.
- Read: `docs/features/demo-slices.md`.
- Key files: `examples/demo/src/`, `examples/demo/tests/`, `packages/engine-core/src/`.
