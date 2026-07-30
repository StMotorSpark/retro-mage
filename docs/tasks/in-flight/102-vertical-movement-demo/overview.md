---
task: "102"
slug: vertical-movement-demo
status: in-flight
depends-on: ["101"]
blocked-by: ""
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
- Task kept in-flight pending manual or bounded proof of movement DoD items.
