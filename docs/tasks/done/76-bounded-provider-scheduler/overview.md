---
task: "76"
slug: bounded-provider-scheduler
status: done
depends-on: ["75"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Implemented StreamingScheduler with a priority queue bounded by concurrency policy. Integrated smoothly with WorldRuntime and maintained opaque request lifecycle."
---

# Implement Bounded Provider Scheduler

Connect streaming intent plans to bounded, priority-ordered provider requests while preserving `WorldRuntime` lifecycle and request-identity authority.

## Desired Changes

- Add scheduler-owned queued/loading request tracking driven by task:75 planner output.
- Enforce configurable maximum concurrent provider loads with default concurrency of two.
- Order queued work by descending priority with stable FIFO tie-breaking.
- Start provider requests only for still-relevant instances and avoid duplicate loads for resident/loading content.
- Cancel queued or active work that loses relevance when runtime safety permits; preserve current and crossing-critical work.
- Accept ready, failed, cancelled, and stale provider results only through existing runtime validation.
- Expose scheduler decisions and request state for diagnostics without moving lifecycle authority to TypeScript.
- Keep explicit application-triggered loads compatible with scheduler-managed loads.

## Definition of Done

- [ ] Scheduler starts no more than configured concurrent provider requests.
- [ ] Queue order is priority-descending and FIFO-stable for ties.
- [ ] Requests losing relevance are cancelled or removed safely; late results cannot replace newer requests.
- [ ] Current instance and crossing-critical target cannot be cancelled by ordinary relevance changes.
- [ ] Ready results commit transformed content through `WorldRuntime` and preserve pre-resolved spatial placement.
- [ ] Failed results preserve source playability and produce observable failure state.
- [ ] Explicit app loads do not create duplicate active requests.
- [ ] Rust tests cover queue order, concurrency, cancellation, stale results, failure, and readiness gating.
- [ ] Existing Rust tests pass.

## Out of Scope

- New relevance rules or intent types beyond task:75.
- Automatic eviction/persistence handoff; task:77 owns retention and eviction.
- Browser transport or demo provider integration; task:78 owns that boundary.
- Retry backoff, memory pressure heuristics, network transport, workers, or infinite worlds.
- Renderer batching, collision projection redesign, or gameplay simulation scheduling.

## Implementation Steps

1. Read task:75 outcome and `docs/architecture/streaming-scheduler.md` before editing.
2. Trace `LevelProvider`, `ResidencyManager`, `WorldRuntime.begin_load`, `accept`, `cancel_load`, and request identity handling.
3. Add scheduler queue state and update operation at the runtime boundary. Keep provider results and lifecycle commits routed through `WorldRuntime`.
4. Define the smallest shared request/diagnostic shape required by task:78, including instance ID, request ID, priority, intent, and cancellation/failure reason.
5. Implement deterministic queue admission, bounded concurrency, relevance re-evaluation, and safe cancellation.
6. Ensure scheduler completion handling does not activate simulation or alter crossing pose; it only commits provider content and lifecycle state.
7. Add Rust integration tests using deterministic fixture providers, including superseded request results.
8. Run engine-core tests and document any boundary decisions in the task outcome.

## Context

- Read: `docs/architecture/streaming-scheduler.md` — queue, provider, cancellation, and frame-boundary contract.
- Read: `docs/architecture/world-runtime.md` — authoritative lifecycle and crossing gate.
- Related: task:75 provides planner intents and priorities.
- Related: task:77 consumes scheduler state for retention/eviction.
- Related: task:78 exposes scheduler state and exercises browser behavior.
- Key files: `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/level_provider.rs`, `packages/engine-core/src/residency.rs`, `packages/engine-core/src/world_transport.rs`.
