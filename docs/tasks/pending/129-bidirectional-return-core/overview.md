---
task: "129"
slug: bidirectional-return-core
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-20
outcome: ""
---

# Repair Bidirectional Spatial Return Crossing

Make engine-owned spatial links cross safely in both directions through the normal world-aware frame.

## Desired Changes

- Repair `WorldRuntime` bidirectional crossing direction and re-arm behavior so a player can cross source → target, leave target anchor, then cross target → source without caller thresholds, teleports, or collision synchronization.
- Make directional evaluation conform to transformed anchor orientation: source uses its world forward vector and a bidirectional reverse endpoint uses its opposite traversal direction.
- Replace global/ambiguous traversal disarm state with runtime state that identifies link and endpoint needed to re-arm safely.
- Add deterministic engine regression coverage matching consumer topology: outside anchor `[4, 0, 1]`, dungeon anchor `[3, 0, 6]`, provisional dungeon instance transform `[1, 0, 5]`, one spatial bidirectional link, and `WorldTransport::tick_engine` movement in both directions.
- Verify target placement remains engine-owned and return activation restores source collision through normal lifecycle operations.

## Definition of Done

- [ ] Regression drives `tick_engine` through forward crossing, re-arm clearance, reverse crossing, and asserts active instance changes each time.
- [ ] Regression asserts forward target collision activates, return source collision activates, departed instance collision deactivates, and player remains grounded on supported geometry.
- [ ] No test or production caller supplies a crossing threshold, pose teleport, direct collision mutation, or second engine tick path.
- [ ] Directional crossing uses transformed anchor direction, reverses correctly for bidirectional endpoint traversal, and rejects movement in opposite direction.
- [ ] Re-arm state cannot immediately re-cross at shared boundary, but re-arms after configured clearance for same link/endpoint.
- [ ] Existing one-way, readiness, overflow, explicit-arrival, and spatial-placement behavior remains covered and passes.
- [ ] `cargo test -p engine-core` passes.

## Out of Scope

- Consumer repository edits, commits, or test-worktree cleanup.
- Game-specific crossing thresholds, teleport workarounds, or manual collision synchronization.
- New link transform modes, anchor-volume schema changes, renderer changes, or scheduler tuning.
- Public diagnostics API additions; assess separately only if regression cannot expose failure deterministically.

## Implementation Steps

1. Read `docs/features/level-transitions.md`, `docs/architecture/crossing-policy.md`, `docs/architecture/collision-bridge.md`, and `docs/architecture/world-runtime.md`. Treat their current contract as authoritative.
2. Trace `WorldTransport::tick_engine`, `WorldRuntime::try_crossing`, `WorldTopology::anchor_forward_world`, placement resolution, and residency activation/deactivation. Preserve world-aware frame ordering.
3. Introduce traversal state with enough link/endpoint identity to enforce documented hysteresis without blocking a valid reverse traversal after clearance. Keep state runtime-owned and clear stale state safely when topology/lifecycle requires it.
4. Evaluate direction from active endpoint transformed anchor orientation. For reverse traversal of one `Bidirectional` link, apply reverse orientation; retain non-directional policy behavior.
5. Add minimal Rust regression fixtures with consumer-equivalent anchors, provisional transform, support surfaces, and production-equivalent movement via `tick_engine`. Do not encode consumer implementation imports or private consumer APIs.
6. Run focused crossing tests, then full `cargo test -p engine-core`. Record exact commands/results in task outcome when completing.

## Context

- Read: `docs/features/level-transitions.md` — spatial placement and bidirectional contract.
- Read: `docs/architecture/crossing-policy.md` — direction and re-arm contract.
- Read: `docs/architecture/collision-bridge.md` — single world-aware tick and collision ownership.
- Key files: `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_manifest.rs`, `packages/engine-core/src/world_transport.rs`, `packages/engine-core/tests/seamless_demo.rs`.
- Consumer proof context: Avendal task-09 production-touch repro; do not modify `/Users/bensimons/Documents/GitHub/avendal-game`.
