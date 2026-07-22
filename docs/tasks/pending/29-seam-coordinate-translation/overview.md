---
task: "29"
slug: seam-coordinate-translation
status: pending
depends-on: ["27", "28"]
blocked-by: ""
assigned-to: ""
created: 2025-06-17
outcome: ""
---

# Seam Coordinate Translation (Indoor ↔ Outdoor Handoff)

Implement the seam transform and crossing logic described in `docs/architecture/world-streaming.md`'s "Coordinate Translation at the Seam" section, so a player crossing between a room graph (task:28) and the outdoor chunk grid (task:27) hands off with no visible cut.

## Desired Changes

- Add a **seam transform** data structure: an offset + rotation pinned to a specific door/exit tile, mapping room-local tile coordinates to outdoor global tile coordinates (and back) for that link only
- Attach seam transforms to specific room-graph edges/exit tiles (task:28) and specific outdoor chunk/tile locations (task:27) — a room can have more than one seam, each with its own independent transform
- Implement the crossing sequence: convert player position through the relevant seam transform, switch the active driving data structure (room graph vs. outdoor chunk grid) to the destination, with no global coordinate reconciliation elsewhere
- Implement the seam trigger distance behavior: within the configured seam trigger distance (tunable value, hardcode a sane default now; task:30 wires app-facing config) of a seam, eagerly ensure the far side is resident (calling into task:27's/task:28's existing load logic) ahead of the actual crossing
- Add engine-core functions exposing current active structure + player position in that structure's coordinates, for `render`/tests to consume

## Definition of Done

- [ ] A test fixture with one room having a seam to a specific outdoor chunk/tile proves: player position converts correctly through the seam transform in both directions (room→outdoor and outdoor→room round-trips to the same relative position)
- [ ] A test proves that approaching a seam within the trigger distance causes the far side to become resident before the player's position actually crosses the seam boundary
- [ ] A test proves crossing the seam switches the active driving data structure and converts player position correctly, with no discontinuity in reported world-facing state (e.g. player doesn't visibly teleport to (0,0) or an unrelated point)
- [ ] A test proves a single room can have two independent seams to two different outdoor locations, each with its own correct transform
- [ ] Rust unit tests cover all of the above with concrete fixtures
- [ ] `cargo test` passes; `wasm-pack build` still succeeds

## Out of Scope

- Visual/render-side transition handling — this task only produces correct position/data-structure state at the crossing; how `render` consumes that to avoid a visible pop is a `render`-package concern if any is needed at all
- Tuning config surface for seam trigger distance — that's task:30, this task only needs the value to be overridable
- Multi-floor seams or seams involving vertical openings — scoped to flat indoor/outdoor seams per this doc; a future extension if multi-floor outdoor connections are needed

## Implementation Steps

1. Read `docs/architecture/world-streaming.md`'s "Coordinate Translation at the Seam" section in full
2. Design the seam transform data structure and how it attaches to room-graph edges (task:28) and outdoor chunk/tile locations (task:27)
3. Implement the coordinate conversion functions (room-local ↔ outdoor-global) for a given seam
4. Implement seam trigger distance logic, calling into task:27/task:28's existing load paths to preload the far side
5. Implement the crossing sequence that switches the active driving structure and converts player position
6. Write Rust unit tests covering round-trip conversion, preload-before-crossing, actual crossing, and multi-seam-per-room
7. Run `cargo test` and `wasm-pack build`, confirm both pass

## Context

**Read first:**
- `docs/architecture/world-streaming.md` — source of truth for seam transform design and trigger-distance rule
- task:27's outdoor chunk streaming (dependency)
- task:28's room graph streaming (dependency)

**Related work:**
- task:27 (dependency: outdoor chunk resident set + load logic)
- task:28 (dependency: room graph resident set + load logic)
- task:30 (streaming tuning config) attaches app-facing config to the seam trigger distance this task exposes

**Key files:**
- `packages/engine-core/src/`
