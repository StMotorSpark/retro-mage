---
feature: world-model
tags: [features, world-model, dungeon-crawler]
summary: Retro Mage represents the game world as a grid-ish, real-time dungeon-crawler space indoors and chunked terrain outdoors, with room for simulation depth layered on top.
relates-to:
  - "[Rendering](../architecture/rendering.md)"
  - "[Tech Stack](../architecture/tech-stack.md)"
  - "[Visibility](../architecture/visibility.md)"
  - "[World Streaming](../architecture/world-streaming.md)"
---

# World Model

Retro Mage's world model defines the space a game built on the engine takes place in: a grid-ish, real-time dungeon-crawler space indoors, extending into chunked open terrain outdoors, with simulation depth as an evolving layer rather than a fixed rule set.

## Overview

The genre reference point is the dungeon crawler / immersive sim — real-time movement and combat within a space that is grid-ish rather than freeform, giving structured navigation and level design while supporting the polygon geometry described in [Rendering](../architecture/rendering.md) for spaces that break from a strict grid.

## Indoor Space — Grid-ish, Real-Time

Indoor dungeon space is grid-aligned by default — tiles for floors, ceilings, and walls — with polygon geometry available for structures that depart from the grid. Movement and combat are real-time, not turn-based: actors move and act continuously rather than on a turn cycle.

## Outdoor Space — Chunked Terrain

Outdoor space extends the world beyond the dungeon grid into open terrain, represented in chunks so that streaming, rendering, and memory cost scale with the chunks currently relevant to the player rather than the entire outdoor map. Outdoor chunks connect to indoor dungeon spaces as entry and exit points between the two representations, and that connection is seamless — a player crosses between indoor and outdoor data without a load screen or discrete level transition, per [Visibility](../architecture/visibility.md).

## Simulation Depth

The world model supports simulation depth beyond pure navigation and combat — interactive objects, inventory, and actor behavior are expected additions as the engine matures. The specific mechanics of that depth are defined in their own feature docs as they're built out, rather than fixed in this document.

## Related Docs

- [Rendering](../architecture/rendering.md) — how this world model is drawn, including the tile/polygon hybrid and chunked outdoor rendering
- [Tech Stack](../architecture/tech-stack.md) — the fixed-point math and Rust/WASM core this world model runs on
- [Visibility](../architecture/visibility.md) — the occlusion/sight-radius cull and seamless indoor/outdoor streaming handoff built on this world model
- [World Streaming](../architecture/world-streaming.md) — the chunk/room streaming mechanics for the outdoor terrain and indoor rooms described here
