import { EngineState, WorldTransport } from 'engine-core';
import { WorldStateReader, WorldTransportReader } from 'render';

export interface DynamicContentProofSnapshot {
  ready: boolean;
  tileId: number;
  tileSolid: number;
  pose: { x: number; y: number; z: number };
  diagnostics: string;
}

export interface DynamicContentProofHarness {
  snapshot(): DynamicContentProofSnapshot;
  open(): number;
  rejectUnknownVariant(): { code: number; diagnostics: string };
}

/**
 * Narrow browser fixture for the public WorldTransport dynamic-content contract.
 * It is selected only by the proof URL and owns no demo world data or renderer state.
 */
export function installDynamicContentProof(memory: WebAssembly.Memory): DynamicContentProofHarness {
  const transport = WorldTransport.with_capacity(4, 1, 1, 1);
  const engine = new EngineState();
  const collision = engine.collision_config();
  collision.gravity = 0;
  engine.set_collision_config(collision);
  engine.set_player_speed(10);

  if (!transport.begin_definition('door', '1', -3, 0, -2, 3, 2, 2)
    || !transport.begin_dynamic_content_slot('door', 'gate', 'closed')
    || !transport.definition_dynamic_content_variant('door', 'gate', 'closed')
    || !transport.dynamic_content_variant_tile('door', 0, 0, 0, 41, 0, 0, 0, true, false, false, false, false, false)
    || !transport.definition_dynamic_content_variant('door', 'gate', 'open')
    || !transport.dynamic_content_variant_tile('door', 0, 0, 0, 42, 0, 0, 0, false, false, false, false, false, false)
    || !transport.finish_dynamic_content_slot('door', 'gate')
    || !transport.finish_definition('door')
    || !transport.register_instance('door-instance', 'door', 0, 0, 0, 0, 0, 0, 1, 1, 0)) {
    throw new Error('Could not author dynamic-content proof definition.');
  }
  const request = transport.begin_load('door-instance', 'proof');
  if (!transport.accept_definition(request, 'door-instance')
    || !transport.set_instance_state('door-instance', 3, true, true, true)) {
    throw new Error('Could not activate dynamic-content proof instance.');
  }

  engine.set_camera(-2, 0, 0, 0, 0);
  engine.set_input(1, 0, 0, 0, 0, 0, 0);
  const cameraReader = new WorldStateReader(engine, memory);
  const transportReader = new WorldTransportReader(transport, memory);
  const snapshot = (): DynamicContentProofSnapshot => {
    const camera = cameraReader.read().camera;
    const world = transportReader.read();
    return {
      ready: true,
      tileId: world.scene?.tiles.tile_id[0] ?? 0,
      tileSolid: world.scene?.tiles.solid[0] ?? 0,
      pose: { x: camera.x[0] ?? 0, y: camera.y[0] ?? 0, z: camera.z[0] ?? 0 },
      diagnostics: transport.dynamic_content_diagnostics_json(),
    };
  };

  // The fixture's only frames are the documented world-aware path.
  transport.tick_engine(engine, 0.2);
  return {
    snapshot,
    open: () => {
      const result = transport.set_dynamic_content_variant('door-instance', 'gate', 'open');
      transport.tick_engine(engine, 0.2);
      return result;
    },
    rejectUnknownVariant: () => ({
      code: transport.set_dynamic_content_variant('door-instance', 'gate', 'missing'),
      diagnostics: transport.dynamic_content_diagnostics_json(),
    }),
  };
}
