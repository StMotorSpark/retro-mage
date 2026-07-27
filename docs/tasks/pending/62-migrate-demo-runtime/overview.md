---
task: "62"
slug: migrate-demo-runtime
status: pending
depends-on: ["57", "58", "60", "61"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Migrate Demo to Global Level Runtime

Make the demo use the new provider, manifest, residency, global scene, collision, and transition path end to end.

## Desired Changes

- Replace old room/seam/chunk transition setup in the proof path.
- Load dungeon and outdoor instances through the authoritative runtime.
- Show outdoor content before crossing when visible.
- Use global collision for both instances.
- Preserve touch/gamepad and PWA integration.

## Definition of Done

- [ ] Demo has no active legacy seam transition for the proof path.
- [ ] Player traverses dungeon → outdoor → dungeon.
- [ ] Target geometry renders before crossing.
- [ ] Collision and lighting use global instance data.
- [ ] Source remains playable on target load failure.

## Out of Scope

- Full multi-floor movement.
- WebGPU.
- Advanced portal culling.
- Combat, HUD, audio, or clouds.

## Implementation Steps

1. Read demo-scope, level-transitions, and world-runtime docs.
2. Wire authored provider and manifest from task 61.
3. Connect preload/crossing state to input/player movement.
4. Remove demo-only assumptions about indoor/outdoor coordinate modes.
5. Add integration coverage for forward, reverse, and failed preload.

## Context

- Read: `docs/features/demo-scope.md`
- Read: `docs/architecture/world-runtime.md`
- Depends on tasks 57, 58, 60, and 61.
