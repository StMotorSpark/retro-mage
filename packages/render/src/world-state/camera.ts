import type { CameraView } from './types.js';

export interface CameraEngineState {
  camera_x_ptr(): number;
  camera_x_count(): number;
  camera_y_ptr(): number;
  camera_y_count(): number;
  camera_z_ptr(): number;
  camera_z_count(): number;
  camera_yaw_ptr(): number;
  camera_yaw_count(): number;
  camera_pitch_ptr(): number;
  camera_pitch_count(): number;
}

/**
 * Reads or updates a `CameraView` over WASM memory.
 * Defensively re-wraps typed-array views if WASM memory has grown/reallocated,
 * preserving zero per-frame heap allocation in steady state.
 */
export function readCameraView(
  engine: CameraEngineState,
  memory: WebAssembly.Memory,
  cachedView?: CameraView | null
): CameraView {
  const buffer = memory.buffer;
  if (
    cachedView &&
    cachedView.x.buffer === buffer &&
    buffer.byteLength > 0
  ) {
    cachedView.count = 1;
    return cachedView;
  }

  return {
    x: new Float32Array(buffer, engine.camera_x_ptr(), engine.camera_x_count()),
    y: new Float32Array(buffer, engine.camera_y_ptr(), engine.camera_y_count()),
    z: new Float32Array(buffer, engine.camera_z_ptr(), engine.camera_z_count()),
    yaw: new Float32Array(buffer, engine.camera_yaw_ptr(), engine.camera_yaw_count()),
    pitch: new Float32Array(buffer, engine.camera_pitch_ptr(), engine.camera_pitch_count()),
    count: 1,
  };
}
