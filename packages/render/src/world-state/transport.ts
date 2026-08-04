import type { ActorsView, LightsView, TilesView } from './types.js';
import type { GlobalSceneOverflowDiagnostic, GlobalSceneView, GlobalScenePolygonsView } from './scene.js';

export interface WorldTransportEngine {
  tiles_x_ptr(): number;
  tiles_y_ptr(): number;
  tiles_z_ptr(): number;
  tiles_tile_id_ptr(): number;
  tiles_material_id_ptr(): number;
  tiles_uv_mode_ptr?(): number;
  tiles_uv_u_ptr?(): number;
  tiles_uv_v_ptr?(): number;
  tiles_render_flags_ptr?(): number;
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
  actors_material_id_ptr?(): number;
  actors_uv_mode_ptr?(): number;
  actors_uv_u_ptr?(): number;
  actors_uv_v_ptr?(): number;
  actors_render_flags_ptr?(): number;
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
  instance_restore_status(index: number): number;
  instance_restore_attempts(index: number): number;
  instance_state_version(index: number): string;
  instance_restore_failure_reason(index: number): string;
  instance_handoff_status(index: number): number;
  begin_restore?(id: string): number;
  complete_restore?(id: string, attempt: number, success: boolean, version: string, failure_reason?: string): boolean;
  ambient_light?: () => number;
  overflowed?: () => boolean;
  overflow_diagnostics_json?: () => string;
  skipped_instances_json?: () => string;
  definition_surface?(definition_id: string, min_x: number, min_y: number, min_z: number, max_x: number, max_y: number, max_z: number, h_x: number, h_y: number, h_c: number, nx: number, ny: number, nz: number, walkable: boolean): boolean;
  polygon_count?(): number; polygon_vertex_count?(): number; polygon_index_count?(): number;
  polygons_instance_ptr?(): number; polygons_source_ptr?(): number; polygons_vertex_start_ptr?(): number; polygons_vertex_count_ptr?(): number; polygons_index_start_ptr?(): number; polygons_index_count_ptr?(): number; polygons_material_id_ptr?(): number; polygons_uv_mode_ptr?(): number; polygons_render_flags_ptr?(): number; polygons_placement_ptr?(): number; polygon_vertices_ptr?(): number; polygon_indices_ptr?(): number;
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
  /** Combined resident content, already transformed into global coordinates. */
  readonly scene: GlobalSceneView;
  readonly ambient_light: number;
  overflowed?: () => boolean;
}

export interface WorldTransportInstance {
  readonly id: string;
  readonly state: number;
  readonly render_resident: boolean;
  readonly collision_active: boolean;
  readonly simulation_active: boolean;
  readonly restore_status: number;
  readonly restore_attempts: number;
  readonly state_version: string;
  readonly restore_failure_reason: string;
  readonly handoff_status: number;
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
      uv_mode: this.engine.tiles_uv_mode_ptr ? f32(this.memory, this.engine.tiles_uv_mode_ptr(), tc, old?.tiles.uv_mode) : new Float32Array(tc),
      uv_u: this.engine.tiles_uv_u_ptr ? f32(this.memory, this.engine.tiles_uv_u_ptr(), tc, old?.tiles.uv_u) : new Float32Array(tc),
      uv_v: this.engine.tiles_uv_v_ptr ? f32(this.memory, this.engine.tiles_uv_v_ptr(), tc, old?.tiles.uv_v) : new Float32Array(tc),
      render_flags: this.engine.tiles_render_flags_ptr ? f32(this.memory, this.engine.tiles_render_flags_ptr(), tc, old?.tiles.render_flags) : new Float32Array(tc).fill(5),
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
      material_id: this.engine.actors_material_id_ptr ? f32(this.memory, this.engine.actors_material_id_ptr(), ac, old?.actors.material_id) : new Float32Array(ac),
      uv_mode: this.engine.actors_uv_mode_ptr ? f32(this.memory, this.engine.actors_uv_mode_ptr(), ac, old?.actors.uv_mode) : new Float32Array(ac).fill(2),
      uv_u: this.engine.actors_uv_u_ptr ? f32(this.memory, this.engine.actors_uv_u_ptr(), ac, old?.actors.uv_u) : new Float32Array(ac),
      uv_v: this.engine.actors_uv_v_ptr ? f32(this.memory, this.engine.actors_uv_v_ptr(), ac, old?.actors.uv_v) : new Float32Array(ac),
      render_flags: this.engine.actors_render_flags_ptr ? f32(this.memory, this.engine.actors_render_flags_ptr(), ac, old?.actors.render_flags) : new Float32Array(ac).fill(6),
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
    let polygons: GlobalScenePolygonsView | undefined;
    if (this.engine.polygon_count && this.engine.polygons_instance_ptr && this.engine.polygon_vertices_ptr) {
      const pc = this.engine.polygon_count(), vc = this.engine.polygon_vertex_count?.() ?? 0, ic = this.engine.polygon_index_count?.() ?? 0;
      const u32 = (fn: (() => number) | undefined) => new Uint32Array(this.memory.buffer, fn ? fn() : 0, pc);
      const f = (fn: (() => number) | undefined, n: number) => new Float32Array(this.memory.buffer, fn ? fn() : 0, n);
      polygons = { instance_id: u32(this.engine.polygons_instance_ptr), source_id: u32(this.engine.polygons_source_ptr), vertex_start: u32(this.engine.polygons_vertex_start_ptr), vertex_count: u32(this.engine.polygons_vertex_count_ptr), index_start: u32(this.engine.polygons_index_start_ptr), index_count: u32(this.engine.polygons_index_count_ptr), material_id: u32(this.engine.polygons_material_id_ptr), uv_mode: f(this.engine.polygons_uv_mode_ptr, pc), render_flags: f(this.engine.polygons_render_flags_ptr, pc), placement_id: u32(this.engine.polygons_placement_ptr), vertices: f(this.engine.polygon_vertices_ptr, vc * 8), indices: new Uint32Array(this.memory.buffer, this.engine.polygon_indices_ptr ? this.engine.polygon_indices_ptr() : 0, ic), count: pc, vertex_count_total: vc, index_count_total: ic };
    }
    const instances = Array.from({ length: this.engine.instance_count() }, (_, i) => ({
      id: this.engine.instance_id(i),
      state: this.engine.instance_state(i),
      render_resident: this.engine.instance_render_resident(i),
      collision_active: this.engine.instance_collision_active(i),
      simulation_active: this.engine.instance_simulation_active(i),
      restore_status: this.engine.instance_restore_status(i),
      restore_attempts: this.engine.instance_restore_attempts(i),
      state_version: this.engine.instance_state_version(i),
      restore_failure_reason: this.engine.instance_restore_failure_reason(i),
      handoff_status: this.engine.instance_handoff_status(i),
    }));
    const scene: GlobalSceneView = {
      polygons,
      tiles,
      actors,
      lights,
      instanceIds: instances.filter((instance) => instance.render_resident).map((instance) => instance.id),
      counts: { tiles: tc, actors: ac, lights: lc, instances: instances.filter((instance) => instance.render_resident).length },
      overflow: {
        overflowed: this.engine.overflowed?.() ?? false,
        diagnostics: this.parseDiagnostics(),
        skippedInstances: this.parseSkippedInstances(),
      },
    };
    this.cached = {
      tiles,
      actors,
      lights,
      instances,
      scene,
      ambient_light: this.engine.ambient_light?.() ?? 0,
      overflowed: this.engine.overflowed?.bind(this.engine),
    };
    return this.cached;
  }

  private parseDiagnostics(): GlobalSceneOverflowDiagnostic[] {
    const raw = this.engine.overflow_diagnostics_json?.();
    if (!raw) return [];
    try {
      return JSON.parse(raw) as GlobalSceneOverflowDiagnostic[];
    } catch {
      return [];
    }
  }

  private parseSkippedInstances(): string[] {
    const raw = this.engine.skipped_instances_json?.();
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }
}
