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

## Provider Completion Rules

For every active request, retain `{ requestId, instanceId, abortController }` in game-owned provider state. On success call the public acceptance method with the same request identity and instance. On failure report failure with the same identity. On engine cancellation abort the game job where possible. A late promise completion remains stale; never retry it by issuing acceptance under a newer ID.

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
