---
feature: consumer-integration-contract
tags: [consumer, contract, ownership, lifecycle, agents]
summary: Retro Mage consumers preserve engine lifecycle authority while owning game content, provider execution, assets, gameplay, and durable state.
relates-to:
  - "[Consumer Integration](../architecture/consumer-integration.md)"
  - "[World Runtime](../architecture/world-runtime.md)"
  - "[Provider Lifecycle](../architecture/provider-lifecycle.md)"
  - "[Material Contract](../architecture/material-contract.md)"
---

# Consumer Integration Contract

Use this checklist during implementation and review. [Consumer Integration](../architecture/consumer-integration.md) is canonical; this document turns it into agent-facing decisions.

## Game Owns

- Authored/generated local definitions, topology manifests, content versions, anchor/link selection, and provider metadata.
- Fetches, workers, generator jobs, cancellation handles, retry presentation, and network policy.
- Material IDs/descriptors, asset keys, byte resolution, palette choices, and content folder conventions.
- Game mechanics, UI, button semantics, actor behavior, persistence payload format/storage/migration, and deployment.

## Engine Owns

- Validation, runtime IDs, local-to-global placement, residency, active state, collision activation, crossing readiness, arrival safety, and scene publication.
- Provider request IDs, stale-result rejection, terminal lifecycle cleanup, scheduling intent, and crossing hysteresis.
- Simulation pose/movement and world-aware tick ordering.
- Renderer GPU resources, shader/pass execution, texture upload/lifetime, and LUT upload.
- Raw-device normalization into one input schema.

## Required Handling

| Event | Consumer action |
| --- | --- |
| Provider request | Start/track game-owned work keyed by engine request ID. |
| Provider cancellation | Abort supported work; allow late completion to be rejected as stale. |
| Provider failure | Report it with same ID; preserve source gameplay; offer game-owned retry/UI. |
| Scene overflow | Read diagnostic, reduce/split content or raise configured capacity; never accept missing geometry. |
| Missing material/asset | Surface diagnostic and repair game descriptor/asset resolution; do not conceal fallback. |
| Eviction handoff | Persist opaque game payload when accepted; follow runtime restore lifecycle on reload. |
| Button press | Map generic slot to game action outside `input` and engine movement internals. |

## Forbidden Shortcuts

- Calling legacy `EngineState.tick()` for a `WorldTransport` game.
- Calling manual collision synchronization or deriving collision from render data.
- Moving player across a link through game-specific coordinate threshold/teleport logic.
- Accepting provider output without matching current request ID and instance ID.
- Marking an instance collision-active merely because it is visible.
- Passing WebGL objects into level data/WASM.
- Importing demo source or assuming demo debug hooks are supported consumer APIs.
- Treating fallback materials, overflow, or silent provider failures as a successful slice.

## Review Questions

1. Does game code own every app concern and avoid engine private state?
2. Does every global-world frame use `WorldTransport.tick_engine` exactly once?
3. Does provider code preserve identity through success, failure, cancellation, retry, and stale completion?
4. Does render use exported global views and game-owned resource resolution?
5. Does browser proof observe lifecycle/collision/render diagnostics rather than only a rendered canvas?

## Related Docs

- [Consumer Integration](../architecture/consumer-integration.md) — canonical boundary
- [World Runtime](../architecture/world-runtime.md) — lifecycle and crossing authority
- [Provider Lifecycle](../architecture/provider-lifecycle.md) — request identity rules
- [Material Contract](../architecture/material-contract.md) — asset and GPU ownership
