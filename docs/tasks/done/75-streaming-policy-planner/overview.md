---
task: "75"
slug: streaming-policy-planner
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Implemented streaming planner evaluating explicit intent from distance, links, and pins without mutating lifecycle. Exposed LinkPreloadPolicy in topology."
---

# Implement Streaming Policy Planner

Add engine-owned coarse streaming intent evaluation for finite level instances without starting provider work or mutating lifecycle state directly.

## Desired Changes

- Add scheduler policy configuration for relevance distance, retention hysteresis, link preload behavior, and default priority/concurrency values defined by the Streaming Scheduler design.
- Add explicit per-instance desired residency intent: `Unneeded`, `Prefetch`, `Required`, or `Pinned`.
- Evaluate intent from current instance, global player pose, transformed finite bounds, reachable links, link preload policy, lifecycle state, application pins, and priority hints.
- Keep renderer visibility, collision activation, simulation activation, and crossing resolution out of planner authority.
- Produce deterministic scheduling decisions with stable tie-breaking for equal-priority work.
- Keep planner output inspectable for later runtime scheduling and browser diagnostics.

## Definition of Done

- [ ] Policy config has validated defaults and app-overridable relevance/retention values.
- [ ] Planner assigns required intent to current and immediately traversable transition content.
- [ ] Planner assigns prefetch intent to relevant linked/nearby instances and unneeded intent outside retention rules.
- [ ] Explicit pins prevent unneeded intent; application priority affects ordering without activating gameplay.
- [ ] Planner handles unknown, loading, resident, active, failed, evictable, and evicted lifecycle states safely.
- [ ] Equal-priority decisions are deterministic and stable.
- [ ] Rust unit tests cover bounds distance, link relevance, pins, hysteresis, failure safety, and intent precedence.
- [ ] Existing Rust tests pass.

## Out of Scope

- Provider request execution or concurrency queue.
- Automatic eviction or persistence handoff.
- Browser/WASM transport changes.
- Renderer occlusion or fine draw culling.
- Infinite procedural regions, byte-accurate memory budgets, or predictive movement.
- Gameplay simulation scheduling or multi-floor movement.

## Implementation Steps

1. Read `docs/architecture/streaming-scheduler.md`, `docs/architecture/world-runtime.md`, `docs/architecture/world-streaming.md`, and `docs/features/level-transitions.md`.
2. Inspect `WorldRuntime`, `WorldTopology`, `ResidencyManager`, transformed instance bounds, and current lifecycle enums before defining the planner boundary.
3. Add policy/configuration and intent types at the engine-core world-runtime boundary. Preserve application ownership of provider metadata and topology.
4. Implement a deterministic planner that consumes a frame relevance context and returns intent plus ordered reasons/priorities; do not call provider or mutate residency in this task.
5. Add focused tests for precedence: current/pinned/required content dominates prefetch and unneeded states.
6. Update related architecture docs only if the implementation exposes a contract mismatch; retain the scheduler design as source of truth.
7. Run `cargo test` for engine-core and record any API decisions in the task outcome.

## Context

- Read: `docs/architecture/streaming-scheduler.md` — authoritative scheduler contract.
- Read: `docs/architecture/world-runtime.md` — lifecycle and ownership boundaries.
- Read: `docs/architecture/world-streaming.md` — finite bounds, relevance, and eviction semantics.
- Related: task:76 consumes planner output for bounded provider scheduling.
- Related: task:77 consumes intent for pinning, retention, and eviction.
- Key files: `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_manifest.rs`, `packages/engine-core/src/residency.rs`, `packages/engine-core/src/world.rs`.
