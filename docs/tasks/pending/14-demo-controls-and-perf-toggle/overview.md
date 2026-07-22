---
task: "14"
slug: demo-controls-and-perf-toggle
status: pending
depends-on: ["13"]
blocked-by: ""
assigned-to: ""
created: 2025-07-22
outcome: ""
---

# Demo Controls and Perf Overlay Toggle

Wire real gamepad/touch controls into `examples/demo` so the finalized input schema is testable end to end on both device types, and add a minimal on-screen performance overlay whose visibility is toggled by a mapped button — exercising a face button (gamepad) and its on-screen equivalent (touch) at the same time.

## Desired Changes

- Wire `examples/demo/src/main.ts`'s per-frame loop to consume `InputState` from task:13 and drive the camera:
  - `move.x/y` translates the camera position along the ground plane, relative to current camera yaw (forward/back/strafe), each frame
  - `look.x/y` adjusts camera yaw/pitch each frame
  - Read the current camera pose each frame from the existing `WorldStateReader`'s camera view (`reader.read().camera`) as the base to apply deltas onto, then call `engineState.set_camera(...)` with the updated pose — camera movement is no longer a one-time startup call
- Add a minimal DOM-based performance overlay to `examples/demo` (not the full `examples/bench` p95/p99 tool) showing a live, rolling average frame time or FPS number, updating a few times per second
- Bind one button slot (pick `face1`) to toggle the overlay's visibility via `buttonsPressed` edge detection — pressing the gamepad's mapped face button or the corresponding on-screen touch button hides/shows the overlay
- Keep the existing console logging or remove it if it's superseded by the overlay — either is acceptable as long as the overlay is the primary visible feedback

## Definition of Done

- [ ] `pnpm --filter demo dev` and `pnpm --filter demo build` pass
- [ ] Manual test with gamepad connected: left stick moves the camera relative to facing, right stick changes look direction, pressing the mapped face button hides/shows the overlay
- [ ] Manual test with touch (mobile browser or touch-emulated devtools): dragging the on-screen movement stick moves the camera, swiping the look zone changes look direction, tapping the on-screen button mapped to `face1` hides/shows the overlay
- [ ] Overlay is visible by default on load
- [ ] No changes made to `examples/bench/` or `packages/render`'s core rendering pipeline

## Out of Scope

- p95/p99 or windowed statistical frame-timing (that's `examples/bench`'s job) — a simple rolling average or instantaneous FPS number is sufficient here
- Collision, gravity, or any real movement constraints — free camera movement in the ground plane is sufficient to prove the input wiring
- Consuming the reserved `vertical` axis — camera stays ground-plane only in this task
- Any change to `engine-core`'s Rust source — `set_camera` and the existing camera buffer reader already provide everything this task needs
- Remapping which button toggles the overlay per user preference — a single hardcoded slot (`face1`) is sufficient

## Implementation Steps

1. **Confirm task:13's shape** — read the finalized `InputState` and button bit constants from `packages/input/src/types.ts` and `src/buttons.ts` before wiring.
2. **Camera movement** (`examples/demo/src/main.ts`)
   - Each frame: read `reader.read().camera` for current `x/y/z/yaw/pitch`
   - Compute a movement delta from `inputSource.getState().move`, rotated by current yaw so forward is relative to facing, scaled by `dt` and a fixed speed constant
   - Compute a look delta from `.look`, scaled by `dt` and a fixed sensitivity constant, added to yaw/pitch
   - Call `engineState.set_camera(newX, newY, newZ, newYaw, newPitch)` with the result
3. **Perf overlay** (new small DOM element in `examples/demo`, e.g. created in `main.ts` or a small `src/perf-overlay.ts` helper)
   - Sample `performance.now()` deltas across frames, maintain a short rolling window, render an updating average FPS or ms figure into a fixed-position DOM element
4. **Overlay toggle**
   - Track the previous frame's `buttonsPressed` bit for `face1` (from task:13's bit constants); on that edge, flip the overlay element's visibility (e.g. toggling a CSS class or `display` style)
5. **Verify**
   - Run `pnpm --filter demo dev`, test with a connected gamepad and with touch/devtools touch emulation, confirm movement, look, and the overlay toggle all work

## Context

**Read first:**
- `docs/architecture/input-schema.md` — the schema this task's camera wiring and button toggle consume
- `docs/tasks/done/05-demo-app-wiring/overview.md` — the existing demo wiring this task extends
- `docs/tasks/done/12-render-resolution-benchmark-scene/overview.md` — reference for a frame-timing overlay's implementation approach (JS wall-clock timing via `requestAnimationFrame`, not WebGL timer queries) — this task's overlay is a much smaller version of that one, not a copy

**Related work:**
- task:13 (dependency: this task consumes its finalized `InputState` shape and button bit constants)

**Key files:**
- `examples/demo/src/main.ts`
- `packages/input/src/types.ts`, `src/buttons.ts` — schema and bit constants this task reads from
- `packages/render/src/world-state/camera.ts` — camera view shape read each frame
