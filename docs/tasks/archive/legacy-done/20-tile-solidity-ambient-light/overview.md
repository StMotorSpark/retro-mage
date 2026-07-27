---
task: "20"
slug: tile-solidity-ambient-light
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2025-06-16
outcome: "Added solid f32 field to TilesBuffer and set_tile, tiles_solid_ptr/count getters on EngineState, and ambient_light getter/setter scalar on EngineState defaulting to 0.0. Updated wasm-bridge schema doc and all set_tile callsites."
---

# Tile Solidity + Ambient Light Data Model

Add the two pieces of world-state data the visibility system needs but doesn't yet have: a per-tile flag saying whether a tile blocks sight, and an ambient light level for the currently-loaded space.

## Desired Changes

- Add a `solid` field (`f32`, `0`/`1`) to `packages/engine-core/src/tiles.rs`'s `TilesBuffer`, following the exact SoA/getter conventions already used by `active` on `ActorsBuffer`/`LightsBuffer` — this marks whether a tile blocks sight through it (walls, closed doors) vs. lets sight pass (floors, ceilings, open doorways, vertical gaps)
- Add ambient light level storage to `EngineState` (`packages/engine-core/src/lib.rs`) — a single `f32` representing the current space's ambient light level (0 = pitch black interior, 1 = full outdoor daylight), with a setter (e.g. `set_ambient_light(level: f32)`) and getter (`ambient_light()`) exposed via `#[wasm_bindgen]`. This is intentionally a single scalar for now (matching the project's low-ceremony, hand-maintained wire format approach) — not a per-tile or per-room array — because the engine only has one loaded space at a time today; do not build multi-room/multi-chunk ambient light storage in this task
- Update `packages/engine-core/src/tiles.rs`'s `set_tile` (or add a variant) to accept and store the new `solid` field
- Update `docs/architecture/wasm-bridge.md`'s Tile Geometry schema table to add the `solid` field (this doc is schema source of truth — update it first per its own "Schema Ownership" section, then mirror into the Rust struct), and add a short "Ambient Light" note under the Camera/Player Pose section or its own small subsection documenting the new `ambient_light` scalar and its getter/setter names

## Definition of Done

- [ ] `TilesBuffer` has a `solid: [f32; MAX_TILES]` field, set via `set_tile`, with a corresponding pointer/count getter on `EngineState` following the `tiles_solid_ptr()` naming convention already used for other tile fields
- [ ] `EngineState` exposes `set_ambient_light(f32)` and `ambient_light() -> f32`, defaulting to `0.0` on construction
- [ ] Rust unit tests cover: `solid` flag round-trips correctly per-tile, `solid` defaults to `0.0` (non-blocking) for unset tiles, `ambient_light` round-trips and defaults to `0.0`
- [ ] `cargo test` passes
- [ ] `wasm-pack build --target web --out-dir pkg` still succeeds with the new getters visible in generated `.d.ts`
- [ ] `docs/architecture/wasm-bridge.md` reflects the new `solid` field and `ambient_light` scalar exactly as implemented

## Out of Scope

- Actually computing sight radius from ambient/dynamic light — that's task:21
- Any shadowcasting/occlusion cull logic — that's task:22
- Populating `solid` with real dungeon geometry data (this task only adds the storage + API; a test fixture with a few hand-set tiles is enough to prove round-trip behavior)
- Per-room or per-chunk ambient light (single global scalar only, per Desired Changes above)
- Render-side changes — `render`'s reader code (task:09) doesn't need this field yet since nothing consumes it until task:22

## Implementation Steps

1. **Read `docs/architecture/wasm-bridge.md`** and `docs/architecture/visibility.md` in full for context on why these two fields exist
2. **Update `docs/architecture/wasm-bridge.md` first** — add `solid` to the Tile Geometry table, add the ambient light note, per the doc's own "Schema Ownership" rule (doc changes before code)
3. **Add `solid` to `TilesBuffer`** in `packages/engine-core/src/tiles.rs` — mirror the existing `x`/`y`/`z`/`tile_id`/`variant` pattern exactly (fixed-size array, included in `set_tile`, included in the max-size and round-trip tests)
4. **Add pointer/count getter** on `EngineState` in `packages/engine-core/src/lib.rs` for `tiles_solid_ptr()` (and count, matching the existing `tiles_*` getter pattern already present for other tile fields)
5. **Add ambient light scalar** to `EngineState` — a plain `f32` field, `set_ambient_light`/`ambient_light` methods, defaulting to `0.0`
6. **Write Rust unit tests** in `packages/engine-core/src/tiles.rs` (solid flag) and `packages/engine-core/src/lib.rs` or a new test module (ambient light)
7. **Run `cargo test` and `wasm-pack build`**, confirm both pass

## Context

**Read first:**
- `docs/architecture/visibility.md` — why `solid` (occlusion) and ambient light exist; this task builds the data model the rest of the visibility slice depends on
- `docs/architecture/wasm-bridge.md` — exact schema conventions to follow, and the "Schema Ownership" rule about updating the doc first
- `packages/engine-core/src/tiles.rs`, `packages/engine-core/src/actors.rs`, `packages/engine-core/src/lights.rs` — existing SoA buffer patterns to mirror exactly

**Related work:**
- task:21 (sight radius calculation) depends on this task's `ambient_light` scalar existing
- task:22 (shadowcasting cull) depends on this task's `solid` field existing

**Key files:**
- `packages/engine-core/src/tiles.rs`
- `packages/engine-core/src/lib.rs`
- `docs/architecture/wasm-bridge.md`
