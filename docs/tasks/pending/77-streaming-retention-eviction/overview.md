---
task: "77"
slug: streaming-retention-eviction
status: pending
depends-on: ["75"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Implement Streaming Retention and Eviction

Apply scheduler intent to runtime pinning, retention hysteresis, evictable state, and safe release/reload of finite level-instance content.

## Desired Changes

- Represent runtime and application pin reasons without conflating pinning with gameplay activation.
- Keep current instance, immediately traversable transition targets, crossing endpoint pairs, and explicit application pins retained.
- Mark resident content outside the relevance/retention band as evictable deterministically.
- Reject eviction for current, active, pinned, loading, or crossing-critical instances.
- Release transient transformed content on eviction while preserving topology, instance identity, and persistence handoff boundaries.
- Support reloading evicted content through the existing provider request/result lifecycle.
- Expose eviction eligibility, retention reason, and eviction reason for diagnostics.

## Definition of Done

- [ ] Current instance and active transition pair remain pinned through relevance changes.
- [ ] Explicit application pins prevent eviction until released.
- [ ] Retention hysteresis prevents immediate eviction at the relevance boundary.
- [ ] Ineligible content transitions to `evictable` before release; protected content cannot be evicted.
- [ ] Eviction releases runtime content but preserves descriptor/topology and application persistence identity.
- [ ] Reload returns the instance through normal provider validation and restores spatial placement.
- [ ] Failed reload does not damage current or retained source content.
- [ ] Rust tests cover pin precedence, hysteresis, protected states, release, reload, and failure.
- [ ] Existing Rust tests pass.

## Out of Scope

- New relevance/planner rules; task:75 owns planner intent.
- Provider queue/concurrency; task:76 owns request scheduling.
- Byte-accurate memory budgets or platform-specific pressure heuristics.
- Persistence serialization format or actor transfer.
- Browser/WASM transport and demo proof; task:78 owns those changes.
- Infinite procedural regions, renderer culling, or gameplay simulation scheduling.

## Implementation Steps

1. Read task:75 outcome and `docs/architecture/streaming-scheduler.md`, especially pins, retention, and eviction sections.
2. Trace `ResidencyManager` state transitions, `WorldRuntime.mark_evictable`, `evict`, persistence handoff, and transformed content ownership.
3. Add pin/reason and retention state at the runtime boundary with explicit application pin/unpin operations if absent.
4. Apply planner intent without allowing evictable/evicted state to bypass provider validation or crossing safety.
5. Ensure eviction removes render/collision runtime content while keeping topology descriptors available for reload.
6. Add deterministic reload tests, including spatial target transform stability and failed reload source preservation.
7. Run engine-core tests and document any persistence or pinning boundary decisions in the task outcome.

## Context

- Read: `docs/architecture/streaming-scheduler.md` — retention and eviction source of truth.
- Read: `docs/architecture/world-runtime.md` — lifecycle and persistence boundary.
- Read: `docs/architecture/world-streaming.md` — residency and eviction semantics.
- Related: task:75 provides intent and policy inputs.
- Related: task:76 provides bounded provider request behavior.
- Related: task:78 consumes diagnostics and browser-visible lifecycle state.
- Key files: `packages/engine-core/src/residency.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/instance_runtime.rs`, `packages/engine-core/src/world_transport.rs`.
