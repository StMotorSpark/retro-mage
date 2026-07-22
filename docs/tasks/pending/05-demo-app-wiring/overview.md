---
task: "05"
slug: demo-app-wiring
status: pending
depends-on: ["02", "03", "04"]
blocked-by: ""
assigned-to: ""
created: 2025-06-01
outcome: ""
---

# Demo App Wiring

Create the `examples/demo` Vite app that imports `engine-core`, `render`, and `input` together into one running page, proving the full pipeline end to end.

## Desired Changes

- Create `examples/demo` as a Vite app (vanilla TS template, no framework) with `package.json`, `tsconfig.json` (extends root `tsconfig.base.json`), `vite.config.ts`, `index.html`
- Add dependencies on `engine-core`, `render`, `input` via the workspace protocol (`"workspace:*"`)
- Wire a single `src/main.ts` that: creates a canvas element, calls `createRenderer(canvas)` from `render` and `start()`s it, creates an `EngineState` from `engine-core` and calls `tick()` once per frame, creates `createInputSource(container)` from `input` and logs its `getState()` once per frame (console log acceptable — no gameplay logic yet)
- Confirm `pnpm --filter demo dev` runs a local dev server showing the clear-color canvas

## Definition of Done

- [ ] `pnpm --filter demo dev` starts a Vite dev server without error
- [ ] Opening the dev server in a browser shows a canvas cleared to the solid color from task:03's render loop
- [ ] Browser console shows `engine-core`'s placeholder tick counter incrementing once per frame
- [ ] Browser console shows `input`'s `InputState` reflecting gamepad or touch input when provided
- [ ] `pnpm --filter demo build` produces a static build in `examples/demo/dist`

## Out of Scope

- Any real dungeon content, sprites, lighting, or tile geometry — this task only proves the three packages run together
- PWA manifest/service worker — task:06
- Visual polish beyond the solid-color canvas

## Implementation Steps

1. **Vite app scaffold** (`examples/demo/`)
   - `package.json` with `dev`/`build` scripts, `vite.config.ts`, `index.html` with a `<canvas>` and a container `<div>` for the touch overlay
2. **Dependencies**
   - Add `engine-core`, `render`, `input` as `"workspace:*"` dependencies
3. **Wiring** (`src/main.ts`)
   - Instantiate `EngineState` (from `engine-core`), `createRenderer(canvas)` (from `render`), `createInputSource(container)` (from `input`)
   - Call `renderer.start()`
   - In a `requestAnimationFrame` loop (or hook into render's loop if it exposes a per-frame callback), call `engineState.tick(dt)` and log `inputSource.getState()`
4. **Verify**
   - Run `pnpm --filter demo dev`, confirm canvas renders and console logs update

## Context

**Read first:**
- `docs/architecture/repo-structure.md` — `examples/demo`'s role as thin glue/reference implementation
- `docs/research/known-gaps.md` — demo scope beyond this skeleton is still undefined; this task is intentionally minimal

**Related work:**
- task:02, task:03, task:04 (dependency: this task consumes all three packages' skeleton APIs)
- task:06 depends on this task's app existing

**Key files:**
- `examples/demo/src/main.ts`, `examples/demo/index.html`, `examples/demo/vite.config.ts`
