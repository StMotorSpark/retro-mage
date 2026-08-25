---
feature: persistence-restore
tags: [architecture, persistence, eviction, reload, runtime]
summary: Retro Mage restores application-owned instance state after base content reload while keeping runtime identity, placement, and activation safety engine-owned.
relates-to:
  - "[Eviction and Reload](./eviction-reload.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[Provider Lifecycle](./provider-lifecycle.md)"
  - "[Collision Bridge](./collision-bridge.md)"
  - "[Runtime Dynamic Content](./runtime-dynamic-content.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Persistence and Restore

Persistence and restore reconnect application-owned gameplay state to an evicted level instance. The engine preserves spatial and lifecycle identity while the application owns state storage, serialization, migration, and interpretation.

## Ownership

The engine owns:

- instance ID and topology identity;
- definition ID and version;
- authoritative transform and link placement;
- render, collision, and gameplay lifecycle state;
- provider request identity and stale-result rejection;
- restore sequencing and activation gates.

The application owns:

- actor and gameplay state;
- persistence storage and state handles;
- serialization format and schema migration;
- procedural metadata and opaque state interpretation;
- restore failure reasons and retry policy.

The engine does not inspect or mutate the state represented by an application-owned handle.

## Persistence Policy

Each instance carries an application-selected persistence policy used by runtime retention decisions:

- `session`: state may remain in session-owned storage and does not require durable storage;
- `persistent`: eviction requires application save acknowledgment;
- `regenerate`: reload uses base content and application-selected regenerated state;
- `application-managed`: application controls handoff and retention through the exposed lifecycle boundary.

The engine understands policy behavior needed for safe retention. It does not prescribe storage, serialization, encryption, or migration implementation.

## State Handoff

Eviction exposes a handoff context containing:

- instance ID;
- definition ID and version;
- authoritative transform;
- persistence policy;
- eviction reason;
- opaque application state handle or payload reference.

The handle identifies application-owned state. Runtime does not retain large serialized payloads or interpret their contents. Persistent instances remain protected until the application acknowledges successful state handoff; failed handoff leaves the instance retained and retryable.

## Reload Sequence

Reload follows one ordered lifecycle:

```text
evicted
→ provider request
→ definition validation
→ authoritative transform application
→ base render resident
→ state restore pending
→ state restored
→ collision enabled
→ gameplay activated
```

Base geometry may render while state restore is pending. Stateful actors and gameplay-dependent presentation remain suppressed until restore succeeds. Collision and gameplay activation wait for successful restore when restored state affects simulation.

A restore operation is idempotent for an instance, state handle, and state version. Retrying the same restore does not duplicate actors or apply state mutations multiple times.

## Identity and Versioning

Eviction and reload preserve instance ID, topology identity, transform, persistence policy, and link placement. A provider result must match the active request, instance, definition ID, and definition version.

State schema versions are application-owned. The application supplies migration or rejects incompatible state explicitly. A rejected state does not activate gameplay or alter topology.

Provider resolution returns base content. State restoration remains a separate application-owned operation, so mutable state cannot silently alter validated level geometry or collision. Application-restored dynamic-content selections use the validated per-instance runtime operation while content is resident-inactive; arbitrary geometry and topology changes remain separate operations.

## Failure and Cancellation

Failure never teleports the player, disables the current source, deletes topology, or publishes partial collision content.

- provider failure leaves the instance failed or evicted and retryable;
- stale or cancelled provider results cannot revive content;
- missing, corrupt, or incompatible state leaves base content `resident-inactive`;
- restore callback failure leaves the instance render-available but inactive;
- explicit retry can attempt restore again with a new lifecycle operation.

The source and unrelated resident instances remain playable throughout target reload or restore failure.

## Diagnostics

Per-instance diagnostics expose:

- persistence policy;
- handoff status and reason;
- opaque state handle identity, without payload contents;
- restore status;
- state schema version;
- restore failure reason;
- restore attempt count;
- activation blocked reason.

Diagnostics do not expose application-private state contents.

## Proof

Core tests verify:

- identity, transform, and topology preservation across eviction;
- persistent handoff acknowledgment gating release;
- reload through a fresh provider request identity;
- base render residency while restore is pending;
- collision and gameplay activation after successful restore;
- idempotent restore retry;
- missing, corrupt, incompatible, and rejected state safety;
- stale and cancelled reload completion safety;
- source preservation after provider or restore failure.

The browser proof uses a deterministic application store and provider. It mutates actor state, forces eviction, records the opaque handoff, reloads base content, restores state, verifies activation ordering, and injects stale and failed results.

## Explicit Boundaries

This contract does not define application save formats, storage APIs, encryption, migration algorithms, actor transfer between instances, geometry mutation during restore, or durable cloud synchronization.

## Related Docs

- [Eviction and Reload](./eviction-reload.md) — protected release and base-content reload
- [World Runtime](./world-runtime.md) — instance lifecycle and persistence ownership
- [Provider Lifecycle](./provider-lifecycle.md) — request identity and stale-result handling
- [Collision Bridge](./collision-bridge.md) — activation and collision synchronization
- [Runtime Dynamic Content](./runtime-dynamic-content.md) — restoring validated per-instance content selections
- [Known Gaps](../research/known-gaps.md) — unresolved end-to-end proof
