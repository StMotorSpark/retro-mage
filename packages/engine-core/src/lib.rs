//! `engine-core`: Rust/WASM simulation core for Retro Mage.

pub mod actors;
pub mod camera;
pub mod input;
pub mod lights;
pub mod tiles;
pub mod visibility;

use std::collections::HashMap;
use actors::{ActorsBuffer, MAX_ACTORS};
use camera::{CameraBuffer, MAX_CAMERA};
use input::InputState;
use lights::{LightsBuffer, MAX_LIGHTS};
use tiles::{TilesBuffer, MAX_TILES};
use wasm_bindgen::prelude::*;

/// Main engine state holding world-state SoA preallocated buffers.
#[wasm_bindgen]
pub struct EngineState {
    tick_count: f64,
    ambient_light: f32,
    input: InputState,
    actors: ActorsBuffer,
    lights: LightsBuffer,
    tiles: TilesBuffer,
    camera: CameraBuffer,
    master_actors: ActorsBuffer,
    master_lights: LightsBuffer,
    master_tiles: TilesBuffer,
}

#[wasm_bindgen]
impl EngineState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> EngineState {
        EngineState {
            tick_count: 0.0,
            ambient_light: 0.0,
            input: InputState::default(),
            actors: ActorsBuffer::new(),
            lights: LightsBuffer::new(),
            tiles: TilesBuffer::new(),
            camera: CameraBuffer::new(),
            master_actors: ActorsBuffer::new(),
            master_lights: LightsBuffer::new(),
            master_tiles: TilesBuffer::new(),
        }
    }

    /// Update the current frame's normalized input state.
    pub fn set_input(
        &mut self,
        move_x: f32,
        move_y: f32,
        look_x: f32,
        look_y: f32,
        vertical: f32,
        buttons: u32,
        buttons_pressed: u32,
    ) {
        self.input = InputState {
            move_x,
            move_y,
            look_x,
            look_y,
            vertical,
            buttons,
            buttons_pressed,
        };
    }

    /// Advance the engine simulation tick by `dt` seconds and recompute visibility.
    pub fn tick(&mut self, dt: f64) {
        self.tick_count += dt;
        self.recompute_visibility();
    }

    /// Accumulated tick time count in seconds.
    #[wasm_bindgen(getter)]
    pub fn tick_count(&self) -> f64 {
        self.tick_count
    }

    /// Global ambient light scalar for the loaded space (0.0 = dark, 1.0 = full daylight).
    pub fn ambient_light(&self) -> f32 {
        self.ambient_light
    }

    /// Set the global ambient light scalar for the loaded space.
    pub fn set_ambient_light(&mut self, level: f32) {
        self.ambient_light = level;
        self.recompute_visibility();
    }

    // ==========================================
    // Actors Buffer (max 64)
    // ==========================================

    pub fn actors_x_ptr(&self) -> *const f32 {
        self.actors.x.as_ptr()
    }
    pub fn actors_x_count(&self) -> usize {
        MAX_ACTORS
    }

    pub fn actors_y_ptr(&self) -> *const f32 {
        self.actors.y.as_ptr()
    }
    pub fn actors_y_count(&self) -> usize {
        MAX_ACTORS
    }

    pub fn actors_z_ptr(&self) -> *const f32 {
        self.actors.z.as_ptr()
    }
    pub fn actors_z_count(&self) -> usize {
        MAX_ACTORS
    }

    pub fn actors_facing_ptr(&self) -> *const f32 {
        self.actors.facing.as_ptr()
    }
    pub fn actors_facing_count(&self) -> usize {
        MAX_ACTORS
    }

    pub fn actors_sprite_id_ptr(&self) -> *const f32 {
        self.actors.sprite_id.as_ptr()
    }
    pub fn actors_sprite_id_count(&self) -> usize {
        MAX_ACTORS
    }

    pub fn actors_active_ptr(&self) -> *const f32 {
        self.actors.active.as_ptr()
    }
    pub fn actors_active_count(&self) -> usize {
        MAX_ACTORS
    }

    pub fn actors_count(&self) -> usize {
        self.actors.active_count()
    }

    pub fn set_actor(
        &mut self,
        index: usize,
        x: f32,
        y: f32,
        z: f32,
        facing: f32,
        sprite_id: f32,
        active: f32,
    ) -> bool {
        let ok = self
            .master_actors
            .set_actor(index, x, y, z, facing, sprite_id, active);
        if ok {
            self.recompute_visibility();
        }
        ok
    }

    // ==========================================
    // Lights Buffer (max 32)
    // ==========================================

    pub fn lights_x_ptr(&self) -> *const f32 {
        self.lights.x.as_ptr()
    }
    pub fn lights_x_count(&self) -> usize {
        MAX_LIGHTS
    }

    pub fn lights_y_ptr(&self) -> *const f32 {
        self.lights.y.as_ptr()
    }
    pub fn lights_y_count(&self) -> usize {
        MAX_LIGHTS
    }

    pub fn lights_z_ptr(&self) -> *const f32 {
        self.lights.z.as_ptr()
    }
    pub fn lights_z_count(&self) -> usize {
        MAX_LIGHTS
    }

    pub fn lights_r_ptr(&self) -> *const f32 {
        self.lights.r.as_ptr()
    }
    pub fn lights_r_count(&self) -> usize {
        MAX_LIGHTS
    }

    pub fn lights_g_ptr(&self) -> *const f32 {
        self.lights.g.as_ptr()
    }
    pub fn lights_g_count(&self) -> usize {
        MAX_LIGHTS
    }

    pub fn lights_b_ptr(&self) -> *const f32 {
        self.lights.b.as_ptr()
    }
    pub fn lights_b_count(&self) -> usize {
        MAX_LIGHTS
    }

    pub fn lights_intensity_ptr(&self) -> *const f32 {
        self.lights.intensity.as_ptr()
    }
    pub fn lights_intensity_count(&self) -> usize {
        MAX_LIGHTS
    }

    pub fn lights_active_ptr(&self) -> *const f32 {
        self.lights.active.as_ptr()
    }
    pub fn lights_active_count(&self) -> usize {
        MAX_LIGHTS
    }

    pub fn lights_count(&self) -> usize {
        self.lights.active_count()
    }

    pub fn set_light(
        &mut self,
        index: usize,
        x: f32,
        y: f32,
        z: f32,
        r: f32,
        g: f32,
        b: f32,
        intensity: f32,
        active: f32,
    ) -> bool {
        let ok = self
            .master_lights
            .set_light(index, x, y, z, r, g, b, intensity, active);
        if ok {
            self.recompute_visibility();
        }
        ok
    }

    // ==========================================
    // Tiles Buffer (max 1024)
    // ==========================================

    pub fn tiles_x_ptr(&self) -> *const f32 {
        self.tiles.x.as_ptr()
    }
    pub fn tiles_x_count(&self) -> usize {
        MAX_TILES
    }

    pub fn tiles_y_ptr(&self) -> *const f32 {
        self.tiles.y.as_ptr()
    }
    pub fn tiles_y_count(&self) -> usize {
        MAX_TILES
    }

    pub fn tiles_z_ptr(&self) -> *const f32 {
        self.tiles.z.as_ptr()
    }
    pub fn tiles_z_count(&self) -> usize {
        MAX_TILES
    }

    pub fn tiles_tile_id_ptr(&self) -> *const f32 {
        self.tiles.tile_id.as_ptr()
    }
    pub fn tiles_tile_id_count(&self) -> usize {
        MAX_TILES
    }

    pub fn tiles_variant_ptr(&self) -> *const f32 {
        self.tiles.variant.as_ptr()
    }
    pub fn tiles_variant_count(&self) -> usize {
        MAX_TILES
    }

    pub fn tiles_solid_ptr(&self) -> *const f32 {
        self.tiles.solid.as_ptr()
    }
    pub fn tiles_solid_count(&self) -> usize {
        MAX_TILES
    }

    pub fn tiles_vertical_opening_ptr(&self) -> *const f32 {
        self.tiles.vertical_opening.as_ptr()
    }
    pub fn tiles_vertical_opening_count(&self) -> usize {
        MAX_TILES
    }

    pub fn tiles_count(&self) -> usize {
        self.tiles.count
    }

    pub fn set_tile(
        &mut self,
        index: usize,
        x: f32,
        y: f32,
        z: f32,
        tile_id: f32,
        variant: f32,
        solid: f32,
        vertical_opening: f32,
    ) -> bool {
        let ok = self
            .master_tiles
            .set_tile(index, x, y, z, tile_id, variant, solid, vertical_opening);
        if ok {
            self.recompute_visibility();
        }
        ok
    }

    // ==========================================
    // Camera / Player Pose Buffer (1 entry)
    // ==========================================

    pub fn camera_x_ptr(&self) -> *const f32 {
        self.camera.x.as_ptr()
    }
    pub fn camera_x_count(&self) -> usize {
        MAX_CAMERA
    }

    pub fn camera_y_ptr(&self) -> *const f32 {
        self.camera.y.as_ptr()
    }
    pub fn camera_y_count(&self) -> usize {
        MAX_CAMERA
    }

    pub fn camera_z_ptr(&self) -> *const f32 {
        self.camera.z.as_ptr()
    }
    pub fn camera_z_count(&self) -> usize {
        MAX_CAMERA
    }

    pub fn camera_yaw_ptr(&self) -> *const f32 {
        self.camera.yaw.as_ptr()
    }
    pub fn camera_yaw_count(&self) -> usize {
        MAX_CAMERA
    }

    pub fn camera_pitch_ptr(&self) -> *const f32 {
        self.camera.pitch.as_ptr()
    }
    pub fn camera_pitch_count(&self) -> usize {
        MAX_CAMERA
    }

    pub fn set_camera(&mut self, x: f32, y: f32, z: f32, yaw: f32, pitch: f32) {
        self.camera.set_camera(x, y, z, yaw, pitch);
        self.recompute_visibility();
    }

    // ==========================================
    // Sight Radius & Visibility Culling
    // ==========================================

    /// Calculate current effective sight radius based on ambient light level,
    /// camera position, and master active lights buffer.
    pub fn sight_radius(&self) -> f32 {
        visibility::compute_sight_radius(
            self.ambient_light,
            self.camera.x[0],
            self.camera.y[0],
            self.camera.z[0],
            &self.master_lights,
            visibility::DEFAULT_MAX_DRAW_DISTANCE,
        )
    }

    /// Recompute visibility cull for current camera pose and update output WASM buffers.
    pub fn recompute_visibility(&mut self) {
        let radius = self.sight_radius();
        let cam_x = self.camera.x[0];
        let cam_y = self.camera.y[0];
        let cam_z = self.camera.z[0];

        let use_y_axis = false;

        // Build solid & vertical-opening grid maps from master tiles
        let mut grid_solids = HashMap::new();
        let mut grid_openings = HashMap::new();
        for i in 0..self.master_tiles.count {
            let pos = visibility::get_grid_pos_3d(
                self.master_tiles.x[i],
                self.master_tiles.y[i],
                self.master_tiles.z[i],
                use_y_axis,
            );
            let solid = self.master_tiles.solid[i] != 0.0;
            if solid {
                grid_solids.insert(pos, true);
            } else {
                grid_solids.entry(pos).or_insert(false);
            }

            let is_opening = self.master_tiles.vertical_opening[i] != 0.0;
            if is_opening {
                grid_openings.insert(pos, true);
            } else {
                grid_openings.entry(pos).or_insert(false);
            }
        }

        // Compute visible grid cells
        let visible_cells = visibility::compute_visible_grid_cells_3d(
            cam_x,
            cam_y,
            cam_z,
            radius,
            &grid_solids,
            &grid_openings,
            use_y_axis,
        );

        // Filter tiles: copy visible master tiles to self.tiles
        let mut visible_tile_count = 0;
        for i in 0..self.master_tiles.count {
            let tx = self.master_tiles.x[i];
            let ty = self.master_tiles.y[i];
            let tz = self.master_tiles.z[i];
            let pos = visibility::get_grid_pos_3d(tx, ty, tz, use_y_axis);

            let dx = tx - cam_x;
            let dy = ty - cam_y;
            let dz = tz - cam_z;
            let dist = (dx * dx + dy * dy + dz * dz).sqrt();

            if visible_cells.contains(&pos) && dist <= radius {
                if visible_tile_count < MAX_TILES {
                    self.tiles.x[visible_tile_count] = tx;
                    self.tiles.y[visible_tile_count] = ty;
                    self.tiles.z[visible_tile_count] = tz;
                    self.tiles.tile_id[visible_tile_count] = self.master_tiles.tile_id[i];
                    self.tiles.variant[visible_tile_count] = self.master_tiles.variant[i];
                    self.tiles.solid[visible_tile_count] = self.master_tiles.solid[i];
                    self.tiles.vertical_opening[visible_tile_count] =
                        self.master_tiles.vertical_opening[i];
                    visible_tile_count += 1;
                }
            }
        }
        self.tiles.count = visible_tile_count;

        // Filter actors: update active state in self.actors
        for i in 0..MAX_ACTORS {
            self.actors.x[i] = self.master_actors.x[i];
            self.actors.y[i] = self.master_actors.y[i];
            self.actors.z[i] = self.master_actors.z[i];
            self.actors.facing[i] = self.master_actors.facing[i];
            self.actors.sprite_id[i] = self.master_actors.sprite_id[i];

            if self.master_actors.active[i] != 0.0 {
                let ax = self.master_actors.x[i];
                let ay = self.master_actors.y[i];
                let az = self.master_actors.z[i];
                let pos = visibility::get_grid_pos_3d(ax, ay, az, use_y_axis);

                let dx = ax - cam_x;
                let dy = ay - cam_y;
                let dz = az - cam_z;
                let dist = (dx * dx + dy * dy + dz * dz).sqrt();

                if visible_cells.contains(&pos) && dist <= radius {
                    self.actors.active[i] = self.master_actors.active[i];
                } else {
                    self.actors.active[i] = 0.0;
                }
            } else {
                self.actors.active[i] = 0.0;
            }
        }

        // Filter lights: update active state in self.lights
        for i in 0..MAX_LIGHTS {
            self.lights.x[i] = self.master_lights.x[i];
            self.lights.y[i] = self.master_lights.y[i];
            self.lights.z[i] = self.master_lights.z[i];
            self.lights.r[i] = self.master_lights.r[i];
            self.lights.g[i] = self.master_lights.g[i];
            self.lights.b[i] = self.master_lights.b[i];
            self.lights.intensity[i] = self.master_lights.intensity[i];

            if self.master_lights.active[i] != 0.0 {
                let lx = self.master_lights.x[i];
                let ly = self.master_lights.y[i];
                let lz = self.master_lights.z[i];
                let pos = visibility::get_grid_pos_3d(lx, ly, lz, use_y_axis);

                let dx = lx - cam_x;
                let dy = ly - cam_y;
                let dz = lz - cam_z;
                let dist = (dx * dx + dy * dy + dz * dz).sqrt();

                if visible_cells.contains(&pos) && dist <= radius {
                    self.lights.active[i] = self.master_lights.active[i];
                } else {
                    self.lights.active[i] = 0.0;
                }
            } else {
                self.lights.active[i] = 0.0;
            }
        }
    }
}

impl Default for EngineState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_state_getters_and_roundtrip() {
        let mut state = EngineState::new();
        state.set_ambient_light(1.0);

        // Actors
        assert!(!state.actors_x_ptr().is_null());
        assert_eq!(state.actors_x_count(), 64);
        assert_eq!(state.actors_count(), 0);
        state.set_actor(0, 1.0, 0.0, 3.0, 0.5, 10.0, 1.0);
        assert_eq!(state.actors_count(), 1);
        unsafe {
            assert_eq!(*state.actors_x_ptr(), 1.0);
            assert_eq!(*state.actors_y_ptr(), 0.0);
            assert_eq!(*state.actors_z_ptr(), 3.0);
            assert_eq!(*state.actors_facing_ptr(), 0.5);
            assert_eq!(*state.actors_sprite_id_ptr(), 10.0);
            assert_eq!(*state.actors_active_ptr(), 1.0);
        }

        // Lights
        assert!(!state.lights_x_ptr().is_null());
        assert_eq!(state.lights_x_count(), 32);
        assert_eq!(state.lights_count(), 0);
        state.set_light(0, 5.0, 0.0, 7.0, 1.0, 0.0, 0.0, 2.5, 1.0);
        assert_eq!(state.lights_count(), 1);
        unsafe {
            assert_eq!(*state.lights_x_ptr(), 5.0);
            assert_eq!(*state.lights_r_ptr(), 1.0);
            assert_eq!(*state.lights_intensity_ptr(), 2.5);
        }

        // Tiles
        assert!(!state.tiles_x_ptr().is_null());
        assert_eq!(state.tiles_x_count(), 1024);
        assert!(!state.tiles_solid_ptr().is_null());
        assert_eq!(state.tiles_solid_count(), 1024);
        assert!(!state.tiles_vertical_opening_ptr().is_null());
        assert_eq!(state.tiles_vertical_opening_count(), 1024);
        assert_eq!(state.tiles_count(), 0);
        state.set_tile(0, 10.0, 0.0, 20.0, 2.0, 1.0, 1.0, 0.0);
        assert_eq!(state.tiles_count(), 1);
        unsafe {
            assert_eq!(*state.tiles_x_ptr(), 10.0);
            assert_eq!(*state.tiles_tile_id_ptr(), 2.0);
            assert_eq!(*state.tiles_solid_ptr(), 1.0);
            assert_eq!(*state.tiles_vertical_opening_ptr(), 0.0);
        }

        // Ambient Light
        assert_eq!(state.ambient_light(), 1.0);
        state.set_ambient_light(0.8);
        assert_eq!(state.ambient_light(), 0.8);

        // Camera
        assert!(!state.camera_x_ptr().is_null());
        assert_eq!(state.camera_x_count(), 1);
        state.set_camera(1.0, 2.0, 3.0, 0.1, 0.2);
        unsafe {
            assert_eq!(*state.camera_x_ptr(), 1.0);
            assert_eq!(*state.camera_y_ptr(), 2.0);
            assert_eq!(*state.camera_z_ptr(), 3.0);
            assert_eq!(*state.camera_yaw_ptr(), 0.1);
            assert_eq!(*state.camera_pitch_ptr(), 0.2);
        }

        // Input
        assert_eq!(state.input, InputState::default());
        state.set_input(0.75, -0.5, 0.2, -0.1, 1.0, 0b1010, 0b0010);
        assert_eq!(state.input.move_x, 0.75);
        assert_eq!(state.input.move_y, -0.5);
        assert_eq!(state.input.look_x, 0.2);
        assert_eq!(state.input.look_y, -0.1);
        assert_eq!(state.input.vertical, 1.0);
        assert_eq!(state.input.buttons, 0b1010);
        assert_eq!(state.input.buttons_pressed, 0b0010);

        // Sight Radius
        state.set_ambient_light(0.0);
        assert_eq!(state.sight_radius(), 0.0);
        state.set_ambient_light(1.0);
        assert_eq!(state.sight_radius(), visibility::DEFAULT_MAX_DRAW_DISTANCE);
    }

    #[test]
    fn test_shadowcasting_occlusion_and_sight_radius_fixtures() {
        let mut state = EngineState::new();
        // Set camera at (0, 0, 0)
        state.set_camera(0.0, 0.0, 0.0, 0.0, 0.0);
        // Ambient light 0.1 -> sight_radius = 3.2m
        state.set_ambient_light(0.1);
        assert_eq!(state.sight_radius(), 3.2);

        // Build room tiles along Z axis:
        // Tile 0: (0, 0, 1) - near side floor (unoccluded, dist 1.0 <= 3.2) -> visible
        // Tile 1: (0, 0, 2) - solid wall (unoccluded, dist 2.0 <= 3.2, solid = 1.0) -> visible
        // Tile 2: (0, 0, 3) - behind wall (occluded by solid wall at z=2) -> excluded
        // Tile 3: (0, 0, 10) - unoccluded direction, but beyond sight radius (dist 10.0 > 3.2) -> excluded
        // Tile 4: (2, 0, 0) - side floor (unoccluded, dist 2.0 <= 3.2) -> visible
        state.set_tile(0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0);
        state.set_tile(1, 0.0, 0.0, 2.0, 2.0, 0.0, 1.0, 0.0); // Solid wall at z=2
        state.set_tile(2, 0.0, 0.0, 3.0, 1.0, 0.0, 0.0, 0.0);
        state.set_tile(3, 0.0, 0.0, 10.0, 1.0, 0.0, 0.0, 0.0);
        state.set_tile(4, 2.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0);

        // Actors:
        // Actor 0: (0, 0, 1) - near side -> visible
        // Actor 1: (0, 0, 3) - behind wall -> occluded (active cleared)
        // Actor 2: (0, 0, 10) - beyond sight radius -> out of sight (active cleared)
        state.set_actor(0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0);
        state.set_actor(1, 0.0, 0.0, 3.0, 0.0, 1.0, 1.0);
        state.set_actor(2, 0.0, 0.0, 10.0, 0.0, 1.0, 1.0);

        // Lights:
        // Light 0: (2, 0, 0) - unoccluded -> visible
        // Light 1: (0, 0, 3) - behind wall -> occluded (active cleared)
        state.set_light(0, 2.0, 0.0, 0.0, 1.0, 1.0, 1.0, 5.0, 1.0);
        state.set_light(1, 0.0, 0.0, 3.0, 1.0, 1.0, 1.0, 5.0, 1.0);

        // Check tile buffer:
        // Visible tiles: (0,0,1), (0,0,2), (2,0,0) -> count = 3
        assert_eq!(state.tiles_count(), 3);
        let mut visible_z = Vec::new();
        unsafe {
            for i in 0..state.tiles_count() {
                visible_z.push((*state.tiles_z_ptr().add(i) * 10.0).round() as i32);
            }
        }
        // Tile behind wall (z=3) and beyond radius (z=10) are NOT in visible set
        assert!(!visible_z.contains(&30));
        assert!(!visible_z.contains(&100));

        // Check actors:
        // Actor 0 (z=1) is active
        unsafe {
            assert_eq!(*state.actors_active_ptr().add(0), 1.0);
            // Actor 1 (z=3, occluded) has active cleared (0.0)
            assert_eq!(*state.actors_active_ptr().add(1), 0.0);
            // Actor 2 (z=10, out of radius) has active cleared (0.0)
            assert_eq!(*state.actors_active_ptr().add(2), 0.0);
        }
        assert_eq!(state.actors_count(), 1);

        // Check lights:
        unsafe {
            assert_eq!(*state.lights_active_ptr().add(0), 1.0);
            assert_eq!(*state.lights_active_ptr().add(1), 0.0);
        }
        assert_eq!(state.lights_count(), 1);
    }

    #[test]
    fn test_visibility_runs_every_frame_on_movement() {
        let mut state = EngineState::new();
        state.set_ambient_light(1.0); // Full sight radius

        // Set up wall at (0, 0, 2) and tile behind wall at (0, 0, 3)
        state.set_tile(0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0);
        state.set_tile(1, 0.0, 0.0, 2.0, 2.0, 0.0, 1.0, 0.0); // Wall
        state.set_tile(2, 0.0, 0.0, 3.0, 1.0, 0.0, 0.0, 0.0); // Behind wall

        // Frame 1: player at (0, 0, 0)
        state.set_camera(0.0, 0.0, 0.0, 0.0, 0.0);
        assert_eq!(state.tiles_count(), 2); // Only (0,0,1) and (0,0,2) visible

        // Frame 2: player moves around wall to (2, 0, 3) via tick
        state.set_camera(2.0, 0.0, 3.0, 0.0, 0.0);
        state.tick(0.016);

        // Now from (2, 0, 3), tile (0, 0, 3) is unoccluded and visible!
        assert_eq!(state.tiles_count(), 3);
    }

    #[test]
    fn test_multi_floor_visibility_opening_and_isolation() {
        let mut state = EngineState::new();
        state.set_ambient_light(1.0); // Full sight radius

        // Floor 1 (upper floor, y = 1.0):
        // Tile 0: Player stand tile at (0, 1, 0)
        // Tile 1: Balcony opening tile at (1, 1, 0) with vertical_opening = 1.0
        state.set_tile(0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0);
        state.set_tile(1, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0); // Vertical opening!

        // Floor 0 (lower floor, y = 0.0):
        // Tile 2: Tile directly under opening at (1, 0, 0)
        // Tile 3: Tile forward on lower floor at (2, 0, 0)
        // Tile 4: Tile under solid floor at (0, 0, 0)
        state.set_tile(2, 1.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0);
        state.set_tile(3, 2.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0);
        state.set_tile(4, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0);

        // Actor 0 on lower floor forward (2, 0, 0)
        // Actor 1 on lower floor under solid floor (0, 0, 0)
        state.set_actor(0, 2.0, 0.0, 0.0, 0.0, 1.0, 1.0);
        state.set_actor(1, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0);

        // 1. Player near opening on upper floor: camera at (0, 1, 0)
        state.set_camera(0.0, 1.0, 0.0, 0.0, 0.0);

        // Visible tiles should include:
        // Floor 1: (0, 1, 0) and (1, 1, 0)
        // Floor 0: (1, 0, 0) and (2, 0, 0) through opening
        // Excluded: (0, 0, 0) on Floor 0 (under solid floor)
        let mut visible_coords = Vec::new();
        unsafe {
            for i in 0..state.tiles_count() {
                let x = *state.tiles_x_ptr().add(i);
                let y = *state.tiles_y_ptr().add(i);
                let z = *state.tiles_z_ptr().add(i);
                visible_coords.push((x.round() as i32, y.round() as i32, z.round() as i32));
            }
        }
        assert!(visible_coords.contains(&(0, 1, 0)));
        assert!(visible_coords.contains(&(1, 1, 0)));
        assert!(visible_coords.contains(&(1, 0, 0)));
        assert!(visible_coords.contains(&(2, 0, 0)));
        assert!(!visible_coords.contains(&(0, 0, 0))); // Solid floor isolation!

        // Actor 0 (2, 0, 0) is visible through opening
        // Actor 1 (0, 0, 0) is excluded under solid floor
        unsafe {
            assert_eq!(*state.actors_active_ptr().add(0), 1.0);
            assert_eq!(*state.actors_active_ptr().add(1), 0.0);
        }

        // 2. Standing away from vertical opening: move player to (-5, 1, 0) on upper floor
        state.set_camera(-5.0, 1.0, 0.0, 0.0, 0.0);
        // From (-5, 1, 0), player is out of sight range of opening (dist to (1,1,0) > DEFAULT_MAX_DRAW_DISTANCE is false, but opening is not visible if we place wall or if far)
        // Let's test player standing far away on lower floor: camera at (-10, 0, 0)
        state.set_camera(-10.0, 0.0, 0.0, 0.0, 0.0);
        // Player on lower floor standing away sees only lower floor tiles near them, zero upper floor tiles leakage
        let mut visible_y_lower = Vec::new();
        unsafe {
            for i in 0..state.tiles_count() {
                visible_y_lower.push(*state.tiles_y_ptr().add(i) as i32);
            }
        }
        for y in visible_y_lower {
            assert_eq!(y, 0); // No upper floor (y=1) leakage!
        }
    }
}
