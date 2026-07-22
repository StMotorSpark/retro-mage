---
task: "22"
slug: shadowcasting-visibility-cull
status: pending
depends-on: ["20", "21"]
blocked-by: ""
assigned-to: ""
created: 2025-06-16
outcome: ""
---

# Recursive Shadowcasting Visibility Cull

Implement the recursive shadowcasting algorithm `docs/architecture/visibility.md` specifies: given the player's tile position, the `solid` occlusion map (task:20), and the current sight radius (task:21), compute which tiles/actors/lights are actually visible this frame, and gate the existing WASM bridge buffers to only expose those.

## Desired Changes

- Add the shadowcasting algorithm to `packages/engine-core/src/visibility.rs` (from task:21) — recursive shadowcasting over the tile grid in octants from the player's tile, using `TilesBuffer.solid` to determine which tiles cast a shadow, bounded by `sight_radius()`'s current value
- Wire the cull's output into the existing buffers **without adding a new wire-format buffer**: per `docs/architecture/wasm-bridge.md`'s existing `active`/count conventions, actors and lights outside the visible set have their `active` flag cleared for that frame (not deleted — just excluded from the current frame's live count, exactly like any other inactive slot), and the tiles buffer's `count` (via `set_count`) reflects only currently-visible tiles for that frame
- Call the cull once per frame from `EngineState::tick` (or an explicitly separate `recompute_visibility()` method called every frame by the same caller that calls `tick` — worker's choice, but it must run every frame, not on a movement-threshold trigger, per the design doc's "Update Frequency" section)
- If recomputing and rewriting the full tiles buffer every single frame conflicts with `docs/architecture/wasm-bridge.md`'s existing "Tile geometry | Once per room load / on room change" cadence note, resolve the conflict by updating that doc: the visibility cull recomputes every frame internally, but the tiles buffer is only rewritten (bumping its "version"/triggering a `render`-side re-read) when the *visible set actually changes* frame-to-frame — document whichever resolution is implemented in `docs/architecture/wasm-bridge.md`, since that doc is schema/cadence source of truth and currently doesn't account for a per-frame-recomputed-but-conditionally-rewritten buffer

## Definition of Done

- [ ] A test fixture with a small hand-built room (a handful of tiles, at least one `solid` wall tile positioned to block sight to specific tiles behind it) proves: tiles on the near side of the wall (relative to player) are included in the visible set, tiles directly behind the wall from the player's perspective are excluded, tiles outside `sight_radius()`'s current radius are excluded regardless of occlusion
- [ ] Actors and lights positioned behind occluding walls or beyond sight radius have their `active` flag cleared for that frame; actors/lights within radius and unoccluded remain active
- [ ] The cull runs every frame (verified by a test asserting two different player positions across two consecutive `tick`-equivalent calls produce two different visible sets, proving no stale-until-movement-threshold caching)
- [ ] `docs/architecture/wasm-bridge.md`'s tile buffer cadence note is updated to accurately describe actual behavior post-implementation
- [ ] Rust unit tests cover all of the above with concrete tile/actor/light fixtures, not just "count changed"
- [ ] `cargo test` passes; `wasm-pack build` still succeeds

## Out of Scope

- Cross-floor/vertical (Z-level) visibility — that's task:23; this task's shadowcasting operates on a single flat floor/grid only
- App-tunable cull precision by distance (coarse cull for far chunks) — that's task:24; this task always computes exact occlusion within the current sight radius
- Any `render`-side changes — `render`'s existing reader code (task:09) already reads whatever `active`/count values `engine-core` produces; no reader changes are needed since this task doesn't change the wire schema, only which entries are marked active/counted
- Real dungeon content/level data — a small hand-built test fixture is sufficient; populating `examples/demo` with a real multi-room scene proving this visually is task:25

## Implementation Steps

1. **Read `docs/architecture/visibility.md`'s "Algorithm — Recursive Shadowcasting" and "Occlusion Is Always On" sections** in full
2. **Implement the octant-based recursive shadowcasting function** in `packages/engine-core/src/visibility.rs` — standard reference implementations of this algorithm (e.g. the well-known "FOV using recursive shadowcasting" technique) operate on an 8-octant sweep from an origin tile, using a solid/transparent grid; adapt the well-known algorithm shape to this project's `TilesBuffer.solid` array and coordinate system
3. **Bound the sweep by `sight_radius()`** (task:21) — tiles beyond the current radius are excluded regardless of occlusion
4. **Gate `ActorsBuffer`/`LightsBuffer`** — for each active actor/light, check whether its position falls within the computed visible tile set; if not, clear its `active` flag for this frame (do not mutate any other field)
5. **Gate `TilesBuffer`** — set `count` (via `set_count`) to reflect only the visible tiles for this frame; decide and implement the "only rewrite when visible set changes" resolution described in Desired Changes, and update `docs/architecture/wasm-bridge.md` to match whatever is implemented
6. **Wire the cull into the per-frame call path** — call it every frame from wherever `tick` is already called
7. **Write Rust unit tests** with hand-built fixtures: a small room with a wall, actors/lights on both sides, assert exact visible/occluded outcomes
8. **Run `cargo test` and `wasm-pack build`**, confirm both pass

## Context

**Read first:**
- `docs/architecture/visibility.md` — source of truth for this algorithm's exact behavior and rationale
- `docs/architecture/wasm-bridge.md` — the existing `active`/count conventions this task reuses instead of adding a new buffer
- `packages/engine-core/src/visibility.rs` (post task:21) — the `sight_radius()` function this task consumes

**Related work:**
- task:20 (dependency: `solid` tile field)
- task:21 (dependency: `sight_radius()` function)
- task:23 (multi-floor extension) depends on this task's single-floor cull existing
- task:24 (tunable cull precision) depends on this task's cull existing
- task:25 (demo proof) depends on this task

**Key files:**
- `packages/engine-core/src/visibility.rs`
- `packages/engine-core/src/lib.rs`
- `docs/architecture/wasm-bridge.md`
