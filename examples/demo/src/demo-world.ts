import type { WorldTransport } from 'engine-core';

export type DemoLevelId = 'dungeon' | 'outdoor';
export type AnchorDirection = 'in' | 'out' | 'both';

export interface DemoTile {
  x: number; y: number; z: number;
  tileId: number; materialId: number; variant: number; orientation: number;
  solid: boolean;
  openings?: { north?: boolean; east?: boolean; south?: boolean; west?: boolean; vertical?: boolean };
}

export interface DemoActor {
  x: number; y: number; z: number;
  actorId: string; spriteId: number; facing: number; active: boolean; spawn: boolean;
}

export interface DemoLight {
  x: number; y: number; z: number;
  color: [number, number, number]; intensity: number; active: boolean;
}

export interface DemoAnchor {
  id: string;
  x: number; y: number; z: number; yaw: number;
  volume: { min: [number, number, number]; max: [number, number, number] };
  direction: AnchorDirection;
}

export interface DemoSurface {
  bounds: { min: [number, number, number]; max: [number, number, number] };
  heightFunction: [number, number, number];
  normal: [number, number, number];
  walkable: boolean;
}

export interface DemoLevelDefinition {
  id: DemoLevelId;
  version: '1';
  bounds: { min: [number, number, number]; max: [number, number, number] };
  tiles: readonly DemoTile[];
  actors: readonly DemoActor[];
  lights: readonly DemoLight[];
  anchors: readonly DemoAnchor[];
  surfaces?: readonly DemoSurface[];
  providerMetadata: { kind: string };
}

export interface DemoLevelInstance {
  id: `${DemoLevelId}-instance`;
  definitionId: DemoLevelId;
  position: [number, number, number];
}

export interface DemoWorldManifest {
  definitions: readonly DemoLevelDefinition[];
  instances: readonly DemoLevelInstance[];
  link: {
    id: 'dungeon-outdoor';
    source: { instanceId: 'dungeon-instance'; anchorId: 'outdoor-gate' };
    target: { instanceId: 'outdoor-instance'; anchorId: 'dungeon-gate' };
    direction: 'bidirectional';
    preload: 'before-visible';
  };
}

const floor = (x: number, z: number, tileId: number, materialId: number): DemoTile => ({ x, y: 0, z, tileId, materialId, variant: 0, orientation: 0, solid: false });
const wall = (x: number, z: number, tileId = 1, materialId = 1): DemoTile => ({ x, y: 0, z, tileId, materialId, variant: 0, orientation: 0, solid: true });
const anchor = (id: string, x: number, z: number, direction: AnchorDirection, yaw: number): DemoAnchor => ({ id, x, y: 0, z, yaw, volume: { min: [-0.5, 0, -0.5], max: [0.5, 2, 0.5] }, direction });

// Billboard centers and invisible collision footprints are authored independently.
// A slight Z offset keeps any future visible trunk geometry out of billboard pixels.
const forestTrees = [[5, -7], [8, -5], [4, -2], [7, 0], [5, 12], [9, 15], [4, 16], [8, 14], [16, -7], [20, -5], [15, -2], [19, 0], [16, 12], [21, 15]] as const;
const treeBlockers = forestTrees.map(([x, z]) => [x, z + 0.25] as const);
const treeCollisionTileId = 17;

function dungeonTiles(): DemoTile[] {
  const tiles: DemoTile[] = [];
  // Route: compact start room (-4..0) -> open doorway -> vaulted hall -> side room.
  for (let x = -4; x <= 10; x += 1) for (let z = 2; z <= 7; z += 1) tiles.push(floor(x, z, 2, 2));
  // Temporary flat ceiling uses supplied placeholder asset; y=2 keeps player route open.
  for (let x = -4; x <= 10; x += 1) for (let z = 2; z <= 7; z += 1) tiles.push({ x, y: 6, z, tileId: 3, materialId: 4, variant: 0, orientation: 0, solid: true });
  for (let x = -5; x <= 10; x += 1) { tiles.push(wall(x, 1)); tiles.push(wall(x, 8)); }
  for (let z = 2; z <= 7; z += 1) { tiles.push(wall(-5, z)); if (z !== 4) tiles.push(wall(10, z)); }

  // Walkable Ramp (from z=6 to z=4 at x=0,1). Slope is 0.5.
  const elevatedFloor = (x: number, y: number, z: number, tileId: number, materialId: number, orientation = 0): DemoTile => ({ x, y, z, tileId, materialId, variant: 0, orientation, solid: false });
  const ceiling = (x: number, y: number, z: number, tileId: number, materialId: number): DemoTile => ({ x, y, z, tileId, materialId, variant: 0, orientation: 0, solid: true });

  // Upper balcony floor, same dungeon material as lower room. Vertical openings preserve look-down visibility.
  for (let x = 0; x <= 2; x++) for (let z = 2; z <= 4; z++) tiles.push({ ...elevatedFloor(x, 1, z, 2, 2), openings: { vertical: true } });
  // Authored guard geometry: side rails and back rail leave ramp approach open.
  // Right boundary plus back rail; left edge remains open for the authored ledge/fall proof.
  for (let z = 2; z <= 3; z++) tiles.push(ceiling(3, 1, z, 1, 1));
  for (let x = 0; x <= 2; x++) tiles.push(ceiling(x, 1, 2, 1, 1));

  // Walkable ramp visuals
  tiles.push(elevatedFloor(0, 0.25, 5.5, 2, 2));
  tiles.push(elevatedFloor(0, 0.5, 5, 2, 2));
  tiles.push(elevatedFloor(0, 0.75, 4.5, 2, 2));
  tiles.push(elevatedFloor(1, 0.25, 5.5, 2, 2));
  tiles.push(elevatedFloor(1, 0.5, 5, 2, 2));
  tiles.push(elevatedFloor(1, 0.75, 4.5, 2, 2));
  tiles.push(elevatedFloor(2, 0.25, 5.5, 2, 2));
  tiles.push(elevatedFloor(2, 0.5, 5, 2, 2));
  tiles.push(elevatedFloor(2, 0.75, 4.5, 2, 2));

  // Too-Steep Ramp (from z=6 to z=5 at x=4). Slope is 1.0.
  // Visuals: orientation=2 at z=5
  tiles.push(elevatedFloor(4, 0, 5, 2, 2, 2));
  tiles.push(elevatedFloor(5, 0, 5, 2, 2, 2));

  // Platform at top of too-steep ramp
  tiles.push(elevatedFloor(4, 1, 4, 2, 2));
  tiles.push(elevatedFloor(5, 1, 4, 2, 2));

  // Low Ceiling (at x=-2, z=3, y=1.5)
  tiles.push(ceiling(-2, 1.5, 3, 1, 1));
  tiles.push(ceiling(-3, 1.5, 3, 1, 1));

  // Taller hallway ceiling and side-room ceiling (visual scale cue).
  for (let x = 1; x <= 6; x++) for (let z = 2; z <= 7; z++) tiles.push({ x, y: 6, z, tileId: 3, materialId: 4, variant: 0, orientation: 0, solid: true });
  for (let x = 7; x <= 9; x++) for (let z = 5; z <= 7; z++) tiles.push({ x, y: 2, z, tileId: 3, materialId: 4, variant: 0, orientation: 0, solid: true });
  return tiles;
}

function outdoorTiles(): DemoTile[] {
  const tiles: DemoTile[] = [];
  // Grass corridor; road begins in clearing beyond dense tree line.
  for (let x = 0; x <= 24; x += 1) for (let z = -8; z <= 16; z += 1) tiles.push(floor(x, z, 3, 3));
  // Road continues through clearing toward stream and castle.
  for (let z = -1; z <= 16; z += 1) tiles.push(floor(12, z, 4, 5));
  for (let z = 1; z <= 16; z += 2) { tiles.push(floor(2, z, 3, 3)); tiles.push(floor(22, z + 1, 3, 3)); }
  // Opaque sloped stream band; center cobblestone remains traversable.
  for (let x = 10; x <= 14; x += 1) tiles.push({ ...floor(x, 7, 7, 7), orientation: 1 });
  tiles.push(floor(12, 7, 8, 6));
  // Side barriers stop stream entry while leaving crossing open.
  tiles.push(wall(10, 7, 9, 0)); tiles.push(wall(14, 7, 9, 0));
  // Textured castle landmark; center entry remains open.
  for (let x = 8; x <= 16; x += 1) { if (x < 11 || x > 13) { tiles.push(wall(x, 13, 10, 8)); tiles.push(wall(x, 15, 10, 8)); } }
  for (let z = 13; z <= 15; z += 1) { tiles.push(wall(8, z, 10, 8)); tiles.push(wall(16, z, 10, 8)); }
  // Castle entry hall: open south doorway, three elevations, opaque columns, shells, and throne approach.
  for (let x = 9; x <= 15; x++) for (let z = 16; z <= 22; z++) tiles.push(floor(x, z, 11, 9));
  // Flanking room shells and throne-room approach walls; center route stays open.
  for (let z = 17; z <= 21; z++) { tiles.push(wall(8, z, 12, 9)); tiles.push(wall(16, z, 12, 9)); }
  for (let x = 9; x <= 15; x++) { if (x < 11 || x > 13) { tiles.push(wall(x, 22, 12, 9)); tiles.push(wall(x, 16, 12, 9)); } }
  // Grand stair visual ramp reaches balcony ring at y=1; matching support surface below.
  for (let x = 11; x <= 13; x++) for (let z = 16; z <= 19; z++) tiles.push({ ...floor(x, z, 13, 9), y: (z - 16) * 0.25 });
  for (let x = 9; x <= 15; x++) for (let z = 20; z <= 22; z++) tiles.push({ ...floor(x, z, 14, 9), y: 1, openings: { vertical: true } });
  // Upper balcony guard retains its authored lateral collision boundary at balcony height.
  tiles.push({ ...wall(16, 20, treeCollisionTileId, 0), y: 1 });
  // Opaque columns, never translucent billboard substitutes.
  for (const [x, z] of [[9, 17], [15, 17], [9, 21], [15, 21]] as const) tiles.push(wall(x, z, 15, 9));
  // Upper throne approach, with second stair cue and matching support surface.
  for (let x = 11; x <= 13; x++) for (let z = 22; z <= 25; z++) tiles.push({ ...floor(x, z, 13, 9), y: 1 + (z - 22) * 0.25 });
  // Collision-only tree footprints leave billboards free of opaque trunk pillars.
  for (const [x, z] of treeBlockers) tiles.push(wall(x, z, treeCollisionTileId, 0));
  // Mountain rock encloses authored outdoor extent. These solid, textured slopes use
  // existing definition-tile transport, so render and collision consume same global
  // outdoor instance transform. Route coordinates remain intentionally untouched.
  for (let z = -9; z <= 26; z++) {
    // Dungeon gate aligns at local z=0; opening preserves spatial transition.
    if (z < -1 || z > 1) tiles.push(wall(-1, z, 16, 10));
    tiles.push(wall(25, z, 16, 10));
  }
  for (let x = 0; x <= 24; x++) {
    tiles.push(wall(x, -9, 16, 10));
    tiles.push(wall(x, 26, 16, 10));
  }
  return tiles;
}

const dungeon: DemoLevelDefinition = {
  id: 'dungeon', version: '1', bounds: { min: [-6, 0, 0], max: [11, 3, 9] },
  tiles: dungeonTiles(),
  actors: [
    { x: -3.5, y: 1, z: 3, actorId: 'torch-start', spriteId: 2, facing: 0, active: true, spawn: true },
    { x: 2, y: 1, z: 6.5, actorId: 'torch-hall', spriteId: 2, facing: 0, active: true, spawn: true },
    { x: 8, y: 1, z: 6, actorId: 'dungeon-deco', spriteId: 3, facing: 0, active: true, spawn: true },
  ],
  lights: [
    { x: -2, y: 1.5, z: 4, color: [1, 0.7, 0.3], intensity: 8, active: true },
    { x: 2, y: 1.5, z: 4, color: [1, 0.7, 0.3], intensity: 8, active: true },
    { x: 7, y: 1.5, z: 4, color: [1, 0.7, 0.3], intensity: 8, active: true },
    { x: 9, y: 1.5, z: 6, color: [1, 0.7, 0.3], intensity: 8, active: true },
  ],
  anchors: [anchor('outdoor-gate', 10, 4, 'both', -Math.PI / 2)],
  surfaces: [
    {
      bounds: { min: [-6, 0, 0], max: [11, 0, 9] },
      heightFunction: [0, 0, 0],
      normal: [0, 1, 0],
      walkable: true
    },
    // Walkable ramp (slope 0.5)
    {
      bounds: { min: [-0.5, 0, 4.5], max: [2.5, 2, 6.5] },
      heightFunction: [0, -0.5, 3.85],
      normal: [0, 0.8944, 0.4472],
      walkable: true
    },
    // Top platform for walkable ramp
    {
      bounds: { min: [-0.5, 1.6, 1.5], max: [2.5, 1.6, 4.5] },
      heightFunction: [0, 0, 1.6],
      normal: [0, 1, 0],
      walkable: true
    },
    // Too-steep ramp (slope 1.0)
    {
      bounds: { min: [3.5, 0, 4.5], max: [5.5, 1, 5.5] },
      heightFunction: [0, -1.0, 6.1],
      normal: [0, 0.7071, 0.7071],
      walkable: true
    },
    // Top platform for too-steep ramp
    {
      bounds: { min: [3.5, 1, 3.5], max: [5.5, 1, 4.5] },
      heightFunction: [0, 0, 1],
      normal: [0, 1, 0],
      walkable: true
    }
  ],
  providerMetadata: { kind: 'authored-dungeon' },
};

const outdoor: DemoLevelDefinition = {
  id: 'outdoor', version: '1', bounds: { min: [-1, 0, -9], max: [25, 4, 26] },
  tiles: outdoorTiles(),
  actors: [
    ...([[9, 17], [15, 17], [9, 21], [15, 21]] as const).map(([x, z], index) => ({ x, y: 1, z, actorId: `castle-statue-${index}`, spriteId: 5, facing: 0, active: true, spawn: true })),
    ...forestTrees.map(([x, z], index) => ({ x, y: 0, z, actorId: `tree-${index}`, spriteId: 1, facing: 0, active: true, spawn: true })),
    { x: 10, y: 7, z: 1, actorId: 'cloud-clearing-0', spriteId: 4, facing: 0, active: true, spawn: true },
    { x: 18, y: 6, z: 8, actorId: 'cloud-clearing-1', spriteId: 4, facing: 0, active: true, spawn: true },
  ],
  // Cool ambient separates outdoor shading from torch-lit dungeon; castle broad-falloff light.
  lights: [{ x: 12, y: 3, z: 4, color: [0.8, 0.9, 1], intensity: 1, active: true }, { x: 12, y: 3, z: 18, color: [0.65, 0.8, 1], intensity: 7, active: true }],
  anchors: [anchor('dungeon-gate', 0, 0, 'both', -Math.PI / 2)],
  surfaces: [
    {
      bounds: { min: [0, 0, -9], max: [25, 0, 16] },
      heightFunction: [0, 0, 0],
      normal: [0, 1, 0],
      walkable: true
    },
    // Castle ground, grand stair, balcony, and throne stair form one continuous route.
    { bounds: { min: [8, 0, 16], max: [16, 0, 17] }, heightFunction: [0, 0, 0], normal: [0, 1, 0], walkable: true },
    { bounds: { min: [11, 0, 16], max: [13, 1, 20] }, heightFunction: [0, 0.25, -4], normal: [0, 0.9701, -0.2425], walkable: true },
    { bounds: { min: [8, 1, 20], max: [16, 1, 22] }, heightFunction: [0, 0, 1], normal: [0, 1, 0], walkable: true },
    { bounds: { min: [11, 1, 22], max: [13, 1.75, 25] }, heightFunction: [0, 0.25, -4.5], normal: [0, 0.9701, -0.2425], walkable: true },
  ],
  providerMetadata: { kind: 'authored-outdoor-castle' },
};

export const demoDefinitions: readonly DemoLevelDefinition[] = [dungeon, outdoor];
export const demoManifest: DemoWorldManifest = {
  definitions: demoDefinitions,
  instances: [
    { id: 'dungeon-instance', definitionId: 'dungeon', position: [0, 0, 0] },
    { id: 'outdoor-instance', definitionId: 'outdoor', position: [10, 0, 4] },
  ],
  link: { id: 'dungeon-outdoor', source: { instanceId: 'dungeon-instance', anchorId: 'outdoor-gate' }, target: { instanceId: 'outdoor-instance', anchorId: 'dungeon-gate' }, direction: 'bidirectional', preload: 'before-visible' },
};

function valid(definition: DemoLevelDefinition): boolean {
  return definition.version === '1' && definition.bounds.min.every(Number.isFinite) && definition.bounds.max.every(Number.isFinite)
    && definition.bounds.min.every((value, index) => value <= definition.bounds.max[index]! )
    && definition.anchors.length > 0 && definition.tiles.every((tile) => Number.isFinite(tile.x) && Number.isFinite(tile.y) && Number.isFinite(tile.z));
}

export class DemoLevelProvider {
  resolve(definitionId: DemoLevelId): DemoLevelDefinition {
    const definition = demoManifest.definitions.find((candidate) => candidate.id === definitionId);
    if (!definition) throw new Error(`Unknown demo definition: ${definitionId}`);
    if (!valid(definition)) throw new Error(`Invalid demo definition: ${definitionId}`);
    return definition;
  }

  resolveAsync(definitionId: DemoLevelId, options: { delayMs: number; fail: boolean; signal?: AbortSignal }): Promise<DemoLevelDefinition> {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (options.fail) reject(new Error(`Provider failed: ${definitionId}`));
        else resolve(this.resolve(definitionId));
      }, options.delayMs);
      options.signal?.addEventListener('abort', () => {
        window.clearTimeout(timer);
        reject(new DOMException('Provider request cancelled', 'AbortError'));
      }, { once: true });
    });
  }
}

export function createDemoLevelProvider(): DemoLevelProvider { return new DemoLevelProvider(); }

/** Submit authored definitions + topology; instance content loads separately. */
export function registerDemoWorld(transport: WorldTransport): void {
  for (const resolved of demoManifest.definitions) {
    if (!transport.begin_definition(resolved.id, resolved.version, ...resolved.bounds.min, ...resolved.bounds.max)) throw new Error(`Failed to begin ${resolved.id}`);
    for (const [tileIndex, tile] of resolved.tiles.entries()) {
      if (!transport.definition_tile(resolved.id, tile.x, tile.y, tile.z, tile.tileId, tile.materialId, tile.variant, tile.orientation, tile.solid, tile.openings?.north ?? false, tile.openings?.east ?? false, tile.openings?.south ?? false, tile.openings?.west ?? false, tile.openings?.vertical ?? false)) throw new Error(`Failed tile in ${resolved.id}`);
      // Asset map requires explicit polygon-style UV semantics for authored mountain rock.
      if (tile.tileId === 16 && !transport.definition_tile_surface?.(resolved.id, tileIndex, 1, tile.x, tile.z, 5)) throw new Error(`Failed mountain surface in ${resolved.id}`);
    }
    for (const [actorIndex, actor] of resolved.actors.entries()) {
      if (!transport.definition_actor(resolved.id, actor.x, actor.y, actor.z, actor.actorId, actor.spriteId, actor.facing, actor.active, actor.spawn)) throw new Error(`Failed actor in ${resolved.id}`);
      if (actor.spriteId === 5 && !transport.definition_actor_surface?.(resolved.id, actorIndex, 9, 2, 0, 0, 6)) throw new Error(`Failed statue material in ${resolved.id}`);
    }
    for (const light of resolved.lights) if (!transport.definition_light(resolved.id, light.x, light.y, light.z, ...light.color, light.intensity, light.active)) throw new Error(`Failed light in ${resolved.id}`);
    for (const a of resolved.anchors) if (!transport.definition_anchor_oriented(resolved.id, a.id, a.x, a.y, a.z, a.yaw, ...a.volume.min, ...a.volume.max, a.direction === 'in' ? 0 : a.direction === 'out' ? 1 : 2)) throw new Error(`Failed anchor in ${resolved.id}`);
    if (resolved.surfaces) {
      for (const s of resolved.surfaces) if (!transport.definition_surface?.(resolved.id, ...s.bounds.min, ...s.bounds.max, ...s.heightFunction, ...s.normal, s.walkable)) throw new Error(`Failed surface in ${resolved.id}`);
    }
    if (!transport.finish_definition(resolved.id)) throw new Error(`Failed to finish ${resolved.id}`);
  }
  for (const instance of demoManifest.instances) if (!transport.register_instance(instance.id, instance.definitionId, ...instance.position, 0, 0, 0, 1, 1, 0)) throw new Error(`Failed instance ${instance.id}`);
  if (!transport.register_instance('cancellation-instance', 'outdoor', 100, 0, 100, 0, 0, 0, 1, 1, 0)) throw new Error('Failed cancellation proof instance');
  const { source, target } = demoManifest.link;
  if (!transport.register_bidirectional_link(demoManifest.link.id, source.instanceId, source.anchorId, target.instanceId, target.anchorId)) throw new Error('Failed demo topology link');
}
