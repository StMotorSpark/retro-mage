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
  // Camera starting pose at (0, 0, 6) looking down -Z into starting room (Room 0: Entry Hall).
  // y must match the tile grid's floor elevation (0 = Entry Hall floor tiles' y), since
  // engine-core's visibility culling rounds camera.y to an integer "elev" layer and only
  // tiles on that same elev are shadowcast-visible (see recompute_visibility/visibility.rs).
  // A fractional eye-height y (e.g. 1.5) rounds to a different elev than the floor tiles,
  // producing zero visible tiles.
  engineState.set_camera(0, 0, 6, 0, 0);
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

  // Doorways
  engineState.register_indoor_doorway(-100.0, -4.0, -100.0, 100.0, 0, 1); // Entry -> Armory
  engineState.register_indoor_doorway(-4.0, 100.0, -100.0, 100.0, 1, 0);  // Armory -> Entry
  engineState.register_indoor_doorway(4.0, 100.0, -100.0, 100.0, 0, 2);   // Entry -> Gate Room
  engineState.register_indoor_doorway(-100.0, 4.0, -100.0, 100.0, 2, 0);  // Gate Room -> Entry

  engineState.set_active_world_structure(0); // 0 = Indoor, 1 = Outdoor
  engineState.set_outdoor_default_tile_id(3); // tile_id 3 = grass terrain

  // Outdoor world coordinates are deliberately offset far away (+1000 on both axes) from
  // indoor room coordinates. engine-core's master tile buffer and collision system are a
  // single shared coordinate space with no structure-aware partitioning (see
  // docs/research/known-gaps.md "Outdoor Coordinate System") — indoor tiles remain solid
  // obstacles and visible geometry at their literal (x, z) position even while the active
  // world structure is Outdoor. Since the indoor rooms occupy roughly x/z in [-10, 10], a
  // small offdoor anchor like (32, 32) put solid Gate Room wall tiles well within both the
  // outdoor sight radius (up to 32 tiles) and the collision path back to the seam, causing
  // dungeon geometry to render in the outdoor sky and to block the return crossing. Pushing
  // the outdoor world out to ~1000 keeps the two spaces from ever numerically overlapping.
  

  // Register Seam mapping Gate Room exit tile at (10, 4) to outdoor global (1032, 1032).
  // register_seam's offset_x/offset_y are raw SeamTransform translation values (not
  // derived from the pinned-point formula), so both the outdoor anchor and the transform
  // offset must be shifted by OUTDOOR_OFFSET consistently with the original (32, 32) anchor
  // — shifting the room-side (10, 4) numbers instead would desync the seam's stored anchor
  // from where the transform actually places the player on crossing.
  engineState.register_seam(
    1,
    2,
    10.0,
    4.0,
    32.0,
    32.0,
    22.0,
    28.0,
    0.0
  );

  let tileIdx = 0;

  // 1. Room 0: Entry Hall floor grid (y = 0.0): x in [-3, 3], z in [2, 7]
  for (let x = -3; x <= 3; x++) {
    for (let z = 2; z <= 7; z++) {
      engineState.set_indoor_tile(tileIdx++, x, 0, z, 2, 0, 0, 0); // tile_id 2 = floor
    }
  }

  // Entry Hall walls (tile_id 1 = wall, solid = 1.0)
  for (let x = -4; x <= 4; x++) {
    engineState.set_indoor_tile(tileIdx++, x, 0, 8, 1, 0, 1.0, 0); // South wall
    engineState.set_indoor_tile(tileIdx++, x, 0, 1, 1, 0, 1.0, 0); // North wall
  }
  for (let z = 2; z <= 7; z++) {
    if (z !== 4) {
      engineState.set_indoor_tile(tileIdx++, -4, 0, z, 1, 0, 1.0, 0); // West wall (doorway at z=4)
      engineState.set_indoor_tile(tileIdx++, 4, 0, z, 1, 0, 1.0, 0); // East wall (doorway at z=4)
    }
  }

  // 2. Room 1: Armory floor grid (y = 0.0): x in [-9, -5], z in [3, 6]
  for (let x = -9; x <= -5; x++) {
    for (let z = 3; z <= 6; z++) {
      engineState.set_indoor_tile(tileIdx++, x, 0, z, 2, 0, 0, 0); // floor
    }
  }
  // Doorway connection between Entry Hall & Armory
  engineState.set_indoor_tile(tileIdx++, -4, 0, 4, 2, 0, 0, 0);

  // Armory walls
  for (let x = -10; x <= -4; x++) {
    engineState.set_indoor_tile(tileIdx++, x, 0, 7, 1, 0, 1.0, 0); // South wall
    engineState.set_indoor_tile(tileIdx++, x, 0, 2, 1, 0, 1.0, 0); // North wall
  }
  for (let z = 3; z <= 6; z++) {
    engineState.set_indoor_tile(tileIdx++, -10, 0, z, 1, 0, 1.0, 0); // West wall
    if (z !== 4) {
      engineState.set_indoor_tile(tileIdx++, -4, 0, z, 1, 0, 1.0, 0); // East wall
    }
  }

  // 3. Room 2: Gate Room floor grid (y = 0.0): x in [5, 9], z in [3, 6]
  for (let x = 5; x <= 9; x++) {
    for (let z = 3; z <= 6; z++) {
      engineState.set_indoor_tile(tileIdx++, x, 0, z, 2, 0, 0, 0); // floor
    }
  }
  // Doorway connection between Entry Hall & Gate Room
  engineState.set_indoor_tile(tileIdx++, 4, 0, 4, 2, 0, 0, 0);
  // Seam exit tile
  engineState.set_indoor_tile(tileIdx++, 10, 0, 4, 2, 0, 0, 0);

  // Gate Room walls
  for (let x = 4; x <= 10; x++) {
    engineState.set_indoor_tile(tileIdx++, x, 0, 7, 1, 0, 1.0, 0); // South wall
    engineState.set_indoor_tile(tileIdx++, x, 0, 2, 1, 0, 1.0, 0); // North wall
  }
  for (let z = 3; z <= 6; z++) {
    if (z !== 4) {
      engineState.set_indoor_tile(tileIdx++, 4, 0, z, 1, 0, 1.0, 0); // West wall
      engineState.set_indoor_tile(tileIdx++, 10, 0, z, 1, 0, 1.0, 0); // East wall (gate exit at z=4)
    }
  }

  // Outdoor grass terrain patch (app-level workaround, see note below), centered on the
  // seam anchor (32, 32) and sized to cover the scattered tree actors' footprint.
  //
  // NOTE: engine-core's outdoor chunk streamer (OutdoorChunkStreamer/FlatChunkProvider)
  // tracks resident chunk bookkeeping correctly but never copies chunk tile data into
  // master_tiles / the visible-tiles buffer that recompute_visibility culls from render
  // reads — so streamed outdoor chunks are otherwise invisible geometry. Until that
  // chunk-to-tile-buffer bridge exists in engine-core, this demo authors the outdoor
  // ground plane as ordinary hand-placed tiles, the same way indoor rooms are authored.
  for (let x = 20; x <= 46; x++) {
    for (let z = 20; z <= 46; z++) {
      engineState.set_outdoor_tile(tileIdx++, x, 0, z, 3, 0, 0, 0); // grass, non-solid
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

  // Tree Billboard Sprite Actors (6 total) in outdoor chunk area (task:38)
  // Scattered across outdoor area around seam exit (32, 32), avoiding direct path
  engineState.set_outdoor_actor(0, 25.0, 0.0, 24.0, 0.0, 1.0, 1.0);
  engineState.set_outdoor_actor(1, 38.0, 0.0, 26.0, 0.0, 1.0, 1.0);
  engineState.set_outdoor_actor(2, 22.0, 0.0, 36.0, 0.0, 1.0, 1.0);
  engineState.set_outdoor_actor(3, 40.0, 0.0, 38.0, 0.0, 1.0, 1.0);
  engineState.set_outdoor_actor(4, 28.0, 0.0, 44.0, 0.0, 1.0, 1.0);
  engineState.set_outdoor_actor(5, 36.0, 0.0, 42.0, 0.0, 1.0, 1.0);

  // Set up world state reader over WASM memory
  const reader = new WorldStateReader(engineState, wasmOutput.memory);

  // Pass reader view getter to the render loop
  const renderer = createRenderer(canvas, {
    getViews: () => reader.read(),
  });

  // Wire textures into world-tiles and sprites renderers
  try {
    const stoneWallRes = await fetch('/assets/textures/stone-wall.ktx2');
    if (stoneWallRes.ok) {
      const buffer = await stoneWallRes.arrayBuffer();
      const loaded = await loadKtx2Texture(gl, buffer);
      renderer.tileRenderer?.setTexture(1, loaded.texture); // stone wall (tile_id 1)
    }
    const stoneFloorRes = await fetch('/assets/textures/stone-floor.ktx2');
    if (stoneFloorRes.ok) {
      const buffer = await stoneFloorRes.arrayBuffer();
      const loaded = await loadKtx2Texture(gl, buffer);
      renderer.tileRenderer?.setTexture(2, loaded.texture); // stone floor (tile_id 2)
    }
    const grassRes = await fetch('/assets/textures/grass.ktx2');
    if (grassRes.ok) {
      const buffer = await grassRes.arrayBuffer();
      const loaded = await loadKtx2Texture(gl, buffer);
      renderer.tileRenderer?.setTexture(3, loaded.texture); // grass terrain (tile_id 3)
    }
    const treeRes = await fetch('/assets/sprites/tree-sprite.ktx2');
    if (treeRes.ok) {
      const buffer = await treeRes.arrayBuffer();
      const loaded = await loadKtx2Texture(gl, buffer);
      renderer.spriteRenderer?.setTexture(1, loaded.texture); // tree sprite (sprite_id 1)
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

    // Indoor room-graph transitions are driven by an explicit current-room id
    // (engine-core has no automatic position-based room detection — rooms are
    // graph nodes, not spatial regions, per docs/architecture/world-streaming.md).
    // The demo's 3 rooms *do* occupy known, non-overlapping tile footprints along
    // the x axis, so approximate room membership from player x and update the
    // engine's current room as the player physically crosses a doorway. Without
    // this, the Gate Room seam (registered against room_id=2) is never a
    // candidate for the seam manager's crossing check once the player leaves
    // Entry Hall, since the seam manager only evaluates seams attached to the
    // current room, not merely resident rooms.
    if (engineState.active_world_structure() === 0) {

    }

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
// generateSW strategy only emits sw.js on `vite build`; dev server has no
// service worker to register, so skip in dev to avoid a text/html 404 mismatch.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Service worker registration failed:', err);
    });
  });
}
