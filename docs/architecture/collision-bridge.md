---
feature: collision-bridge
tags: [architecture, collision, movement, runtime, wasm]
summary: The world transport drives one world-aware tick while runtime-owned collision state feeds engine movement without caller-managed snapshots.
relates-to:
  - "[Collision](./collision.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[World Streaming](./world-streaming.md)"
  - "[Crossing Policy](./crossing-policy.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Collision Bridge

The collision bridge connects authoritative `WorldRuntime` lifecycle state to `EngineState` movement. `WorldTransport` drives the world-aware frame, runtime-owned collision data updates with lifecycle changes, and callers do not manually synchronize collision snapshots.

## Ownership

- `EngineState` owns input, camera/player pose, movement delta, and standalone movement execution.
- `WorldRuntime` owns level-instance lifecycle, transformed content, collision activation, crossing readiness, and active-world state.
- `WorldTransport` owns WASM-facing world orchestration and drives the world-aware tick.
- The collision index is runtime-owned composed state derived from resident transformed content and collision-active flags.

`EngineState` remains usable without a world transport for compatibility. The world-aware tick is the canonical path for global level-instance worlds.

## World-Aware Frame

`WorldTransport` exposes one orchestration path that coordinates `EngineState` and `WorldRuntime`:

```text
input
→ movement against runtime collision view
→ crossing evaluation and commit
→ streaming relevance and provider scheduling
→ provider completion acceptance
→ render and diagnostics publication
```

Movement never observes lifecycle changes halfway through its resolution. Crossing receives the post-movement global pose and movement delta. An explicit link may update the player pose; a spatial link preserves global pose. Scheduler relevance uses the authoritative post-crossing pose and active instance.

Provider completions commit through `WorldRuntime` before render publication. Lifecycle changes update collision and render consumers through the same runtime authority.

## Collision Index

The runtime maintains a mutable global collision index. Each collision-active resident instance contributes transformed global solids; render-resident or simulation-active state alone does not contribute collision.

Lifecycle operations update the affected index entry without requiring a complete caller-managed snapshot:

- accepted resident content inserts transformed collision data when collision is active
- activation enables collision for validated resident content
- crossing activation enables the target after readiness and safe-arrival checks
- eviction, failure, cancellation, and deactivation remove or disable collision
- transform changes rebuild only the affected instance entry

Collision readiness means transformed collision geometry is validated and available to the index. Safe arrival remains a crossing-specific gate.

Movement receives a read-only collision query for the duration of its resolution. The index does not mutate during movement. Runtime lifecycle mutation occurs at defined frame boundaries.

## API Boundary

The browser-facing integration provides a world-aware tick operation equivalent to:

```text
WorldTransport.tickEngine(engine, dt)
```

The operation owns ordering and invokes engine movement helpers against the runtime collision view. `sync_collision()` is not part of normal application flow. Direct collision registration APIs remain compatibility/test adapters, not a second lifecycle authority.

Standalone `EngineState.tick(dt)` continues to run the compatibility movement path when no global runtime is attached. It does not claim ownership of runtime collision state.

## Crossing Integration

World-aware movement submits the resulting global player pose and movement delta to `WorldRuntime`. Runtime crossing owns:

- active endpoint selection
- directional anchor-volume checks
- re-arm hysteresis
- target readiness
- target collision activation
- active-instance mutation

A failed or pending crossing leaves source pose, source collision, and source gameplay state intact. Successful crossing publishes any explicit arrival pose back to `EngineState` before render state is exported.

## Synchronization Rules

One runtime record drives all consumers:

```text
WorldRuntime lifecycle
→ transformed content
→ collision index
→ render export
→ instance diagnostics
```

No caller reconstructs collision from render buffers. No renderer flag activates collision. No collision snapshot is copied into `EngineState` once world-aware orchestration is active.

## Compatibility Boundary

Legacy indoor/outdoor movement remains available only through standalone `EngineState.tick()`. World-aware orchestration selects global runtime movement and prevents legacy seam logic from changing pose, residency, or visibility. Removal of compatibility paths requires migrated consumers and a passing global-runtime browser proof.

## Tests

The implementation carries tests for:

- lifecycle changes updating collision without explicit synchronization calls
- resident-but-inactive targets remaining non-solid
- activation and eviction changing collision participation
- transformed instance updates affecting only the changed instance
- movement followed by directional crossing in one world-aware tick
- failed target readiness preserving source movement and collision
- explicit-link arrival pose publication
- standalone engine tick remaining compatible
- render and collision consumers observing the same transformed content

## Related Docs

- [Collision](./collision.md) — movement truth and active transformed geometry
- [World Runtime](./world-runtime.md) — lifecycle and crossing authority
- [World Streaming](./world-streaming.md) — scheduler timing and residency intent
- [Crossing Policy](./crossing-policy.md) — directional crossing and re-arm rules
- [WASM Bridge](./wasm-bridge.md) — typed Rust/WASM ownership boundaries
- [Known Gaps](../research/known-gaps.md) — remaining implementation work
