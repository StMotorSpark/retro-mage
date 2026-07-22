---
task: "30"
slug: streaming-tuning-config
status: done
depends-on: ["27", "28", "29"]
blocked-by: ""
assigned-to: ""
created: 2025-06-17
outcome: "Exposed StreamingConfig struct and EngineState getters/setters for outdoor_load_radius, outdoor_evict_radius, indoor_hop_depth, and seam_trigger_distance. Configured values dynamically drive engine streaming behavior per level/context without exposing internal LRU/resident-set state. Added dev-mode validation warning when load radius or seam trigger distance is less than max sight distance. Covered by Rust unit tests."
---

# World Streaming Tuning Config

Expose the app-tunable knobs from `docs/architecture/world-streaming.md`'s three-tier control split (outdoor load/evict radius, indoor hop depth, seam trigger distance) as an application-facing config surface, following the same pattern as task:24's visibility tuning config.

## Desired Changes

- Add a streaming config struct/API in `packages/engine-core` (or extend an existing app-config surface if task:24 already established one — check first) exposing: outdoor load radius, outdoor evict radius, indoor hop depth, seam trigger distance
- Wire these config values into task:27's, task:28's, and task:29's previously-hardcoded default fields, so runtime config actually drives behavior instead of the hardcoded defaults
- Support per-level override, not just a single global app-wide value, mirroring how `docs/architecture/visibility.md`'s sight-distance knob is tunable per application/level
- Implement the validation constraint from `docs/architecture/world-streaming.md`'s "Streaming Trigger and Load-Ahead" section: outdoor load radius and seam trigger distance must each cover at least the current sight-distance setting (task:21/task:24) — implement as a dev-mode assertion/warning when config is set to a value that violates this, not a hard runtime failure
- Ensure engine-internal bookkeeping (resident-set structures, LRU tracking) from task:27/28/29 remains unexposed to this config surface, per the three-tier split's "not exposed at all" tier

## Definition of Done

- [ ] Config values for outdoor load/evict radius, indoor hop depth, and seam trigger distance are settable at runtime and take effect (verified by a test that sets a non-default value and confirms task:27/28/29 behavior changes accordingly)
- [ ] Per-level override works — two different configured contexts can carry different radius/depth/distance values simultaneously without one overwriting the other
- [ ] A test proves the sight-distance validation warns/asserts in dev builds when load radius or seam trigger distance is configured below the current sight-distance value
- [ ] Engine-internal resident-set/LRU state is not reachable through this config surface
- [ ] Rust unit tests cover config application and the validation constraint with concrete fixtures
- [ ] `cargo test` passes; `wasm-pack build` still succeeds

## Out of Scope

- New streaming mechanics — this task only wires existing hardcoded defaults from task:27/28/29 to a configurable surface
- Priority/pinning system for resident chunks or rooms — explicitly deferred in `docs/architecture/world-streaming.md`'s "Memory Budget and Eviction" section, not part of this task
- Any UI or app-facing config file format — the config surface is an engine-core API; how a specific application authors/loads config values into it is out of scope

## Implementation Steps

1. Read `docs/architecture/world-streaming.md`'s "Streaming Trigger and Load-Ahead" section in full, and task:24's visibility tuning config for the established config-surface pattern to mirror
2. Design/extend the config struct/API in `packages/engine-core`
3. Wire config values into task:27's outdoor radii, task:28's hop depth, and task:29's seam trigger distance
4. Implement per-level override support
5. Implement the sight-distance validation constraint as a dev-mode assertion/warning
6. Write Rust unit tests covering config application, per-level override, and the validation constraint
7. Run `cargo test` and `wasm-pack build`, confirm both pass

## Context

**Read first:**
- `docs/architecture/world-streaming.md` — source of truth for which knobs are app-tunable and the sight-distance validation constraint
- task:24's visibility tuning config — established pattern for engine-default/app-tunable config surfaces

**Related work:**
- task:27, task:28, task:29 (dependencies: the hardcoded default fields this task makes configurable)
- task:31 (demo proof scene) will exercise this config surface

**Key files:**
- `packages/engine-core/src/`
