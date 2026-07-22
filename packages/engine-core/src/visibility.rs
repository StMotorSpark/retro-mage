//! Visibility culling and sight radius calculations.

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
