---
task: "44"
slug: multi-floor-demo
status: done
depends-on: ["43"]
blocked-by: ""
assigned-to: ""
created: 2026-07-26
outcome: "Added Room 3 (Multi Floor Area) to demo map with functional stairs (direction=2), a vertical opening (hole to basement), and a low ceiling obstacle."
---

# Multi-Floor Demo Example

Update the `examples/demo` app to showcase the new multi-floor collision mechanics.

## Desired Changes

- Add a multi-floor structure (e.g., stairs leading up to a balcony or a second floor) to the demo level
- Add a vertical opening (hole) that the player can fall into
- Place a low-hanging ceiling or obstacle to demonstrate the head bump constraint

## Definition of Done

- [ ] Demo map contains at least one set of functional stairs with a `direction` tag
- [ ] Demo map contains a hole that the player falls through using gravity
- [ ] Demo map contains a ceiling low enough to block the player based on `player_height`
- [ ] The player can navigate the new multi-floor geometry without errors or falling out of bounds unintentionally

## Out of Scope

- Adding new textures or complex new actor sprites
- Creating a completely new level (just expand the existing one)

## Implementation Steps

1. **Update Map Data** (`examples/demo` map definition)
   - Modify the tile grid to add a second floor area or a sunken pit.
   - Add stair tiles connecting the Y elevations and assign their `direction` metadata.
   - Add a `vertical_opening` tile to create a droppable hole.
   - Create a low ceiling tile that intersects with `player_height` to block movement.

2. **Test Gameplay**
   - Run the demo locally (`npm run dev` or equivalent).
   - Walk the player character up and down the stairs to verify smooth interpolation.
   - Walk into the hole to verify gravity fall speed and ground impact.
   - Walk under the low ceiling to verify head bump stops movement.

## Context

- Read: `docs/architecture/collision.md`
- Depends on: task 43 (where engine multi-floor logic is implemented)
