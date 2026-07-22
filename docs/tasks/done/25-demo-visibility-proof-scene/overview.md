---
task: "25"
slug: demo-visibility-proof-scene
status: done
depends-on: ["22", "23", "24"]
blocked-by: ""
assigned-to: ""
created: 2025-06-16
outcome: "Implemented multi-room, multi-floor test scene in examples/demo proving shadowcasting occlusion wall, ambient light & torch sight-radius, and vertical opening floor connectivity. Updated PerfOverlay with live controls to adjust max_sight_distance, cull_precision_distance, and ambient_light live while displaying real-time sight radius and rendered tile/actor counts. Verified manually in Chrome macOS build (pnpm --filter demo build & dev): wall occludes actor 1 at (0, 0, -2) until walking around z=0 wall; dark corridor tiles at (-4, -3) collapse sight radius under 0.0 ambient light until approaching torch 1 or increasing ambient light; upper floor tiles and actor 2 at (2, 1, 1) are occluded until standing near (2, 0, 2) vertical opening."
---

# Demo Visibility Proof Scene

Prove the full visibility slice (tasks 20–24) end to end in `examples/demo`: a hand-built scene with walls, a multi-floor gap, and light sources, plus a debug overlay showing the tuning knobs in action.

## Desired Changes

- Extend `examples/demo`'s scene setup (wherever tiles/actors/lights are currently populated, likely in or near `examples/demo/src/main.ts`) with a small hand-built room layout: at least one solid wall occluding part of the room, at least one vertical-opening tile connecting to a second floor/level at a different `z`, and at least two light sources — one bright near the player's expected starting position, one dim or absent to demonstrate the dark/torch-limited sight-radius behavior
- Add a debug overlay control (following `examples/demo/src/perf-overlay.ts`'s existing precedent from task:14) exposing: current computed sight radius (read-only display), a way to adjust `max_sight_distance` and `cull_precision_distance` (task:24's config) live, and current ambient light level (read-only or adjustable, worker's choice)
- Confirm visually (manual check, described in Definition of Done) that walking the player toward the wall, into the dark area, and near the vertical opening produces the expected visible/occluded behavior

## Definition of Done

- [ ] `examples/demo` loads a scene with a wall that visibly blocks tiles/actors/lights behind it from view until the player moves around it
- [ ] `examples/demo` demonstrates the ambient-light-driven sight radius: an area with low/no ambient light and no nearby light source renders little to nothing beyond a short radius; moving near a light source (or into a well-lit area) visibly extends what's rendered
- [ ] `examples/demo` demonstrates the vertical-opening behavior: standing near the opening lets the player see the connected floor; standing away from it does not
- [ ] Debug overlay displays current sight radius and allows adjusting `max_sight_distance`/`cull_precision_distance` live, with visible effect on what's rendered when changed
- [ ] `pnpm --filter demo build` (or equivalent existing demo build/dev command) succeeds
- [ ] Manual verification steps performed and noted in this task's `outcome` field on completion (device/browser used, what was observed)

## Out of Scope

- Automated visual regression testing (no pixel-diff/screenshot test infra exists yet) — this task is proven via manual verification, matching how prior demo tasks (e.g. task:14, task:19) were verified
- Any new `render`-side rendering features (sprites, lighting shaders) beyond what already exists — this task only arranges existing rendering capability into a scene that proves the visibility cull, it does not add new visual effects
- Outdoor/chunked terrain scenes — this task stays within the indoor multi-floor dungeon scope task:23 covers

## Implementation Steps

1. **Read `docs/architecture/visibility.md`** in full for the behaviors this scene needs to demonstrate
2. **Review `examples/demo/src/main.ts`** and `examples/demo/src/perf-overlay.ts`** to understand current scene setup and the existing debug-overlay pattern from task:14
3. **Build the test scene** — populate tiles (including `solid` wall tiles and at least one vertical-opening tile per task:20/23's fields), actors, and lights (per task:20's fields) via `engine-core`'s existing setter methods, arranged so a wall, a dark area, and a floor-to-floor opening are all reachable from the player's starting position
4. **Add the debug overlay controls** for sight radius display and live `max_sight_distance`/`cull_precision_distance` adjustment, calling task:24's setters
5. **Manually verify** each Definition of Done bullet by running the demo (`pnpm --filter demo dev` or equivalent) and walking the player through the scene
6. **Record verification results** in this task's `outcome` frontmatter field when moving to done, per this repo's task lifecycle convention

## Context

**Read first:**
- `docs/architecture/visibility.md` — the behaviors this scene must prove
- `docs/tasks/done/14-demo-controls-and-perf-toggle/overview.md` — precedent for adding a debug overlay control to the demo

**Related work:**
- task:20, task:21, task:22, task:23, task:24 — this task is the integration proof for all of them
- task:09 (`render`'s buffer reader) — already reads whatever `engine-core` marks active/visible; no changes expected here, but if reading reveals a gap, flag it rather than silently patching around it

**Key files:**
- `examples/demo/src/main.ts`
- `examples/demo/src/perf-overlay.ts`
