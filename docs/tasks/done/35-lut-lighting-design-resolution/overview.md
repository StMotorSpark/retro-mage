---
task: "35"
slug: lut-lighting-design-resolution
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-23
outcome: "Resolved LUT Format and Generation known gap by authoring docs/architecture/lighting.md. Documented 256x32 2D LUT dimensions, procedural runtime generation, WebGL texture upload, WASM light buffer integration, and 4-torch demo mapping."
---

# Resolve LUT Lighting Design Gap

Resolve the open "LUT Format and Generation" known gap (`docs/research/known-gaps.md#lut-format-and-generation`) so the demo's torch point-light rendering (task:36) has a concrete lighting lookup table format to implement against.

This is a design decision task, not an art or rendering-code task — output is an update to `docs/architecture/rendering.md` (or a new `docs/architecture/lighting.md` if the LUT design warrants its own doc) plus a `known-gaps.md` resolution entry, matching the pattern already used for Collision and Visibility.

## Desired Changes

- Read `packages/render/src/lighting/` — inspect what, if anything, is already implemented there (there may be partial work; check before assuming a blank slate)
- Decide and document: LUT dimensions (e.g. 1D distance-attenuation table vs. 2D distance×angle), authoring method (baked offline asset vs. generated at runtime from `CollisionConfig`-style tunables), file format (raw typed array shipped as JS, small PNG, or generated procedurally at init), and how `packages/render`'s lighting slice consumes point lights read from the `lights` WASM buffer (`docs/architecture/wasm-bridge.md`)
- Update `docs/research/known-gaps.md`: move "LUT Format and Generation" from Open Questions to Resolved, pointing at the new/updated doc
- Update `docs/_map.md` if a new doc is created

## Definition of Done

- [ ] `packages/render/src/lighting/` current implementation state is read and summarized in the design doc (what exists vs. what's a stub)
- [ ] LUT dimensions, authoring method, and file format are decided and documented in present tense as target state
- [ ] Doc explains how the demo's 4 torch point lights (per `docs/features/demo-scope.md`) map onto the LUT — i.e. what a consuming app needs to call to get a torch light rendered on a tile
- [ ] `docs/research/known-gaps.md` updated: gap moved to Resolved section
- [ ] `docs/_map.md` updated if new doc added
- [ ] No code written in this task — pure design doc resolution

## Out of Scope

- Implementing or modifying `packages/render/src/lighting/` code
- Wiring lighting into the demo (task:36 does that, using this doc as source of truth)
- Time-of-day / dynamic lighting (Phase 2, already tracked separately)

## Implementation Steps

1. Read `packages/render/src/lighting/` source fully — check for existing LUT generation code, shader uniforms, or test fixtures that already imply an answer.
2. Read `docs/architecture/rendering.md` for the conceptual LUT description already present, and `docs/architecture/wasm-bridge.md` for the `lights` buffer shape (`lights.rs` in engine-core) point lights are read from.
3. Make the design decision using `/skill:design-doc` conventions — present tense, target state, no "will"/"future" language.
4. Write the doc (extend `rendering.md`'s lighting section, or split into `docs/architecture/lighting.md` if the content is substantial enough to warrant its own vertical slice doc — use judgment per FaM vertical-slice principle).
5. Update `known-gaps.md` and `_map.md`.

## Context

- Read: `docs/research/known-gaps.md#lut-format-and-generation` — the exact gap being resolved
- Read: `docs/architecture/rendering.md` — existing conceptual LUT description
- Read: `docs/architecture/wasm-bridge.md` — `lights` buffer this LUT consumes
- Related: task:36 (indoor dungeon scene) depends on this doc to implement torch lighting
- Key files: `packages/render/src/lighting/`, `docs/architecture/rendering.md`, `docs/research/known-gaps.md`, `docs/_map.md`
