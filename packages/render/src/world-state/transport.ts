import type { ActorsView, LightsView, TilesView } from './types.js';

export interface WorldTransportEngine {
  tiles_x_ptr(): number;
  tiles_y_ptr(): number;
  tiles_z_ptr(): number;
  tiles_tile_id_ptr(): number;
  tiles_material_id_ptr(): number;
  tiles_variant_ptr(): number;
  tiles_north_ptr(): number;
  tiles_east_ptr(): number;
  tiles_south_ptr(): number;
  tiles_west_ptr(): number;
  tiles_orientation_ptr(): number;
  tiles_solid_ptr(): number;
  tiles_opening_ptr(): number;
  actors_x_ptr(): number;
  actors_y_ptr(): number;
  actors_z_ptr(): number;
  actors_facing_ptr(): number;
  actors_sprite_id_ptr(): number;
  actors_active_ptr(): number;
  lights_x_ptr(): number;
  lights_y_ptr(): number;
  lights_z_ptr(): number;
  lights_r_ptr(): number;
  lights_g_ptr(): number;
  lights_b_ptr(): number;
  lights_intensity_ptr(): number;
  lights_active_ptr(): number;
  tile_count(): number;
  actor_count(): number;
  light_count(): number;
  instance_count(): number;
  instance_id(index: number): string;
  instance_state(index: number): number;
  instance_render_resident(index: number): boolean;
  instance_collision_active(index: number): boolean;
  instance_simulation_active(index: number): boolean;
}

export interface WorldTransportViews {
  tiles: TilesView & {
    readonly material_id: Float32Array;
    readonly orientation: Float32Array;
    readonly north: Float32Array;
    readonly east: Float32Array;
    readonly south: Float32Array;
    readonly west: Float32Array;
  };
  actors: ActorsView;
  lights: LightsView;
  instances: readonly WorldTransportInstance[];
  overflowed?: () => boolean;
}

export interface WorldTransportInstance {
  readonly id: string;
  readonly state: number;
  readonly render_resident: boolean;
  readonly collision_active: boolean;
  readonly simulation_active: boolean;
}

const f32 = (
  memory: WebAssembly.Memory,
  pointer: number,
  count: number,
  previous?: Float32Array,
): Float32Array => {
  if (
    previous?.buffer === memory.buffer &&
    previous.byteOffset === pointer &&
    previous.length === count
  )
    return previous;
  return new Float32Array(memory.buffer, pointer, count);
};

/** Reads authoritative global transport. Re-wraps every view after WASM memory growth. */
export class WorldTransportReader {
  private cached?: WorldTransportViews;
  constructor(
    private readonly engine: WorldTransportEngine,
    private readonly memory: WebAssembly.Memory,
  ) {}

  read(): WorldTransportViews {
    const old = this.cached;
    const tc = this.engine.tile_count(),
      ac = this.engine.actor_count(),
      lc = this.engine.light_count();
    const tiles = {
      x: f32(this.memory, this.engine.tiles_x_ptr(), tc, old?.tiles.x),
      y: f32(this.memory, this.engine.tiles_y_ptr(), tc, old?.tiles.y),
      z: f32(this.memory, this.engine.tiles_z_ptr(), tc, old?.tiles.z),
      tile_id: f32(this.memory, this.engine.tiles_tile_id_ptr(), tc, old?.tiles.tile_id),
      material_id: f32(
        this.memory,
        this.engine.tiles_material_id_ptr(),
        tc,
        old?.tiles.material_id,
      ),
      variant: f32(this.memory, this.engine.tiles_variant_ptr(), tc, old?.tiles.variant),
      orientation: f32(
        this.memory,
        this.engine.tiles_orientation_ptr(),
        tc,
        old?.tiles.orientation,
      ),
      solid: f32(this.memory, this.engine.tiles_solid_ptr(), tc, old?.tiles.solid),
      north: f32(this.memory, this.engine.tiles_north_ptr(), tc, old?.tiles.north),
      east: f32(this.memory, this.engine.tiles_east_ptr(), tc, old?.tiles.east),
      south: f32(this.memory, this.engine.tiles_south_ptr(), tc, old?.tiles.south),
      west: f32(this.memory, this.engine.tiles_west_ptr(), tc, old?.tiles.west),
      vertical_opening: f32(
        this.memory,
        this.engine.tiles_opening_ptr(),
        tc,
        old?.tiles.vertical_opening,
      ),
      direction: new Float32Array(tc),
      count: tc,
    };
    const actors = {
      x: f32(this.memory, this.engine.actors_x_ptr(), ac, old?.actors.x),
      y: f32(this.memory, this.engine.actors_y_ptr(), ac, old?.actors.y),
      z: f32(this.memory, this.engine.actors_z_ptr(), ac, old?.actors.z),
      facing: f32(this.memory, this.engine.actors_facing_ptr(), ac, old?.actors.facing),
      sprite_id: f32(this.memory, this.engine.actors_sprite_id_ptr(), ac, old?.actors.sprite_id),
      active: f32(this.memory, this.engine.actors_active_ptr(), ac, old?.actors.active),
      count: ac,
    };
    const lights = {
      x: f32(this.memory, this.engine.lights_x_ptr(), lc, old?.lights.x),
      y: f32(this.memory, this.engine.lights_y_ptr(), lc, old?.lights.y),
      z: f32(this.memory, this.engine.lights_z_ptr(), lc, old?.lights.z),
      r: f32(this.memory, this.engine.lights_r_ptr(), lc, old?.lights.r),
      g: f32(this.memory, this.engine.lights_g_ptr(), lc, old?.lights.g),
      b: f32(this.memory, this.engine.lights_b_ptr(), lc, old?.lights.b),
      intensity: f32(this.memory, this.engine.lights_intensity_ptr(), lc, old?.lights.intensity),
      active: f32(this.memory, this.engine.lights_active_ptr(), lc, old?.lights.active),
      count: lc,
    };
    const instances = Array.from({ length: this.engine.instance_count() }, (_, i) => ({
      id: this.engine.instance_id(i),
      state: this.engine.instance_state(i),
      render_resident: this.engine.instance_render_resident(i),
      collision_active: this.engine.instance_collision_active(i),
      simulation_active: this.engine.instance_simulation_active(i),
    }));
    this.cached = { tiles, actors, lights, instances };
    return this.cached;
  }
}
