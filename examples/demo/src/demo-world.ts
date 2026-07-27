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
  x: number; y: number; z: number;
  volume: { min: [number, number, number]; max: [number, number, number] };
  direction: AnchorDirection;
}

export interface DemoLevelDefinition {
  id: DemoLevelId;
  version: '1';
  bounds: { min: [number, number, number]; max: [number, number, number] };
  tiles: readonly DemoTile[];
  actors: readonly DemoActor[];
  lights: readonly DemoLight[];
  anchors: readonly DemoAnchor[];
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
const anchor = (id: string, x: number, z: number, direction: AnchorDirection): DemoAnchor => ({ id, x, y: 0, z, volume: { min: [-0.5, 0, -0.5], max: [0.5, 2, 0.5] }, direction });

function dungeonTiles(): DemoTile[] {
  const tiles: DemoTile[] = [];
  for (let x = -4; x <= 10; x += 1) for (let z = 2; z <= 7; z += 1) tiles.push(floor(x, z, 2, 2));
  for (let x = -5; x <= 10; x += 1) { tiles.push(wall(x, 1)); tiles.push(wall(x, 8)); }
  for (let z = 2; z <= 7; z += 1) { tiles.push(wall(-5, z)); if (z !== 4) tiles.push(wall(10, z)); }
  return tiles;
}

function outdoorTiles(): DemoTile[] {
  const tiles: DemoTile[] = [];
  for (let x = 0; x <= 24; x += 1) for (let z = -8; z <= 16; z += 1) tiles.push(floor(x, z, 3, 3));
  return tiles;
}

const dungeon: DemoLevelDefinition = {
  id: 'dungeon', version: '1', bounds: { min: [-6, 0, 0], max: [11, 3, 9] },
  tiles: dungeonTiles(), actors: [],
  lights: [
    { x: -2, y: 1.5, z: 4, color: [1, 0.7, 0.3], intensity: 8, active: true },
    { x: 2, y: 1.5, z: 4, color: [1, 0.7, 0.3], intensity: 8, active: true },
    { x: 7, y: 1.5, z: 4, color: [1, 0.7, 0.3], intensity: 8, active: true },
    { x: 9, y: 1.5, z: 6, color: [1, 0.7, 0.3], intensity: 8, active: true },
  ],
  anchors: [anchor('outdoor-gate', 10, 4, 'both')], providerMetadata: { kind: 'authored-dungeon' },
};

const outdoor: DemoLevelDefinition = {
  id: 'outdoor', version: '1', bounds: { min: [0, 0, -9], max: [25, 4, 17] },
  tiles: outdoorTiles(),
  actors: ([[15, -4], [22, -2], [12, 4], [20, 7], [8, 12], [18, 11]] as const).map(([x, z], index) => ({ x, y: 0, z, actorId: `tree-${index}`, spriteId: 1, facing: 0, active: true, spawn: true })),
  lights: [{ x: 12, y: 3, z: 4, color: [0.8, 0.9, 1], intensity: 1, active: true }],
  anchors: [anchor('dungeon-gate', 0, 0, 'both')], providerMetadata: { kind: 'authored-outdoor' },
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
}

export function createDemoLevelProvider(): DemoLevelProvider { return new DemoLevelProvider(); }

/** Submit authored content + topology through scalar browser/WASM API. */
export function registerDemoWorld(transport: WorldTransport, provider = createDemoLevelProvider()): void {
  for (const definition of demoManifest.definitions) {
    const resolved = provider.resolve(definition.id);
    if (!transport.begin_definition(resolved.id, resolved.version, ...resolved.bounds.min, ...resolved.bounds.max)) throw new Error(`Failed to begin ${resolved.id}`);
    for (const tile of resolved.tiles) if (!transport.definition_tile(resolved.id, tile.x, tile.y, tile.z, tile.tileId, tile.materialId, tile.variant, tile.orientation, tile.solid, tile.openings?.north ?? false, tile.openings?.east ?? false, tile.openings?.south ?? false, tile.openings?.west ?? false, tile.openings?.vertical ?? false)) throw new Error(`Failed tile in ${resolved.id}`);
    for (const actor of resolved.actors) if (!transport.definition_actor(resolved.id, actor.x, actor.y, actor.z, actor.actorId, actor.spriteId, actor.facing, actor.active, actor.spawn)) throw new Error(`Failed actor in ${resolved.id}`);
    for (const light of resolved.lights) if (!transport.definition_light(resolved.id, light.x, light.y, light.z, ...light.color, light.intensity, light.active)) throw new Error(`Failed light in ${resolved.id}`);
    for (const a of resolved.anchors) if (!transport.definition_anchor(resolved.id, a.id, a.x, a.y, a.z, ...a.volume.min, ...a.volume.max, a.direction === 'in' ? 0 : a.direction === 'out' ? 1 : 2)) throw new Error(`Failed anchor in ${resolved.id}`);
    if (!transport.finish_definition(resolved.id)) throw new Error(`Failed to finish ${resolved.id}`);
  }
  for (const instance of demoManifest.instances) if (!transport.register_instance(instance.id, instance.definitionId, ...instance.position, 0, 0, 0, 1, 1, 1)) throw new Error(`Failed instance ${instance.id}`);
  const { source, target } = demoManifest.link;
  if (!transport.register_bidirectional_link(demoManifest.link.id, source.instanceId, source.anchorId, target.instanceId, target.anchorId)) throw new Error('Failed demo topology link');
}
