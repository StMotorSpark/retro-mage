import init, { EngineState } from 'engine-core';
import { createRenderer, WorldStateReader } from 'render';
import { createInputSource, FACE1 } from 'input';
import { PerfOverlay } from './perf-overlay.js';
import { TextureQuadDemo } from './texture-demo.js';

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

  const gl = canvas.getContext('webgl2');
  if (!gl) {
    throw new Error('WebGL2 context not supported.');
  }

  const textureDemo = new TextureQuadDemo(gl);
  textureDemo.loadTexture('/assets/textures/wall.ktx2');

  // engine-core ships as a wasm-bindgen `web` target module — must init before use.
  const wasmOutput = await init();

  const engineState = new EngineState();

  // Populate a small hardcoded room scene into engine-core buffers
  // Camera pose at (0, 1.5, 3.5) looking into room along -Z
  engineState.set_camera(0, 1.5, 3.5, 0, 0);
  engineState.set_ambient_light(1.0);

  // Floor grid (5x5 tiles)
  let tileIdx = 0;
  for (let x = -2; x <= 2; x++) {
    for (let z = -4; z <= 0; z++) {
      engineState.set_tile(tileIdx++, x, 0, z, 1, 0, 0, 0);
    }
  }

  // Wall blocks
  engineState.set_tile(tileIdx++, -2, 1, -4, 2, 0, 1, 0);
  engineState.set_tile(tileIdx++, 2, 1, -4, 2, 0, 1, 0);
  engineState.set_tile(tileIdx++, 0, 1, -4, 3, 0, 1, 0);

  // One active actor in front of camera
  engineState.set_actor(0, 0, 0, -2, 0, 1, 1);

  // One point light source
  engineState.set_light(0, 0, 2.5, -2, 1.0, 0.8, 0.4, 3.0, 1);

  // Set up world state reader over WASM memory
  const reader = new WorldStateReader(engineState, wasmOutput.memory);

  // Pass reader view getter and frame hook to the render loop
  const renderer = createRenderer(canvas, {
    getViews: () => reader.read(),
    onFrame: () => textureDemo.render(),
  });
  // Override the touch look sensitivity default (3) up to 5 for this demo's feel.
  const inputSource = createInputSource(overlay, { touch: { lookSensitivity: 5 } });
  const perfOverlay = new PerfOverlay();

  renderer.start();

  let lastTime = performance.now();

  const MOVE_SPEED = 3.0; // units per second
  const LOOK_SPEED = 1.5; // radians per second
  const PITCH_LIMIT = Math.PI / 2 - 0.05;

  const frame = (time: number): void => {
    const dt = (time - lastTime) / 1000;
    const dtMs = time - lastTime;
    lastTime = time;

    const inputState = inputSource.getState();

    engineState.set_input(
      inputState.move.x,
      inputState.move.y,
      inputState.look.x,
      inputState.look.y,
      inputState.vertical,
      inputState.buttons,
      inputState.buttonsPressed
    );

    // Toggle perf overlay visibility on face1 edge press
    if ((inputState.buttonsPressed & FACE1) !== 0) {
      perfOverlay.toggle();
    }

    // Read current camera view pose as base for deltas
    const camera = reader.read().camera;
    const curX = camera.x[0] ?? 0;
    const curY = camera.y[0] ?? 0;
    const curZ = camera.z[0] ?? 0;
    const curYaw = camera.yaw[0] ?? 0;
    const curPitch = camera.pitch[0] ?? 0;

    // Apply look deltas (yaw and pitch)
    let newYaw = curYaw + inputState.look.x * LOOK_SPEED * dt;
    let newPitch = curPitch - inputState.look.y * LOOK_SPEED * dt;

    if (newPitch > PITCH_LIMIT) newPitch = PITCH_LIMIT;
    if (newPitch < -PITCH_LIMIT) newPitch = -PITCH_LIMIT;

    // Ground plane camera translation relative to facing yaw
    const forwardX = -Math.sin(curYaw);
    const forwardZ = -Math.cos(curYaw);
    const rightX = Math.cos(curYaw);
    const rightZ = -Math.sin(curYaw);

    const fwdScalar = -inputState.move.y * MOVE_SPEED * dt;
    const strafeScalar = inputState.move.x * MOVE_SPEED * dt;

    const newX = curX + fwdScalar * forwardX + strafeScalar * rightX;
    const newZ = curZ + fwdScalar * forwardZ + strafeScalar * rightZ;

    engineState.set_camera(newX, curY, newZ, newYaw, newPitch);

    engineState.tick(dt);

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
