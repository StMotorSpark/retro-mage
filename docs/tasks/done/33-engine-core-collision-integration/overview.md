---
task: "33"
slug: engine-core-collision-integration
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-23
outcome: "Ported collision module into engine-core, exposed CollisionConfig via WASM bridge with app-tunable setters/getters, and integrated facing-relative look and movement with circle-vs-AABB tile collision sliding into EngineState::tick(). Passed all 70 engine-core unit tests."
---

# Engine-Core Collision Integration

Bring the already-written `collision` module (exists on unmerged branch `feat/collision-system`, commit `6096a67`) into this branch, verify it matches `docs/architecture/collision.md`, add missing tests, and wire it into `EngineState::tick()`.

## Desired Changes

- Port `packages/engine-core/src/collision.rs` from `feat/collision-system` (`git show feat/collision-system:packages/engine-core/src/collision.rs`) into this branch.
- Port the corresponding `lib.rs` changes from that branch (`CollisionConfig` wiring, `set_collision_config`/`set_player_speed`/`set_player_radius`/`set_look_sensitivity` exports, `collision` module registration, `tick()` integration).
- Reconcile any drift between that branch's `lib.rs` and this branch's current `lib.rs` (this branch has moved on — streaming/seam/room-graph code landed since). Do not blindly overwrite; merge by hand.
- Ensure `tick()` calls collision in the order specified in `docs/architecture/collision.md` (`apply_look` → `compute_movement_delta` → `resolve_movement` → write camera position → streaming update → `recompute_visibility`).

## Definition of Done

- [ ] `packages/engine-core/src/collision.rs` exists on this branch with circle-vs-AABB sliding resolution as described in `docs/architecture/collision.md`
- [ ] `CollisionConfig` (`player_speed`, `player_radius`, `look_sensitivity`) is exposed via `wasm_bindgen` with app-overridable setters, matching defaults `4.0` / `0.3` / `2.0`
- [ ] `tick()` applies look, computes movement delta, resolves against `master_tiles` solid set, and writes resolved position — in that order, before streaming/visibility update
- [ ] `set_camera` still bypasses collision (unconditional position set) — unchanged behavior
- [ ] Unit tests cover: straight-line movement into open space, blocked movement into a solid tile, sliding along a wall on diagonal movement, doorway clearance at `player_radius=0.3`, pitch clamp at ±85°
- [ ] `cargo test -p engine-core` (or repo equivalent) passes
- [ ] No regression in existing streaming/room-graph/seam tests

## Out of Scope

- Multi-floor (Y-axis) collision — tracked as its own known gap
- Actor-vs-tile or actor-vs-actor collision
- Outdoor XZ/XY coordinate system fix — separate known gap, not required for this task since demo's outdoor area in task:37 is reached via seam, not free player movement across chunks in this task's scope

## Implementation Steps

1. **Diff branches first**: `git diff main feat/collision-system -- packages/engine-core/src/lib.rs packages/engine-core/src/collision.rs` to see exact scope of the unmerged change.
2. **Copy `collision.rs` as-is** (it's self-contained, only depends on `crate::tiles::TilesBuffer`).
3. **Hand-merge `lib.rs`**: apply the collision-related hunks (module declaration, `CollisionConfig` field on `EngineState`, setter methods, `tick()` body changes) onto current `lib.rs`, preserving all streaming/seam/room-graph state and calls added in tasks 26-31.
4. **Verify tick() order**: read current `tick()` implementation, insert collision calls immediately before the existing streaming/seam-check call, per the 6-step order in `docs/architecture/collision.md#integration-in-tick`.
5. **Add/port tests**: check what test coverage the `feat/collision-system` branch already has (`git show feat/collision-system:packages/engine-core/src/collision.rs` includes `#[cfg(test)]` blocks likely); port those, fill gaps per Definition of Done.
6. **Run full test suite** for `engine-core` to confirm no regressions.

## Context

- Read: `docs/architecture/collision.md` — full design doc, source of truth for algorithm and integration order
- Read: `docs/architecture/wasm-bridge.md` — `master_tiles` buffer shape this module reads
- Reference: branch `feat/collision-system`, commit `6096a67feat(engine-core): collision system + movement integration` — has a working implementation already written against an earlier `lib.rs`; use as a starting point, not a blind copy
- Related: task:36 (indoor dungeon scene) depends on this for wall collision to be functional in the demo
- Key files: `packages/engine-core/src/collision.rs` (new), `packages/engine-core/src/lib.rs`, `packages/engine-core/src/tiles.rs`
