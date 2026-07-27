---
task: "10"
slug: wire-world-state-into-render-loop
status: done
depends-on: ["08", "09"]
blocked-by: ""
assigned-to: ""
created: 2025-06-15
outcome: "Wired WASM engine-core world-state buffer views into render loop. Implemented tile (flat-shaded quads/cubes) and actor sprite (flat-colored quads) placeholder renderers with camera perspective and view transforms. Updated examples/demo to populate hardcoded engine state and drive render loop from WASM memory views."
---

# Wire World-State Into Render Loop

Connect task:09's buffer reader to the actual `render` loop and `examples/demo`, drawing placeholder geometry from real `engine-core` buffer data — the first end-to-end proof that a frame on screen reflects `engine-core` world state, rather than the current hardcoded clear-color placeholder.

## Desired Changes

- Update `packages/render/src/loop.ts` (or add a new coordinating module) to accept the buffer-reader views from task:09 and pass per-frame actor/light/tile/camera data into draw calls each frame
- Add minimal placeholder-geometry drawing in `packages/render/src/world-tiles/index.ts` (flat-shaded quads per tile, positioned from the tile buffer) and `packages/render/src/sprites/index.ts` (flat-colored quads per actor, positioned from the actor buffer) — simple enough to prove the data path, not real textured/lit rendering (lighting LUTs and texturing are separate, not-yet-resolved gaps)
- Update `examples/demo/src/main.ts` to construct an `EngineState`, write a small hardcoded scene into it (e.g. one room's worth of tiles, one actor, one light, using task:08's write methods), and drive the render loop from that state every frame
- Verify camera/player pose (task:08/09's camera buffer) feeds into whatever minimal view/projection transform is needed to place drawn geometry sensibly on screen

## Definition of Done

- [ ] Running `examples/demo` shows visible placeholder geometry on screen (not just the solid clear color) reflecting hardcoded scene data written into `engine-core`
- [ ] Geometry position updates on screen if the hardcoded scene's actor position is changed between runs (proves data flows from `engine-core` buffers, not from values hardcoded in `render`)
- [ ] No visibility culling, real lighting, or texturing implemented here — flat-colored placeholder shapes only
- [ ] `pnpm --filter render typecheck` and `pnpm --filter demo typecheck` (or equivalent) still pass
- [ ] A short note is added to `examples/demo`'s code or README (worker's choice where) describing this is a placeholder-geometry proof, not final rendering

## Out of Scope

- Real textures, lighting LUTs, skybox, painter's-algorithm depth sorting — those remain separate, not-yet-scheduled work tied to their own known gaps (LUT format, asset pipeline)
- Visibility culling algorithm — still an open known gap; this task draws whatever the hardcoded scene provides, unfiltered
- Internal render resolution / upscale decision — still an open known gap; this task uses whatever canvas sizing `context.ts` currently does, unchanged
- Any changes to the WASM bridge schema itself — if a gap in the schema surfaces while wiring this up (e.g. missing field needed for placeholder drawing), flag it rather than silently extending the schema without updating `docs/architecture/wasm-bridge.md`

## Implementation Steps

1. **Confirm task:09's reader interface** — read the `*View` types task:09 produces (`ActorsView`, `LightsView`, `TilesView`, `CameraView`)
2. **Extend `packages/render/src/loop.ts`** — accept the views (or a function that fetches fresh views each frame) as a parameter to `createLoop`, call into world-tiles/sprites drawing each frame instead of only clearing the canvas
3. **Add minimal draw logic** in `world-tiles/index.ts` and `sprites/index.ts` — simplest possible: flat-colored quads per entry in the tiles/actors buffers, positioned using the raw `x, y, z` values (no lighting, no texture sampling)
4. **Add a minimal camera transform** — enough to project the hardcoded scene sensibly (a fixed perspective or orthographic projection using the camera buffer's position/yaw/pitch is sufficient; does not need to be the final camera model)
5. **Update `examples/demo/src/main.ts`** — construct `EngineState`, call task:08's write methods to populate one small hardcoded scene (a handful of tiles, one actor, one light, one camera pose), wire it into the updated render loop
6. **Manual verification** — run `pnpm --filter demo dev`, confirm placeholder geometry renders and moves if hardcoded values are changed

## Context

**Read first:**
- `docs/architecture/rendering.md` — target rendering approach this placeholder intentionally does not yet fully implement
- `docs/architecture/wasm-bridge.md` — the data this task threads through the render loop
- `docs/research/known-gaps.md` — visibility, LUT, asset pipeline, and resolution/upscale gaps this task deliberately does not resolve

**Related work:**
- task:08 (dependency: buffer storage + write methods)
- task:09 (dependency: reader/view code)
- This task is the first visible proof of the pipeline the earlier "empty screen" testing conversation was asking about

**Key files:**
- `packages/render/src/loop.ts`, `packages/render/src/world-tiles/index.ts`, `packages/render/src/sprites/index.ts`
- `examples/demo/src/main.ts`
