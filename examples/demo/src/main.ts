import init, { EngineState } from 'engine-core';
import { createRenderer, WorldStateReader } from 'render';
import { createInputSource } from 'input';

/**
 * Demo app: thin glue proving engine-core (WASM sim), render (WebGL2), and
 * input (gamepad/touch) run together in one page.
 *
 * NOTE: Placeholder-geometry proof. Draws flat-shaded quads/cubes for tiles and
 * flat-colored billboard quads for actors directly from WASM engine-core SoA buffers.
 * Final rendering pipeline (lighting LUTs, textures, painter's algorithm sorting,
 * skybox) will follow in future vertical slices.
 */
async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  const overlay = document.querySelector<HTMLElement>('#input-overlay');

  if (!canvas || !overlay) {
    throw new Error('Expected #scene canvas and #input-overlay elements in index.html.');
  }

  // engine-core ships as a wasm-bindgen `web` target module — must init before use.
  const wasmOutput = await init();

  const engineState = new EngineState();

  // Populate a small hardcoded room scene into engine-core buffers
  // Camera pose at (0, 1.5, 3.5) looking into room along -Z
  engineState.set_camera(0, 1.5, 3.5, 0, 0);

  // Floor grid (5x5 tiles)
  let tileIdx = 0;
  for (let x = -2; x <= 2; x++) {
    for (let z = -4; z <= 0; z++) {
      engineState.set_tile(tileIdx++, x, 0, z, 1, 0);
    }
  }

  // Wall blocks
  engineState.set_tile(tileIdx++, -2, 1, -4, 2, 0);
  engineState.set_tile(tileIdx++, 2, 1, -4, 2, 0);
  engineState.set_tile(tileIdx++, 0, 1, -4, 3, 0);

  // One active actor in front of camera
  engineState.set_actor(0, 0, 0, -2, 0, 1, 1);

  // One point light source
  engineState.set_light(0, 0, 2.5, -2, 1.0, 0.8, 0.4, 3.0, 1);

  // Set up world state reader over WASM memory
  const reader = new WorldStateReader(engineState, wasmOutput.memory);

  // Pass reader view getter to the render loop
  const renderer = createRenderer(canvas, () => reader.read());
  const inputSource = createInputSource(overlay);

  renderer.start();

  let lastTime = performance.now();

  const frame = (time: number): void => {
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    engineState.tick(dt);
    // eslint-disable-next-line no-console
    console.log('tick_count:', engineState.tick_count, 'input:', inputSource.getState());

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Demo failed to start:', err);
});

// Register the generated service worker so the app shell (JS, WASM, CSS, HTML)
// installs to the home screen and reloads without a network round-trip.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Service worker registration failed:', err);
    });
  });
}
