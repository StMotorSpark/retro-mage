---
task: "11"
slug: capped-framebuffer-upscale
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-22
outcome: ""
---

# Capped Internal Framebuffer + Linear Upscale

Implement the internal render resolution approach from `docs/architecture/rendering.md`'s "Internal Render Resolution and Upscaling" section: the 3D scene renders to an offscreen framebuffer at a capped, statically-configured resolution, then upscales to the canvas's native backing store via a linear-filtered fullscreen-quad blit.

## Desired Changes

- Extend `packages/render/src/context.ts` (or a new sibling module in `packages/render/src/`, worker's choice) to own:
  - Creation of an offscreen framebuffer + backing texture sized by the resolution cap rule
  - A resize/viewport recalculation path that keeps canvas CSS size at full device viewport while the framebuffer stays at capped resolution
  - A single named, exported, tunable configuration value controlling the cap (see Implementation Steps) — no inline/hardcoded cap math elsewhere in the pipeline
- Add a blit pass: a fullscreen-quad shader that samples the offscreen framebuffer's color texture with **linear filtering** and draws it to the canvas's default framebuffer
- Wire this into `packages/render/src/loop.ts` / `index.ts` so the existing render loop draws into the offscreen framebuffer instead of directly to the canvas, followed by the blit pass each frame
- HUD/touch-control rendering is explicitly out of scope for this task (see Out of Scope) but the framebuffer split must leave room for a future native-resolution overlay pass to be added without restructuring this task's output

## Definition of Done

- [ ] A single exported config value (e.g. `RENDER_RESOLUTION_CAP` or an options field) controls the internal framebuffer's resolution; changing this one value changes rendered internal resolution with no other code edits required
- [ ] Offscreen framebuffer resizes correctly when the canvas resizes (e.g. device rotation, window resize), recomputing both canvas CSS size and capped internal framebuffer size independently
- [ ] Blit pass uses linear (not nearest) texture filtering, verified by reading the sampler/texture parameter setup in code
- [ ] Existing render loop's tile/sprite drawing renders into the offscreen framebuffer and reaches the screen only via the blit pass — verify by confirming `gl.bindFramebuffer` targets the offscreen framebuffer during scene draw and the default framebuffer only during blit
- [ ] `pnpm --filter render test` passes, with new unit tests covering: cap config produces expected framebuffer dimensions given a few sample canvas sizes/cap values, and resize recomputation logic
- [ ] No visual/functional regression to existing placeholder tile/sprite rendering from tasks 09/10 — still renders, just now via the offscreen+blit path

## Out of Scope

- Choosing or hardcoding the actual cap number/multiplier — leave the default conservative (e.g. cap effective DPR at 1.0, or another clearly-documented placeholder) and clearly marked in code as pending real benchmark data from task:12
- Adaptive/dynamic per-frame resolution scaling based on measured frame time — this task implements a static, load-once cap only, per `docs/architecture/rendering.md`
- HUD, touch control overlay, or any UI rendering pass — this task only handles the 3D scene framebuffer + blit
- Nearest-neighbor / pixelated upscale mode — explicitly rejected as the look target, do not add as an option
- Outdoor rendering, skybox, or any world-content changes

## Implementation Steps

1. **Read `docs/architecture/rendering.md`'s "Internal Render Resolution and Upscaling" section** for the exact rules: two resolution domains, cap rule shape, linear filtering requirement, static (non-adaptive) decision.
2. **Define the tunable cap config** — a single exported value/interface (e.g. `{ maxDevicePixelRatio: number; maxPixels: number }` or similar; worker chooses exact shape) living in a clearly-named location (e.g. `packages/render/src/context.ts` or a new `packages/render/src/resolution.ts`). This is the coordination surface task:12 will read/override during benchmarking — keep it simple and directly importable/overridable.
3. **Implement framebuffer creation** — WebGL2 framebuffer + color texture (and depth if needed, matching existing `gl.enable(gl.DEPTH_TEST)` usage in `loop.ts`) sized via the cap rule against current canvas CSS size.
4. **Implement resize handling** — canvas CSS size tracks device viewport (existing behavior via `gl.drawingBufferWidth`/`height` reads in `loop.ts` should be reconsidered here since those currently read the canvas's own backing store, not an internal framebuffer); recompute both canvas backing store and offscreen framebuffer size on resize/rotation.
5. **Implement the blit pass** — minimal vertex/fragment shader pair drawing a fullscreen textured quad, texture parameters set to `gl.LINEAR` for both min/mag filters, no mipmaps needed at this stage.
6. **Wire into `loop.ts`** — scene draw (`tileRenderer`, `spriteRenderer` calls) targets the offscreen framebuffer; after scene draw, bind default framebuffer and run the blit pass.
7. **Add unit tests** — cap-to-dimension calculation is pure and testable without a real WebGL context (extract as a plain function); framebuffer/resize logic can be tested with a mocked/stubbed `WebGL2RenderingContext` following existing test patterns in `packages/render/src/index.test.ts`.
8. **Run `pnpm --filter render test`** and confirm passing; manually verify in a browser (or `examples/demo` if runnable) that rendering still shows placeholder geometry with no visual regression.

## Context

**Read first:**
- `docs/architecture/rendering.md` — "Internal Render Resolution and Upscaling" + "Performance Target" sections (source of truth for this task)
- `docs/research/known-gaps.md` — "Internal Render Resolution Pixel Budget" entry, explains why the cap value itself is a placeholder here

**Related work:**
- task:09, task:10 (existing render loop / world-state wiring this task builds on top of, must not regress)
- task:12 (benchmark scene) depends on this task's tunable config value existing and being easily overridable for a resolution sweep

**Key files:**
- `packages/render/src/context.ts` — current WebGL2 context creation, extend here or add sibling module
- `packages/render/src/loop.ts` — current render loop, needs offscreen-framebuffer + blit wiring
- `packages/render/src/index.ts` — public entry point, may need new exports for the cap config
- `packages/render/src/index.test.ts` — existing test patterns to follow
