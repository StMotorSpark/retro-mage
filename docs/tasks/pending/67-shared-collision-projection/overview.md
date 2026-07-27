---
task: "67"
slug: shared-collision-projection
status: pending
depends-on: ["65", "58"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Derive Collision From Shared Runtime Content

Remove app-side manual collision duplication and make collision consume the same authoritative transformed content used for rendering.

## Desired Changes

- Build collision projection from authoritative runtime level content.
- Preserve explicit solidity/opening/stair semantics.
- Update collision activation from residency state.
- Remove demo calls that manually submit separate solid geometry.
- Add projection consistency checks for render and collision content.

## Definition of Done

- [ ] Demo collision requires no manual per-tile collision loop.
- [ ] Render and collision use identical instance transforms and content versions.
- [ ] Non-solid tiles/openings remain traversable.
- [ ] Active target collision begins only at engine crossing activation.
- [ ] Tests detect render/collision content divergence.

## Out of Scope

- Actor collision.
- Full multi-floor physics.
- New collision shapes.
- WebGPU.

## Implementation Steps

1. Read collision and world-runtime docs.
2. Add runtime collision projection/query to the shared authority.
3. Connect projection to `EngineState` movement.
4. Migrate demo and remove duplicated solid submission.
5. Add integration tests for two transformed instances.

## Context

- Depends on tasks 65 and 58.
- Key files: `packages/engine-core/src/global_collision.rs`, `world_runtime.rs`, `examples/demo/src/main.ts`.
