---
task: "08"
slug: engine-core-wasm-buffers
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2025-06-15
outcome: ""
---

# Engine-Core WASM Buffers

Implement the fixed-size, preallocated SoA buffers defined in `docs/architecture/wasm-bridge.md` inside `engine-core`, replacing the current placeholder `EngineState`/`world.rs` with real (still minimal) world-state storage that `render` can read via pointer/count getters.

## Desired Changes

- Replace the placeholder `EngineState` tick-counter API in `packages/engine-core/src/lib.rs` with real world-state storage, organized per `docs/principles/agent-dev-principles.md`'s feature-module convention (e.g. `src/actors.rs`, `src/lights.rs`, `src/tiles.rs`, `src/camera.rs`, replacing the current empty `src/world.rs` placeholder or splitting it into these)
- Implement four fixed-size, preallocated buffers exactly matching the schema in `docs/architecture/wasm-bridge.md`:
  - Actors (max 64): `x, y, z, facing, sprite_id, active` — all `f32`
  - Lights (max 32): `x, y, z, r, g, b, intensity, active` — all `f32`
  - Tile geometry (max 1024): `x, y, z, tile_id, variant` — all `f32`
  - Camera/player pose (single entry): `x, y, z, yaw, pitch` — all `f32`
- Expose, per buffer, `#[wasm_bindgen]` getter methods returning a pointer (byte offset into WASM linear memory) and a live count, per field, per the "Memory Access Pattern" section of `docs/architecture/wasm-bridge.md` (e.g. `actors_x_ptr()`, `actors_x_count()` or an equivalent naming scheme — pick one consistent convention and apply it to every field/buffer)
- Add simple write methods (e.g. `set_actor(index, x, y, z, facing, sprite_id)`, `set_light(...)`, `set_tile(...)`, `set_camera(...)`) sufficient to populate the buffers from Rust — these do not need real simulation logic yet, just correct storage and layout
- Add Rust unit tests (per `docs/principles/test-driven-development.md`) verifying: buffer sizes match documented max entries, writing a value and reading it back through the getter produces the exact expected value, `active` flag semantics work as documented, and out-of-range writes are handled safely (either clamped or a documented panic/no-op — worker's choice, but must be tested)

## Definition of Done

- [ ] All four buffers exist with the exact field sets, types, and max entry counts documented in `docs/architecture/wasm-bridge.md`
- [ ] Each buffer's data is stored in memory that does not require reallocation during normal operation (fixed-size arrays, not growable `Vec`s reallocated per-frame)
- [ ] Pointer + count getters exist for every field of every buffer, following one consistent naming convention
- [ ] `cargo test` passes, including tests asserting exact round-trip values for at least one populated entry per buffer
- [ ] `wasm-pack build` still produces a working `pkg/` output with `.d.ts` types covering the new getters
- [ ] `docs/architecture/wasm-bridge.md`'s "Memory Access Pattern" section reflects the actual getter naming convention chosen (update the doc if the task settles on a naming pattern not already explicit there)

## Out of Scope

- Real simulation logic (movement, physics, visibility culling, collision) — this task only implements storage and the read/write API surface, not gameplay behavior
- The `render`-side reader code (typed-array views, per-frame re-fetch) — that is task:09
- Growing buffers beyond documented max entries, or making max entries configurable — fixed caps only, per the design doc
- Fixed-point math — wire format is `f32` per the design doc; do not introduce fixed-point types here

## Implementation Steps

1. **Read `docs/architecture/wasm-bridge.md`** in full — this is the exact schema to implement, field-by-field
2. **Restructure `engine-core` modules** — replace `src/world.rs` placeholder with feature-named modules for actors, lights, tiles, camera (or keep `world.rs` as a coordinating module that owns all four, worker's choice, but avoid a generic `utils.rs`)
3. **Implement fixed-size storage** — e.g. `[f32; 64]` arrays per actor field (SoA), or a single `[f32; 64 * STRIDE]` per buffer — either satisfies "SoA, fixed stride," worker picks whichever is simpler to implement correctly, as long as `render`'s expected per-field typed-array view (per the design doc) is producible from it
4. **Implement write methods** and an `active` count/flag mechanism — decide whether `active` is a per-entry flag (matches design doc) or an implicit "first N are live" convention; design doc specifies a per-entry `active` field, follow that
5. **Implement pointer/count getters** — `#[wasm_bindgen]` methods returning `*const f32` cast to `u32` (typical wasm-bindgen pattern for exposing offsets) plus a count getter; keep the same convention across all four buffers
6. **Write Rust unit tests** — one test module per buffer type, covering: correct max size, write-then-read-back exact value, `active` flag toggling, boundary index behavior
7. **Verify build** — `wasm-pack build --target web --out-dir pkg` succeeds, generated `.d.ts` shows the new methods

## Context

**Read first:**
- `docs/architecture/wasm-bridge.md` — the exact schema this task implements (source of truth)
- `docs/principles/test-driven-development.md` — testing expectations, especially for connector points
- `docs/principles/agent-dev-principles.md` — feature-module naming convention
- `docs/tasks/done/02-engine-core-skeleton/overview.md` — the placeholder this task replaces

**Related work:**
- task:09 depends on this task's getter API existing and being stable
- task:10 depends on both this task and task:09

**Key files:**
- `packages/engine-core/src/lib.rs`, `packages/engine-core/src/world.rs` (replace/restructure)
- `packages/engine-core/Cargo.toml` (no new dependencies expected)
