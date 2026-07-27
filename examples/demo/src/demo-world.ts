/** App-owned demo topology/content. Engine receives only resolved primitive data. */
export type DemoLevelId = 'dungeon' | 'outdoor';

export interface DemoAnchor {
  id: string;
  x: number;
  z: number;
}

export interface DemoLevelDefinition {
  id: DemoLevelId;
  version: '1';
  anchors: readonly DemoAnchor[];
  providerMetadata: { kind: string };
}

export interface DemoLevelInstance {
  id: `${DemoLevelId}-instance`;
  definitionId: DemoLevelId;
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

export const demoDefinitions: readonly DemoLevelDefinition[] = [
  { id: 'dungeon', version: '1', anchors: [{ id: 'outdoor-gate', x: 10, z: 4 }], providerMetadata: { kind: 'authored-dungeon' } },
  { id: 'outdoor', version: '1', anchors: [{ id: 'dungeon-gate', x: 32, z: 32 }], providerMetadata: { kind: 'authored-outdoor' } },
];

export const demoManifest: DemoWorldManifest = {
  definitions: demoDefinitions,
  instances: [
    { id: 'dungeon-instance', definitionId: 'dungeon' },
    { id: 'outdoor-instance', definitionId: 'outdoor' },
  ],
  link: {
    id: 'dungeon-outdoor',
    source: { instanceId: 'dungeon-instance', anchorId: 'outdoor-gate' },
    target: { instanceId: 'outdoor-instance', anchorId: 'dungeon-gate' },
    direction: 'bidirectional',
    preload: 'before-visible',
  },
};

/** Provider boundary remains app-owned and engine-agnostic. */
export class DemoLevelProvider {
  resolve(definitionId: DemoLevelId): DemoLevelDefinition {
    const definition = demoManifest.definitions.find((candidate) => candidate.id === definitionId);
    if (!definition) throw new Error(`Unknown demo definition: ${definitionId}`);
    return definition;
  }
}

export function createDemoLevelProvider(): DemoLevelProvider {
  return new DemoLevelProvider();
}
