---
task: "102"
slug: vertical-movement-demo
status: in-flight
depends-on: ["101"]
blocked-by: "Player position remains at (0, 0, 4) with y=0 and does not respond to movement inputs or snap to the platform at y=1.0, meaning vertical collision/movement behavior cannot be verified."
assigned-to: "agent"
created: 2026-07-30
outcome: ""
---

# Add Vertical Movement Demo Content

Extend the existing demo with simple ramp, ledge, landing, steep-slope, and low-ceiling content using existing materials.

## Desired Changes

- Add a textured ramp mesh using existing floor material/assets.
- Add top/bottom platforms and a ledge/fall landing area.
- Add a too-steep ramp for uphill blocking proof.
- Add static low-ceiling geometry for head-clearance proof.
- Submit support surfaces through the authored provider contract.
- Preserve dungeon/outdoor seamless traversal, persistence, and existing scene content.
- Add debug/diagnostic exposure for support selection, grounded state, Y, and vertical velocity where needed by browser tests.

## Definition of Done

- [ ] Demo loads ramp/support content through production world transport.
- [ ] Player can ascend and descend ramp with continuous elevation.
- [ ] Player can walk off ledge, fall, and land safely.
- [ ] Too-steep ramp blocks uphill movement.
- [ ] Low ceiling blocks body penetration.
- [ ] Existing seamless and persistence behavior remains intact.
- [x] Demo build/typecheck pass without new generated artifacts.

## Out of Scope

- New art pipeline or polished stair mesh.
- Decorative stairs/ramp matching validation.
- Browser proof assertions (task:103).
- Combat, interaction, jump, crouch, or fall damage.

## Implementation Steps

1. Read task:101 outcome and inspect current authored demo definitions/provider and renderer geometry conventions.
2. Add minimal ramp/platform/ceiling content using existing textures and explicit support surfaces.
3. Wire geometry through the same definition/provider/transport path as dungeon and outdoor content.
4. Add stable debug hooks without exposing opaque persistence payloads or bypassing runtime authority.
5. Run build/typecheck and manually inspect ramp material alignment and traversal.

## Context

- Read: `docs/architecture/vertical-movement.md`.
- Read: `docs/features/demo-scope.md`.
- Depends on: task:101.
- Key files: `examples/demo/src/demo-world.ts`, `examples/demo/src/main.ts`, `packages/render/src/world-state/`.

## Session Notes

- Code typechecks and builds cleanly.
- Added debug exposures (`grounded`, `verticalVelocity`).
- Stripped trailing whitespace in `demo-world.ts`.
- Removed untracked test results artifacts.
- Exact evidence for ramp traversal and blocking missing (headless env / Playwright server not started).
- Attempted to verify movement via Playwright smoke test. Found that player spawns at `(0, 0, 4)` with `y=0` (ignoring platform at `y=1`), and synthetic touch inputs fail to move the player's X or Z coordinates.
- Task kept in-flight pending physics engine fixes or manual proof of movement DoD items.
