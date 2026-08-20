---
feature: consumer-integration
tags: [architecture, consumer, integration, agents, packages]
summary: Retro Mage consuming games integrate engine-core, render, and input through an application-owned shell with explicit runtime, provider, asset, and verification boundaries.
relates-to:
  - "[Repo Structure](./repo-structure.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[Collision Bridge](./collision-bridge.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Material Contract](./material-contract.md)"
  - "[Input Event Schema](./input-schema.md)"
  - "[Consumer Agent Guide](../consumer/agent-guide.md)"
---

# Consumer Integration

A consuming game is an application-owned shell around Retro Mage packages. It owns game content, topology, provider execution, assets, gameplay, durable state, and product UI. Retro Mage owns simulation truth, transformed runtime content, collision lifecycle, normalized input production, and GPU execution.

## Package Boundary

A game consumes three packages:

- `engine-core` — Rust/WASM simulation, world transport, movement, runtime lifecycle, and scene export.
- `render` — WebGL renderer, typed scene readers, materials, texture upload, LUT upload, and render loop.
- `input` — gamepad and touch normalization into the engine input shape.

The current package manifests are private workspace packages. A consumer uses a local path/link during co-development or a deliberately built and pinned Git/package artifact. It does not assume an npm-published package exists. Consumer code depends only on package public exports, never `examples/demo` source files or engine package internals.

## Ownership Contract

| Concern | Owner |
| --- | --- |
| Game rules, entities, UI, progression, interactions | consuming game |
| Local level definitions, world manifest, anchors, links | consuming game |
| Provider fetches, generation jobs, abort handles, metadata | consuming game |
| Runtime instance identity, transforms, residency, crossing, collision activation | `engine-core` |
| Durable save schema, storage, encryption, migration | consuming game |
| Restore attempt identity and activation safety | `engine-core` |
| Asset keys, URLs/bytes, material descriptors, palette choices | consuming game |
| GPU resources, shaders, render passes, LUT upload | `render` |
| Device polling and touch/gamepad normalization | `input` |
| Button meaning and contextual controls | consuming game |

## Required Runtime Flow

A game uses one world-aware frame path:

```text
initialize WASM and EngineState
→ create WorldTransport
→ register game topology and local definitions
→ set current instance and scheduling policy
→ poll engine-issued provider requests
→ resolve each request in game code
→ accept, fail, or cancel using its request ID
→ each frame: normalize input → EngineState.set_input(...) → WorldTransport.tick_engine(...)
→ read WorldTransport scene views → render
```

`WorldTransport.tick_engine(engine, dt)` is canonical for a global level-instance world. It resolves movement against runtime-owned collision, applies legal crossings, evaluates streaming, accepts lifecycle changes at frame boundaries, and publishes render/diagnostic state. A game does not rebuild collision from render buffers or call `sync_collision()` as normal flow.

## Provider and Transition Safety

The engine exposes provider work through a pull queue. The game starts its own fetch, worker, or generation job for each engine-issued request and retains the returned request ID with that job. It accepts a result only through the matching request ID, reports failures through the transport, and aborts work after engine cancellation when its provider supports aborting.

A target becoming render-resident does not activate it for collision or simulation. The runtime owns crossing readiness, directional anchor checks, re-arm hysteresis, safe arrival, and activation. A failed or pending target leaves source pose, collision, and gameplay available. Game UI may report failure or offer retry, but does not force a crossing or teleport around the runtime gate.

## Render and Asset Boundary

Scene transport contains global geometry, numeric material IDs, UV metadata, render flags, actors, lights, and camera data. The game maps its stable material IDs to descriptors and asset keys. It resolves asset bytes. `render` creates, uploads, uses, and disposes GPU resources.

A missing asset or invalid material remains visible through deterministic fallback plus diagnostics. The game treats diagnostics and scene overflow as failures to inspect, never as acceptable hidden geometry loss. Render content and collision content remain separate; visual flags never activate collision.

## Consumer Invariants

A consuming game follows these rules:

- No direct imports from `examples/demo`.
- No mutation of engine-owned runtime IDs, placement, lifecycle, or collision activation outside public transport APIs.
- No manual per-frame collision snapshots or collision reconstruction from scene buffers.
- No application crossing thresholds in place of runtime link crossing.
- No use of standalone legacy `EngineState.tick()` for a world managed by `WorldTransport`.
- No stale/cancelled provider completion accepted as current content.
- No GPU object stored in WASM or level content.
- No silent scene-capacity overflow; inspect diagnostics, adjust configured capacity/content, and preserve atomic publication rules.

## Verification Boundary

Each game slice carries automated checks at boundaries it uses: unit tests for game logic, package typecheck/build, and a browser proof using production input and the world-aware frame path. Browser assertions inspect lifecycle, active instance, collision/support, material/resource diagnostics, and route-specific state rather than only object existence or screenshots.

The consumer runbooks provide current commands and reference locations. The architecture docs remain authoritative when a runbook conflicts with an ownership or lifecycle rule.

## Related Docs

- [Repo Structure](./repo-structure.md) — packages and separate-repository intent
- [World Runtime](./world-runtime.md) — topology, provider, residency, and crossing authority
- [Collision Bridge](./collision-bridge.md) — canonical world-aware tick
- [WASM Bridge](./wasm-bridge.md) — scene export ownership
- [Material Contract](./material-contract.md) — asset and GPU ownership
- [Input Event Schema](./input-schema.md) — normalized input boundary
- [Consumer Agent Guide](../consumer/agent-guide.md) — consumer-agent entrypoint
