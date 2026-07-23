import init, { EngineState } from 'engine-core';
import { createRenderer, loadKtx2Texture, WorldStateReader } from 'render';
import { createInputSource, FACE1 } from 'input';
import { PerfOverlay } from './perf-overlay.js';

/**
 * Demo app: 3-room indoor dungeon scene (Entry Hall, Armory, Gate Room)
 * exercising textured tile rendering, LUT lighting, collision-driven movement,
 * and indoor room graph streaming per docs/features/demo-scope.md.
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

  // engine-core ships as a wasm-bindgen `web` target module — must init before use.
  const wasmOutput = await init();

  const engineState = new EngineState();

  // Populate 3-room indoor dungeon scene into engine-core
  // Camera starting pose at (0, 1.5, 6) looking down -Z into starting room (Room 0: Entry Hall)
  engineState.set_camera(0, 1.5, 6, 0, 0);
  engineState.set_ambient_light(0.05);
  engineState.set_max_sight_distance(32.0);
  engineState.set_cull_precision_distance(32.0);

  // Configure world streaming tuning parameters (task:30)
  // Load radius = 2 chunks, Evict radius = 3 chunks, Hop depth = 1 hop, Seam trigger = 32 tiles
  engineState.set_outdoor_load_radius(2);
  engineState.set_outdoor_evict_radius(3);
  engineState.set_indoor_hop_depth(1);
  engineState.set_seam_trigger_distance(32.0);
  engineState.set_seam_crossing_threshold(1.5);

  // Set up 3-room graph (task:36)
  // Room 0: Entry Hall (starting room, wide, 2 torches)
  // Room 1: Armory (narrower side room connected to Entry Hall, 1 torch)
  // Room 2: Gate Room (connected to Entry Hall, 1 torch, contains seam exit tile)
  engineState.add_room_to_graph(0, 'Entry Hall');
  engineState.add_room_to_graph(1, 'Armory');
  engineState.add_room_to_graph(2, 'Gate Room');
  engineState.add_room_edge(0, 1);
  engineState.add_room_edge(0, 2);
  engineState.set_indoor_current_room(0);
  engineState.set_active_world_structure(0); // 0 = Indoor, 1 = Outdoor
  engineState.set_outdoor_default_tile_id(3); // tile_id 3 = grass terrain

  // Register Seam mapping Gate Room exit tile at (10, 4) to outdoor global (32, 32)
  engineState.register_seam(1, 2, 10.0, 4.0, 32.0, 32.0, 22.0, 28.0, 0.0);

  let tileIdx = 0;

  // 1. Room 0: Entry Hall floor grid (y = 0.0): x in [-3, 3], z in [2, 7]
  for (let x = -3; x <= 3; x++) {
    for (let z = 2; z <= 7; z++) {
      engineState.set_tile(tileIdx++, x, 0, z, 2, 0, 0, 0); // tile_id 2 = floor
    }
  }

  // Entry Hall walls (tile_id 1 = wall, solid = 1.0)
  for (let x = -4; x <= 4; x++) {
    engineState.set_tile(tileIdx++, x, 0, 8, 1, 0, 1.0, 0); // South wall
    engineState.set_tile(tileIdx++, x, 0, 1, 1, 0, 1.0, 0); // North wall
  }
  for (let z = 2; z <= 7; z++) {
    if (z !== 4) {
      engineState.set_tile(tileIdx++, -4, 0, z, 1, 0, 1.0, 0); // West wall (doorway at z=4)
      engineState.set_tile(tileIdx++, 4, 0, z, 1, 0, 1.0, 0); // East wall (doorway at z=4)
    }
  }

  // 2. Room 1: Armory floor grid (y = 0.0): x in [-9, -5], z in [3, 6]
  for (let x = -9; x <= -5; x++) {
    for (let z = 3; z <= 6; z++) {
      engineState.set_tile(tileIdx++, x, 0, z, 2, 0, 0, 0); // floor
    }
  }
  // Doorway connection between Entry Hall & Armory
  engineState.set_tile(tileIdx++, -4, 0, 4, 2, 0, 0, 0);

  // Armory walls
  for (let x = -10; x <= -4; x++) {
    engineState.set_tile(tileIdx++, x, 0, 7, 1, 0, 1.0, 0); // South wall
    engineState.set_tile(tileIdx++, x, 0, 2, 1, 0, 1.0, 0); // North wall
  }
  for (let z = 3; z <= 6; z++) {
    engineState.set_tile(tileIdx++, -10, 0, z, 1, 0, 1.0, 0); // West wall
    if (z !== 4) {
      engineState.set_tile(tileIdx++, -4, 0, z, 1, 0, 1.0, 0); // East wall
    }
  }

  // 3. Room 2: Gate Room floor grid (y = 0.0): x in [5, 9], z in [3, 6]
  for (let x = 5; x <= 9; x++) {
    for (let z = 3; z <= 6; z++) {
      engineState.set_tile(tileIdx++, x, 0, z, 2, 0, 0, 0); // floor
    }
  }
  // Doorway connection between Entry Hall & Gate Room
  engineState.set_tile(tileIdx++, 4, 0, 4, 2, 0, 0, 0);
  // Seam exit tile
  engineState.set_tile(tileIdx++, 10, 0, 4, 2, 0, 0, 0);

  // Gate Room walls
  for (let x = 4; x <= 10; x++) {
    engineState.set_tile(tileIdx++, x, 0, 7, 1, 0, 1.0, 0); // South wall
    engineState.set_tile(tileIdx++, x, 0, 2, 1, 0, 1.0, 0); // North wall
  }
  for (let z = 3; z <= 6; z++) {
    if (z !== 4) {
      engineState.set_tile(tileIdx++, 4, 0, z, 1, 0, 1.0, 0); // West wall
      engineState.set_tile(tileIdx++, 10, 0, z, 1, 0, 1.0, 0); // East wall (gate exit at z=4)
    }
  }

  // Torch Point Lights (4 total): warm orange-yellow (r=1.0, g=0.7, b=0.3)
  // Entry Hall Torch 1 & 2
  engineState.set_light(0, -2.0, 1.5, 4.0, 1.0, 0.7, 0.3, 8.0, 1.0);
  engineState.set_light(1, 2.0, 1.5, 4.0, 1.0, 0.7, 0.3, 8.0, 1.0);
  // Armory Torch
  engineState.set_light(2, -7.0, 1.5, 4.5, 1.0, 0.7, 0.3, 8.0, 1.0);
  // Gate Room Torch
  engineState.set_light(3, 7.0, 1.5, 4.5, 1.0, 0.7, 0.3, 8.0, 1.0);

  // Set up world state reader over WASM memory
  const reader = new WorldStateReader(engineState, wasmOutput.memory);

  // Pass reader view getter to the render loop
  const renderer = createRenderer(canvas, {
    getViews: () => reader.read(),
  });

  // Wire textures into world-tiles renderer
  try {
    const wallRes = await fetch('/assets/textures/wall.ktx2');
    if (wallRes.ok) {
      const buffer = await wallRes.arrayBuffer();
      const loaded = await loadKtx2Texture(gl, buffer);
      renderer.tileRenderer?.setTexture(1, loaded.texture); // stone wall (tile_id 1)
      renderer.tileRenderer?.setTexture(2, loaded.texture); // stone floor (tile_id 2)
    }
    const grassRes = await fetch('/assets/textures/grass.ktx2');
    if (grassRes.ok) {
      const buffer = await grassRes.arrayBuffer();
      const loaded = await loadKtx2Texture(gl, buffer);
      renderer.tileRenderer?.setTexture(3, loaded.texture); // grass terrain (tile_id 3)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load demo textures:', err);
  }

  // Override touch look sensitivity default (3) up to 5 for this demo's feel.
  const inputSource = createInputSource(overlay, { touch: { lookSensitivity: 5 } });
  const perfOverlay = new PerfOverlay({
    onAdjustMaxSight: (delta: number) => {
      const cur = engineState.max_sight_distance();
      const next = Math.max(1, Math.min(64, cur + delta));
      engineState.set_max_sight_distance(next);
    },
    onAdjustCullPrecision: (delta: number) => {
      const cur = engineState.cull_precision_distance();
      const next = Math.max(1, Math.min(64, cur + delta));
      engineState.set_cull_precision_distance(next);
    },
    onAdjustAmbientLight: (delta: number) => {
      const cur = engineState.ambient_light();
      const next = Math.max(0, Math.min(1, cur + delta));
      engineState.set_ambient_light(next);
    },
    onAdjustSeamTrigger: (delta: number) => {
      const cur = engineState.seam_trigger_distance();
      const next = Math.max(1, Math.min(64, cur + delta));
      engineState.set_seam_trigger_distance(next);
    },
    onAdjustOutdoorLoadRadius: (delta: number) => {
      const cur = engineState.outdoor_load_radius();
      const next = Math.max(1, Math.min(8, cur + delta));
      engineState.set_outdoor_load_radius(next);
    },
    onAdjustIndoorHopDepth: (delta: number) => {
      const cur = engineState.indoor_hop_depth();
      const next = Math.max(1, Math.min(5, cur + delta));
      engineState.set_indoor_hop_depth(next);
    },
  });

  renderer.start();

  let lastTime = performance.now();

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

    // Advance engine tick: applies look, computes facing movement delta,
    // and resolves tile collision with sliding resolution (task:33)
    engineState.tick(dt);

    const activeStruct = engineState.active_world_structure();
    const isOutdoor = activeStruct === 1;

    // Active world structure updates rendering skybox and outdoor ambient lighting
    renderer.setSkyboxEnabled(isOutdoor);
    engineState.set_ambient_light(isOutdoor ? 1.0 : 0.05);

    perfOverlay.update(dtMs, time, {
      sightRadius: engineState.sight_radius(),
      maxSightDistance: engineState.max_sight_distance(),
      cullPrecisionDistance: engineState.cull_precision_distance(),
      ambientLight: engineState.ambient_light(),
      tilesCount: engineState.tiles_count(),
      actorsCount: engineState.actors_count(),
      activeWorldStructure: activeStruct === 0 ? 'Indoor' : 'Outdoor',
      currentRoomId: engineState.indoor_current_room_id(),
      residentRoomsCount: engineState.resident_room_count(),
      residentChunksCount: engineState.resident_chunk_count(),
      seamTriggerDistance: engineState.seam_trigger_distance(),
      outdoorLoadRadius: engineState.outdoor_load_radius(),
      indoorHopDepth: engineState.indoor_hop_depth(),
    });

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
