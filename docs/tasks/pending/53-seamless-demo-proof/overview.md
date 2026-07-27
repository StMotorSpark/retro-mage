---
task: "53"
slug: seamless-demo-proof
status: pending
depends-on: ["51", "52"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Build Seamless Two-Level Demo Proof

Create the smallest playable authored dungeon-to-outdoor transition that proves strong global-scene continuity.

## Desired Changes

- Define finite dungeon and outdoor level content through application providers.
- Register a bidirectional link with explicit anchors.
- Preload target content before visual reveal.
- Render source and target together in global coordinates.
- Walk across and return through the connection.
- Retain PWA shell behavior for the demo app.

## Definition of Done

- [ ] Dungeon and outdoor content are separate level definitions.
- [ ] One definition/provider path is application-owned and engine-agnostic.
- [ ] Target geometry is visible before crossing.
- [ ] Crossing has no load screen, geometry pop, or coordinate discontinuity.
- [ ] Collision works on both sides.
- [ ] Return traversal works.
- [ ] Integration tests cover loading, failure-safe source behavior, and crossing.

## Out of Scope

- Full multi-floor physics.
- WebGPU.
- Combat, HUD, audio, animated sprites, and procedural clouds.
- Advanced portal culling.

## Implementation Steps

1. Read demo-scope, level-transitions, world-runtime, rendering, and collision docs.
2. Build two small finite fixture definitions in the app.
3. Register instances and link anchors through the manifest.
4. Exercise provider loading and residency gates.
5. Add integration coverage for pre-crossing visibility and return travel.
6. Verify the PWA shell remains installable and cached.

## Context

- Read: `docs/features/demo-scope.md`
- Read: `docs/features/level-transitions.md`
- Depends on: tasks 51 and 52.
