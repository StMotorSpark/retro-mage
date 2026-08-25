---
feature: consumer-quickstart
tags: [consumer, quickstart, wasm, rendering, input]
summary: Retro Mage consumers bootstrap one world-aware game loop by initializing WASM, registering game-owned world data, resolving provider work, and rendering exported state.
relates-to:
  - "[Consumer Agent Guide](./agent-guide.md)"
  - "[Consumer Integration](../architecture/consumer-integration.md)"
  - "[Collision Bridge](../architecture/collision-bridge.md)"
  - "[Reference App](./reference-app.md)"
---

# Consumer Quickstart

This runbook establishes a smallest real integration. It creates one game-owned level, one provider-backed instance, one input/render loop, and one browser proof. It does not use `examples/demo` as a dependency.

## Prerequisites

A consumer has Node, pnpm, Rust with `wasm32-unknown-unknown`, and `wasm-pack`. Its build includes a completed `engine-core` WASM build. The package manifests currently mark `engine-core`, `render`, and `input` private, so the consumer uses a controlled local link/path or a built, pinned artifact supplied by its engine checkout/release process.

## Bootstrap Order

1. Import and initialize `engine-core` WASM, then create `EngineState` and `WorldTransport`.
2. Register game-owned definitions, instances, anchors, links, current instance, and scheduler policy through public transport APIs.
3. Construct a `WorldTransportReader` with the WASM memory and pass its current views to `createRenderer`.
4. Construct `createInputSource` over the game input container.
5. Poll scheduler/provider requests. Start game-owned asynchronous work; complete it through its engine request ID.
6. Every animation frame call `EngineState.set_input(...)`, then `WorldTransport.tick_engine(engineState, dtSeconds)`.
7. Read diagnostics and exported world state. Render loop reads the same state through its reader.

The current demo shows this public wiring in `examples/demo/src/main.ts`; its world/content code is reference material only.

## Frame Skeleton

```ts
import init, { EngineState, WorldTransport } from 'engine-core';
import { createRenderer, WorldStateReader, WorldTransportReader } from 'render';
import { createInputSource } from 'input';

const wasm = await init();
const engine = new EngineState();
const world = new WorldTransport();

// Game code registers definitions, instances, anchors, links, current instance,
// and scheduler configuration here. It also owns provider request execution.
registerGameWorld(world);

const cameraReader = new WorldStateReader(engine, wasm.memory);
const worldReader = new WorldTransportReader(world, wasm.memory);
const renderer = createRenderer(canvas, {
  getViews: () => {
    const camera = cameraReader.read();
    const scene = worldReader.read();
    return {
      ...camera,
      tiles: scene.tiles,
      actors: scene.actors,
      lights: scene.lights,
      scene: scene.scene,
      ambient_light: scene.ambient_light,
    };
  },
});
const input = createInputSource(inputContainer);
renderer.start();

let previous = performance.now();
function frame(time: number): void {
  const state = input.getState();
  engine.set_input(
    state.move.x, state.move.y, state.look.x, state.look.y,
    state.vertical, state.buttons, state.buttonsPressed,
  );
  world.tick_engine(engine, (time - previous) / 1000);
  previous = time;
  serviceProviderRequests(world); // game-owned jobs; preserve engine request IDs
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

Verify checked-out declarations for exact registration and scheduler method names. The frame and ownership ordering above is contract; registration helper shape is application code.

## Dynamic-Content Slot Example

Author dynamic content as part of the game-owned definition before finalizing it. This generic door uses stable authored IDs and complete closed/open variant contributions:

```ts
world.begin_dynamic_content_slot("gate-definition", "door", "closed");
world.definition_dynamic_content_variant("gate-definition", "door", "closed");
world.dynamic_content_variant_tile(/* closed door tile; solid: true */);
world.definition_dynamic_content_variant("gate-definition", "door", "open");
world.dynamic_content_variant_tile(/* open door visual; solid: false */);
world.finish_dynamic_content_slot("gate-definition", "door");
```

The supported variant contribution builders are `dynamic_content_variant_tile(...)`, `dynamic_content_variant_actor(...)`, `dynamic_content_variant_light(...)`, and `dynamic_content_variant_polygon(...)`. An open variant may have no contribution when no open visual is needed. The slot's `content_id` is unique within its definition, its `variant_id` values are unique within that slot, and `(instance_id, content_id, variant_id)` is the only runtime selection identity.

When game-owned interaction/range/facing rules allow the door to open, select its authored variant rather than changing the definition or runtime internals:

```ts
const result = world.set_dynamic_content_variant("gate-01", "door", "open");
if (result === 1) {
  save.dynamicContent["gate-01:door"] = "open";
}

// Normal world frame: commits an accepted selection atomically.
world.tick_engine(engine, dtSeconds);
```

`1` means accepted for the next world-frame commit. Invalid IDs or an unavailable lifecycle return an immediate stable rejection. At the `tick_engine(...)` boundary the engine revalidates accepted work and updates render publication and collision together. Read `dynamic_content_last_result()` after submission/commit and parse `dynamic_content_diagnostics_json()` when a result is not accepted.

During restore, after the provider supplies validated base content, the game reads its own saved variant and calls `set_dynamic_content_variant(instanceId, contentId, variantId)` while that instance is resident-inactive; then it runs the normal frame tick. A resident-inactive linked target accepts this preparation before crossing, as does an active instance. Other lifecycle states reject. Eviction clears the engine's transient override, so game save state remains the source of the desired selection and is reapplied on every restore.

The game never reloads the world, teleports the player, edits definitions or scene buffers, or synchronizes collision manually for this flow. The engine owns the atomic render/collision commit and crossing/activation authority.

## Provider Completion Rules

For every active request, retain `{ requestId, instanceId, abortController }` in game-owned provider state. On success call the public acceptance method with the same request identity and instance. On failure report failure with the same identity. On engine cancellation abort the game job where possible. A late promise completion remains stale; never retry it by issuing acceptance under a newer ID.

## Spatial Link Rules

`register_bidirectional_link(...)` creates a spatial connection. The target instance transform supplied during registration is provisional: the engine aligns the target anchor to the source anchor before residency. The application supplies authored anchors and starts/completes provider work; it does not calculate doorway coordinates or target placement.

The runtime owns anchor-volume evaluation, directional traversal, target readiness, collision activation, and re-arm hysteresis. Each frame submits normalized input once, then calls `WorldTransport.tick_engine(engine, dtSeconds)` once. A consumer does not add coordinate thresholds, direct camera teleports, a second engine tick, or manual collision synchronization around a crossing.

## Minimal Proof

Automate browser assertions that prove:

- WASM initializes and a source instance reaches resident then active state.
- Input changes pose through `tick_engine`.
- Provider completion produces render residency.
- A failed target does not remove source collision/playability.
- Render diagnostics show no unhandled overflow or expected-material failure.

## Related Docs

- [Consumer Agent Guide](./agent-guide.md) — entrypoint and escalation rules
- [Consumer Integration](../architecture/consumer-integration.md) — ownership contract
- [Collision Bridge](../architecture/collision-bridge.md) — frame ordering
- [Reference App](./reference-app.md) — demo wiring locations
