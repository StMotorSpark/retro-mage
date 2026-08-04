import type { ActorsView, LightsView, TilesView } from './types.js';

export interface GlobalSceneTile {
  x: number;
  y: number;
  z: number;
  tile_id?: number;
  material_id?: number;
  uv_mode?: number;
  uv_u?: number;
  uv_v?: number;
  render_flags?: number;
  variant?: number;
  orientation?: number;
  solid?: number;
  vertical_opening?: number;
  direction?: number;
  stairs?: { rise: number; run: number; direction: number };
}

export interface GlobalSceneActor {
  x: number;
  y: number;
  z: number;
  facing?: number;
  sprite_id?: number;
  active?: number;
}

export interface GlobalSceneLight {
  x: number;
  y: number;
  z: number;
  r?: number;
  g?: number;
  b?: number;
  intensity?: number;
  active?: number;
}

/** Resident instance content. Coordinates MUST already be global. */
export interface GlobalSceneInstance {
  id: string;
  tiles?: readonly GlobalSceneTile[];
  actors?: readonly GlobalSceneActor[];
  lights?: readonly GlobalSceneLight[];
  /** Optional future polygon submission; tile/actor/light paths remain unchanged. */
  polygons?: readonly GlobalScenePolygon[];
}

export interface GlobalScenePolygon {
  vertices: readonly { x: number; y: number; z: number }[];
  material_id?: number;
  solid?: number;
}

export interface GlobalSceneCapacity {
  tiles: number;
  actors: number;
  lights: number;
  instances: number;
}

export interface GlobalSceneOverflowDiagnostic {
  frame: number;
  category: keyof GlobalSceneCapacity;
  requested: number;
  capacity: number;
  instance_id: string;
}

export interface GlobalSceneOverflowReport {
  overflowed: boolean;
  diagnostics: readonly GlobalSceneOverflowDiagnostic[];
  skippedInstances: readonly string[];
}

export type GlobalSceneCounts = GlobalSceneCapacity;

export class SceneCapacityError extends Error {
  readonly kind: keyof GlobalSceneCapacity;
  readonly requested: number;
  readonly capacity: number;

  constructor(kind: keyof GlobalSceneCapacity, requested: number, capacity: number) {
    super(`Global scene ${kind} capacity exceeded: ${requested} > ${capacity}`);
    this.name = 'SceneCapacityError';
    this.kind = kind;
    this.requested = requested;
    this.capacity = capacity;
  }
}

export interface GlobalSceneView {
  readonly tiles: TilesView;
  readonly actors: ActorsView;
  readonly lights: LightsView;
  readonly instanceIds: readonly string[];
  readonly counts: GlobalSceneCounts;
  readonly overflow: GlobalSceneOverflowReport;
}

const DEFAULT_CAPACITY: GlobalSceneCapacity = { tiles: 4096, actors: 256, lights: 128, instances: 64 };

/**
 * Collects all render-resident instances into one global scene submission.
 * Submission is append-only for each frame and atomic per instance: overflow
 * never leaves a partially submitted instance behind.
 */
export class GlobalSceneSubmission {
  readonly capacity: GlobalSceneCapacity;
  private readonly tileData: TilesView;
  private readonly actorData: ActorsView;
  private readonly lightData: LightsView;
  private ids: string[] = [];
  private tileCount = 0;
  private actorCount = 0;
  private lightCount = 0;
  private overflowed = false;
  private diagnostics: GlobalSceneOverflowDiagnostic[] = [];
  private skippedInstances: string[] = [];
  private frame = 0;

  constructor(capacity: Partial<GlobalSceneCapacity> = {}) {
    this.capacity = {
      tiles: capacity.tiles ?? DEFAULT_CAPACITY.tiles,
      actors: capacity.actors ?? DEFAULT_CAPACITY.actors,
      lights: capacity.lights ?? DEFAULT_CAPACITY.lights,
      instances: capacity.instances ?? DEFAULT_CAPACITY.instances,
    };
    for (const [kind, value] of Object.entries(this.capacity)) {
      if (!Number.isInteger(value) || value < 0) throw new RangeError(`Invalid scene ${kind} capacity: ${value}`);
    }
    this.tileData = {
      x: new Float32Array(this.capacity.tiles), y: new Float32Array(this.capacity.tiles), z: new Float32Array(this.capacity.tiles),
      tile_id: new Float32Array(this.capacity.tiles), material_id: new Float32Array(this.capacity.tiles), uv_mode: new Float32Array(this.capacity.tiles), uv_u: new Float32Array(this.capacity.tiles), uv_v: new Float32Array(this.capacity.tiles), render_flags: new Float32Array(this.capacity.tiles), variant: new Float32Array(this.capacity.tiles), solid: new Float32Array(this.capacity.tiles),
      vertical_opening: new Float32Array(this.capacity.tiles), direction: new Float32Array(this.capacity.tiles), count: 0,
    };
    this.actorData = {
      x: new Float32Array(this.capacity.actors), y: new Float32Array(this.capacity.actors), z: new Float32Array(this.capacity.actors),
      facing: new Float32Array(this.capacity.actors), sprite_id: new Float32Array(this.capacity.actors), active: new Float32Array(this.capacity.actors), count: 0,
    };
    this.lightData = {
      x: new Float32Array(this.capacity.lights), y: new Float32Array(this.capacity.lights), z: new Float32Array(this.capacity.lights),
      r: new Float32Array(this.capacity.lights), g: new Float32Array(this.capacity.lights), b: new Float32Array(this.capacity.lights),
      intensity: new Float32Array(this.capacity.lights), active: new Float32Array(this.capacity.lights), count: 0,
    };
  }

  get counts(): GlobalSceneCounts {
    return { tiles: this.tileCount, actors: this.actorCount, lights: this.lightCount, instances: this.ids.length };
  }

  reset(): void {
    this.frame++;
    this.tileCount = 0; this.actorCount = 0; this.lightCount = 0; this.ids = [];
    this.tileData.count = 0; this.actorData.count = 0; this.lightData.count = 0;
    this.overflowed = false;
    this.diagnostics = [];
    this.skippedInstances = [];
  }

  submit(instance: GlobalSceneInstance): void {
    if (!instance.id.trim()) throw new Error('Global scene instance id must not be empty');
    const tiles = instance.tiles ?? [], actors = instance.actors ?? [], lights = instance.lights ?? [];
    const next = { tiles: this.tileCount + tiles.length, actors: this.actorCount + actors.length, lights: this.lightCount + lights.length, instances: this.ids.length + 1 };
    for (const kind of ['instances', 'tiles', 'actors', 'lights'] as const) {
      if (next[kind] > this.capacity[kind]) {
        this.overflowed = true;
        this.diagnostics.push({ frame: this.frame, category: kind, requested: next[kind], capacity: this.capacity[kind], instance_id: instance.id });
        this.skippedInstances.push(instance.id);
        return;
      }
    }
    let i = this.tileCount;
    for (const tile of tiles) {
      this.tileData.x[i] = tile.x; this.tileData.y[i] = tile.y; this.tileData.z[i] = tile.z;
      this.tileData.tile_id[i] = tile.tile_id ?? 0; this.tileData.material_id![i] = tile.material_id ?? 0; this.tileData.uv_mode![i] = tile.uv_mode ?? 0; this.tileData.uv_u![i] = tile.uv_u ?? 0; this.tileData.uv_v![i] = tile.uv_v ?? 0; this.tileData.render_flags![i] = tile.render_flags ?? 5; this.tileData.variant[i] = tile.variant ?? 0; this.tileData.solid[i] = tile.solid ?? 0;
      this.tileData.vertical_opening[i] = tile.vertical_opening ?? 0; this.tileData.direction[i] = tile.direction ?? 0; i++;
    }
    i = this.actorCount;
    for (const actor of actors) {
      this.actorData.x[i] = actor.x; this.actorData.y[i] = actor.y; this.actorData.z[i] = actor.z;
      this.actorData.facing[i] = actor.facing ?? 0; this.actorData.sprite_id[i] = actor.sprite_id ?? 0; this.actorData.active[i] = actor.active ?? 1; i++;
    }
    i = this.lightCount;
    for (const light of lights) {
      this.lightData.x[i] = light.x; this.lightData.y[i] = light.y; this.lightData.z[i] = light.z;
      this.lightData.r[i] = light.r ?? 1; this.lightData.g[i] = light.g ?? 1; this.lightData.b[i] = light.b ?? 1;
      this.lightData.intensity[i] = light.intensity ?? 1; this.lightData.active[i] = light.active ?? 1; i++;
    }
    this.tileCount = next.tiles; this.actorCount = next.actors; this.lightCount = next.lights;
    this.tileData.count = this.tileCount; this.actorData.count = this.actorCount; this.lightData.count = this.lightCount;
    this.ids.push(instance.id);
  }

  view(): GlobalSceneView {
    return {
      tiles: this.tileData, actors: this.actorData, lights: this.lightData,
      instanceIds: this.ids, counts: this.counts,
      overflow: {
        overflowed: this.overflowed, diagnostics: this.diagnostics, skippedInstances: this.skippedInstances
      }
    };
  }
}

export function createGlobalSceneSubmission(capacity?: Partial<GlobalSceneCapacity>): GlobalSceneSubmission {
  return new GlobalSceneSubmission(capacity);
}

