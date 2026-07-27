import init, { EngineState, WorldTransport } from 'engine-core';
import { createRenderer, loadKtx2Texture, WorldStateReader, WorldTransportReader } from 'render';
import { createInputSource, FACE1 } from 'input';
import { PerfOverlay } from './perf-overlay.js';
import { createDemoLevelProvider, demoManifest, registerDemoWorld, type DemoLevelId } from './demo-world.js';

interface DemoDebugSnapshot {
  ready: boolean;
  wasmReady: boolean;
  assetsReady: boolean;
  renderFrame: number;
  pose: { x: number; y: number; z: number };
  activeInstance: 'dungeon-instance' | 'outdoor-instance';
  targetVisible: boolean;
  instances: Array<{ id: string; state: number; renderResident: boolean; collisionActive: boolean }>;
  sourcePlayable: boolean;
}

declare global {
  interface Window {
    __debugPos?: { x: number; y: number; z: number };
    __retroMageDebug?: DemoDebugSnapshot;
  }
}

/** Demo proof: authored instances share one global scene, collision, and traversal path. */
async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  const overlay = document.querySelector<HTMLElement>('#input-overlay');
  if (!canvas || !overlay) throw new Error('Expected #scene canvas and #input-overlay elements in index.html.');
  const gl = canvas.getContext('webgl2');
  if (!gl) throw new Error('WebGL2 context not supported.');

  const wasmOutput = await init();
  const engineState = new EngineState();
  const failOutdoor = new URLSearchParams(window.location.search).has('failOutdoor');
  let assetsReady = false;
  let renderFrame = 0;
  const worldTransport = new WorldTransport();
  const provider = createDemoLevelProvider();

  // Application owns provider + manifest. Definitions/topology register first;
  // instance content arrives through explicit async provider requests.
  registerDemoWorld(worldTransport);
  if (demoManifest.link.preload !== 'before-visible') throw new Error('Demo link must preload before visible.');
  if (!worldTransport.set_current_instance('dungeon-instance')) throw new Error('Failed to set source current instance.');

  const load = (instanceId: string, definitionId: DemoLevelId, delayMs: number, fail: boolean): void => {
    const requestId = worldTransport.begin_load(instanceId, `demo-${definitionId}`);
    if (requestId === 0n) throw new Error(`Failed to begin load for ${instanceId}`);
    const controller = new AbortController();
    void provider.resolveAsync(definitionId, { delayMs, fail, signal: controller.signal }).then(() => {
      if (!worldTransport.accept_definition(requestId, instanceId)) throw new Error(`Failed to accept ${instanceId}`);
      if (instanceId === 'dungeon-instance' && !worldTransport.set_instance_state(instanceId, 3, true, true, true)) throw new Error('Failed to activate source dungeon.');
      worldTransport.sync_collision(engineState);
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (!worldTransport.fail_load(requestId, instanceId, error instanceof Error ? error.message : String(error))) throw new Error(`Failed to reject ${instanceId}`);
      worldTransport.sync_collision(engineState);
      if (instanceId === 'outdoor-instance') console.warn('Outdoor preload failed by debug request; source remains playable.');
    });
  };
  load('dungeon-instance', 'dungeon', 40, false);
  load('outdoor-instance', 'outdoor', 250, failOutdoor);

  engineState.set_camera(0, 0, 4, 0, 0);
  engineState.set_ambient_light(0.05);
  engineState.set_max_sight_distance(64);
  engineState.set_cull_precision_distance(64);

  const legacyReader = new WorldStateReader(engineState, wasmOutput.memory);
  const transportReader = new WorldTransportReader(worldTransport, wasmOutput.memory);
  const renderer = createRenderer(canvas, {
    getViews: () => {
      const camera = legacyReader.read();
      const world = transportReader.read();
      return { ...camera, tiles: world.tiles, actors: world.actors, lights: world.lights, scene: world.scene, ambient_light: world.ambient_light };
    },
  });

  try {
    for (const [path, setter, id] of [
      ['/assets/textures/stone-wall.ktx2', renderer.tileRenderer?.setTexture, 1],
      ['/assets/textures/stone-floor.ktx2', renderer.tileRenderer?.setTexture, 2],
      ['/assets/textures/grass.ktx2', renderer.tileRenderer?.setTexture, 3],
    ] as const) {
      const response = await fetch(path);
      if (response.ok && setter) setter.call(renderer.tileRenderer, id, (await loadKtx2Texture(gl, await response.arrayBuffer())).texture);
    }
    const tree = await fetch('/assets/sprites/tree-sprite.ktx2');
    if (tree.ok && renderer.spriteRenderer) renderer.spriteRenderer.setTexture(1, (await loadKtx2Texture(gl, await tree.arrayBuffer())).texture);
  } catch (err) {
    console.error('Failed to load demo textures:', err);
  }
  assetsReady = true;

  const inputSource = createInputSource(overlay, { touch: { lookSensitivity: 5 } });
  const perfOverlay = new PerfOverlay({
    onAdjustMaxSight: (delta) => engineState.set_max_sight_distance(Math.max(1, Math.min(128, engineState.max_sight_distance() + delta))),
    onAdjustCullPrecision: (delta) => engineState.set_cull_precision_distance(Math.max(1, Math.min(128, engineState.cull_precision_distance() + delta))),
    onAdjustAmbientLight: (delta) => engineState.set_ambient_light(Math.max(0, Math.min(1, engineState.ambient_light() + delta))),
  });
  renderer.start();

  let lastTime = performance.now();
  const frame = (time: number): void => {
    const dtMs = time - lastTime;
    lastTime = time;
    const input = inputSource.getState();
    engineState.set_input(input.move.x, input.move.y, input.look.x, input.look.y, input.vertical, input.buttons, input.buttonsPressed);
    if ((input.buttonsPressed & FACE1) !== 0) perfOverlay.toggle();
    engineState.tick(dtMs / 1000);

    const cameraBeforeCrossing = legacyReader.read().camera;
    if ((input.move.x !== 0 || input.move.y !== 0) && worldTransport.try_crossing(cameraBeforeCrossing.x[0] ?? 0, cameraBeforeCrossing.y[0] ?? 0, cameraBeforeCrossing.z[0] ?? 0)) {
      engineState.set_camera(worldTransport.crossing_pose_x(), worldTransport.crossing_pose_y(), worldTransport.crossing_pose_z(), cameraBeforeCrossing.yaw[0] ?? 0, cameraBeforeCrossing.pitch[0] ?? 0);
      worldTransport.sync_collision(engineState);
    }
    const world = transportReader.read();
    const camera = legacyReader.read().camera;
    const x = camera.x[0] ?? 0;
    const activeInstance = worldTransport.active_instance_id();
    renderer.setSkyboxEnabled(activeInstance === 'outdoor-instance');
    const targetAmbient = activeInstance === 'outdoor-instance' ? 1 : 0.05;
    engineState.set_ambient_light(engineState.ambient_light() + (targetAmbient - engineState.ambient_light()) * (1 - Math.exp(-5 * dtMs / 1000)));
    perfOverlay.update(dtMs, time, {
      sightRadius: engineState.sight_radius(), maxSightDistance: engineState.max_sight_distance(),
      cullPrecisionDistance: engineState.cull_precision_distance(), ambientLight: engineState.ambient_light(),
      tilesCount: world.tiles.count, actorsCount: world.actors.count, activeWorldStructure: activeInstance === 'outdoor-instance' ? 'Outdoor' : 'Indoor',
    });
    const pose = { x, y: camera.y[0] ?? 0, z: camera.z[0] ?? 0 };
    const instances = world.instances.map((instance) => ({
      id: instance.id,
      state: instance.state,
      renderResident: instance.render_resident,
      collisionActive: instance.collision_active,
    }));
    window.__debugPos = pose;
    window.__retroMageDebug = {
      ready: true,
      wasmReady: true,
      assetsReady,
      renderFrame: ++renderFrame,
      pose,
      activeInstance: activeInstance as DemoDebugSnapshot['activeInstance'],
      targetVisible: world.scene.instanceIds.includes('outdoor-instance'),
      instances,
      sourcePlayable: instances.some((instance) => instance.id === 'dungeon-instance' && instance.collisionActive),
    };
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

main().catch((err) => console.error('Demo failed to start:', err));

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch((err) => console.error('Service worker registration failed:', err)));
}
