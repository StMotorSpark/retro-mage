---
task: "13"
slug: input-schema-implementation
status: done
depends-on: ["04"]
blocked-by: ""
assigned-to: ""
created: 2025-07-22
outcome: "Implemented locked InputState schema matching docs/architecture/input-schema.md with move/look vectors, vertical axis, and 12-slot button bitmask (face1-4, dpadUp-Right, trigger1-4). Created src/buttons.ts bit constants. Updated gamepad and touch sources to handle look vectors and edge-triggered buttonsPressed. Added unit tests with happy-dom."
---

# Input Schema Implementation

Replace the placeholder `InputState` shape in `packages/input` with the locked schema from `docs/architecture/input-schema.md` — separate move/look vectors, a reserved vertical axis, and a 12-slot button bitmask shared by gamepad and the default on-screen touch overlay.

## Desired Changes

- Replace `InputState` in `packages/input/src/types.ts` with the locked shape:
  - `move: { x: number; y: number }` — ground-plane movement vector, -1..1 per axis
  - `look: { x: number; y: number }` — camera look vector, -1..1 per axis, separate from `move`
  - `vertical: number` — reserved axis, default `0`, not consumed by anything yet
  - `buttons: number` — `u32`-range bitmask, current held state
  - `buttonsPressed: number` — `u32`-range bitmask, edge-triggered (set only the frame a bit transitions from unheld to held, cleared next frame)
- Add a shared bit-constant export (e.g. `src/buttons.ts`) naming all 12 slots per the schema doc's table: `face1`–`face4` (bits 0–3), `dpadUp`/`dpadDown`/`dpadLeft`/`dpadRight` (bits 4–7), `trigger1`–`trigger4` (bits 8–11). Both the gamepad slice and touch slice import from this single source so bit meaning never drifts between device paths.
- Update `packages/input/src/gamepad/index.ts`:
  - Map left stick axes → `move.x/y`, right stick axes → `look.x/y` (existing deadzone handling carries over)
  - Map standard Gamepad API button indices 0–3 → `face1`–`face4`, 12–15 → d-pad bits, 4–7 (LB/RB/LT/RT) → `trigger1`–`trigger4` (digital press, using `button.pressed` or a pressure threshold for analog triggers — no analog value is carried, per the schema's Out of Scope)
  - Track previous frame's `buttons` bitmask internally to compute `buttonsPressed` each call
- Update `packages/input/src/touch/index.ts`:
  - Keep the existing virtual thumbstick for `move`, mapped to the left zone
  - Add a swipe-tracked zone (center/right of the container) producing `look.x/y` deltas each frame
  - Render a default set of 12 on-screen buttons (labeled by slot name, e.g. `F1`–`F4`, `D-Up`/`D-Down`/`D-Left`/`D-Right`, `T1`–`T4`) as plain DOM elements positioned over the container, wired to set/clear the corresponding bitmask bits on press/release
  - Structure the overlay so its DOM elements, positions, and visibility are swappable — expose enough (container queries, CSS classes, or a config hook) that a consuming app can restyle or hide/relabel individual buttons without forking this package
  - Track previous frame's `buttons` bitmask internally (same as gamepad) to compute `buttonsPressed`
- Update `packages/input/src/index.ts`'s `createInputSource` merge logic for the new shape (still gamepad-precedence-if-connected, else touch)
- Search the repo for any other consumer of the old `{ move, actions }` shape (e.g. `examples/demo/src/main.ts`'s console log) and update call sites to compile against the new shape — no new behavior required there beyond compiling; task:14 wires real behavior

## Definition of Done

- [ ] `pnpm --filter input build` and `pnpm --filter input test` (if test tooling covers this package) pass with no errors
- [ ] `InputState` matches the fields and types listed above; no remaining `actions: Record<string, boolean>` field anywhere in the package
- [ ] Bit constants for all 12 slots are exported from one module and documented with a comment referencing `docs/architecture/input-schema.md`
- [ ] `buttonsPressed` is empty on the first frame a button is held and empty again on the second consecutive held frame (edge-only) — covered by a unit test if the package has a test runner, otherwise noted as a manual check
- [ ] Manual test: connecting a gamepad and moving both sticks updates `move` and `look` independently; pressing each mapped button sets the corresponding bit
- [ ] Manual test: the default touch overlay renders a movement stick, a swipe-look zone, and 12 buttons, and pressing an on-screen button sets the corresponding bit
- [ ] `examples/demo` still typechecks/builds against the new `InputState` shape (behavior changes are out of scope for this task, see task:14)

## Out of Scope

- Wiring the new `InputState` into any real camera movement, gameplay behavior, or on-screen overlay toggle in `examples/demo` — that is task:14
- The input → `engine-core` transport mechanism (writable WASM buffer vs. function call) — still an open gap in `docs/research/known-gaps.md`
- Assigning any semantic meaning to a button slot (e.g. "attack", "interact") — slots stay generic per the schema doc
- Analog trigger pressure values — triggers are digital press/release only in this schema
- Any consumption of the `vertical` field by `engine-core` or actor behavior — the field exists but nothing reads it yet
- Visual polish/theming of the default touch overlay beyond making it functional and swappable — a consuming app's skinning work is out of scope here

## Implementation Steps

1. **Bit constants** (`packages/input/src/buttons.ts`)
   - Export named bit values for all 12 slots, matching the bit ranges in `docs/architecture/input-schema.md`'s Button Slots table
2. **Types** (`packages/input/src/types.ts`)
   - Replace `InputState` per Desired Changes; update `createEmptyInputState()` to return the new shape with `buttons: 0`, `buttonsPressed: 0`, `vertical: 0`
3. **Gamepad slice** (`packages/input/src/gamepad/index.ts`)
   - Add right-stick → `look` mapping alongside the existing left-stick → `move` mapping
   - Add button index → bit constant mapping using the standard Gamepad API layout; compute the bitmask each `getState()` call
   - Store previous bitmask in the slice's closure/state to derive `buttonsPressed`
4. **Touch slice** (`packages/input/src/touch/index.ts`)
   - Add a swipe-zone tracker for `look`, separate from the existing thumbstick drag tracker for `move`
   - Render 12 DOM button elements using the same bit constants from step 1; wire pointer/touch down-up to set/clear bits and compute `buttonsPressed` the same way as the gamepad slice
5. **Unified source** (`packages/input/src/index.ts`)
   - No structural change to the precedence logic, just compile against the new `InputState` shape
6. **Fix downstream compile errors**
   - Update `examples/demo/src/main.ts`'s existing console log (or any other reference) to compile against the new shape without adding new behavior

## Context

**Read first:**
- `docs/architecture/input-schema.md` — the locked schema this task implements (source of truth for field names, bit layout, and what's explicitly out of scope)
- `docs/research/known-gaps.md` — confirms the transport mechanism remains open and out of scope here
- `docs/tasks/done/04-input-skeleton/overview.md` — the placeholder this task replaces

**Related work:**
- task:04 (dependency: this task replaces its placeholder `InputState`)
- task:14 depends on this task's finalized `InputState` shape and button bit constants

**Key files:**
- `packages/input/src/types.ts`, `src/buttons.ts` (new), `src/gamepad/index.ts`, `src/touch/index.ts`, `src/index.ts`
