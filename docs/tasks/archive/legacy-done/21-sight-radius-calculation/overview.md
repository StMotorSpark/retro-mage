---
task: "21"
slug: sight-radius-calculation
status: done
depends-on: ["20"]
blocked-by: ""
assigned-to: ""
created: 2025-06-16
outcome: "Implemented compute_sight_radius in visibility.rs module and sight_radius method on EngineState. Calculates base radius from ambient light plus dynamic light contribution (intensity - distance falloff), bounded by DEFAULT_MAX_DRAW_DISTANCE (32.0). Fully tested with Rust unit tests."
---

# Sight Radius Calculation

Implement the "sight radius is a function of ambient light level plus nearby dynamic light contribution" calculation described in `docs/architecture/visibility.md`, as a standalone function the shadowcasting cull (task:22) consumes.

## Desired Changes

- Add a new module `packages/engine-core/src/visibility.rs` (new feature slice, per `docs/principles/agent-dev-principles.md`'s module convention) containing a function that computes effective sight radius given: the current `ambient_light` scalar (task:20), the player/camera position, and the live `LightsBuffer` entries
- The calculation combines a **base radius from ambient light** (scaling from near-zero at `ambient_light == 0.0` up to the app-configured max draw distance at `ambient_light == 1.0`) with an **additional radius contribution from nearby active lights**, weighted by each light's `intensity` and falloff by distance from the player — exact falloff curve (linear, inverse-square, etc.) is the worker's implementation choice, but it must be monotonically decreasing with distance and produce `0` contribution beyond a light's practical falloff range
- Expose a `sight_radius(&self) -> f32` method on `EngineState` (or a method taking explicit camera position if `EngineState` doesn't yet track one distinctly from `CameraBuffer` — use the existing `CameraBuffer` entry as the reference position) so this value is independently testable and inspectable before task:22 consumes it internally
- The max draw distance ambient light scales toward is a configurable constant for now (a `const` or a field with a sane default) — task:24 will make it an app-tunable runtime value; this task just needs the calculation to accept/use a max-distance input rather than hardcoding one magic number inline

## Definition of Done

- [ ] `sight_radius()` (or equivalent) returns the full configured max distance when `ambient_light == 1.0` and no dynamic lights are active
- [ ] `sight_radius()` returns a small radius bounded by nearby light contribution when `ambient_light == 0.0` and one or more active lights are near the player
- [ ] `sight_radius()` returns `0` or near-`0` when `ambient_light == 0.0` and no active lights are within range of the player
- [ ] Light contribution falls off with distance (a light far from the player contributes less than one close to the player) and never contributes negatively
- [ ] Rust unit tests cover all four bullets above with concrete numeric assertions (not just "greater than zero" — assert expected relative ordering/magnitude)
- [ ] `cargo test` passes; `wasm-pack build` still succeeds

## Out of Scope

- Any occlusion/shadowcasting logic — this task computes a radius number only, it does not decide which tiles are visible within that radius (task:22)
- Making the max draw distance runtime-tunable by the app — this task uses a fixed default constant/field; task:24 wires the app-facing tuning API
- Per-light color contribution to the radius calculation (color feeds the LUT lighting pipeline per `docs/architecture/rendering.md`, not sight radius) — only `intensity` and distance matter here

## Implementation Steps

1. **Read `docs/architecture/visibility.md`'s "Sight Radius Is Driven by Ambient Light Level" section** — this is the exact behavior to implement
2. **Create `packages/engine-core/src/visibility.rs`**, add `pub mod visibility;` to `packages/engine-core/src/lib.rs`
3. **Implement the base-radius-from-ambient-light function** — a simple scale from `ambient_light` (0.0–1.0) to a max-distance constant
4. **Implement the dynamic-light-contribution function** — iterate active entries in `LightsBuffer` (use `active_count()`/`active` filtering, matching the pattern already used elsewhere), compute distance from camera position (`CameraBuffer`'s single entry) to each light, apply a monotonic falloff, sum or take the max contribution (worker's choice, document which), combine with the ambient base
5. **Expose `sight_radius()`** on `EngineState`, delegating to the new module
6. **Write Rust unit tests** in `visibility.rs` covering the four Definition of Done bullets with concrete fixture values (specific ambient levels, specific light positions/intensities, specific camera position)
7. **Run `cargo test` and `wasm-pack build`**, confirm both pass

## Context

**Read first:**
- `docs/architecture/visibility.md` — source of truth for this calculation's exact behavior
- `packages/engine-core/src/lights.rs` — the `LightsBuffer`/`active_count()` pattern this task reads from
- `packages/engine-core/src/camera.rs` — the camera/player position this task reads from

**Related work:**
- task:20 (dependency: `ambient_light` scalar this task consumes)
- task:22 (shadowcasting cull) depends on this task's `sight_radius()` existing
- task:24 (app-tunable config) will make this task's fixed max-distance constant runtime-configurable

**Key files:**
- `packages/engine-core/src/visibility.rs` (new)
- `packages/engine-core/src/lib.rs`
