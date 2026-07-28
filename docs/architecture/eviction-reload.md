---
feature: eviction-reload
tags: [architecture, streaming, eviction, persistence, memory]
summary: Retro Mage releases unneeded level-instance content through protected deterministic eviction and reloads it through the same provider and transform validation path while application state remains opaque.
relates-to:
  - "[World Runtime](./world-runtime.md)"
  - "[World Streaming](./world-streaming.md)"
  - "[Streaming Scheduler](./streaming-scheduler.md)"
  - "[Provider Lifecycle](./provider-lifecycle.md)"
  - "[Persistence and Restore](./persistence-restore.md)"
  - "[Collision Bridge](./collision-bridge.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Eviction and Reload

Eviction releases transient level-instance content without deleting topology identity. Reload resolves the same instance through the provider lifecycle, reapplies authoritative placement, and exposes an application-owned state restoration boundary.

## Protected Instances

Runtime never evicts an instance while any protection applies:

- instance is current;
- instance is active;
- instance is explicitly pinned;
- instance belongs to an active transition pair;
- instance is a crossing-critical target or source;
- instance has an active provider request;
- instance is required by scheduler intent.

An active instance does not transition directly to `Evictable`. Runtime deactivates gameplay and collision through an explicit lifecycle operation, then evaluates retention eligibility. Current-instance tracking remains an invariant: the current instance is always pinned.

## Eviction Lifecycle

An eligible resident instance follows:

```text
resident → evictable → evicted
```

`Evictable` is observable and carries an eviction reason. It has no collision activity or gameplay simulation. Render residency remains available during the evictable retention interval unless the scheduler commits release.

Eviction then:

- removes transformed global content;
- removes render and collision participation;
- releases the resolved definition held by runtime;
- preserves instance ID, definition identity, transform, persistence policy, and topology links;
- emits an application persistence handoff;
- retains diagnostics explaining eligibility and release.

Eviction never changes world topology, moves the player, or disables the current source instance.

## Deterministic Victim Selection

When multiple candidates are eligible, runtime orders release by:

1. protected instances excluded;
2. instances outside the retention band;
3. lowest scheduler priority;
4. greatest global distance from player;
5. oldest relevance timestamp;
6. stable instance ID.

The initial policy uses transformed bounds and hysteresis. Memory pressure can influence candidate intent through a future policy input, but it does not change protection, readiness, crossing, or lifecycle ownership rules.

## Persistence Boundary

The engine owns transient definition and transformed-content state. The consuming application owns mutable gameplay state and durable persistence payloads.

The handoff identifies:

- instance ID;
- definition ID and version;
- transform;
- persistence policy;
- eviction reason;
- opaque application state handle or payload reference supplied by the application.

The engine does not serialize actor state, inventory, procedural seeds, generator data, or application save formats. The application commits any payload using its own storage policy.

## Reload

Reload uses the normal provider request path:

```text
evicted
→ queued/loading
→ provider result
→ definition validation
→ authoritative transform application
→ resident
→ application state restoration
→ optional activation
```

Spatial link placement is resolved at load initiation and remains stable across reload. A ready result must match the instance's definition identity and version. Transformed render and collision data become available only after successful acceptance.

Application state restoration is separate from definition resolution. The application supplies its opaque state after base content is resident and ahead of gameplay activation when restored state affects simulation. Render residency does not imply simulation activation.

## Failure and Cancellation

A failed reload leaves the instance `Failed` or `Evicted` according to retry policy, with no partial transformed content. Current, active, and retained source instances remain unchanged. A cancelled or stale reload result cannot revive released content.

Explicit retry creates a new provider request identity. Retry does not alter transform, topology, or application persistence identity.

## Diagnostics

Per-instance diagnostics expose:

- protection and pin reasons;
- retention/relevance reason;
- evictable timestamp;
- eviction reason;
- released-content categories;
- provider request ID for reload;
- reload attempt and retry count;
- restore status and application-owned failure reason.

Global diagnostics expose candidate count, protected count, released count, and the last deterministic victim ordering.

## Tests and Proof

The implementation carries tests for:

- current, active, explicit-pinned, and transition-critical instances resisting eviction;
- active-to-evictable rejection without explicit deactivation;
- hysteresis and deterministic victim ordering;
- render and collision removal after release;
- topology and transform preservation after eviction;
- successful reload through provider validation;
- spatial placement stability across eviction and reload;
- application state handoff and restoration boundary;
- failed reload preserving current and retained source content;
- cancellation and stale completion safety;
- browser proof of resident → evicted → reloaded lifecycle.

## Explicit Boundaries

This contract does not define byte-accurate memory accounting, GPU texture budgets, browser memory-pressure APIs, persistence serialization, actor transfer, or infinite procedural regions.

## Related Docs

- [World Runtime](./world-runtime.md) — lifecycle and persistence ownership
- [World Streaming](./world-streaming.md) — residency and release behavior
- [Streaming Scheduler](./streaming-scheduler.md) — intent and candidate ordering
- [Provider Lifecycle](./provider-lifecycle.md) — request/retry/cancellation semantics
- [Persistence and Restore](./persistence-restore.md) — application state handoff and activation gating
- [Collision Bridge](./collision-bridge.md) — collision participation follows runtime state
- [Known Gaps](../research/known-gaps.md) — remaining implementation work
