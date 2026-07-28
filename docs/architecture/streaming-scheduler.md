---
feature: streaming-scheduler
tags: [architecture, streaming, scheduling, residency, providers]
summary: The world runtime computes coarse level-instance residency intent from global relevance, transition links, and application pins, then schedules bounded provider work without changing crossing or simulation ownership.
relates-to:
  - "[World Runtime](./world-runtime.md)"
  - "[World Streaming](./world-streaming.md)"
  - "[Provider Lifecycle](./provider-lifecycle.md)"
  - "[Eviction and Reload](./eviction-reload.md)"
  - "[Level Transitions](../features/level-transitions.md)"
  - "[World Model](../features/world-model.md)"
  - "[Visibility](./visibility.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Streaming Scheduler

The streaming scheduler converts world relevance into residency work for finite level instances. It runs inside the world runtime, requests application-owned provider work through the existing request/result boundary, and leaves topology, crossing, collision activation, and gameplay simulation under their existing authorities.

## Responsibilities

The scheduler owns:

- evaluating coarse residency relevance
- assigning preload priority
- limiting concurrent provider requests
- starting and cancelling provider requests
- retaining required and pinned instances
- marking unneeded resident instances evictable
- exposing desired state, queue state, and scheduling reasons for diagnostics

The scheduler does not own:

- world topology or link creation
- level-definition generation or transport
- crossing resolution or player teleportation
- renderer fine-grained culling
- collision truth or gameplay simulation activation
- durable persistence serialization

`WorldRuntime` validates every scheduler action against lifecycle, pinning, request identity, and crossing safety rules.

## Update Boundary

The application supplies the current global player pose and frame context to the runtime. The runtime evaluates streaming after movement and crossing checks have established the frame's authoritative player and active-instance state. Provider completions are accepted through the runtime before the render snapshot is published.

A frame follows this order:

1. input updates player intent
2. movement resolves against active global collision geometry
3. the runtime evaluates an eligible crossing
4. the runtime evaluates streaming relevance
5. the scheduler starts or cancels provider work
6. provider completions commit through the runtime
7. render and diagnostic snapshots publish

A scheduler update never mutates gameplay state in the middle of movement. Residency completion can make content render-resident in the same frame that the runtime accepts it, but it does not activate simulation automatically.

## Relevance Inputs

The first scheduler contract uses coarse world information:

- current active instance
- global player pose
- transformed finite instance bounds
- links reachable from the current instance
- link preload policy and crossing requirements
- application pins and priority hints
- current lifecycle state
- scheduler policy configuration

Renderer occlusion and fine draw visibility are not scheduler inputs. The scheduler maintains coarse residency; the renderer performs per-frame frustum, distance, depth, and optional occlusion culling over resident content.

## Desired Residency

The scheduler produces intent, not direct lifecycle mutation. Each instance receives one of these intents:

| Intent | Meaning |
|---|---|
| `Unneeded` | Content has no current residency requirement and may become evictable. |
| `Prefetch` | Content is likely to become relevant and should become render-resident when capacity permits. |
| `Required` | Content is needed for current world continuity or an eligible transition. |
| `Pinned` | Content remains retained by an explicit application or runtime pin. |

Runtime state remains authoritative:

```text
known → loading → resident → active → evictable → evicted
                      ↘ failed
```

A `Prefetch` target is render-resident without collision activity or actor simulation. A `Required` target must satisfy the same render, transformed-collision, and safe-arrival readiness gate used by crossing. `Pinned` is a retention reason, not a gameplay activation request.

## Link Preload

Link preload and crossing remain separate policies.

A linked target enters `Prefetch` when its source connection is relevant according to link preload distance, anchor relevance, or application priority. The target becomes `Required` while it is the active transition target or while a crossing attempt requires it. Crossing remains legal only when the target is resident, transformed, render-ready, collision-ready, and has a validated safe arrival pose.

Early target visibility is best-effort. Crossing readiness is a hard gate. If a target is late or fails, the source remains playable and the application can keep the connection closed, retry, redirect, or present fallback content.

## Queue and Concurrency

The scheduler maintains a priority queue of provider requests. Priority ordering is descending and ties use stable FIFO order. The default concurrent-load limit is two and is application-configurable.

A queued request starts only when:

- its instance still has `Prefetch`, `Required`, or `Pinned` intent
- no newer request supersedes it
- the instance is not already resident or loading
- a provider slot is available

The scheduler does not preempt an active provider request in the initial contract. Cancellation removes work that is no longer relevant from the queue and asks the provider to cancel active work when supported. Late results remain safe because the runtime accepts only the current request identity.

## Pins and Retention

The runtime hard-pins:

- the current active instance
- the target of an immediately traversable transition
- both endpoints during a crossing transaction
- instances explicitly pinned by the application

The scheduler retains recently relevant content through a configurable distance hysteresis band. An instance outside the retention band becomes `evictable` only when it is not current, active, pinned, loading, or required by a transition. Eviction releases transient transformed content while preserving topology and application-owned persistence identity.

Multiple eligible links are deterministic: all required transition targets remain retained, while prefetch targets use link priority followed by stable manifest order.

## Eviction Policy

The initial policy uses transformed-bound distance and hysteresis. It does not require a byte-accurate memory budget or platform-specific heuristic. The policy surface accepts a future memory-pressure signal without making memory pressure part of the lifecycle contract.

Eviction proceeds through `evictable` rather than immediately deleting a descriptor. The runtime can reject eviction for current, pinned, active-transition, loading, or crossing-critical instances. Reload uses the same provider request identity and resolved-definition validation path as initial loading.

## Failure and Retry

A provider failure commits the instance to `failed` and includes an application-owned failure reason. The scheduler does not immediately retry in a tight loop. Retry occurs through an explicit application request or a configured relevance re-entry/backoff policy.

Cancellation and stale completion are distinct from failure:

- cancellation stops or abandons a request without replacing content
- stale completion is ignored by request identity
- validation failure becomes `failed`
- provider failure becomes `failed`

No scheduler failure or eviction action implicitly teleports the player or disables the current source instance.

## Provider Boundary

The provider remains application-owned. The scheduler creates an engine request identity and exposes pending work through the existing provider boundary:

```text
scheduler → WorldRuntime.begin_load(instance, metadata)
provider  → pending / ready / failed / cancelled result
runtime   → accept(result)
```

Provider metadata, generator IDs, seeds, versions, transport details, and persistence payloads remain opaque application data. The scheduler does not call filesystem, network, worker, or procedural-generation APIs directly.

The browser transport exposes queued request identity, cancellation, and result acceptance without moving lifecycle authority into TypeScript.

## Observability

Scheduler diagnostics expose, per instance:

- desired intent
- actual runtime state
- relevance reason
- priority
- pin reasons
- request ID
- queue and loading timestamps
- retry count
- cancellation reason
- failure reason
- eviction reason

Global diagnostics expose concurrent-load limit, active request count, queue depth, and the last scheduling decision. Tests use these fields to assert scheduling decisions without relying on fixed timing or renderer visibility guesses.

## Explicit Boundaries

The scheduler contract covers finite level instances. It does not define infinite procedural regions, content authoring formats, byte-precise memory accounting, renderer batching capacity, actor simulation scheduling, or multi-floor movement physics.

## Related Docs

- [World Runtime](./world-runtime.md) — authoritative lifecycle and provider ownership
- [World Streaming](./world-streaming.md) — residency units, preload, and eviction behavior
- [Provider Lifecycle](./provider-lifecycle.md) — request queue and terminal result handling
- [Eviction and Reload](./eviction-reload.md) — protected release and reload behavior
- [Level Transitions](../features/level-transitions.md) — crossing readiness and link semantics
- [World Model](../features/world-model.md) — global instances and topology
- [Visibility](./visibility.md) — renderer culling separate from residency
- [WASM Bridge](./wasm-bridge.md) — request and render-state transport boundaries
- [Known Gaps](../research/known-gaps.md) — remaining implementation work
