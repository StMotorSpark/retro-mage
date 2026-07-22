---
task: "24"
slug: visibility-tuning-config
status: pending
depends-on: ["21", "22"]
blocked-by: ""
assigned-to: ""
created: 2025-06-16
outcome: ""
---

# App-Tunable Visibility Config

Expose the two per-application/per-level tuning knobs `docs/architecture/visibility.md` calls out as configurable: max sight distance, and the distance threshold where the cull drops from exact per-tile occlusion to a coarser distance-only approximation.

## Desired Changes

- Replace task:21's fixed max-draw-distance constant with a runtime-configurable value on `EngineState` — `set_max_sight_distance(f32)` / `max_sight_distance() -> f32` — defaulting to whatever constant task:21 currently hardcodes, so existing behavior is unchanged until an app calls the setter
- Add a **cull precision distance** setting — `set_cull_precision_distance(f32)` / `cull_precision_distance() -> f32` — the distance from the player beyond which task:22's shadowcasting cull stops computing exact per-tile occlusion and instead includes/excludes tiles by distance alone (no wall-blocking check), defaulting to a value equal to `max_sight_distance` (i.e., exact occlusion everywhere, matching current behavior, until an app lowers it)
- Wire both settings into `packages/engine-core/src/visibility.rs`'s cull: radius calculation reads `max_sight_distance` instead of a hardcoded constant; the shadowcasting sweep switches to distance-only inclusion once past `cull_precision_distance`
- Follow the existing per-frame function-call transport pattern already used for input (`docs/architecture/input-schema.md`'s "per-frame fn call" mechanism) rather than adding these to a buffer — these are infrequently-changed config values, not per-frame simulation state, so a plain `#[wasm_bindgen]` setter called whenever the app changes level/settings is sufficient; no every-frame call is required for these two setters

## Definition of Done

- [ ] `set_max_sight_distance`/`max_sight_distance` and `set_cull_precision_distance`/`cull_precision_distance` exist on `EngineState`, both defaulting to values that reproduce task:21/task:22's prior fixed behavior exactly
- [ ] A test proves lowering `max_sight_distance` shrinks the computed `sight_radius()` result accordingly
- [ ] A test proves setting `cull_precision_distance` below a fixture's wall distance causes tiles beyond that threshold to be included by distance alone even when they'd otherwise be occluded by a wall (i.e., precision genuinely drops as documented), while tiles within the threshold still respect exact occlusion
- [ ] Existing task:21/task:22 tests still pass with default config values
- [ ] `cargo test` passes; `wasm-pack build` still succeeds

## Out of Scope

- Any `render`/demo/UI surface for setting these values — this task only builds the `engine-core` API; task:25 (or a future app-level task) decides how a game actually exposes/tunes these per level
- Automatic/adaptive tuning (e.g. engine picking `cull_precision_distance` based on measured frame time) — these are explicit app-set values only, no auto-scaling logic
- Any change to `max_actors`/`max_lights`/`max_tiles` caps — those remain fixed per `docs/architecture/wasm-bridge.md`

## Implementation Steps

1. **Read `docs/architecture/visibility.md`'s "Occlusion Is Always On" section**, specifically the "What is tunable" bullets — this is the exact scope of this task
2. **Read `docs/architecture/input-schema.md`** for the existing per-frame-fn-call precedent, to keep the config-setting pattern consistent with how the codebase already crosses this kind of infrequent-update boundary
3. **Add the two config fields** to `EngineState`, with setters/getters, defaulting to values matching prior hardcoded behavior
4. **Update `packages/engine-core/src/visibility.rs`** — `sight_radius()` reads `max_sight_distance` instead of its previous constant; the shadowcasting sweep checks current sweep distance against `cull_precision_distance` and switches modes at that threshold
5. **Write Rust unit tests** covering both Definition of Done assertions with concrete fixtures
6. **Run `cargo test` and `wasm-pack build`**, confirm both pass, and confirm task:21/task:22's pre-existing tests still pass unmodified

## Context

**Read first:**
- `docs/architecture/visibility.md` — source of truth for what's tunable and why
- `docs/architecture/input-schema.md` — precedent for the per-frame-fn-call transport pattern this task's config setters follow

**Related work:**
- task:21 (dependency: `sight_radius()` calculation this task makes configurable)
- task:22 (dependency: shadowcasting cull this task adds a precision threshold to)
- task:25 (demo proof) may expose these as debug-toggle values, similar to task:14's perf toggle precedent

**Key files:**
- `packages/engine-core/src/lib.rs`
- `packages/engine-core/src/visibility.rs`
