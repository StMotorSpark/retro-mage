---
task: "72"
slug: engine-crossing-policy
status: pending
depends-on: ["71"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Implement Directional Crossing Policy

Make engine link traversal use narrow, directional crossing volumes with explicit re-arm hysteresis while keeping preload and readiness independent.

## Desired Changes

- Add authoritative `CrossingPolicy` data to `LevelLink`.
- Use recommended defaults: zero crossing padding, 0.5 world-unit re-arm distance, directional crossing enabled.
- Replace fixed proximity padding in runtime crossing checks with link policy.
- Require movement toward the destination for directional links.
- Track armed/disarmed traversal state so a successful crossing cannot immediately reverse while the player remains at the shared boundary.
- Preserve bidirectional reverse traversal after the player clears re-arm distance.
- Keep target readiness, safe arrival, source playability, and global pose continuity unchanged.
- Expose policy through browser transport/scalar registration as required by the demo.
- Add Rust tests for exact volume, directional movement, readiness denial, re-arm hysteresis, and bidirectional return traversal.

## Definition of Done

- [ ] No fixed `5.0` crossing padding remains in authoritative global crossing logic.
- [ ] Default link policy matches `padding = 0`, `rearm_distance = 0.5`, `require_direction = true`.
- [ ] Player inside an anchor but stationary or moving away does not cross.
- [ ] A ready target crosses only while the player enters the destination direction.
- [ ] Failed/pending target leaves source active and playable.
- [ ] Reverse crossing works after leaving the endpoint by the configured re-arm distance.
- [ ] Immediate repeated crossing at the shared boundary is impossible.
- [ ] Rust unit/integration tests cover policy defaults and state transitions.
- [ ] Existing engine tests pass.

## Out of Scope

- Demo-specific tuning or browser assertions.
- Runtime-driven preload scheduling.
- Memory/eviction policy.
- Teleporter arrival redesign.
- Full multi-floor movement.
- Visual pixel regression.

## Implementation Steps

1. Read `docs/architecture/crossing-policy.md`, `docs/features/level-transitions.md`, `docs/architecture/world-runtime.md`, and `docs/architecture/world-model.md`.
2. Extend `LevelLink` and manifest validation with crossing policy defaults/validation while preserving existing callers through recommended defaults.
3. Update runtime crossing evaluation to use the active endpoint's policy, player movement delta, and traversal armed state rather than a global padding constant.
4. Ensure state updates occur only after readiness and successful activation; failed or pending targets do not consume traversal state.
5. Add browser transport registration/accessors for policy without moving lifecycle authority out of `WorldRuntime`.
6. Add deterministic Rust coverage for source/target anchors sharing world space, direction checks, hysteresis, one-way links, and reverse bidirectional traversal.
7. Run Rust tests and regenerate WASM bindings if browser APIs changed.

## Context

- Read: `docs/architecture/crossing-policy.md` — source of truth.
- Read: `docs/features/level-transitions.md` — user-visible traversal contract.
- Related: task:71 — CI proof stabilization.
- Follow-up: task:73 — demo crossing proof.
- Key files: `packages/engine-core/src/world_manifest.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_transport.rs`.
