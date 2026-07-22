/**
 * ActorsView exposes typed-array views over WASM linear memory for all active actors.
 * Struct-of-Arrays (SoA) layout with 1 f32 slot per actor field.
 * Maximum capacity: 64 actors.
 */
export interface ActorsView {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly facing: Float32Array;
  readonly sprite_id: Float32Array;
  readonly active: Float32Array;
  /** Number of live active actors currently in the simulation */
  count: number;
}

/**
 * LightsView exposes typed-array views over WASM linear memory for point light sources.
 * Struct-of-Arrays (SoA) layout with 1 f32 slot per light field.
 * Maximum capacity: 32 lights.
 */
export interface LightsView {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly r: Float32Array;
  readonly g: Float32Array;
  readonly b: Float32Array;
  readonly intensity: Float32Array;
  readonly active: Float32Array;
  /** Number of live active lights currently in the simulation */
  count: number;
}

/**
 * TilesView exposes typed-array views over WASM linear memory for room tile geometry.
 * Struct-of-Arrays (SoA) layout with 1 f32 slot per tile field.
 * Maximum capacity: 1024 visible tiles.
 */
export interface TilesView {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly tile_id: Float32Array;
  readonly variant: Float32Array;
  /** Number of tile entries currently loaded */
  count: number;
}

/**
 * CameraView exposes typed-array views over WASM linear memory for player camera pose.
 * Struct-of-Arrays (SoA) layout for single camera pose struct.
 * Count is fixed at 1.
 */
export interface CameraView {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly yaw: Float32Array;
  readonly pitch: Float32Array;
  /** Always 1 for camera pose */
  count: number;
}

/**
 * WorldStateViews combines all buffer views into a single container object.
 */
export interface WorldStateViews {
  actors: ActorsView;
  lights: LightsView;
  tiles: TilesView;
  camera: CameraView;
}
