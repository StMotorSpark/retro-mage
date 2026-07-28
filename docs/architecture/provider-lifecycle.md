---
feature: provider-lifecycle
tags: [architecture, streaming, providers, async, wasm]
summary: Retro Mage exposes application-owned level provider work through a pull-based request queue with explicit cancellation, terminal cleanup, retry identity, and stale-result rejection.
relates-to:
  - "[World Runtime](./world-runtime.md)"
  - "[Streaming Scheduler](./streaming-scheduler.md)"
  - "[World Streaming](./world-streaming.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Eviction and Reload](./eviction-reload.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Provider Lifecycle

The consuming application owns level resolution. `WorldRuntime` and `StreamingScheduler` own request identity, lifecycle acceptance, and readiness state while exposing provider work through a pull-based queue that remains suitable for browser and WASM boundaries.

## Ownership

- The application owns file loading, network requests, worker jobs, procedural generation, abort handles, and provider metadata interpretation.
- `WorldRuntime` owns instance lifecycle, request identity, definition validation, transformed content, and result acceptance.
- `StreamingScheduler` owns request intent, queue priority, concurrency limits, cancellation decisions, retry policy hooks, and scheduling diagnostics.
- The browser transport exposes pending request records and accepts provider results; it does not own a second lifecycle state.

The engine never calls filesystem, network, worker, or generator APIs directly.

## Request Model

Each instance has at most one current provider request. A request contains:

- engine-issued monotonically unique request ID
- instance ID
- definition ID and version
- opaque application metadata
- scheduling priority and reason for diagnostics

A replacement request invalidates its predecessor. The predecessor's result is stale even when it arrives after the replacement.

The scheduler exposes queued and active request records through a pull API:

```text
scheduler → pending request queue
application → resolve(request)
application → accept(result)
```

The application can poll or drain requests at its own event-loop boundary. This keeps provider execution outside Rust/WASM while preserving engine ownership of request identity and lifecycle.

## Request Lifecycle

A request follows:

```text
queued → loading → pending → ready
                         ↘ failed
                         ↘ cancelled
```

`Pending` keeps the request active and allows a later result with the same request ID. `Ready`, `Failed`, and `Cancelled` are terminal. Terminal outcomes remove the request from the active-request coordinator while diagnostics retain its terminal result.

A provider result is accepted only when:

- instance ID matches the active request;
- request ID matches the active request;
- ready definition ID and version match the request;
- ready definition passes engine validation.

Any result failing request identity is classified as stale and cannot mutate lifecycle, content, collision, render residency, or simulation state.

## Cancellation

Scheduler cancellation marks a queued or active request cancelled in engine state and exposes the cancellation record to the application. The application uses request ID to abort its timer, fetch, worker, or generator job when supported.

Provider cancellation is best effort. A late result after cancellation is stale and has no effect. Cancellation is not provider failure and does not replace resolved content with a new definition.

## Retry

Retry is explicit. A retry creates a new request ID, carries selected metadata and a new scheduling timestamp, and passes through the same validation path. The scheduler can expose a relevance re-entry or backoff hook, but it does not run a tight automatic retry loop.

A failed request leaves the source instance and unrelated resident content unchanged. Retry does not teleport the player, activate collision, or mutate topology.

## Scheduler Integration

The scheduler starts requests only when intent remains `Prefetch`, `Required`, or `Pinned`, a concurrency slot exists, and no newer request supersedes the work. Completion handling removes the request from active scheduling, then commits the result through `WorldRuntime`.

A successful result can make an instance render-resident in the same publication boundary. It does not activate collision or gameplay simulation automatically. Crossing applies its own readiness and safe-arrival gate.

## Observability

Diagnostics expose:

- request ID and instance ID;
- queued, loading, pending, terminal, and stale status;
- intent, priority, and scheduling reason;
- cancellation reason;
- failure reason;
- retry count and retry source;
- queue and completion timestamps.

Diagnostics remain inspectable without relying on timer duration, renderer pixels, or provider implementation details.

## Tests and Proof

The implementation carries tests for:

- pull-queue ordering and concurrency limits;
- one active request per instance;
- pending completion with matching identity;
- terminal cleanup after ready, failed, and cancelled outcomes;
- replacement request invalidating the older request;
- late result rejection after cancellation or replacement;
- definition ID/version and content validation;
- explicit retry with a new request ID;
- source preservation after target failure;
- browser provider execution through scheduler-emitted requests rather than direct lifecycle mutation.

## Explicit Boundaries

This contract does not define provider file formats, network protocols, worker APIs, generator schemas, persistence serialization, byte budgets, GPU resource accounting, or infinite procedural regions.

## Related Docs

- [World Runtime](./world-runtime.md) — lifecycle authority and provider boundary
- [Streaming Scheduler](./streaming-scheduler.md) — intent, queue, and concurrency
- [World Streaming](./world-streaming.md) — residency and failure behavior
- [WASM Bridge](./wasm-bridge.md) — browser transport ownership
- [Eviction and Reload](./eviction-reload.md) — release and reload lifecycle
- [Known Gaps](../research/known-gaps.md) — remaining implementation work
