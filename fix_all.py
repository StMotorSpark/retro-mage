import re

# 1. tiles.rs
with open('packages/engine-core/src/tiles.rs', 'r') as f:
    t = f.read()
t = t.replace('pub vertical_opening: Vec<f32>,', 'pub vertical_opening: Vec<f32>,\n    pub direction: Vec<f32>,')
t = t.replace('vertical_opening: vec![0.0; MAX_TILES],', 'vertical_opening: vec![0.0; MAX_TILES],\n            direction: vec![0.0; MAX_TILES],')
t = t.replace('vertical_opening: f32,', 'vertical_opening: f32,\n        direction: f32,')
t = t.replace('self.vertical_opening[index] = vertical_opening;', 'self.vertical_opening[index] = vertical_opening;\n        self.direction[index] = direction;')
t = t.replace('assert_eq!(buffer.vertical_opening.len(), MAX_TILES);', 'assert_eq!(buffer.vertical_opening.len(), MAX_TILES);\n        assert_eq!(buffer.direction.len(), MAX_TILES);')
t = t.replace('1.0, 1.0);', '1.0, 1.0, 2.0);')
t = t.replace('assert_eq!(buffer.vertical_opening[0], 1.0);', 'assert_eq!(buffer.vertical_opening[0], 1.0);\n        assert_eq!(buffer.direction[0], 2.0);')
t = t.replace('0.0, 0.0, 0.0);', '0.0, 0.0, 0.0, 0.0);')
with open('packages/engine-core/src/tiles.rs', 'w') as f:
    f.write(t)

# 2. collision.rs (CollisionConfig)
with open('packages/engine-core/src/collision.rs', 'r') as f:
    c = f.read()

c = c.replace('pub look_sensitivity: f32,\n}', 'pub look_sensitivity: f32,\n    pub player_height: f32,\n    pub gravity: f32,\n    pub max_fall_speed: f32,\n}')
c = c.replace('look_sensitivity: f32) -> Self', 'look_sensitivity: f32, player_height: f32, gravity: f32, max_fall_speed: f32) -> Self')
c = c.replace('look_sensitivity,\n        }', 'look_sensitivity,\n            player_height,\n            gravity,\n            max_fall_speed,\n        }')
c = c.replace('look_sensitivity: DEFAULT_LOOK_SENSITIVITY,\n        }', 'look_sensitivity: DEFAULT_LOOK_SENSITIVITY,\n            player_height: 1.6,\n            gravity: 9.8,\n            max_fall_speed: 15.0,\n        }')

# Resolve movement implementation
c = re.sub(r'fn check_collision\(px: f32, pz: f32, radius: f32, master_tiles: &TilesBuffer\) -> bool \{.*?\n\}', '''fn check_collision(px: f32, py: f32, pz: f32, radius: f32, player_height: f32, master_tiles: &TilesBuffer) -> bool {
    let r_sq = radius * radius;
    for i in 0..master_tiles.count {
        if master_tiles.solid[i] == 0.0 {
            continue;
        }
        let tx = master_tiles.x[i];
        let ty = master_tiles.y[i];
        let tz = master_tiles.z[i];

        let vertical_overlap = py < ty + 1.0 && py + player_height > ty;
        if !vertical_overlap {
            continue;
        }

        let closest_x = px.clamp(tx - 0.5, tx + 0.5);
        let closest_z = pz.clamp(tz - 0.5, tz + 0.5);
        let dist_sq = (px - closest_x) * (px - closest_x) + (pz - closest_z) * (pz - closest_z);
        if dist_sq < r_sq {
            return true;
        }
    }
    false
}''', c, flags=re.DOTALL)

c = re.sub(r'pub fn resolve_movement.*?\(curr_x, curr_z\)\n\}', '''pub fn resolve_movement(
    px: f32,
    py: f32,
    pz: f32,
    dx: f32,
    vy: f32,
    dz: f32,
    config: &CollisionConfig,
    dt: f32,
    master_tiles: &TilesBuffer,
) -> (f32, f32, f32, f32) {
    let mut new_px = px;
    let mut new_pz = pz;

    let distance = (dx * dx + dz * dz).sqrt();
    if distance >= 1e-6 {
        let max_step = (config.player_radius * 0.5).max(0.05);
        let steps = (distance / max_step).ceil() as usize;
        let step_dx = dx / steps as f32;
        let step_dz = dz / steps as f32;

        let mut curr_x = px;
        let mut curr_z = pz;

        for _ in 0..steps {
            let (next_x, next_z) =
                resolve_single_step(curr_x, py, curr_z, step_dx, step_dz, config, master_tiles);
            if (next_x - curr_x).abs() < 1e-6 && (next_z - curr_z).abs() < 1e-6 {
                break;
            }
            curr_x = next_x;
            curr_z = next_z;
        }

        new_px = curr_x;
        new_pz = curr_z;
    }

    let floor_x = new_px.floor();
    let floor_z = new_pz.floor();
    let mut tile_idx = None;
    let mut max_y = -f32::INFINITY;

    for i in 0..master_tiles.count {
        if master_tiles.x[i].floor() == floor_x && master_tiles.z[i].floor() == floor_z {
            let ty = master_tiles.y[i];
            if ty <= py + 0.5 && ty > max_y {
                max_y = ty;
                tile_idx = Some(i);
            }
        }
    }

    let mut new_py = py;
    let mut new_vy = vy;

    if let Some(i) = tile_idx {
        if master_tiles.vertical_opening[i] == 1.0 {
            new_vy -= config.gravity * dt;
            if new_vy < -config.max_fall_speed {
                new_vy = -config.max_fall_speed;
            }
            new_py += new_vy * dt;
        } else {
            let direction = master_tiles.direction[i];
            let base_y = if direction > 0.0 {
                let dx = new_px - floor_x;
                let dz = new_pz - floor_z;
                if direction == 1.0 {
                    master_tiles.y[i] + (1.0 - dz)
                } else if direction == 2.0 {
                    master_tiles.y[i] + dz
                } else if direction == 3.0 {
                    master_tiles.y[i] + dx
                } else if direction == 4.0 {
                    master_tiles.y[i] + (1.0 - dx)
                } else {
                    master_tiles.y[i]
                }
            } else {
                master_tiles.y[i]
            };
            
            if new_py > base_y + 0.1 {
                new_vy -= config.gravity * dt;
                if new_vy < -config.max_fall_speed {
                    new_vy = -config.max_fall_speed;
                }
                new_py += new_vy * dt;
                if new_py <= base_y {
                    new_py = base_y;
                    new_vy = 0.0;
                }
            } else {
                new_py = base_y;
                new_vy = 0.0;
            }
        }
    } else {
        new_vy -= config.gravity * dt;
        if new_vy < -config.max_fall_speed {
            new_vy = -config.max_fall_speed;
        }
        new_py += new_vy * dt;
    }

    (new_px, new_py, new_pz, new_vy)
}''', c, flags=re.DOTALL)

c = re.sub(r'fn resolve_single_step.*?\(px, pz\)\n\}', '''fn resolve_single_step(
    px: f32,
    py: f32,
    pz: f32,
    dx: f32,
    dz: f32,
    config: &CollisionConfig,
    master_tiles: &TilesBuffer,
) -> (f32, f32) {
    let radius = config.player_radius;
    let height = config.player_height;
    if !check_collision(px + dx, py, pz + dz, radius, height, master_tiles) {
        return (px + dx, pz + dz);
    }

    let new_x = if dx.abs() > 1e-6 && !check_collision(px + dx, py, pz, radius, height, master_tiles) {
        px + dx
    } else {
        px
    };

    let new_z = if dz.abs() > 1e-6 && !check_collision(px, py, pz + dz, radius, height, master_tiles) {
        pz + dz
    } else {
        pz
    };

    if !check_collision(new_x, py, new_z, radius, height, master_tiles) {
        return (new_x, new_z);
    }

    (px, pz)
}''', c, flags=re.DOTALL)

with open('packages/engine-core/src/collision.rs', 'w') as f:
    f.write(c)

