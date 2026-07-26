import re

# 1. chunk.rs
with open('packages/engine-core/src/chunk.rs', 'r') as f:
    c = f.read()

c = c.replace('0.0, // vertical_opening\n                                );', '0.0, // vertical_opening\n                                    0.0, // direction\n                                );')
c = c.replace('outdoor_tiles.set_tile(offset + i, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);', 'outdoor_tiles.set_tile(offset + i, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);')
with open('packages/engine-core/src/chunk.rs', 'w') as f:
    f.write(c)

# 2. lib.rs
with open('packages/engine-core/src/lib.rs', 'r') as f:
    l = f.read()

l = l.replace('pub struct EngineState {', 'pub struct EngineState {\n    pub player_velocity_y: f32,')
l = l.replace('cull_precision_distance: visibility::DEFAULT_MAX_DRAW_DISTANCE,\n            collision_config:', 'cull_precision_distance: visibility::DEFAULT_MAX_DRAW_DISTANCE,\n            player_velocity_y: 0.0,\n            collision_config:')

l = re.sub(r'let \(new_px, new_pz\) = collision::resolve_movement\(.*?if self\.active_world_structure\(\) == 0 \{ &self\.indoor_tiles \} else \{ &self\.outdoor_tiles \},\n        \);\n        self\.camera\.x\[0\] = new_px;\n        self\.camera\.z\[0\] = new_pz;', '''let (new_px, new_py, new_pz, new_vy) = collision::resolve_movement(
            self.camera.x[0],
            self.camera.y[0],
            self.camera.z[0],
            dx,
            self.player_velocity_y,
            dz,
            &self.collision_config,
            dt_f32,
            if self.active_world_structure() == 0 { &self.indoor_tiles } else { &self.outdoor_tiles },
        );
        self.camera.x[0] = new_px;
        self.camera.y[0] = new_py;
        self.camera.z[0] = new_pz;
        self.player_velocity_y = new_vy;''', l, flags=re.DOTALL)

l = l.replace('.set_tile(index, x, y, z, tile_id, variant, solid, vertical_opening)', '.set_tile(index, x, y, z, tile_id, variant, solid, vertical_opening, direction)')
l = l.replace('vertical_opening: f32,', 'vertical_opening: f32, direction: f32,')

# tests in lib.rs
l = re.sub(r'set_indoor_tile\((.*?)\);', lambda m: f'set_indoor_tile({m.group(1)}, 0.0);' if m.group(1).count(',') == 7 else m.group(0), l)

with open('packages/engine-core/src/lib.rs', 'w') as f:
    f.write(l)
