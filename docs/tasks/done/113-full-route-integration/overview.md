---
task: "113"
slug: full-route-integration
status: done
depends-on: ["109", "112"]
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: "Production-touch full-route proof reaches dungeon, forest, stream crossing, castle entry, balcony, and throne approach with verified collision, support, sightline, asset, and frame-health diagnostics. Castle route openings and support surfaces were reconciled; supplied mountain asset remains a documented follow-up (task:118). Required engine, render, demo, and serial browser regressions pass."
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

- [x] Full route is playable from dungeon start to throne-room approach. Evidence: serial `full-route.spec.ts` uses production touch zones only and reaches global castle throne approach at `z >= 28`, `y >= 1.6`.
- [x] All intended transitions, collision boundaries, support surfaces, and look-down views work. Evidence: serial route proof asserts dungeon-to-outdoor continuity, forest trunk, stream bank, cobblestone, castle openings/guards, grounded stair/balcony/throne supports, and castle look-down visibility; existing movement proof covers dungeon balcony.
- [x] No material/asset fallback appears unexpectedly in showcase route. Evidence: route proof asserts exact resolved route asset keys and `materialDiagnostics === 0`.
- [x] Existing runtime, persistence, streaming, and vertical movement proofs pass. Evidence: `engine-core` 119 unit + 5 integration tests, render 46 tests, and serial browser suite pass; browser suite covers preload/failure, eviction/reload, restore, overflow, cancellation/stale, and movement.
- [x] Remaining gaps are classified and have clear follow-up scope. Evidence: verified mountain resolver/geometry omission recorded in `docs/research/known-gaps.md`; task:118 scopes repair.
- [x] No generated traces, screenshots, or test artifacts remain tracked. Evidence: removed `test-results`, demo `dist`, and Vite cache; final artifact scan is empty.

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
