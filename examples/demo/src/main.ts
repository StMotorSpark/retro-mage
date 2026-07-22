import init, { EngineState } from 'engine-core';
import { createRenderer } from 'render';
import { createInputSource } from 'input';

/**
 * Demo app: thin glue proving engine-core (WASM sim), render (WebGL2), and
 * input (gamepad/touch) run together in one page. No gameplay logic here —
 * see docs/architecture/repo-structure.md for examples/demo's role.
 */
async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  const overlay = document.querySelector<HTMLElement>('#input-overlay');

  if (!canvas || !overlay) {
    throw new Error('Expected #scene canvas and #input-overlay elements in index.html.');
  }

  // engine-core ships as a wasm-bindgen `web` target module — must init before use.
  await init();

  const engineState = new EngineState();
  const renderer = createRenderer(canvas);
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
