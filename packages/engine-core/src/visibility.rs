//! Visibility culling and sight radius calculations.

use std::collections::{HashMap, HashSet};
use crate::lights::{LightsBuffer, MAX_LIGHTS};

pub const DEFAULT_MAX_DRAW_DISTANCE: f32 = 32.0;

/// Compute effective sight radius based on ambient light level, camera position, and active lights.
///
/// Base sight radius scales linearly with ambient light (0.0 to `max_draw_distance`).
/// Dynamic lights within range contribute `intensity - distance` to sight radius.
/// Total sight radius is non-negative and capped at `max_draw_distance`.
pub fn compute_sight_radius(
    ambient_light: f32,
    cam_x: f32,
    cam_y: f32,
    cam_z: f32,
    lights: &LightsBuffer,
    max_draw_distance: f32,
) -> f32 {
    let ambient_clamped = ambient_light.clamp(0.0, 1.0);
    let base_radius = ambient_clamped * max_draw_distance;

    let mut dynamic_contribution: f32 = 0.0;

    for i in 0..MAX_LIGHTS {
        if lights.active[i] != 0.0 {
            let dx = lights.x[i] - cam_x;
            let dy = lights.y[i] - cam_y;
            let dz = lights.z[i] - cam_z;
            let dist = (dx * dx + dy * dy + dz * dz).sqrt();

            let intensity = lights.intensity[i];
            if intensity > 0.0 && dist < intensity {
                let contrib = intensity - dist;
                dynamic_contribution += contrib;
            }
        }
    }

    (base_radius + dynamic_contribution).min(max_draw_distance)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct GridPos {
    pub x: i32,
    pub z: i32,
}

pub fn get_grid_pos(x: f32, y: f32, z: f32, use_y_axis: bool) -> GridPos {
    let gx = x.round() as i32;
    let gz = if use_y_axis { y.round() as i32 } else { z.round() as i32 };
    GridPos { x: gx, z: gz }
}

/// Compute set of visible grid cells from an origin given a sight radius and solid cell map.
pub fn compute_visible_grid_cells(
    origin_x: f32,
    origin_y: f32,
    origin_z: f32,
    sight_radius: f32,
    grid_solids: &HashMap<GridPos, bool>,
    use_y_axis: bool,
) -> HashSet<GridPos> {
    let mut visible = HashSet::new();
    let p_grid = get_grid_pos(origin_x, origin_y, origin_z, use_y_axis);

    if sight_radius < 0.0 {
        return visible;
    }

    // Origin tile is always visible
    visible.insert(p_grid);

    if sight_radius == 0.0 {
        return visible;
    }

    for octant in 0..8 {
        cast_light(
            &mut visible,
            grid_solids,
            p_grid,
            sight_radius,
            1,
            0.0,
            1.0,
            octant,
            origin_x,
            origin_y,
            origin_z,
            use_y_axis,
        );
    }

    visible
}

fn cast_light(
    visible: &mut HashSet<GridPos>,
    grid_solids: &HashMap<GridPos, bool>,
    p_grid: GridPos,
    sight_radius: f32,
    row: i32,
    mut min_slope: f32,
    max_slope: f32,
    octant: u8,
    origin_x: f32,
    origin_y: f32,
    origin_z: f32,
    use_y_axis: bool,
) {
    if min_slope >= max_slope {
        return;
    }
    if row as f32 > sight_radius + 1.0 {
        return;
    }

    let mut blocked = false;
    let mut new_min_slope = min_slope;

    for col in 0..=row {
        let (rx, rz) = transform_octant(row, col, octant);
        let cell = GridPos {
            x: p_grid.x + rx,
            z: p_grid.z + rz,
        };

        let cell_min = (col as f32 - 0.5) / (row as f32);
        let cell_max = (col as f32 + 0.5) / (row as f32);

        if cell_max < min_slope {
            continue;
        }
        if cell_min > max_slope {
            break;
        }

        // Distance check from camera origin
        let world_z = if use_y_axis { origin_z } else { cell.z as f32 };
        let world_y = if use_y_axis { cell.z as f32 } else { origin_y };
        let dx = cell.x as f32 - origin_x;
        let dy = world_y - origin_y;
        let dz = world_z - origin_z;
        let dist = (dx * dx + dy * dy + dz * dz).sqrt();

        if dist <= sight_radius {
            visible.insert(cell);
        }

        let is_solid = grid_solids.get(&cell).copied().unwrap_or(false);

        if is_solid {
            if !blocked {
                blocked = true;
                let next_max = (col as f32 - 0.5) / (row as f32);
                if next_max > min_slope {
                    cast_light(
                        visible,
                        grid_solids,
                        p_grid,
                        sight_radius,
                        row + 1,
                        min_slope,
                        next_max,
                        octant,
                        origin_x,
                        origin_y,
                        origin_z,
                        use_y_axis,
                    );
                }
            }
            new_min_slope = (col as f32 + 0.5) / (row as f32);
        } else {
            if blocked {
                blocked = false;
                min_slope = new_min_slope;
            }
        }
    }

    if !blocked {
        cast_light(
            visible,
            grid_solids,
            p_grid,
            sight_radius,
            row + 1,
            min_slope,
            max_slope,
            octant,
            origin_x,
            origin_y,
            origin_z,
            use_y_axis,
        );
    }
}

fn transform_octant(row: i32, col: i32, octant: u8) -> (i32, i32) {
    match octant {
        0 => (row, col),
        1 => (col, row),
        2 => (-col, row),
        3 => (-row, col),
        4 => (-row, -col),
        5 => (-col, -row),
        6 => (col, -row),
        7 => (row, -col),
        _ => (row, col),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lights::LightsBuffer;

    #[test]
    fn test_full_ambient_light_no_dynamic_lights() {
        let lights = LightsBuffer::new();
        let radius = compute_sight_radius(1.0, 0.0, 0.0, 0.0, &lights, DEFAULT_MAX_DRAW_DISTANCE);
        assert_eq!(radius, DEFAULT_MAX_DRAW_DISTANCE);
    }

    #[test]
    fn test_zero_ambient_light_nearby_dynamic_light() {
        let mut lights = LightsBuffer::new();
        // Place active light with intensity 10.0 at distance 2.0 (x=2, y=0, z=0)
        lights.set_light(0, 2.0, 0.0, 0.0, 1.0, 1.0, 1.0, 10.0, 1.0);

        let radius = compute_sight_radius(0.0, 0.0, 0.0, 0.0, &lights, DEFAULT_MAX_DRAW_DISTANCE);
        // Expected contribution = intensity (10.0) - dist (2.0) = 8.0
        assert_eq!(radius, 8.0);
        assert!(radius > 0.0);
        assert!(radius < DEFAULT_MAX_DRAW_DISTANCE);
    }

    #[test]
    fn test_zero_ambient_light_no_lights_in_range() {
        let mut lights = LightsBuffer::new();
        // Place active light with intensity 5.0 at distance 10.0 (x=10, y=0, z=0)
        lights.set_light(0, 10.0, 0.0, 0.0, 1.0, 1.0, 1.0, 5.0, 1.0);

        let radius_out_of_range =
            compute_sight_radius(0.0, 0.0, 0.0, 0.0, &lights, DEFAULT_MAX_DRAW_DISTANCE);
        assert_eq!(radius_out_of_range, 0.0);

        let no_lights = LightsBuffer::new();
        let radius_no_lights =
            compute_sight_radius(0.0, 0.0, 0.0, 0.0, &no_lights, DEFAULT_MAX_DRAW_DISTANCE);
        assert_eq!(radius_no_lights, 0.0);
    }

    #[test]
    fn test_light_falloff_with_distance_and_non_negative() {
        let mut lights_close = LightsBuffer::new();
        // Light intensity 10.0 at dist 2.0 -> contrib = 8.0
        lights_close.set_light(0, 2.0, 0.0, 0.0, 1.0, 1.0, 1.0, 10.0, 1.0);

        let mut lights_far = LightsBuffer::new();
        // Light intensity 10.0 at dist 6.0 -> contrib = 4.0
        lights_far.set_light(0, 6.0, 0.0, 0.0, 1.0, 1.0, 1.0, 10.0, 1.0);

        let radius_close =
            compute_sight_radius(0.0, 0.0, 0.0, 0.0, &lights_close, DEFAULT_MAX_DRAW_DISTANCE);
        let radius_far =
            compute_sight_radius(0.0, 0.0, 0.0, 0.0, &lights_far, DEFAULT_MAX_DRAW_DISTANCE);

        assert_eq!(radius_close, 8.0);
        assert_eq!(radius_far, 4.0);
        assert!(radius_close > radius_far);

        let mut lights_beyond = LightsBuffer::new();
        // Light intensity 10.0 at dist 15.0 -> dist > intensity -> contrib = 0.0
        lights_beyond.set_light(0, 15.0, 0.0, 0.0, 1.0, 1.0, 1.0, 10.0, 1.0);
        let radius_beyond =
            compute_sight_radius(0.0, 0.0, 0.0, 0.0, &lights_beyond, DEFAULT_MAX_DRAW_DISTANCE);
        assert_eq!(radius_beyond, 0.0);
    }
}
