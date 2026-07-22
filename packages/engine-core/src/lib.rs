//! `engine-core`: Rust/WASM simulation core for Retro Mage.

pub mod actors;
pub mod camera;
pub mod input;
pub mod lights;
pub mod tiles;

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

    /// Advance the engine simulation tick by `dt` seconds.
    pub fn tick(&mut self, dt: f64) {
        self.tick_count += dt;
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
        self.actors
            .set_actor(index, x, y, z, facing, sprite_id, active)
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
        self.lights
            .set_light(index, x, y, z, r, g, b, intensity, active)
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
    ) -> bool {
        self.tiles
            .set_tile(index, x, y, z, tile_id, variant, solid)
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

        // Actors
        assert!(!state.actors_x_ptr().is_null());
        assert_eq!(state.actors_x_count(), 64);
        assert_eq!(state.actors_count(), 0);
        state.set_actor(0, 1.0, 2.0, 3.0, 0.5, 10.0, 1.0);
        assert_eq!(state.actors_count(), 1);
        unsafe {
            assert_eq!(*state.actors_x_ptr(), 1.0);
            assert_eq!(*state.actors_y_ptr(), 2.0);
            assert_eq!(*state.actors_z_ptr(), 3.0);
            assert_eq!(*state.actors_facing_ptr(), 0.5);
            assert_eq!(*state.actors_sprite_id_ptr(), 10.0);
            assert_eq!(*state.actors_active_ptr(), 1.0);
        }

        // Lights
        assert!(!state.lights_x_ptr().is_null());
        assert_eq!(state.lights_x_count(), 32);
        assert_eq!(state.lights_count(), 0);
        state.set_light(0, 5.0, 6.0, 7.0, 1.0, 0.0, 0.0, 2.5, 1.0);
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
        assert_eq!(state.tiles_count(), 0);
        state.set_tile(0, 10.0, 0.0, 20.0, 2.0, 1.0, 1.0);
        assert_eq!(state.tiles_count(), 1);
        unsafe {
            assert_eq!(*state.tiles_x_ptr(), 10.0);
            assert_eq!(*state.tiles_tile_id_ptr(), 2.0);
            assert_eq!(*state.tiles_solid_ptr(), 1.0);
        }

        // Ambient Light
        assert_eq!(state.ambient_light(), 0.0);
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
    }
}
