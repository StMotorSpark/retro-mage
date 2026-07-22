---
task: "15"
slug: input-wired-into-engine-core
status: pending
depends-on: ["13"]
blocked-by: ""
assigned-to: ""
created: 2025-01-01
outcome: ""
---

# Input Wired Into Engine Core

Carry the normalized `InputState` from `packages/input` across the WASM boundary into `engine-core` each frame via a single per-frame function call, per the transport decision in `docs/architecture/input-schema.md`.

## Desired Changes

- Add a single `#[wasm_bindgen]` method on `EngineState` (in `packages/engine-core/src/lib.rs`), e.g. `set_input(&mut self, move_x: f32, move_y: f32, look_x: f32, look_y: f32, vertical: f32, buttons: u32, buttons_pressed: u32)`, that stores the current frame's input fields into a plain internal struct on `EngineState` (no buffer, no pointer/count getters — this is the fn-call path, not the SoA buffer pattern used by Actors/Lights/Tiles/Camera)
- Add a minimal internal `InputState` struct/module in `engine-core` (e.g. `packages/engine-core/src/input.rs`) holding the 7 fields with the same names/types as the wire call, plus a `Default` impl (all zero)
- `EngineState` holds one instance of this internal input state, overwritten wholesale on each `set_input` call
- Wire the demo app (`examples/demo`) to call `engine.set_input(...)` once per frame with the current frame's `InputState` from `packages/input`'s `createInputSource().getState()` (or equivalent existing call site), before/alongside the existing `engine.tick(dt)` call
- No gameplay behavior needs to consume this input state yet — this task only makes it observably present inside `engine-core` for the next task to read

## Definition of Done

- [ ] `pnpm --filter engine-core build` (wasm build) succeeds with no errors
- [ ] `EngineState::set_input` exists with the exact 7-argument signature above and compiles/exports via `wasm-bindgen`
- [ ] Internal `engine-core` input struct's field names/types match `docs/architecture/input-schema.md`'s schema table (`move_x`, `move_y`, `look_x`, `look_y`, `vertical` as `f32`; `buttons`, `buttons_pressed` as `u32`)
- [ ] A Rust unit test in `engine-core` constructs an `EngineState`, calls `set_input` with known values, and asserts the internal state stores them unchanged (round-trip test)
- [ ] `examples/demo` calls `engine.set_input(...)` once per frame with real values from the `input` package's current frame state (verify via a temporary console log or debugger during manual testing, then remove any temporary debug output)
- [ ] `pnpm --filter demo build` (or equivalent) still builds/runs with no console errors after wiring

## Out of Scope

- Any `engine-core` simulation logic that reads/consumes the stored input state (movement, actions, camera control) — this task only stores it, a future task consumes it
- Any change to `packages/input`'s `InputState` shape or the touch/gamepad device sources — task:13 already finalized these
- Reverting or reconsidering the fn-call vs. buffer decision — `docs/architecture/input-schema.md` already documents this as a deliberate, closed decision
- Assigning semantic meaning to any button bit (attack, interact, etc.) — stays generic per the schema doc
- Any change to the Actors/Lights/Tiles/Camera buffer pattern in `docs/architecture/wasm-bridge.md` — that pattern is unrelated and unaffected by this task

## Implementation Steps

1. **Internal input struct** (`packages/engine-core/src/input.rs`, new file)
   - Define a plain Rust struct with fields `move_x`, `move_y`, `look_x`, `look_y`, `vertical: f32`, `buttons`, `buttons_pressed: u32`
   - Implement `Default` (all-zero state), matching `createEmptyInputState()`'s zeroed shape on the TypeScript side
   - Add `pub mod input;` to `packages/engine-core/src/lib.rs`
2. **Store on `EngineState`** (`packages/engine-core/src/lib.rs`)
   - Add an `input: input::InputState` field to the `EngineState` struct, initialized via `Default::default()` in `EngineState::new()`
3. **`set_input` method** (`packages/engine-core/src/lib.rs`)
   - Add `#[wasm_bindgen]` method matching the signature in Desired Changes
   - Body simply overwrites `self.input` with a new struct built from the arguments — no validation, no partial updates
4. **Rust unit test** (co-located in `input.rs` or `lib.rs`, matching existing test conventions in the crate)
   - Construct `EngineState::new()`, call `set_input` with distinct known values per field, assert each field on the internal state matches
5. **Wire demo call site** (`examples/demo/src/main.ts` or wherever the per-frame loop already calls `engine.tick(dt)`)
   - Each frame, read the current `InputState` from the existing input source (`createInputSource().getState()` per task:13/14's wiring)
   - Call `engine.set_input(state.move.x, state.move.y, state.look.x, state.look.y, state.vertical, state.buttons, state.buttonsPressed)`
   - Order relative to `engine.tick(dt)` within the frame loop is an implementation choice — pick whichever avoids reading stale input for that tick (input read before tick is the natural choice, but not mandated)
6. **Manual verification**
   - Temporarily log/inspect `engine-core`'s stored input state (or add a debug getter) to confirm live values from moving a stick / pressing a button actually reach `engine-core`; remove any temporary debug scaffolding before done

## Context

**Read first:**
- `docs/architecture/input-schema.md` — locked schema + the per-frame fn-call transport decision this task implements (see "Transport Mechanism — Per-Frame Function Call" section)
- `docs/architecture/wasm-bridge.md` — the separate, unrelated buffer-based `engine-core` → `render` pattern; this task must not follow that pattern
- `docs/tasks/done/13-input-schema-implementation/overview.md` — the finalized `InputState` shape and bit constants this task consumes
- `docs/tasks/done/14-demo-controls-and-perf-toggle/overview.md` — existing demo per-frame input read call site, if one already exists there

**Related work:**
- task:13 (dependency: finalized `InputState` shape this task's fn-call signature mirrors)
- task:08 (context: existing `EngineState`/WASM buffer pattern for Actors/Lights/Tiles/Camera — different pattern, referenced for contrast only)

**Key files:**
- `packages/engine-core/src/lib.rs`, `src/input.rs` (new)
- `packages/input/src/index.ts`, `src/types.ts` (read-only reference, no changes)
- `examples/demo/src/main.ts` (or equivalent frame-loop entry point)
