---
task: "03"
slug: render-skeleton
status: pending
depends-on: ["01"]
blocked-by: ""
assigned-to: ""
created: 2025-06-01
outcome: ""
---

# Render Package Skeleton (WebGL2)

Create the `packages/render` TypeScript package with a WebGL2 context bootstrap and a clear-screen render loop, organized as empty vertical-slice folders per the rendering feature areas.

## Desired Changes

- Create `packages/render/package.json`, `tsconfig.json` (extends root `tsconfig.base.json`)
- Add `src/context.ts` (or similarly named module) that initializes a WebGL2 context from a provided `HTMLCanvasElement` and exposes it
- Add `src/loop.ts` implementing a `requestAnimationFrame`-driven render loop that clears the screen to a solid color each frame — this is the placeholder proving the pipeline, not real rendering
- Create empty vertical-slice folders matching `docs/architecture/rendering.md`: `src/lighting/`, `src/skybox/`, `src/sprites/`, `src/world-tiles/` (each with a `.gitkeep` or a minimal placeholder `index.ts` stub)
- Export a small public API (e.g. `createRenderer(canvas): Renderer` with `start()`/`stop()`) from `src/index.ts` for the demo app to consume

## Definition of Done

- [ ] `pnpm --filter render build` (or equivalent) typechecks and builds with no errors
- [ ] `createRenderer(canvas)` initializes a WebGL2 context without throwing, given a real `HTMLCanvasElement`
- [ ] Calling `start()` runs a `requestAnimationFrame` loop that clears the canvas to a visible solid color every frame
- [ ] `calling stop()` halts the loop
- [ ] `lighting/`, `skybox/`, `sprites/`, `world-tiles/` folders exist under `src/`, each empty or with a placeholder stub only
- [ ] No shader, material, or lighting logic implemented yet beyond the solid-color clear

## Out of Scope

- Any actual tile/polygon rendering, sprite drawing, painter's-algorithm sorting, LUT lighting, skybox, or clouds — all deferred to future feature tasks per slice
- WebGPU support — WebGL2 only for this skeleton
- Reading any real world state from `engine-core` — this task's loop has no data source yet

## Implementation Steps

1. **Package setup** (`packages/render/package.json`, `tsconfig.json`)
   - `tsconfig.json` extends `../../tsconfig.base.json`
2. **Context bootstrap** (`src/context.ts`)
   - Function taking an `HTMLCanvasElement`, returning the `WebGL2RenderingContext` (throw a clear error if `getContext('webgl2')` returns null)
3. **Render loop** (`src/loop.ts`)
   - `start(gl, onFrame?)` / `stop()` pair using `requestAnimationFrame`; each frame calls `gl.clearColor(...)` + `gl.clear(...)`
4. **Vertical-slice folders**
   - Create `src/lighting/`, `src/skybox/`, `src/sprites/`, `src/world-tiles/`, each with a placeholder `index.ts` (e.g. `export {}` with a comment noting the slice's future purpose from `docs/architecture/rendering.md`)
5. **Public API** (`src/index.ts`)
   - Export `createRenderer(canvas: HTMLCanvasElement): { start(): void; stop(): void }` composing context + loop

## Context

**Read first:**
- `docs/architecture/rendering.md` — the four rendering slices this skeleton stubs out
- `docs/architecture/repo-structure.md` — `render` package role, vertical-slice convention
- `docs/architecture/tech-stack.md` — WebGL2-first strategy
- `docs/principles/agent-dev-principles.md` — folder-is-feature rule

**Related work:**
- task:01 (dependency: workspace/tsconfig must exist)
- task:05 depends on this task's `createRenderer` API

**Key files:**
- `packages/render/src/index.ts`, `src/context.ts`, `src/loop.ts`, `src/{lighting,skybox,sprites,world-tiles}/`
