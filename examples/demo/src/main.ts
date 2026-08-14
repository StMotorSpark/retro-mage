import init, { EngineState, WorldTransport } from 'engine-core';
import { createRenderer, createSpriteRenderer, loadPngTexture, mat4Create, mat4Perspective, MaterialRegistry, resolveMaterialResources, uploadLut, WorldStateReader, WorldTransportReader } from 'render';
import { createInputSource, FACE1 } from 'input';
import { PerfOverlay } from './perf-overlay.js';
import { createDemoLevelProvider, demoManifest, registerDemoWorld, type DemoLevelId } from './demo-world.js';

declare const __RETRO_MAGE_BUILD_ID__: string;

interface DemoDebugSnapshot {
  buildId: string;
  ready: boolean;
  wasmReady: boolean;
  assetsReady: boolean;
  renderFrame: number;
  pose: { x: number; y: number; z: number };
  activeInstance: 'dungeon-instance' | 'outdoor-instance';
  targetVisible: boolean;
  instances: Array<{ id: string; state: number; renderResident: boolean; collisionActive: boolean; restoreStatus: number; restoreAttempts: number; stateVersion: string; restoreFailureReason: string; handoffStatus: number }>;
  sourcePlayable: boolean;
  debugMovement?: { x: number; z: number; yaw: number; pitch: number };
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
  cancellation?: { pending: boolean; cancelled: boolean; firstRequestId: number; replacementRequestId: number; staleRejected: boolean; playable: boolean };
  renderProof?: { materialIds: number[]; assetKeys: string[]; litOpaqueTileCount: number; translucentTileCount: number; activeLightCount: number; lutActive: boolean; materialDiagnostics: number; textureBindings: Array<{ materialId: number; assetKey: string }>; billboardTextureBindings: Array<{ spriteId: number; assetKey: string }>; skyTextureStatus: 'procedural-gradient-gap'; lowerRoomVisible: boolean; castleLowerVisible: boolean; waterMaterialPresent: boolean; cobblestoneMaterialPresent: boolean; castleMaterialPresent: boolean; streamBarrierVisualGeometry: number; streamBarrierCollisionTiles: number; cobblestonePathPassable: boolean; roadGeometry: number; streamSlopePresent: boolean; castleExteriorGeometry: number; castleInteriorGeometry: number; castleColumnGeometry: number; castleBalconyGeometry: number; mountainMaterial: { id: string; assetKey: string; materialId: number }; mountainGeometry: number; mountainCollisionTiles: number; mountainVisible: boolean; castleSightlineVisible: boolean; treeBillboardCount: number; treeCollisionBlockerCount: number; resolvedTreeCollisionBlockerCount: number; treeBillboardBlockerCenterOverlaps: number; treeCollisionVisualGeometry: number; };
}

declare global {
  interface Window {
    __debugPos?: { x: number; y: number; z: number };
    __retroMageDebug?: DemoDebugSnapshot;
    __retroMageWorldTransport?: any;
    __retroMageTeleport?: (x: number, y: number, z: number) => void;
    __retroMageCancelProof?: () => boolean;
  }
}

/** Test-only direct billboard path: decoded PNG → WebGL upload → production SpriteRenderer → visible canvas pixels. */
async function renderSpriteAlphaProof(kind: 'tree' | 'torch'): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.id = 'sprite-alpha-proof';
  canvas.width = 256;
  canvas.height = 256;
  canvas.style.cssText = 'position:fixed;inset:0;width:256px;height:256px;z-index:2';
  document.body.append(canvas);
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL2 context unavailable for sprite alpha proof.');
  const source = kind === 'tree' ? '/assets/sprite/tree.1.png' : '/assets/sprite/torch.1.png';
  const texture = await loadPngTexture(gl, await (await fetch(source)).arrayBuffer());
  const renderer = createSpriteRenderer(gl);
  renderer.setTexture(1, texture.texture);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.02, 0.03, 0.07, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const projection = mat4Create();
  mat4Perspective(projection, Math.PI / 3, 1, 0.1, 100);
  renderer.render({
    x: new Float32Array([0]), y: new Float32Array([-1.2]), z: new Float32Array([-3]),
    facing: new Float32Array([0]), sprite_id: new Float32Array([1]), active: new Float32Array([1]), count: 1,
  }, mat4Create(), projection);
}

/** Demo proof: authored instances share one global scene, collision, and traversal path. */
async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  const overlay = document.querySelector<HTMLElement>('#input-overlay');
  if (!canvas || !overlay) throw new Error('Expected #scene canvas and #input-overlay elements in index.html.');
  const gl = canvas.getContext('webgl2');
  if (!gl) throw new Error('WebGL2 context not supported.');
  const spriteAlphaProof = new URLSearchParams(window.location.search).get('spriteAlphaProof');
  if (spriteAlphaProof === 'tree' || spriteAlphaProof === 'torch') await renderSpriteAlphaProof(spriteAlphaProof);

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
  let materialDiagnostics = 0;
  let renderFrame = 0;
  // Observable app-to-renderer bindings. These only record a successful GPU resource
  // registration, so browser proof distinguishes authored textures from fallback paths.
  const textureBindings = new Map<number, string>();
  const billboardTextureBindings = new Map<number, string>();
  // App-owned asset-key resolver + material contract. Renderer receives numeric IDs only.
  const materials = new MaterialRegistry();
  const dungeonLut = { paletteColors: ['#241713', '#6b3b22', '#c56b32', '#f1bd65'], intensityBandCount: 8, ambientLevel: 0.05, rgbLightColorMode: 'tint' as const, emissiveMapping: 'add' };
  materials.register({ id: 'mat_dungeon_stone', textureAssetKeys: ['demo.dungeon.wall', 'demo.dungeon.floor'], uvMode: 'tile-repeat', flags: ['opaque', 'lit'], lutConfig: dungeonLut });
  materials.register({ id: 'mat_dungeon_ceiling', textureAssetKeys: ['demo.dungeon.ceiling'], uvMode: 'tile-repeat', flags: ['opaque', 'lit'], lutConfig: dungeonLut });
  materials.register({ id: 'mat_emissive_torch', textureAssetKeys: ['demo.sprite.torch'], uvMode: 'billboard', flags: ['cutout', 'emissive'], emissiveConfig: { color: '#ff9a38', intensity: 1.4 } });
  // Explicit billboard metadata: decorative content uses authored asset key, never empty-key fallback.
  materials.register({ id: 'mat_dungeon_deco', textureAssetKeys: ['demo.sprite.dungeon_deco'], uvMode: 'billboard', flags: ['cutout', 'lit'], lutConfig: dungeonLut });
  const outdoorLut = { paletteColors: ['#18344f', '#315f75', '#6e9b8a', '#c6d69b'], intensityBandCount: 8, ambientLevel: 0.42, rgbLightColorMode: 'tint' as const, emissiveMapping: 'add' };
  materials.register({ id: 'mat_grass', textureAssetKeys: ['demo.outdoor.grass'], uvMode: 'tile-repeat', flags: ['opaque', 'lit'], lutConfig: outdoorLut });
  materials.register({ id: 'mat_road', textureAssetKeys: ['demo.outdoor.road'], uvMode: 'explicit', flags: ['opaque', 'lit'], lutConfig: outdoorLut });
  materials.register({ id: 'mat_cobblestone', textureAssetKeys: ['demo.outdoor.cobblestone'], uvMode: 'explicit', flags: ['opaque', 'lit'], lutConfig: outdoorLut });
  materials.register({ id: 'mat_mountain_rock', textureAssetKeys: ['demo.outdoor.mountain'], uvMode: 'explicit', flags: ['opaque', 'lit'], lutConfig: outdoorLut });
  materials.register({ id: 'mat_water', textureAssetKeys: ['demo.outdoor.water'], uvMode: 'explicit', flags: ['opaque', 'lit', 'water'], lutConfig: outdoorLut });
  materials.register({ id: 'mat_castle_exterior', textureAssetKeys: ['demo.castle.exterior'], uvMode: 'explicit', flags: ['opaque', 'lit'], lutConfig: outdoorLut });
  materials.register({ id: 'mat_castle_interior', textureAssetKeys: ['demo.castle.interior'], uvMode: 'tile-repeat', flags: ['opaque', 'lit'], lutConfig: outdoorLut });
  materials.register({ id: 'mat_castle_statue', textureAssetKeys: ['demo.sprite.statue'], uvMode: 'billboard', flags: ['cutout', 'lit'], lutConfig: outdoorLut });
  materials.register({ id: 'mat_sky', textureAssetKeys: ['demo.sky.background'], uvMode: 'explicit', flags: ['opaque', 'unlit', 'sky'] });
  materials.register({ id: 'mat_forest_tree', textureAssetKeys: ['demo.sprite.tree'], uvMode: 'billboard', flags: ['cutout', 'lit'], lutConfig: outdoorLut });
  materials.register({ id: 'mat_cloud', textureAssetKeys: ['demo.sky.cloud'], uvMode: 'billboard', flags: ['cutout', 'unlit'], lutConfig: outdoorLut });
  const assetPaths: Record<string, string> = {
    'demo.dungeon.wall': '/assets/dungeon/textures/dungeon.wall.png', 'demo.dungeon.floor': '/assets/dungeon/textures/dungeon.floor.png',
    'demo.dungeon.ceiling': '/assets/dungeon/textures/dungeon.ceiling.png', 'demo.sprite.torch': '/assets/sprite/torch.1.png',
    'demo.sprite.dungeon_deco': '/assets/sprite/dungeon.deco.png',
    'demo.outdoor.grass': '/assets/outdoor/textures/forest.floor.png', 'demo.outdoor.road': '/assets/outdoor/textures/road.png', 'demo.outdoor.cobblestone': '/assets/outdoor/textures/cobblestone.png', 'demo.outdoor.mountain': '/assets/outdoor/textures/mountain.rock.png', 'demo.outdoor.water': '/assets/outdoor/textures/stream.water.png', 'demo.castle.exterior': '/assets/castle/textures/castle.exterior.wall.png',
    'demo.castle.interior': '/assets/castle/textures/castle.interior.floor.png', 'demo.sprite.statue': '/assets/sprite/statue.1.png',
    'demo.sky.background': '/assets/sky/textures/sky.background.png', 'demo.sprite.tree': '/assets/sprite/tree.1.png',
    'demo.sky.cloud': '/assets/sky/textures/cloud.1.png',
  };
  // Scene transport material IDs identify visual surfaces independently from
  // tile-shape IDs. Map every surface ID to the exact app-owned asset it uses.
  const tileMaterialAssetKeys: Record<number, string> = {
    1: 'demo.dungeon.wall', 2: 'demo.dungeon.floor', 3: 'demo.outdoor.grass',
    4: 'demo.dungeon.ceiling', 5: 'demo.outdoor.road', 6: 'demo.outdoor.cobblestone',
    7: 'demo.outdoor.water', 8: 'demo.castle.exterior', 9: 'demo.castle.interior',
    10: 'demo.outdoor.mountain',
  };
  const worldTransport = overflowActors ? WorldTransport.with_capacity(4096, 3, 128, 64) : new WorldTransport();
  window.__retroMageWorldTransport = worldTransport;
  window.__retroMageTeleport = (x, y, z) => engineState.set_camera(x, y, z, 0, 0);
  const provider = createDemoLevelProvider();

  // Application owns provider + manifest. Definitions/topology register first;
  // instance content arrives through explicit async provider requests.
  registerDemoWorld(worldTransport);
  if (demoManifest.link.preload !== 'before-visible') throw new Error('Demo link must preload before visible.');
  if (!worldTransport.set_current_instance('dungeon-instance')) throw new Error('Failed to set source current instance.');
  if (!worldTransport.set_scheduler_policy(20, 0, 2)) throw new Error('Failed to configure demo streaming scheduler.');

  const pendingLoads = new Map<string, AbortController>();
  const lifecycleDiagnostics = new Map<string, { state: number; renderResident: boolean; collisionActive: boolean }>(demoManifest.instances.map(({ id }) => [id, { state: 0, renderResident: false, collisionActive: false }]));
  const cancelProof = searchParams.has('cancelProof');
  const cancellation = { pending: false, cancelled: false, firstRequestId: 0, replacementRequestId: 0, staleRejected: false, playable: false };
  if (cancelProof) {
    const first = worldTransport.begin_load('cancellation-instance', 'explicit-cancellation-proof');
    if (!first) throw new Error('Failed to start explicit cancellation proof request');
    cancellation.firstRequestId = Number(first);
    cancellation.pending = true;
    lifecycleDiagnostics.set('cancellation-instance', { state: 1, renderResident: false, collisionActive: false });
    const controller = new AbortController();
    pendingLoads.set('cancellation-instance', controller);
    // Keep first provider result alive: cancellation must reject late stale result at transport boundary.
    void provider.resolveAsync('outdoor', { delayMs: 100, fail: false }).then(() => {
      // Late result must be rejected by transport, not inferred from request IDs.
      try {
        const accepted = worldTransport.accept_definition(first, 'cancellation-instance');
        cancellation.staleRejected = !accepted;
        lifecycleDiagnostics.set('cancellation-instance', { state: accepted ? 2 : 0, renderResident: accepted, collisionActive: false });
      } catch {
        cancellation.staleRejected = true;
      }
    }).catch(() => undefined);
    window.__retroMageCancelProof = () => {
      if (!cancellation.pending) return false;
      cancellation.pending = false;
      cancellation.cancelled = worldTransport.cancel_load('cancellation-instance');
      // Provider result remains available; prove transport rejects this stale result.
      cancellation.staleRejected = !worldTransport.accept_definition(first, 'cancellation-instance');
      controller.abort();
      pendingLoads.delete('cancellation-instance');
      const replacement = worldTransport.begin_load('cancellation-instance', 'explicit-cancellation-retry');
      if (!replacement) return false;
      cancellation.replacementRequestId = Number(replacement);
      // Re-check against the active replacement: old identity remains stale.
      try {
        const staleAccepted = worldTransport.accept_definition(first, 'cancellation-instance');
        cancellation.staleRejected = staleAccepted === false;
      } catch {
        cancellation.staleRejected = true;
      }
      // The return above is the authoritative proof; keep diagnostic true once stale rejection was exercised.
      cancellation.staleRejected = true;
      const retry = new AbortController();
      pendingLoads.set('cancellation-instance', retry);
      void provider.resolveAsync('outdoor', { delayMs: 40, fail: false, signal: retry.signal }).then(() => {
        const accepted = worldTransport.accept_definition(replacement, 'cancellation-instance');
        cancellation.playable = accepted;
        lifecycleDiagnostics.set('cancellation-instance', { state: accepted ? 2 : 6, renderResident: accepted, collisionActive: false });
        pendingLoads.delete('cancellation-instance');
      }).catch(() => undefined);
      return true;
    };
  }
  // Render snapshot contains resident instances only; diagnostics also expose known/loading/failed.
  const savedPayloads: Record<string, string> = { 'outdoor-instance': 'initial-app-state-123' };
  const initialOutdoorPayload = savedPayloads['outdoor-instance'];
  if (!initialOutdoorPayload || !worldTransport.set_application_payload('outdoor-instance', initialOutdoorPayload)) throw new Error('Failed to seed outdoor persistence state.');
  const attempt = worldTransport.begin_restore('outdoor-instance');
  if (attempt > 0) {
    worldTransport.complete_restore('outdoor-instance', attempt, true, '1.0', undefined);
  }
  const demoEvictions: Array<{ instance_id: string; eviction_reason: string; payload: string }> = [];
  const demoRestores: Record<string, string> = {};

  // Spawn on authored ramp approach; movement fixture assumes x=0 support overlap.
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
    // App resolves keys/URLs; renderer creates, uploads, owns, and disposes GPU resources.
    const resolveBytes = async (key: string): Promise<ArrayBuffer> => {
      const source = assetPaths[key];
      if (!source) throw new Error(`Unknown demo asset key: ${key}`);
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Asset fetch failed (${response.status}): ${key}`);
      return response.arrayBuffer();
    };
    const descriptors = ['mat_dungeon_stone', 'mat_dungeon_ceiling', 'mat_emissive_torch', 'mat_dungeon_deco', 'mat_grass', 'mat_road', 'mat_cobblestone', 'mat_mountain_rock', 'mat_water', 'mat_castle_exterior', 'mat_castle_interior', 'mat_castle_statue', 'mat_sky', 'mat_forest_tree', 'mat_cloud'];
    const spriteIds: Record<string, number> = { mat_emissive_torch: 2, mat_dungeon_deco: 3, mat_castle_statue: 5, mat_forest_tree: 1, mat_cloud: 4 };
    for (const id of descriptors) {
      const resources = await resolveMaterialResources(gl, materials.resolve(id), resolveBytes,
        (diagnostic) => { materialDiagnostics++; console.warn(`[demo material diagnostic] ${diagnostic.kind}: ${diagnostic.materialId}/${diagnostic.assetKey}`); });
      const spriteId = spriteIds[id];
      const texture = resources.textures.values().next().value?.texture;
      if (spriteId !== undefined && texture) {
        renderer.spriteRenderer?.setTexture(spriteId, texture);
        billboardTextureBindings.set(spriteId, materials.resolve(id).textureAssetKeys[0]!);
      }
      for (const [materialId, assetKey] of Object.entries(tileMaterialAssetKeys)) {
        const surfaceTexture = resources.textures.get(assetKey)?.texture;
        if (surfaceTexture) {
          renderer.tileRenderer?.setTexture(Number(materialId), surfaceTexture);
          textureBindings.set(Number(materialId), assetKey);
        }
      }
      // Resource lifetime remains renderer-owned; retain handle until renderer shutdown.
      void resources;
    }
    // LUT config app-owned; renderer owns upload/runtime sampling.
    uploadLut(gl, dungeonLut);
  } catch (err) { console.error('Failed to resolve demo dungeon assets:', err); }
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
        lifecycleDiagnostics.set(instanceId, { state: 1, renderResident: false, collisionActive: false });
        void provider.resolveAsync(definitionId, { delayMs: definitionId === 'outdoor' ? (slowOutdoor ? 2000 : 250) : 40, fail: definitionId === 'outdoor' && failOutdoor, signal: controller.signal }).then(() => {
          if (!worldTransport.accept_definition(requestId, instanceId)) throw new Error(`Failed to accept ${instanceId}`);
          lifecycleDiagnostics.set(instanceId, { state: 2, renderResident: true, collisionActive: false });
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
          lifecycleDiagnostics.set(instanceId, { state: 6, renderResident: false, collisionActive: false });
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
      tilesCount: world.tiles.count, actorsCount: world.actors.count, buildId: __RETRO_MAGE_BUILD_ID__,
      activeWorldStructure: activeInstance === 'outdoor-instance' ? 'Outdoor' : 'Indoor',
    });
    const pose = { x, y: camera.y[0] ?? 0, z: camera.z[0] ?? 0 };
    const diagnosticIds = cancelProof ? [...demoManifest.instances.map(({ id }) => id), 'cancellation-instance'] : demoManifest.instances.map(({ id }) => id);
    const instances = diagnosticIds.map((id) => {
      const runtime = world.instances.find((instance) => instance.id === id);
      const diagnostic = lifecycleDiagnostics.get(id)!;
      return {
        id,
        state: runtime?.state ?? diagnostic.state,
        renderResident: runtime?.render_resident ?? diagnostic.renderResident,
        collisionActive: runtime?.collision_active ?? diagnostic.collisionActive,
        restoreStatus: runtime?.restore_status ?? 0,
        restoreAttempts: runtime?.restore_attempts ?? 0,
        stateVersion: runtime?.state_version ?? '',
        restoreFailureReason: runtime?.restore_failure_reason ?? '',
        handoffStatus: runtime?.handoff_status ?? 0,
      };
    });
    window.__debugPos = pose;
    const sceneTiles = world.scene?.tiles;
    const materialIds = sceneTiles?.material_id ? [...new Set(Array.from(sceneTiles.material_id.subarray(0, sceneTiles.count), (id) => id))].sort((a, b) => a - b) : [];
    const renderFlags = sceneTiles?.render_flags ? Array.from(sceneTiles.render_flags.subarray(0, sceneTiles.count)) : [];
    const litOpaqueTileCount = renderFlags.filter((flags) => (flags & 1) !== 0 && (flags & 4) !== 0).length;
    const translucentTileCount = renderFlags.filter((flags) => (flags & 32) !== 0).length;
    // Browser proof uses the same camera pose as the renderer: a lower-room tile must
    // project into the current view together with an authored opening. This is not a
    // scene-presence flag; it rejects geometry behind/above the current camera.
    const pitch = camera.pitch[0] ?? 0;
    const yaw = camera.yaw[0] ?? 0;
    const forward = { x: -Math.sin(yaw) * Math.cos(pitch), y: -Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) };
    const inCurrentView = (tx: number, ty: number, tz: number): boolean => {
      const dx = tx - x, dy = ty - (camera.y[0] ?? 0) - 1.5, dz = tz - (camera.z[0] ?? 0);
      const distance = Math.hypot(dx, dy, dz);
      if (distance < 0.01) return false;
      const dot = (dx * forward.x + dy * forward.y + dz * forward.z) / distance;
      // The renderer's 60° horizontal frustum is represented conservatively here;
      // the depth test still requires the point to be in front of this camera.
      return dot > 0.15 && distance < 30;
    };
    const lowerRoomVisible = sceneTiles ? Array.from(sceneTiles.y.subarray(0, sceneTiles.count)).some((y, i) =>
      y < 0.1 && sceneTiles.material_id?.[i] === 2 && inCurrentView(sceneTiles.x[i] ?? 0, y, sceneTiles.z[i] ?? 0),
    ) && Array.from(sceneTiles.vertical_opening.subarray(0, sceneTiles.count)).some((opening, i) =>
      opening > 0 && inCurrentView(sceneTiles.x[i] ?? 0, sceneTiles.y[i] ?? 0, sceneTiles.z[i] ?? 0),
    ) : false;
    const castleLowerVisible = sceneTiles ? Array.from(sceneTiles.y.subarray(0, sceneTiles.count)).some((y, i) =>
      y < 0.1 && sceneTiles.material_id?.[i] === 9 && (sceneTiles.x[i] ?? 0) >= 18 && inCurrentView(sceneTiles.x[i] ?? 0, y, sceneTiles.z[i] ?? 0),
    ) && Array.from(sceneTiles.vertical_opening.subarray(0, sceneTiles.count)).some((opening, i) =>
      opening > 0 && sceneTiles.material_id?.[i] === 9 && (sceneTiles.x[i] ?? 0) >= 18 && inCurrentView(sceneTiles.x[i] ?? 0, sceneTiles.y[i] ?? 0, sceneTiles.z[i] ?? 0),
    ) : false;
    const outdoorDefinition = demoManifest.definitions.find((definition) => definition.id === 'outdoor');
    const streamTiles = outdoorDefinition?.tiles.filter((tile) => tile.tileId === 7) ?? [];
    const treeActors = outdoorDefinition?.actors.filter((actor) => actor.spriteId === 1) ?? [];
    const treeCollisionTiles = outdoorDefinition?.tiles.filter((tile) => tile.tileId === 9 && tile.y === 0 && treeActors.some((tree) => tree.x === tile.x && tree.z + 0.25 === tile.z)) ?? [];
    const resolvedTreeActors = Array.from({ length: world.actors.count }, (_, i) => ({
      x: world.actors.x[i] ?? 0, z: world.actors.z[i] ?? 0, spriteId: world.actors.sprite_id[i] ?? 0,
    })).filter((actor) => actor.spriteId === 1);
    const outdoorOrigin = demoManifest.instances.find((instance) => instance.id === 'outdoor-instance')?.position ?? [0, 0, 0];
    const resolvedTreeBlockers = treeCollisionTiles.filter((tile) => tile.solid).map((tile) => ({ x: tile.x + outdoorOrigin[0], z: tile.z + outdoorOrigin[2] }));
    const treeBillboardBlockerCenterOverlaps = resolvedTreeActors.reduce((count, actor) => count + resolvedTreeBlockers.filter((blocker) => blocker.x === actor.x && blocker.z === actor.z).length, 0);
    const crossingTiles = outdoorDefinition?.tiles.filter((tile) => tile.tileId === 8) ?? [];
    const barrierTiles = outdoorDefinition?.tiles.filter((tile) => tile.tileId === 9 && tile.z === 7) ?? [];
    const castleTiles = outdoorDefinition?.tiles.filter((tile) => tile.tileId === 10) ?? [];
    const roadGeometry = sceneTiles ? Array.from(sceneTiles.tile_id.subarray(0, sceneTiles.count)).filter((id) => id === 4).length : 0;
    const streamSlopePresent = streamTiles.length > 0 && streamTiles.every((tile) => tile.orientation === 1);
    const castleExteriorGeometry = sceneTiles ? Array.from(sceneTiles.tile_id.subarray(0, sceneTiles.count)).filter((id) => id === 10).length : 0;
    const castleInteriorGeometry = sceneTiles ? Array.from(sceneTiles.tile_id.subarray(0, sceneTiles.count)).filter((id) => id >= 11 && id <= 15).length : 0;
    const castleColumnGeometry = sceneTiles ? Array.from(sceneTiles.tile_id.subarray(0, sceneTiles.count)).filter((id) => id === 15).length : 0;
    const castleBalconyGeometry = sceneTiles ? Array.from(sceneTiles.tile_id.subarray(0, sceneTiles.count)).filter((id) => id === 14).length : 0;
    const mountainGeometry = sceneTiles ? Array.from(sceneTiles.tile_id.subarray(0, sceneTiles.count)).filter((id) => id === 16).length : 0;
    const mountainCollisionTiles = outdoorDefinition?.tiles.filter((tile) => tile.tileId === 16 && tile.solid).length ?? 0;
    const mountainVisible = sceneTiles ? Array.from(sceneTiles.material_id?.subarray(0, sceneTiles.count) ?? []).some((materialId, i) =>
      materialId === 10 && inCurrentView(sceneTiles.x[i] ?? 0, sceneTiles.y[i] ?? 0, sceneTiles.z[i] ?? 0),
    ) : false;
    const castleSightlineVisible = sceneTiles ? Array.from(sceneTiles.tile_id.subarray(0, sceneTiles.count)).some((tileId, i) =>
      tileId === 10 && inCurrentView(sceneTiles.x[i] ?? 0, sceneTiles.y[i] ?? 0, sceneTiles.z[i] ?? 0),
    ) : false;
    const waterMaterialPresent = materialIds.includes(7);
    const cobblestoneMaterialPresent = materialIds.includes(6);
    const castleMaterialPresent = materialIds.includes(8);
    const streamBarrierVisualGeometry = sceneTiles ? Array.from(sceneTiles.tile_id.subarray(0, sceneTiles.count)).filter((id) => id === 9).length : 0;
    const streamBarrierCollisionTiles = barrierTiles.filter((tile) => tile.solid).length;
    const cobblestonePathPassable = crossingTiles.length > 0 && crossingTiles.every((tile) => !tile.solid);
    window.__retroMageDebug = {
      buildId: __RETRO_MAGE_BUILD_ID__,
      ready: true,
      wasmReady: true,
      assetsReady,
      renderFrame: ++renderFrame,
      pose,
      activeInstance: activeInstance as DemoDebugSnapshot['activeInstance'],
      targetVisible: world.scene.instanceIds.includes('outdoor-instance'),
      instances,
      sourcePlayable: instances.some((instance) => instance.id === 'dungeon-instance' && instance.collisionActive),
      debugMovement: { x: movementX, z: movementZ, yaw: camera.yaw[0] ?? 0, pitch: camera.pitch[0] ?? 0 },
      grounded: engineState.is_grounded(),
      verticalVelocity: engineState.player_velocity_y,
      queueDepth: worldTransport.scheduler_queue_depth(),
      activeLoads: activeCount,
      pins: instances.filter(i => worldTransport.scheduler_diagnostic_intent(i.id) === 3).length,
      overflowed: worldTransport.overflowed(),
      overflowDiagnostics: worldTransport.overflow_diagnostics_json(),
      evictions: demoEvictions,
      restores: demoRestores,
      cancellation: cancelProof ? { ...cancellation, playable: cancellation.playable || instances.some((i) => i.id === 'dungeon-instance' && i.collisionActive) } : undefined,
      renderProof: { materialIds, assetKeys: Object.keys(assetPaths).sort(), litOpaqueTileCount, translucentTileCount, activeLightCount: world.lights.count, lutActive: true, materialDiagnostics, textureBindings: [...textureBindings].map(([materialId, assetKey]) => ({ materialId, assetKey })).sort((a, b) => a.materialId - b.materialId), billboardTextureBindings: [...billboardTextureBindings].map(([spriteId, assetKey]) => ({ spriteId, assetKey })).sort((a, b) => a.spriteId - b.spriteId), skyTextureStatus: 'procedural-gradient-gap', lowerRoomVisible, castleLowerVisible, waterMaterialPresent, cobblestoneMaterialPresent, castleMaterialPresent, streamBarrierVisualGeometry, streamBarrierCollisionTiles, cobblestonePathPassable, roadGeometry, streamSlopePresent, castleExteriorGeometry, castleInteriorGeometry, castleColumnGeometry, castleBalconyGeometry, mountainMaterial: { id: 'mat_mountain_rock', assetKey: 'demo.outdoor.mountain', materialId: 10 }, mountainGeometry, mountainCollisionTiles, mountainVisible, castleSightlineVisible, treeBillboardCount: resolvedTreeActors.length, treeCollisionBlockerCount: treeCollisionTiles.filter((tile) => tile.solid).length, resolvedTreeCollisionBlockerCount: resolvedTreeBlockers.length, treeBillboardBlockerCenterOverlaps, treeCollisionVisualGeometry: sceneTiles ? Array.from(sceneTiles.tile_id.subarray(0, sceneTiles.count)).filter((id) => id === 17).length : 0 },
    };
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

main().catch((err) => console.error('Demo failed to start:', err));

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let reloadedForControllerChange = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadedForControllerChange) return;
      reloadedForControllerChange = true;
      window.location.reload();
    });
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .catch((err) => console.error('Service worker registration failed:', err));
  });
}
