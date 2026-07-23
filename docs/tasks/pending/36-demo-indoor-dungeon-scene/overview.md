---
task: "36"
slug: demo-indoor-dungeon-scene
status: pending
depends-on: ["33", "34", "35"]
blocked-by: ""
assigned-to: ""
created: 2026-07-23
outcome: ""
---

# Demo Indoor Dungeon Scene

Build the 3-room indoor dungeon in `examples/demo` per `docs/features/demo-scope.md`: Entry Hall, Armory, Gate Room, with textured stone walls/floors, 4 torch point lights, and working player collision — replacing the current placeholder flat-shaded quad rendering with the real textured/lit tile pipeline.

## Desired Changes

- Author 3 rooms in `examples/demo/src/main.ts` (or a new scene-setup module) as hand-placed tile fixtures: Entry Hall (start, wide, 2 torches), Armory (narrower, connected to Entry Hall, 1 torch, darker ambient), Gate Room (connected to Entry Hall, 1 torch, contains the seam exit tile — seam registration itself is task:37's job, but the room and its exit tile must exist)
- Wire `stone-wall.ktx2` and `stone-floor.ktx2` (compiled from assets added in task:34) as the wall/floor textures via `packages/render`'s `world-tiles` + `textures` modules, replacing `TextureQuadDemo` placeholder rendering for tiles
- Add 4 torch point lights (warm orange-yellow `r=1.0,g=0.7,b=0.3`) using engine-core's `lights` module and the LUT format decided in task:35
- Set indoor `ambient_light ≈ 0.05`
- Wire player movement input through `collision` module (task:33) so the player is blocked by solid wall tiles and slides along them
- Update indoor room graph (`add_room_to_graph`, `add_room_edge`) to reflect 3 rooms instead of the current 2-room proof scene

## Definition of Done

- [ ] 3 rooms exist as tile fixtures with correct adjacency: Entry Hall ↔ Armory, Entry Hall ↔ Gate Room
- [ ] Stone wall and stone floor textures render on the correct tiles (not flat-shaded placeholders)
- [ ] 4 torch point lights are placed (2 in Entry Hall, 1 in Armory, 1 in Gate Room) and visibly illuminate their rooms against low ambient light
- [ ] Player cannot walk through wall tiles; diagonal movement into a wall slides along it
- [ ] Room streaming (hop depth 1) keeps Entry Hall + neighbors resident as player moves between rooms, no visible pop-in
- [ ] Demo runs in dev (`pnpm --filter demo dev` or repo equivalent) and is walkable with gamepad or touch input end to end through all 3 rooms
- [ ] Existing input wiring (`packages/input`) continues to drive `move_x/y` and `look_x/y` into the new collision-driven movement

## Out of Scope

- Seam/door transition to outdoor area — task:37
- Outdoor terrain, skybox, tree sprites — task:37, task:38
- Combat, HUD, animated sprites, audio — Phase 2, not in scope
- Multi-floor rooms, stairwells — separate known gap

## Implementation Steps

1. **Confirm prerequisites landed**: task:33's collision module in `tick()`, task:34's texture folders populated (real PNGs may or may not be present yet from the human — if not yet supplied, use the existing `wall.png` as temporary stand-in and leave a `// TODO: swap when stone-wall.png/stone-floor.png land` comment; do not block on missing art), task:35's LUT format doc.
2. **Author room tile layout**: extend the tile-placement loops already in `examples/demo/src/main.ts` (see current 2-room proof scene as reference pattern) into 3 rooms with appropriate wall/floor tile IDs and solidity flags per `docs/architecture/collision.md`'s solid-tile expectations.
3. **Wire textures**: replace `TextureQuadDemo`/flat quad rendering path for tiles with `packages/render`'s `world-tiles` renderer, feeding it the compiled `.ktx2` textures via `loadKtx2Texture` (see `packages/render/src/textures/index.ts`).
4. **Wire lights**: place 4 `PointLight` entries via engine-core's `lights` module (check `packages/engine-core/src/lights.rs` for the exact setter API), set colors/intensity per demo-scope spec, set `ambient_light` to `0.05`.
5. **Wire collision-driven movement**: ensure the per-frame loop passes `input` events into `EngineState.tick(dt)` (which now runs collision per task:33) rather than any prior direct camera-set path used only for initial placement.
6. **Update room graph**: extend `add_room_to_graph`/`add_room_edge` calls for 3 rooms; keep `set_indoor_current_room(0)` as Entry Hall start.
7. **Manual playtest**: verify walkability, texture rendering, torch lighting contrast, and wall collision end to end.

## Context

- Read: `docs/features/demo-scope.md` — Indoor — 3 Rooms section, full room/light/texture spec
- Read: `docs/architecture/collision.md` — collision integration this task wires up
- Read: `docs/architecture/world-streaming.md` — indoor room graph streaming behavior
- Depends on: task:33 (collision must be in `tick()` before player movement works), task:34 (texture asset folders/naming), task:35 (LUT format for torch lights)
- Key files: `examples/demo/src/main.ts`, `packages/render/src/world-tiles/`, `packages/render/src/textures/`, `packages/engine-core/src/lights.rs`, `packages/engine-core/src/room.rs`
