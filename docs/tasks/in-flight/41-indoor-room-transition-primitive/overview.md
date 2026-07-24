---
task: "41"
slug: indoor-room-transition-primitive
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-24
outcome: ""
---

# Indoor Room-Transition Primitive

Add a trigger volume (doorway) primitive to `engine-core` so it can automatically detect when the player moves between indoor rooms, removing the need for manual coordinate bound checks in the application.

## Desired Changes

- Add a new struct/buffer for `Doorway` volumes linking an AABB boundary to an adjacent `room_id`.
- Check player position against registered doorways during `tick()` when active structure is Indoor.
- Automatically update `indoor_current_room_id` internally when crossing a doorway.
- Remove manual player X-bounds check driving `set_indoor_current_room` in `examples/demo/src/main.ts`.

## Definition of Done

- [ ] Demo seamlessly transitions from Entry Hall -> Armory -> Gate Room automatically based on movement
- [ ] `engine-core` updates `indoor_current_room_id` when player crosses a doorway AABB
- [ ] `main.ts` no longer contains manual room-bounds tracking
- [ ] All Rust tests pass (tests added for doorway transitions)

## Out of Scope

- Non-axis-aligned doorways (Phase 1 supports axis-aligned rectangular regions only)
- Interaction prompts for doorways (walking through triggers the transition instantly)
- Changes to seam transition logic (which handles indoor <-> outdoor, not indoor <-> indoor)

## Implementation Steps

1. **Define `Doorway` Struct (`packages/engine-core/src/room.rs` or `lib.rs`)**
   - Add a fixed buffer of doorways to `EngineState` (`[Doorway; MAX_DOORWAYS]`).
   - A `Doorway` should define its AABB (`min_x, max_x, min_z, max_z`), the `from_room_id`, and the `to_room_id`.

2. **Add Registration API (`packages/engine-core/src/lib.rs`)**
   - Expose `register_indoor_doorway(...)` to JS/WASM for the application to setup boundaries.

3. **Check Doorways in `tick()`**
   - In `tick()`, after movement resolution, if `active_world_structure == 0` (Indoor), check if the new `(camera.x, camera.z)` falls inside any active doorway for the `indoor_current_room_id`.
   - If true, update `indoor_current_room_id` to `to_room_id` and update streaming graph boundaries.

4. **Update Demo (`examples/demo/src/main.ts`)**
   - Register the doorways between Entry Hall & Armory, and Entry Hall & Gate Room.
   - Delete the manual `px <= -4` bounds check block in the `frame()` loop.

## Context

**Read first:**
- `docs/architecture/world-streaming.md`
- `docs/research/known-gaps.md` (Indoor Room-Transition Detection gap)

**Key files:**
- `packages/engine-core/src/lib.rs`
- `packages/engine-core/src/room.rs`
- `examples/demo/src/main.ts`
