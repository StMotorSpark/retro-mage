---
task: "23"
slug: multi-floor-visibility
status: done
depends-on: ["22"]
blocked-by: ""
assigned-to: ""
created: 2025-06-16
outcome: "Implemented vertical_opening tile field on TilesBuffer and WASM bridge schema, extended 3D shadowcasting in engine-core to project sightlines across vertical openings to adjoining floors with directional filtering, preventing cross-floor leakage under solid floor geometry."
---

# Multi-Floor Visibility

Extend task:22's shadowcasting cull to handle cross-floor sightlines — balconies overlooking a lower floor, stairwells with a visible gap to the floor above — per `docs/architecture/visibility.md`'s "Multi-Floor Visibility" section, which puts this in scope now rather than deferring it.

## Desired Changes

- Add a way for a tile to mark itself as a **vertical opening** — a tile that does not block sight between Z-levels (a stairwell gap, a balcony edge, an open floor cutout) — distinct from the existing `solid` flag (task:20), which governs same-floor occlusion. Extend `TilesBuffer` (`packages/engine-core/src/tiles.rs`) with this new field, following the same SoA/getter conventions as `solid`
- Update `docs/architecture/wasm-bridge.md`'s Tile Geometry schema table with the new field (doc first, per "Schema Ownership")
- Extend the shadowcasting cull in `packages/engine-core/src/visibility.rs` (task:22) so that, when the player's line of sight passes through a vertical-opening tile, the sweep continues onto the adjoining floor's tiles at the appropriate Z rather than stopping at the floor boundary — the vertical connection is a per-tile-pair relationship (which opening tile connects to which tile(s) on the other floor); the exact adjacency representation (e.g. an opening tile implicitly connects to the tile at the same `x`/`y` on the nearest differing `z`, or an explicit link table) is the worker's implementation choice, but must be tested and documented in a code comment

## Definition of Done

- [ ] A test fixture with two floors (differing `z` tile groups) connected by a vertical-opening tile proves: a player on the upper floor near the opening can see specific tiles/actors on the lower floor through it; tiles on the lower floor not aligned with the opening (i.e., would require passing through solid floor) remain excluded
- [ ] A player on either floor, standing away from any vertical-opening tile, sees only their own floor's tiles (no accidental cross-floor leakage)
- [ ] Existing task:22 single-floor tests still pass unmodified (this task extends, not replaces, the single-floor behavior)
- [ ] `docs/architecture/wasm-bridge.md` reflects the new vertical-opening field
- [ ] `cargo test` passes; `wasm-pack build` still succeeds

## Out of Scope

- Rendering of the cross-floor view (how `render` draws a balcony overlook is a `render`-package/rendering-pipeline concern, not this task) — this task only produces the correct visible-tile/actor set across floors in `engine-core`
- Arbitrarily-angled or non-grid-aligned vertical connections — per `docs/architecture/world-model.md`'s grid-ish indoor space, vertical openings are grid-aligned tile-to-tile connections
- Outdoor terrain/chunk streaming — this task is scoped to indoor multi-floor dungeon structures only

## Implementation Steps

1. **Read `docs/architecture/visibility.md`'s "Multi-Floor Visibility" section** in full
2. **Update `docs/architecture/wasm-bridge.md`** first with the new tile field
3. **Add the vertical-opening field** to `TilesBuffer`, mirroring `solid`'s pattern exactly (fixed array, included in `set_tile` or a new setter variant, pointer/count getter)
4. **Extend the shadowcasting sweep** in `packages/engine-core/src/visibility.rs` — when the sweep reaches a tile marked as a vertical opening, continue the visibility sweep onto the connected floor's tiles rather than treating the opening as a normal transparent same-floor tile; implement whichever adjacency approach is simplest to get correct and tested
5. **Write Rust unit tests** with a two-floor fixture (at least one opening, at least one non-aligned lower-floor tile that must stay excluded)
6. **Run task:22's existing test suite** to confirm no regressions
7. **Run `cargo test` and `wasm-pack build`**, confirm both pass

## Context

**Read first:**
- `docs/architecture/visibility.md` — source of truth, especially "Multi-Floor Visibility"
- `docs/features/world-model.md` — grid-ish indoor space this multi-floor structure sits within

**Related work:**
- task:20 (dependency: existing `TilesBuffer`/`solid` pattern to extend)
- task:22 (dependency: single-floor shadowcasting cull this task extends)
- task:25 (demo proof) may include a multi-floor scene to visually confirm this

**Key files:**
- `packages/engine-core/src/tiles.rs`
- `packages/engine-core/src/visibility.rs`
- `docs/architecture/wasm-bridge.md`
