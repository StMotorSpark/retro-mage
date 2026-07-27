---
task: "37"
slug: demo-outdoor-seam-terrain-skybox
status: done
depends-on: ["34", "36"]
blocked-by: ""
assigned-to: ""
created: 2026-07-23
outcome: "Registered Gate Room to outdoor terrain seam transform, added set_outdoor_default_tile_id to EngineState, implemented SkyboxRenderer in render package with atmospheric scattering gradient shader, wired grass texture and dynamic outdoor ambient light (1.0) on seam crossing in demo main.ts. Verified pnpm test, pnpm typecheck, and pnpm build pass with zero errors."
---

# Demo Outdoor Seam, Terrain & Skybox

Register the seam from Gate Room to an outdoor 3×3 chunk grass terrain area, and render the outdoor scene with grass tiles and an atmospheric skybox, per `docs/features/demo-scope.md`.

## Desired Changes

- Register one seam (`register_seam`) mapping the Gate Room exit tile to the outdoor chunk grid origin, per `docs/architecture/world-streaming.md`'s seam/coordinate-translation contract
- Set seam trigger distance to cover at least the indoor sight radius (streaming preload, no pop-in) and crossing threshold to one tile width
- Provide a `FlatChunkProvider` (or equivalent) filling a 3×3 chunk area (32×32 tiles each, ~96×96 total) with the grass tile ID
- Set outdoor `ambient_light = 1.0`
- Wire `grass.ktx2` (from task:34's asset folder) as the outdoor terrain texture via `packages/render`'s `world-tiles` renderer
- Render the skybox over the outdoor area using `packages/render/src/skybox`
- Confirm outdoor chunk streaming config (load radius 2, evict radius 3 — already set in current demo per task:30) still applies correctly with the new seam

## Definition of Done

- [ ] Walking through the Gate Room exit tile triggers a seam crossing into the outdoor area with no load screen or visible pop-in
- [ ] Outdoor terrain renders as grass-textured tiles across the 3×3 chunk area
- [ ] Skybox is visible over the outdoor terrain, giving a horizon and sky color
- [ ] Outdoor ambient light is full (`1.0`), giving a visibly larger sight radius than indoors — demonstrating contrast with the dungeon
- [ ] Walking back through the seam returns the player to Gate Room correctly positioned
- [ ] Chunk streaming (load/evict radius) continues to function as the player moves within the outdoor area

## Out of Scope

- Tree sprite actors — task:38
- Additional biomes or terrain variety
- Time-of-day/weather on the skybox — Phase 2

## Implementation Steps

1. **Confirm Gate Room exit tile exists** from task:36; identify its local coordinates.
2. **Register the seam**: call `register_seam` with Gate Room's room ID, target outdoor structure ID, local exit tile position, and an offset/rotation `SeamTransform` mapping to outdoor world origin — follow the pattern already used in the current 2-room proof scene in `examples/demo/src/main.ts` (`engineState.register_seam(...)`), adjusting room IDs for the new 3-room layout.
3. **Set seam tuning**: `set_seam_trigger_distance` ≥ current indoor `max_sight_distance`; `set_seam_crossing_threshold` to 1 tile width (see existing demo values as reference: `32.0` / `1.5` — confirm these still make sense for the 3-room layout or adjust).
4. **Provide outdoor chunk data**: implement or reuse a flat grass chunk provider (check `packages/engine-core/src/chunk.rs` and existing outdoor chunk streaming task:26/27 output for the `ChunkProvider` interface) covering 3×3 chunks at 32×32 tiles.
5. **Wire grass texture**: same `world-tiles` + `textures` pipeline pattern used indoors in task:36, pointed at `grass.ktx2`.
6. **Wire skybox**: integrate `packages/render/src/skybox`'s render call into the demo's per-frame draw loop, active only when `active_world_structure` is Outdoor.
7. **Set outdoor ambient light** via `set_ambient_light(1.0)` — likely needs to become a per-structure or dynamically-set value rather than a single global, since indoor is `0.05`; check `EngineState`'s current `ambient_light` API — if it's a single global, this task must call `set_ambient_light` on structure transition (seam crossing) — coordinate with how `active_world_structure` changes are detected in the current streaming code.
8. **Playtest**: cross the seam both directions, confirm terrain, skybox, and lighting contrast.

## Context

- Read: `docs/features/demo-scope.md` — Seam — Door to Outdoor, Outdoor — Terrain, Sky, Trees sections
- Read: `docs/architecture/world-streaming.md` — seam/coordinate-translation contract, outdoor chunk streaming
- Read: `docs/research/known-gaps.md#outdoor-coordinate-system` — pre-existing XZ/XY inconsistency; this task's seam-only crossing is unaffected per that gap's own note, but flag if outdoor free movement across chunk boundaries hits it during playtest
- Depends on: task:34 (grass texture asset), task:36 (Gate Room exit tile must exist)
- Key files: `examples/demo/src/main.ts`, `packages/engine-core/src/chunk.rs`, `packages/engine-core/src/seam.rs`, `packages/render/src/skybox/`, `packages/render/src/world-tiles/`
