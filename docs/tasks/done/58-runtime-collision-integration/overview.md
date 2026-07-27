---
task: "58"
slug: runtime-collision-integration
status: done
depends-on: ["54", "55"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Connected global collision movement to authoritative active-instance snapshots and browser scalar submission APIs. Collision now stays in global mode once configured, uses explicit solid geometry only, isolates inactive/removed instances, preserves sliding, and supports runtime snapshot replacement; Rust tests cover translated/rotated and multi-instance activation behavior."
---

# Integrate Runtime Into Global Collision

Connect authoritative collision-active instance content to player movement.

## Desired Changes

- Build collision geometry from explicit content solidity, not every tile.
- Update active collision instances from residency state.
- Preserve global XZ movement and sliding.
- Keep source playable during target failure/loading.
- Expose collision activation through the browser API where needed.

## Definition of Done

- [ ] Floors/openings do not become walls accidentally.
- [ ] Active transformed instance solids block movement globally.
- [ ] Resident-but-inactive target does not block movement.
- [ ] Crossing readiness and collision readiness share authoritative state.
- [ ] Tests cover multiple instances, translated/rotated solids, and failure isolation.

## Out of Scope

- Stairs, ramps, gravity, elevators, or falling.
- Actor collision.
- Demo migration.
- Full physics.

## Implementation Steps

1. Read collision, world-runtime, and level-transitions docs.
2. Replace position-only collision fixtures with content-aware solids.
3. Connect lifecycle activation/deactivation to collision world.
4. Add integration tests through the engine runtime.

## Context

- Read: `docs/architecture/collision.md`
- Read: `docs/features/level-transitions.md`
- Depends on tasks 54 and 55.
