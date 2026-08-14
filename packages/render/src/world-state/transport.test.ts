import { describe, expect, it } from 'vitest';
import { WorldTransportReader, WorldTransportEngine } from './transport.js';

describe('WorldTransportReader', () => {
  it('round-trips billboard metadata while preserving actor identity state', () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const lanes = [0, 0, 0, 1.25, 77, 1, 11, 2, 0.25, 0.75, 10];
    const engine = {
      actors_x_ptr: () => 0, actors_y_ptr: () => 24, actors_z_ptr: () => 48,
      actors_facing_ptr: () => 72, actors_sprite_id_ptr: () => 96, actors_active_ptr: () => 120,
      actors_material_id_ptr: () => 144, actors_uv_mode_ptr: () => 168, actors_uv_u_ptr: () => 192,
      actors_uv_v_ptr: () => 216, actors_render_flags_ptr: () => 240,
      tiles_x_ptr: () => 264, tiles_y_ptr: () => 264, tiles_z_ptr: () => 264, tiles_tile_id_ptr: () => 264,
      tiles_material_id_ptr: () => 264, tiles_variant_ptr: () => 264, tiles_north_ptr: () => 264, tiles_east_ptr: () => 264,
      tiles_south_ptr: () => 264, tiles_west_ptr: () => 264, tiles_orientation_ptr: () => 264, tiles_solid_ptr: () => 264, tiles_opening_ptr: () => 264,
      lights_x_ptr: () => 264, lights_y_ptr: () => 264, lights_z_ptr: () => 264, lights_r_ptr: () => 264, lights_g_ptr: () => 264, lights_b_ptr: () => 264, lights_intensity_ptr: () => 264, lights_active_ptr: () => 264,
      tile_count: () => 0, actor_count: () => 1, light_count: () => 0, instance_count: () => 0,
      instance_id: () => '', instance_state: () => 0, instance_render_resident: () => false, instance_collision_active: () => false, instance_simulation_active: () => false,
      instance_restore_status: () => 0, instance_restore_attempts: () => 0, instance_state_version: () => '', instance_restore_failure_reason: () => '', instance_handoff_status: () => 0,
    } as WorldTransportEngine;
    for (const [offset, value] of lanes.map((value, i) => [i * 24, value] as const)) new Float32Array(memory.buffer, offset, 1)[0] = value;
    const actors = new WorldTransportReader(engine, memory).read().actors;
    expect(actors.sprite_id[0]).toBe(77); expect(actors.facing[0]).toBe(1.25); expect(actors.active[0]).toBe(1);
    expect(actors.material_id?.[0]).toBe(11); expect(actors.uv_mode?.[0]).toBe(2); expect(actors.uv_u?.[0]).toBe(0.25); expect(actors.uv_v?.[0]).toBe(0.75); expect(actors.render_flags?.[0]).toBe(10);
  });

  it('maps restore properties for instances', () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const engine: WorldTransportEngine = {
      tiles_x_ptr: () => 0,
      tiles_y_ptr: () => 0,
      tiles_z_ptr: () => 0,
      tiles_tile_id_ptr: () => 0,
      tiles_material_id_ptr: () => 0,
      tiles_variant_ptr: () => 0,
      tiles_north_ptr: () => 0,
      tiles_east_ptr: () => 0,
      tiles_south_ptr: () => 0,
      tiles_west_ptr: () => 0,
      tiles_orientation_ptr: () => 0,
      tiles_solid_ptr: () => 0,
      tiles_opening_ptr: () => 0,
      actors_x_ptr: () => 0,
      actors_y_ptr: () => 0,
      actors_z_ptr: () => 0,
      actors_facing_ptr: () => 0,
      actors_sprite_id_ptr: () => 0,
      actors_active_ptr: () => 0,
      lights_x_ptr: () => 0,
      lights_y_ptr: () => 0,
      lights_z_ptr: () => 0,
      lights_r_ptr: () => 0,
      lights_g_ptr: () => 0,
      lights_b_ptr: () => 0,
      lights_intensity_ptr: () => 0,
      lights_active_ptr: () => 0,
      tile_count: () => 0,
      actor_count: () => 0,
      light_count: () => 0,
      instance_count: () => 2,
      instance_id: (i) => i === 0 ? 'inst-0' : 'inst-1',
      instance_state: () => 2,
      instance_render_resident: () => true,
      instance_collision_active: () => true,
      instance_simulation_active: () => true,
      instance_restore_status: (i) => i === 0 ? 1 : 3,
      instance_restore_attempts: (i) => i === 0 ? 0 : 2,
      instance_state_version: (i) => i === 0 ? '' : 'v2',
      instance_restore_failure_reason: (i) => i === 0 ? '' : 'corrupt',
      instance_handoff_status: (i) => i === 0 ? 0 : 2,
    };

    const reader = new WorldTransportReader(engine, memory);
    const views = reader.read();

    expect(views.instances).toHaveLength(2);
    
    const inst0 = views.instances[0]!;
    expect(inst0.id).toBe('inst-0');
    expect(inst0.restore_status).toBe(1);
    expect(inst0.restore_attempts).toBe(0);
    expect(inst0.state_version).toBe('');
    expect(inst0.restore_failure_reason).toBe('');

    const inst1 = views.instances[1]!;
    expect(inst1.id).toBe('inst-1');
    expect(inst1.restore_status).toBe(3);
    expect(inst1.restore_attempts).toBe(2);
    expect(inst1.state_version).toBe('v2');
    expect(inst1.restore_failure_reason).toBe('corrupt');
  });
});
