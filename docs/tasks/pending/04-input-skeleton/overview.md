---
task: "04"
slug: input-skeleton
status: pending
depends-on: ["01"]
blocked-by: ""
assigned-to: ""
created: 2025-06-01
outcome: ""
---

# Input Package Skeleton

Create the `packages/input` TypeScript package with a gamepad detection stub and a touch overlay stub, both normalizing toward a shared placeholder input event type.

## Desired Changes

- Create `packages/input/package.json`, `tsconfig.json` (extends root `tsconfig.base.json`)
- Define a placeholder normalized input event type (e.g. `InputState { move: { x: number; y: number }; actions: Record<string, boolean> }`) in `src/types.ts` — explicitly marked placeholder pending resolution in `docs/research/known-gaps.md`
- Add `src/gamepad/` slice: detects connected gamepads via the Gamepad API and maps stick/button state into the placeholder `InputState` shape
- Add `src/touch/` slice: renders a minimal virtual thumbstick overlay (DOM/CSS, not canvas-drawn) over a provided container element and maps touch drag into the same `InputState` shape
- Export a unified `createInputSource(container): { getState(): InputState; dispose(): void }` from `src/index.ts` that merges whichever device is active (gamepad takes precedence if connected, else touch overlay)

## Definition of Done

- [ ] `pnpm --filter input build` typechecks and builds with no errors
- [ ] `createInputSource(container).getState()` returns a well-typed `InputState` object every call, with `move` at `{0,0}` and no actions true when no input present
- [ ] Connecting a gamepad (manual test) updates `getState().move` when a stick is moved
- [ ] Touch-dragging the virtual thumbstick overlay (manual test in a mobile browser or touch-emulated devtools) updates `getState().move`
- [ ] `dispose()` removes event listeners and the touch overlay DOM

## Out of Scope

- Contextual action button semantics beyond a generic `actions: Record<string, boolean>` bag — real button set resolved later per `docs/research/known-gaps.md`
- Any integration with `engine-core` or `render` — this package only produces `InputState`, it does not consume anything
- Visual polish of the touch overlay — functional only

## Implementation Steps

1. **Package setup** (`packages/input/package.json`, `tsconfig.json`)
   - `tsconfig.json` extends `../../tsconfig.base.json`
2. **Shared type** (`src/types.ts`)
   - `InputState` shape as described in Desired Changes; comment noting it is a placeholder pending `docs/research/known-gaps.md` resolution
3. **Gamepad slice** (`src/gamepad/index.ts`)
   - Poll `navigator.getGamepads()` on each `getState()` call (or via its own rAF loop internally), map left stick + primary buttons into `InputState`
4. **Touch slice** (`src/touch/index.ts`)
   - Render a simple absolutely-positioned DOM element (thumbstick base + knob) into the given container; track touch start/move/end to compute a normalized `{x,y}` vector into `InputState`
5. **Unified source** (`src/index.ts`)
   - `createInputSource(container)`: if `navigator.getGamepads()` reports a connected pad, source from gamepad slice; otherwise source from touch slice. `getState()` returns current merged `InputState`; `dispose()` tears down whichever is active

## Context

**Read first:**
- `docs/architecture/tech-stack.md` — input layer's device-adaptive role
- `docs/architecture/repo-structure.md` — `input` package boundaries (no rendering/simulation concerns)
- `docs/research/known-gaps.md` — input event schema is a placeholder, not final
- `docs/principles/agent-dev-principles.md` — folder-is-feature rule (`gamepad/`, `touch/` as slices)

**Related work:**
- task:01 (dependency: workspace/tsconfig must exist)
- task:05 depends on this task's `createInputSource` API

**Key files:**
- `packages/input/src/index.ts`, `src/types.ts`, `src/gamepad/`, `src/touch/`
