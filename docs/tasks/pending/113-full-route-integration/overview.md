---
task: "113"
slug: full-route-integration
status: pending
depends-on: ["109", "112"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: ""
---

# Integrate and Playtest Full Showcase Route

Compose dungeon, forest, stream, road, and castle slices into one stable showcase route and classify remaining gaps.

## Desired Changes

- Validate the complete first-person route through production input, world, collision, streaming, and render paths.
- Add only integration fixes required to preserve slice contracts.
- Run supplied-asset completeness review.
- Record visual, engine, content, and performance gaps in the appropriate docs or follow-up tasks.
- Preserve deterministic runtime fixtures and existing browser proofs.

## Definition of Done

- [ ] Full route is playable from dungeon start to throne-room approach.
- [ ] All intended transitions, collision boundaries, support surfaces, and look-down views work.
- [ ] No material/asset fallback appears unexpectedly in showcase route.
- [ ] Existing runtime, persistence, streaming, and vertical movement proofs pass.
- [ ] Remaining gaps are classified and have clear follow-up scope.
- [ ] No generated traces, screenshots, or test artifacts remain tracked.

## Out of Scope

- Broad renderer optimization without measured evidence.
- Day/night/weather systems.
- Interactive gameplay systems.
- Final art polish beyond supplied assets and contract compliance.

## Implementation Steps

1. Read all slice outcomes and compare route against `demo-experience.md`.
2. Run focused and full browser proofs using the production harness.
3. Playtest route manually with supplied assets and record concrete failures.
4. Fix only integration defects within existing contracts.
5. Create follow-up tasks for unresolved design or engine gaps; do not hide them in this task.

## Context

- Depends on tasks:109,112.
- Read: `docs/features/demo-experience.md`.
- Read: `docs/features/demo-slices.md`.
- Read: `docs/architecture/material-contract.md`.
- Read: `docs/research/known-gaps.md`.
- Key files: `examples/demo/`, `packages/engine-core/`, `packages/render/`.
