import type { WorldStateViews } from './types.js';
import { readActorsView, type ActorsEngineState } from './actors.js';
import { readLightsView, type LightsEngineState } from './lights.js';
import { readTilesView, type TilesEngineState } from './tiles.js';
import { readCameraView, type CameraEngineState } from './camera.js';

export type CombinedEngineState = ActorsEngineState &
  LightsEngineState &
  TilesEngineState &
  CameraEngineState;

/**
 * WorldStateReader manages zero-copy typed-array views over WASM linear memory
 * for all engine state buffers (actors, lights, tiles, camera).
 */
export class WorldStateReader {
  private cachedViews?: WorldStateViews;

  constructor(
    private engine: CombinedEngineState,
    private memory: WebAssembly.Memory
  ) {}

  /**
   * Reads world-state typed-array views over WASM linear memory.
   * Reuses cached Float32Array instances in steady state, re-wrapping only when WASM memory grows.
   */
  read(): WorldStateViews {
    const actors = readActorsView(this.engine, this.memory, this.cachedViews?.actors);
    const lights = readLightsView(this.engine, this.memory, this.cachedViews?.lights);
    const tiles = readTilesView(this.engine, this.memory, this.cachedViews?.tiles);
    const camera = readCameraView(this.engine, this.memory, this.cachedViews?.camera);

    this.cachedViews = { actors, lights, tiles, camera };
    return this.cachedViews;
  }
}

export * from './types.js';
export * from './actors.js';
export * from './lights.js';
export * from './tiles.js';
export * from './camera.js';
