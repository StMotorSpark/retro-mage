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
  instances: Array<{ id: string; state: number; renderResident: boolean; collisionActive: boolean; restoreStatus: number; restoreAttempts: number; stateVersion: string; restoreFailureReason: string; handoffStatus: number }>;
  sourcePlayable: boolean;
  debugMovement?: { x: number; z: number; yaw: number };
  grounded?: boolean;
  verticalVelocity?: number;
  queueDepth: number;
  activeLoads: number;
  pins: number;
  overflowed?: boolean;
  overflowDiagnostics?: string;
  cancelled?: boolean;
  evictions: Array<{ instance_id: string; eviction_reason: string; payload: string }>;
  restores: Record<string, string>;
}

declare global {
  interface Window {
    __debugPos?: { x: number; y: number; z: number };
    __retroMageDebug?: DemoDebugSnapshot;
    __retroMageWorldTransport?: any;
    __retroMageTeleport?: (x: number, y: number, z: number) => void;
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
  const searchParams = new URLSearchParams(window.location.search);
  const failOutdoor = searchParams.has('failOutdoor');
  const slowOutdoor = searchParams.has('slowOutdoor');
  const overflowActors = searchParams.has('overflowActors');
  const corruptRestore = searchParams.has('corruptRestore');
  const delayRestore = searchParams.has('delayRestore');
  const delayAcknowledge = searchParams.has('delayAcknowledge');
  const failAcknowledge = searchParams.has('failAcknowledge');
  let assetsReady = false;
  let renderFrame = 0;
  const worldTransport = overflowActors ? WorldTransport.with_capacity(4096, 2, 128, 64) : new WorldTransport();
  window.__retroMageWorldTransport = worldTransport;
  window.__retroMageTeleport = (x, y, z) => engineState.set_camera(x, y, z, 0, 0);
  const provider = createDemoLevelProvider();

  // Application owns provider + manifest. Definitions/topology register first;
  // instance content arrives through explicit async provider requests.
  registerDemoWorld(worldTransport);
  if (demoManifest.link.preload !== 'before-visible') throw new Error('Demo link must preload before visible.');
  if (!worldTransport.set_current_instance('dungeon-instance')) throw new Error('Failed to set source current instance.');
  if (!worldTransport.set_scheduler_policy(10, 0, 2)) throw new Error('Failed to configure demo streaming scheduler.');

  const pendingLoads = new Map<string, AbortController>();
  const savedPayloads: Record<string, string> = { 'outdoor-instance': 'initial-app-state-123' };
  const initialOutdoorPayload = savedPayloads['outdoor-instance'];
  if (!initialOutdoorPayload || !worldTransport.set_application_payload('outdoor-instance', initialOutdoorPayload)) throw new Error('Failed to seed outdoor persistence state.');
  const attempt = worldTransport.begin_restore('outdoor-instance');
  if (attempt > 0) {
    worldTransport.complete_restore('outdoor-instance', attempt, true, '1.0', undefined);
  }
  const demoEvictions: Array<{ instance_id: string; eviction_reason: string; payload: string }> = [];
  const demoRestores: Record<string, string> = {};

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
    worldTransport.tick_engine(engineState, dtMs / 1000);
    const activeCount = worldTransport.scheduler_active_request_count();
    const currentActiveIds = new Set<string>();
    const evictionsJson = worldTransport.take_evictions_json();
    if (evictionsJson && evictionsJson !== '[]') {
      const parsed = JSON.parse(evictionsJson);
      demoEvictions.push(...parsed);
      for (const e of parsed) {
        if (failAcknowledge) {
          worldTransport.acknowledge_handoff(e.instance_id, false, "Test failure");
        } else if (delayAcknowledge) {
          setTimeout(() => {
            worldTransport.acknowledge_handoff(e.instance_id, true, undefined);
            if (e.payload) savedPayloads[e.instance_id] = e.payload;
          }, 3000);
        } else {
          worldTransport.acknowledge_handoff(e.instance_id, true, undefined);
          if (e.payload) savedPayloads[e.instance_id] = e.payload;
        }
      }
    }

    for (let i = 0; i < activeCount; i++) {
      const instanceId = worldTransport.scheduler_active_request_instance(i);
      currentActiveIds.add(instanceId);
      if (!pendingLoads.has(instanceId)) {
        const requestId = BigInt(worldTransport.scheduler_active_request_id(i));
        const definitionId = instanceId.replace('-instance', '') as DemoLevelId;
        const controller = new AbortController();
        pendingLoads.set(instanceId, controller);
        void provider.resolveAsync(definitionId, { delayMs: definitionId === 'outdoor' ? (slowOutdoor ? 2000 : 250) : 40, fail: definitionId === 'outdoor' && failOutdoor, signal: controller.signal }).then(() => {
          if (!worldTransport.accept_definition(requestId, instanceId)) throw new Error(`Failed to accept ${instanceId}`);
          if (savedPayloads[instanceId] && !worldTransport.set_application_payload(instanceId, savedPayloads[instanceId])) throw new Error(`Failed to restore persistence handle for ${instanceId}`);
          if (savedPayloads[instanceId]) {
            const payload = corruptRestore ? 'corrupt-payload' : savedPayloads[instanceId];
            const attempt = worldTransport.begin_restore(instanceId);
            if (attempt > 0) {
              const success = payload !== 'corrupt-payload';
              const complete = () => {
                worldTransport.complete_restore(instanceId, attempt, success, '1.0', success ? undefined : 'Corrupt payload');
                demoRestores[instanceId] = payload;
              };
              if (delayRestore && success) setTimeout(complete, 1500); else complete();
            }
          }
          if (instanceId === 'dungeon-instance' && !worldTransport.activate_instance(instanceId)) throw new Error('Failed to activate source dungeon.');
          pendingLoads.delete(instanceId);
        }).catch((error: unknown) => {
          pendingLoads.delete(instanceId);
          if (error instanceof DOMException && error.name === 'AbortError') return;
          if (!worldTransport.fail_load(requestId, instanceId, error instanceof Error ? error.message : String(error))) throw new Error(`Failed to reject ${instanceId}`);
          if (instanceId === 'outdoor-instance') console.warn('Outdoor preload failed by debug request; source remains playable.');
        });
      }
    }
    for (const [id, controller] of pendingLoads) {
      if (!currentActiveIds.has(id)) {
        controller.abort();
        pendingLoads.delete(id);
      }
    }
    const cameraAfterTick = legacyReader.read().camera;
    const movementX = input.move.y * Math.sin(cameraAfterTick.yaw[0] ?? 0) + input.move.x * Math.cos(cameraAfterTick.yaw[0] ?? 0);
    const movementZ = -input.move.y * Math.cos(cameraAfterTick.yaw[0] ?? 0) + input.move.x * Math.sin(cameraAfterTick.yaw[0] ?? 0);
    const world = transportReader.read();
    const camera = cameraAfterTick;
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
      restoreStatus: instance.restore_status,
      restoreAttempts: instance.restore_attempts,
      stateVersion: instance.state_version,
      restoreFailureReason: instance.restore_failure_reason,
      handoffStatus: instance.handoff_status,
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
      debugMovement: { x: movementX, z: movementZ, yaw: camera.yaw[0] ?? 0 },
      grounded: engineState.is_grounded(),
      verticalVelocity: engineState.player_velocity_y,
      queueDepth: worldTransport.scheduler_queue_depth(),
      activeLoads: activeCount,
      pins: instances.filter(i => worldTransport.scheduler_diagnostic_intent(i.id) === 3).length,
      overflowed: worldTransport.overflowed(),
      overflowDiagnostics: worldTransport.overflow_diagnostics_json(),
      evictions: demoEvictions,
      restores: demoRestores,
    };
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

main().catch((err) => console.error('Demo failed to start:', err));

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch((err) => console.error('Service worker registration failed:', err)));
}
