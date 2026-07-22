import type { LightsView } from './types.js';

export interface LightsEngineState {
  lights_x_ptr(): number;
  lights_x_count(): number;
  lights_y_ptr(): number;
  lights_y_count(): number;
  lights_z_ptr(): number;
  lights_z_count(): number;
  lights_r_ptr(): number;
  lights_r_count(): number;
  lights_g_ptr(): number;
  lights_g_count(): number;
  lights_b_ptr(): number;
  lights_b_count(): number;
  lights_intensity_ptr(): number;
  lights_intensity_count(): number;
  lights_active_ptr(): number;
  lights_active_count(): number;
  lights_count(): number;
}

/**
 * Reads or updates a `LightsView` over WASM memory.
 * Defensively re-wraps typed-array views if WASM memory has grown/reallocated,
 * preserving zero per-frame heap allocation in steady state.
 */
export function readLightsView(
  engine: LightsEngineState,
  memory: WebAssembly.Memory,
  cachedView?: LightsView | null
): LightsView {
  const buffer = memory.buffer;
  if (
    cachedView &&
    cachedView.x.buffer === buffer &&
    buffer.byteLength > 0
  ) {
    cachedView.count = engine.lights_count();
    return cachedView;
  }

  const count = engine.lights_count();
  return {
    x: new Float32Array(buffer, engine.lights_x_ptr(), engine.lights_x_count()),
    y: new Float32Array(buffer, engine.lights_y_ptr(), engine.lights_y_count()),
    z: new Float32Array(buffer, engine.lights_z_ptr(), engine.lights_z_count()),
    r: new Float32Array(buffer, engine.lights_r_ptr(), engine.lights_r_count()),
    g: new Float32Array(buffer, engine.lights_g_ptr(), engine.lights_g_count()),
    b: new Float32Array(buffer, engine.lights_b_ptr(), engine.lights_b_count()),
    intensity: new Float32Array(buffer, engine.lights_intensity_ptr(), engine.lights_intensity_count()),
    active: new Float32Array(buffer, engine.lights_active_ptr(), engine.lights_active_count()),
    count,
  };
}
