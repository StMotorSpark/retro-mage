import type { ActorsView } from './types.js';

export interface ActorsEngineState {
  actors_x_ptr(): number;
  actors_x_count(): number;
  actors_y_ptr(): number;
  actors_y_count(): number;
  actors_z_ptr(): number;
  actors_z_count(): number;
  actors_facing_ptr(): number;
  actors_facing_count(): number;
  actors_sprite_id_ptr(): number;
  actors_sprite_id_count(): number;
  actors_active_ptr(): number;
  actors_active_count(): number;
  actors_material_id_ptr?(): number;
  actors_material_id_count?(): number;
  actors_uv_mode_ptr?(): number;
  actors_uv_mode_count?(): number;
  actors_uv_u_ptr?(): number;
  actors_uv_u_count?(): number;
  actors_uv_v_ptr?(): number;
  actors_uv_v_count?(): number;
  actors_render_flags_ptr?(): number;
  actors_render_flags_count?(): number;
  actors_count(): number;
}

/**
 * Reads or updates an `ActorsView` over WASM memory.
 * Defensively re-wraps typed-array views if WASM memory has grown/reallocated,
 * preserving zero per-frame heap allocation in steady state.
 */
export function readActorsView(
  engine: ActorsEngineState,
  memory: WebAssembly.Memory,
  cachedView?: ActorsView | null
): ActorsView {
  const buffer = memory.buffer;
  if (
    cachedView &&
    cachedView.x.buffer === buffer &&
    buffer.byteLength > 0
  ) {
    cachedView.count = engine.actors_count();
    return cachedView;
  }

  const count = engine.actors_count();
  return {
    x: new Float32Array(buffer, engine.actors_x_ptr(), engine.actors_x_count()),
    y: new Float32Array(buffer, engine.actors_y_ptr(), engine.actors_y_count()),
    z: new Float32Array(buffer, engine.actors_z_ptr(), engine.actors_z_count()),
    facing: new Float32Array(buffer, engine.actors_facing_ptr(), engine.actors_facing_count()),
    sprite_id: new Float32Array(buffer, engine.actors_sprite_id_ptr(), engine.actors_sprite_id_count()),
    active: new Float32Array(buffer, engine.actors_active_ptr(), engine.actors_active_count()),
    material_id: engine.actors_material_id_ptr ? new Float32Array(buffer, engine.actors_material_id_ptr(), engine.actors_material_id_count!()) : new Float32Array(count),
    uv_mode: engine.actors_uv_mode_ptr ? new Float32Array(buffer, engine.actors_uv_mode_ptr(), engine.actors_uv_mode_count!()) : new Float32Array(count).fill(2),
    uv_u: engine.actors_uv_u_ptr ? new Float32Array(buffer, engine.actors_uv_u_ptr(), engine.actors_uv_u_count!()) : new Float32Array(count),
    uv_v: engine.actors_uv_v_ptr ? new Float32Array(buffer, engine.actors_uv_v_ptr(), engine.actors_uv_v_count!()) : new Float32Array(count),
    render_flags: engine.actors_render_flags_ptr ? new Float32Array(buffer, engine.actors_render_flags_ptr(), engine.actors_render_flags_count!()) : new Float32Array(count).fill(6),
    count,
  };
}
