import type { TilesView } from './types.js';

export interface TilesEngineState {
  tiles_x_ptr(): number;
  tiles_x_count(): number;
  tiles_y_ptr(): number;
  tiles_y_count(): number;
  tiles_z_ptr(): number;
  tiles_z_count(): number;
  tiles_tile_id_ptr(): number;
  tiles_tile_id_count(): number;
  tiles_variant_ptr(): number;
  tiles_variant_count(): number;
  tiles_count(): number;
}

/**
 * Reads or updates a `TilesView` over WASM memory.
 * Defensively re-wraps typed-array views if WASM memory has grown/reallocated,
 * preserving zero per-frame heap allocation in steady state.
 */
export function readTilesView(
  engine: TilesEngineState,
  memory: WebAssembly.Memory,
  cachedView?: TilesView | null
): TilesView {
  const buffer = memory.buffer;
  if (
    cachedView &&
    cachedView.x.buffer === buffer &&
    buffer.byteLength > 0
  ) {
    cachedView.count = engine.tiles_count();
    return cachedView;
  }

  const count = engine.tiles_count();
  return {
    x: new Float32Array(buffer, engine.tiles_x_ptr(), engine.tiles_x_count()),
    y: new Float32Array(buffer, engine.tiles_y_ptr(), engine.tiles_y_count()),
    z: new Float32Array(buffer, engine.tiles_z_ptr(), engine.tiles_z_count()),
    tile_id: new Float32Array(buffer, engine.tiles_tile_id_ptr(), engine.tiles_tile_id_count()),
    variant: new Float32Array(buffer, engine.tiles_variant_ptr(), engine.tiles_variant_count()),
    count,
  };
}
