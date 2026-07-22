---
feature: visibility
tags: [architecture, rendering, visibility, streaming, world-model]
summary: Retro Mage determines what's visible each frame with one occlusion-aware, light-driven cull that runs identically across a single seamless world, fed by two streaming strategies for indoor and outdoor space.
relates-to:
  - "[Rendering](./rendering.md)"
  - "[World Model](../features/world-model.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[World Streaming](./world-streaming.md)"
---

# Visibility

Retro Mage decides what to draw each frame with a single visibility system: what a wall occludes, how far a player can see, and how indoor and outdoor space stream in and out are all resolved by one cull rather than separate indoor/outdoor visibility rules.

## Overview

The world is seamless — a player can walk from a dark dungeon corridor through a doorway into open outdoor terrain with no load screen and no level transition, per [World Model](../features/world-model.md). Visibility is designed around that constraint: one occlusion-aware cull runs everywhere, and indoor/outdoor is only a distinction in how the underlying world data streams, not in how visibility itself behaves.

## One System, Two Streaming Strategies

Indoor and outdoor space are stored as two distinct data structures — indoor dungeon geometry and outdoor terrain chunks are not unified into one shared coordinate/data model — but the boundary between them is invisible to the player. As a player approaches a doorway or terrain edge, the engine streams in the adjacent structure ahead of time and hands off between them with no visible cut, no loading screen, and no discrete level swap. The player-facing experience is one continuous world; internally, it's two streaming strategies (dense/bounded for indoor rooms, sparse/distance-based for outdoor chunks) feeding the same visibility cull.

This keeps the indoor and outdoor data models simple and independently tunable (a dungeon room's data shape doesn't need to accommodate open-terrain streaming concerns and vice versa) while still delivering the mixed, non-compartmentalized environments the game targets.

## Sight Radius Is Driven by Ambient Light Level

Rather than treating "how far can the player see" as a fixed constant, or inventing a separate light-blocks-sight rule for dark spaces, sight radius is a function of the local ambient light level:

- **High ambient light** (open sky, outdoor daylight) — sight radius defaults to the full configured draw distance. Night or overcast conditions dim how things are shaded (via the lighting LUTs described in [Rendering](./rendering.md)) but do not shrink what's visible — darkness affects appearance, not sight range, when ambient light is present.
- **Low or zero ambient light** (a torch-lit or unlit dungeon interior) — sight radius collapses toward whatever nearby dynamic light sources (torches, spell effects) currently provide. Stepping outside every light source's range means stepping outside what's rendered.

This is one calculation, not two modes: sight radius = f(ambient light level, nearby dynamic light contribution). Outdoor space naturally produces a large radius because it naturally has high ambient light; indoor space naturally produces a small, light-source-dependent radius because it naturally has little to none. No indoor/outdoor branch is needed in the visibility logic itself.

This deliberately does not implement fog-of-war. Retro Mage does not track or render previously-seen-but-currently-out-of-sight geometry — what the player currently sees is exactly what's rendered, nothing is remembered or revealed-then-hidden as a separate concept.

## Occlusion Is Always On

Walls and solid geometry always block sight through them — this is fixed engine behavior, not a configurable trade-off. Seeing through walls would break the first-person dungeon-crawler experience the rendering pipeline targets, and correct occlusion is also required for the painter's-algorithm draw ordering described in [Rendering](./rendering.md) to avoid sorting and drawing geometry that's already known to be hidden.

What *is* tunable per application/level:
- **Sight distance** — the maximum radius the ambient-light calculation above can reach, independent of occlusion.
- **Cull precision by distance** — near the player, visibility is computed with exact per-tile occlusion; beyond a tunable distance threshold, the cull can drop to a coarser, distance-only approximation where exact wall-by-wall occlusion has negligible visual impact. Where that threshold sits is an application/level tuning knob, not a fixed engine constant, so a cramped dungeon and a wide-open field can each tune it for their own performance profile.

## Algorithm — Recursive Shadowcasting

The near-field precise visibility cull uses **recursive shadowcasting** over the tile grid: visibility is computed outward from the player's tile in octants, with any occluding tile casting a shadow that excludes the tiles behind it from that octant's visible set.

This is chosen over portal culling or BSP because:
- The world is grid-aligned by design (per [World Model](../features/world-model.md)) — shadowcasting operates natively on a tile grid, while portal culling and BSP earn their added complexity only against arbitrary, non-grid room geometry this engine doesn't have.
- It computes radius and occlusion together in one pass, which is exactly the combination this doc's sight-radius and occlusion rules need — no separate radius check and occlusion check to keep in sync.
- It runs cheaply enough to recompute every frame, matching the every-frame recompute requirement below, and is a proven, well-understood technique for real-time grid-based visibility.

Recursive shadowcasting is well established for flat, single-floor grids. Extending it across floors is the open piece this doc's multi-floor section below scopes rather than fully resolves.

## Multi-Floor Visibility

Cross-floor sightlines are in scope now, not deferred — a player standing on a balcony overlooking a great hall below, or looking up a stairwell gap to the floor above, is expected to see across that vertical boundary rather than being visually walled off at each floor's bounds. The near-field shadowcasting pass extends to account for vertical openings (balconies, stairwells, floor gaps) as visibility-passing geometry rather than being scoped strictly per-floor.

## Update Frequency

Visibility recomputes every frame, matching the real-time (not turn-based) movement and combat described in [World Model](../features/world-model.md) — there is no tile-boundary-crossing trigger that recomputes only on discrete movement steps. The engine's [60 FPS performance target](./rendering.md#performance-target) makes recompute cost a first-class constraint, which is why cull precision by distance (above) exists as an application-tunable knob rather than a fixed always-exact cull.

## Related Docs

- [Rendering](./rendering.md) — the painter's-algorithm draw order and LUT lighting this visibility cull feeds into
- [World Model](../features/world-model.md) — the seamless indoor/outdoor world and real-time movement this visibility system is designed around
- [WASM Bridge](./wasm-bridge.md) — the per-frame buffer contract that will carry the visible-tile/actor set this cull produces
- [World Streaming](./world-streaming.md) — the chunk/room streaming mechanics behind this doc's "two data structures, invisible handoff" decision
