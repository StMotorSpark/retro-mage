---
task: "50"
slug: residency-lifecycle
status: pending
depends-on: ["47", "48", "49"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Implement Instance Residency Lifecycle

Implement provider-backed loading, residency, activation, cancellation, failure, hysteresis, and eviction for level instances.

## Desired Changes

- Implement known/loading/resident/active/evictable/evicted/failed states.
- Pin current instances and active transition pairs.
- Gate crossing on resident render and collision data.
- Keep source playable on target failure.
- Support cancellation and stale-result rejection.
- Expose simple application pinning and persistence handoff.

## Definition of Done

- [ ] Lifecycle transitions are explicit and tested.
- [ ] Preload requests target linked instances before crossing.
- [ ] Failed targets never unload the source.
- [ ] Cancelled or stale provider results are ignored.
- [ ] Eviction releases runtime resources without deleting application state.
- [ ] Render residency and simulation activation are separate states.

## Out of Scope

- Rendering implementation.
- Full collision implementation.
- Network provider.
- Persistence file format.

## Implementation Steps

1. Read world-runtime and world-streaming docs.
2. Integrate provider results with level instances and links.
3. Implement state transitions and pinning rules.
4. Add tests for preload, crossing gates, failure, cancellation, and eviction.
5. Expose integration hooks for render and collision slices.

## Context

- Read: `docs/architecture/world-runtime.md`
- Read: `docs/architecture/world-streaming.md`
- Depends on: tasks 47, 48, and 49.
