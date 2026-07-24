//! `engine-core`: Rust/WASM simulation core for Retro Mage.

pub mod actors;
pub mod camera;
pub mod chunk;
pub mod collision;
pub mod input;
pub mod lights;
pub mod room;
pub mod seam;
pub mod streaming_config;
pub mod tiles;
pub mod visibility;

pub use collision::CollisionConfig;
pub use streaming_config::StreamingConfig;

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
    max_sight_distance: f32,
    cull_precision_distance: f32,
    collision_config: collision::CollisionConfig,
    input: InputState,
    actors: ActorsBuffer,
    lights: LightsBuffer,
    tiles: TilesBuffer,
    camera: CameraBuffer,
    indoor_actors: ActorsBuffer,
    outdoor_actors: ActorsBuffer,
    master_lights: LightsBuffer,
    indoor_tiles: TilesBuffer,
    outdoor_tiles: TilesBuffer,
    doorways: [room::Doorway; room::MAX_DOORWAYS],
    doorways_count: usize,
    chunk_streamer: chunk::OutdoorChunkStreamer,
    chunk_provider: chunk::FlatChunkProvider,
    indoor_streamer: room::IndoorRoomStreamer,
    room_graph: room::RoomGraph,
    seam_manager: seam::WorldSeamManager,
}

#[wasm_bindgen]
impl EngineState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> EngineState {
        let camera = CameraBuffer::new();
        let mut outdoor_tiles = TilesBuffer::new();
        let mut indoor_tiles = TilesBuffer::new();
        let mut streamer = chunk::OutdoorChunkStreamer::default();
        let mut provider = chunk::FlatChunkProvider::default();
        streamer.update_for_player_pos(camera.x[0], camera.z[0], &mut provider, &mut outdoor_tiles);

        let mut room_graph = room::RoomGraph::new();
        let mut indoor_streamer = room::IndoorRoomStreamer::default();
        indoor_streamer.update_for_current_room(&mut room_graph);

        let seam_manager = seam::WorldSeamManager::new(seam::ActiveWorldStructure::Outdoor);

        EngineState {
            tick_count: 0.0,
            ambient_light: 0.0,
            max_sight_distance: visibility::DEFAULT_MAX_DRAW_DISTANCE,
            cull_precision_distance: visibility::DEFAULT_MAX_DRAW_DISTANCE,
            collision_config: collision::CollisionConfig::default(),
            input: InputState::default(),
            actors: ActorsBuffer::new(),
            lights: LightsBuffer::new(),
            tiles: TilesBuffer::new(),
            camera,
            indoor_actors: ActorsBuffer::new(),
            outdoor_actors: ActorsBuffer::new(),
            master_lights: LightsBuffer::new(),
            indoor_tiles,
            outdoor_tiles,
            doorways: [room::Doorway::default(); room::MAX_DOORWAYS],
            doorways_count: 0,
            chunk_streamer: streamer,
            chunk_provider: provider,
            indoor_streamer,
            room_graph,
            seam_manager,
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
        let dt_f32 = dt as f32;

        // --- Look input: update yaw / pitch ---
        let (new_yaw, new_pitch) = collision::apply_look(
            self.camera.yaw[0],
            self.camera.pitch[0],
            self.input.look_x,
            self.input.look_y,
            self.collision_config.look_sensitivity,
            dt_f32,
        );
        self.camera.yaw[0] = new_yaw;
        self.camera.pitch[0] = new_pitch;

        // --- Movement input: compute desired delta, resolve against solid tiles ---
        let (dx, dz) = collision::compute_movement_delta(
            self.input.move_x,
            self.input.move_y,
            self.camera.yaw[0],
            self.collision_config.player_speed,
            dt_f32,
        );
        let (new_px, new_pz) = collision::resolve_movement(
            self.camera.x[0],
            self.camera.z[0],
            dx,
            dz,
            self.collision_config.player_radius,
            if self.active_world_structure() == 0 { &self.indoor_tiles } else { &self.outdoor_tiles },
        );
        self.camera.x[0] = new_px;
        self.camera.z[0] = new_pz;

        // Ground plane for streaming/seams is XZ (camera.y is elevation, not a horizontal axis) —
        // see docs/research/known-gaps.md "Outdoor Coordinate System".
        let mut px = self.camera.x[0];
        let mut pz = self.camera.z[0];

        self.seam_manager.update_and_check_crossing(
            &mut px,
            &mut pz,
            &mut self.indoor_streamer,
            &mut self.room_graph,
            &mut self.chunk_streamer,
            &mut self.chunk_provider,
            &mut self.outdoor_tiles,
        );

        self.camera.x[0] = px;
        self.camera.z[0] = pz;

        if self.seam_manager.active_structure() == seam::ActiveWorldStructure::Outdoor {
            self.chunk_streamer.update_for_player_pos(
                px,
                pz,
                &mut self.chunk_provider,
                &mut self.outdoor_tiles,
            );
        } else {
            // Check doorways first
            for i in 0..self.doorways_count {
                let d = &self.doorways[i];
                if d.from_room_id == self.indoor_streamer.current_room_id() {
                    if px >= d.min_x && px <= d.max_x && pz >= d.min_z && pz <= d.max_z {
                        self.set_indoor_current_room(d.to_room_id);
                        break;
                    }
                }
            }

            self.indoor_streamer
                .update_for_current_room(&mut self.room_graph);
        }

        self.recompute_visibility();
    }

    /// Current active driving world structure (0 = Indoor, 1 = Outdoor).
    pub fn active_world_structure(&self) -> u32 {
        match self.seam_manager.active_structure() {
            seam::ActiveWorldStructure::Indoor => 0,
            seam::ActiveWorldStructure::Outdoor => 1,
        }
    }

    /// Set active driving world structure (0 = Indoor, 1 = Outdoor).
    pub fn set_active_world_structure(&mut self, structure: u32) {
        let active = if structure == 0 {
            seam::ActiveWorldStructure::Indoor
        } else {
            seam::ActiveWorldStructure::Outdoor
        };
        self.seam_manager.set_active_structure(active);
    }

    /// Player X coordinate in active structure's coordinate space.
    pub fn player_x(&self) -> f32 {
        self.camera.x[0]
    }

    /// Player Z coordinate (ground-plane second axis) in active structure's coordinate space.
    pub fn player_y(&self) -> f32 {
        self.camera.z[0]
    }

    /// Set player position in active structure's coordinate space (x, z ground plane).
    pub fn set_player_pos(&mut self, x: f32, z: f32) {
        self.camera.x[0] = x;
        self.camera.z[0] = z;
        match self.seam_manager.active_structure() {
            seam::ActiveWorldStructure::Outdoor => {
                self.chunk_streamer
                    .update_for_player_pos(x, z, &mut self.chunk_provider, &mut self.outdoor_tiles);
            }
            seam::ActiveWorldStructure::Indoor => {
                self.indoor_streamer
                    .update_for_current_room(&mut self.room_graph);
            }
        }
    }

    /// Register a seam in the engine.
    pub fn register_seam(
        &mut self,
        seam_id: u32,
        room_id: u32,
        room_tile_x: f32,
        room_tile_y: f32,
        outdoor_tile_x: f32,
        outdoor_tile_y: f32,
        offset_x: f32,
        offset_y: f32,
        rotation_rad: f32,
    ) {
        let transform = seam::SeamTransform::new(offset_x, offset_y, rotation_rad);
        let seam = seam::Seam::new(
            seam_id,
            room_id,
            room_tile_x,
            room_tile_y,
            outdoor_tile_x,
            outdoor_tile_y,
            transform,
        );
        self.seam_manager.register_seam(seam);
    }

    /// Get current overall streaming configuration.
    pub fn streaming_config(&self) -> StreamingConfig {
        StreamingConfig {
            outdoor_load_radius: self.chunk_streamer.load_radius(),
            outdoor_evict_radius: self.chunk_streamer.evict_radius(),
            indoor_hop_depth: self.indoor_streamer.hop_depth(),
            seam_trigger_distance: self.seam_manager.seam_trigger_distance(),
        }
    }

    /// Set overall streaming configuration.
    pub fn set_streaming_config(&mut self, config: StreamingConfig) {
        self.set_outdoor_load_radius(config.outdoor_load_radius);
        self.set_outdoor_evict_radius(config.outdoor_evict_radius);
        self.set_indoor_hop_depth(config.indoor_hop_depth);
        self.set_seam_trigger_distance(config.seam_trigger_distance);
    }

    /// Validate current streaming configuration against max sight distance constraint.
    pub fn validate_streaming_config(&self) -> Vec<String> {
        self.streaming_config()
            .validate_against_sight_distance(self.max_sight_distance)
    }

    fn check_and_log_dev_warnings(&self) {
        #[cfg(debug_assertions)]
        {
            for warning in self.validate_streaming_config() {
                eprintln!("[DEV WARNING] {}", warning);
            }
        }
    }

    /// Seam trigger distance in tiles.
    pub fn seam_trigger_distance(&self) -> f32 {
        self.seam_manager.seam_trigger_distance()
    }

    /// Set seam trigger distance in tiles.
    pub fn set_seam_trigger_distance(&mut self, dist: f32) {
        self.seam_manager.set_seam_trigger_distance(dist);
        self.check_and_log_dev_warnings();
    }

    /// Seam crossing threshold in tiles.
    pub fn seam_crossing_threshold(&self) -> f32 {
        self.seam_manager.crossing_threshold()
    }

    /// Set seam crossing threshold in tiles.
    pub fn set_seam_crossing_threshold(&mut self, dist: f32) {
        self.seam_manager.set_crossing_threshold(dist);
    }

    /// Outdoor chunk load radius (chunks).
    pub fn outdoor_load_radius(&self) -> i32 {
        self.chunk_streamer.load_radius()
    }

    /// Set outdoor chunk load radius (chunks).
    pub fn set_outdoor_load_radius(&mut self, radius: i32) {
        self.chunk_streamer.set_load_radius(radius);
        self.chunk_streamer.update_for_player_pos(
            self.camera.x[0],
            self.camera.z[0], // fix y to z
            &mut self.chunk_provider,
            &mut self.outdoor_tiles,
        );
        self.check_and_log_dev_warnings();
    }

    /// Outdoor chunk evict radius (chunks).
    pub fn outdoor_evict_radius(&self) -> i32 {
        self.chunk_streamer.evict_radius()
    }

    /// Set outdoor chunk evict radius (chunks).
    pub fn set_outdoor_evict_radius(&mut self, radius: i32) {
        self.chunk_streamer.set_evict_radius(radius);
        self.chunk_streamer.update_for_player_pos(
            self.camera.x[0],
            self.camera.z[0], // fix y to z
            &mut self.chunk_provider,
            &mut self.outdoor_tiles,
        );
        self.check_and_log_dev_warnings();
    }

    /// Maximum resident outdoor chunks count limit (hard cap).
    pub fn outdoor_max_resident_chunks(&self) -> usize {
        self.chunk_streamer.max_resident_chunks()
    }

    /// Set maximum resident outdoor chunks count limit (hard cap).
    pub fn set_outdoor_max_resident_chunks(&mut self, max: usize) {
        self.chunk_streamer.set_max_resident_chunks(max);
        self.chunk_streamer.update_for_player_pos(
            self.camera.x[0],
            self.camera.z[0], // fix y to z
            &mut self.chunk_provider,
            &mut self.outdoor_tiles,
        );
    }

    /// Number of currently resident outdoor chunks.
    pub fn resident_chunk_count(&self) -> usize {
        self.chunk_streamer.resident_chunk_count()
    }

    /// Check if outdoor chunk at (chunk_x, chunk_y) is resident.
    pub fn is_chunk_resident(&self, chunk_x: i32, chunk_y: i32) -> bool {
        self.chunk_streamer.is_chunk_resident(chunk_x, chunk_y)
    }

    /// Set outdoor default tile ID (e.g. 3 for grass terrain).
    pub fn set_outdoor_default_tile_id(&mut self, tile_id: u16) {
        self.chunk_provider.default_tile_id = tile_id;
    }

    /// Indoor room hop depth (graph hops).
    pub fn indoor_hop_depth(&self) -> u32 {
        self.indoor_streamer.hop_depth()
    }

    /// Set indoor room hop depth.
    pub fn set_indoor_hop_depth(&mut self, depth: u32) {
        self.indoor_streamer.set_hop_depth(depth);
        self.indoor_streamer.set_evict_hop_depth(depth);
        self.indoor_streamer
            .update_for_current_room(&mut self.room_graph);
        self.check_and_log_dev_warnings();
    }

    /// Indoor room evict hop depth (graph hops).
    pub fn indoor_evict_hop_depth(&self) -> u32 {
        self.indoor_streamer.evict_hop_depth()
    }

    /// Set indoor room evict hop depth.
    pub fn set_indoor_evict_hop_depth(&mut self, depth: u32) {
        self.indoor_streamer.set_evict_hop_depth(depth);
        self.indoor_streamer
            .update_for_current_room(&mut self.room_graph);
    }

    /// Maximum resident indoor rooms count limit (hard cap).
    pub fn indoor_max_resident_rooms(&self) -> usize {
        self.indoor_streamer.max_resident_rooms()
    }

    /// Set maximum resident indoor rooms count limit (hard cap).
    pub fn set_indoor_max_resident_rooms(&mut self, max: usize) {
        self.indoor_streamer.set_max_resident_rooms(max);
        self.indoor_streamer
            .update_for_current_room(&mut self.room_graph);
    }

    /// Number of currently resident indoor rooms.
    pub fn resident_room_count(&self) -> usize {
        self.indoor_streamer.resident_room_count()
    }

    /// Check if indoor room with room_id is resident.
    pub fn is_room_resident(&self, room_id: u32) -> bool {
        self.indoor_streamer.is_room_resident(room_id)
    }

    /// Current active indoor room ID.
    pub fn indoor_current_room_id(&self) -> u32 {
        self.indoor_streamer.current_room_id()
    }

    /// Set current active indoor room ID and update resident room set.
    pub fn set_indoor_current_room(&mut self, room_id: u32) {
        self.indoor_streamer
            .set_current_room(room_id, &mut self.room_graph);
    }

    /// Add a room node to internal engine room graph.
    pub fn add_room_to_graph(&mut self, room_id: u32, name: &str) {
        self.room_graph
            .add_room(room::RoomNode::new(room_id, name));
        self.indoor_streamer
            .update_for_current_room(&mut self.room_graph);
    }

    /// Add a bidirectional edge between two rooms in engine room graph.
    pub fn add_room_edge(&mut self, room1: u32, room2: u32) {
        self.room_graph.add_edge(room1, room2);
        self.indoor_streamer
            .update_for_current_room(&mut self.room_graph);
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

    /// Maximum sight distance for the loaded space.
    pub fn max_sight_distance(&self) -> f32 {
        self.max_sight_distance
    }

    /// Set maximum sight distance for the loaded space.
    pub fn set_max_sight_distance(&mut self, dist: f32) {
        self.max_sight_distance = dist;
        self.recompute_visibility();
        self.check_and_log_dev_warnings();
    }

    /// Cull precision distance threshold beyond which occlusion drops to distance-only.
    pub fn cull_precision_distance(&self) -> f32 {
        self.cull_precision_distance
    }

    /// Set cull precision distance threshold.
    pub fn set_cull_precision_distance(&mut self, dist: f32) {
        self.cull_precision_distance = dist;
        self.recompute_visibility();
    }

    // ==========================================
    // Collision / Movement Config
    // ==========================================

    /// Get current collision and movement configuration.
    pub fn collision_config(&self) -> CollisionConfig {
        self.collision_config
    }

    /// Set collision and movement configuration.
    pub fn set_collision_config(&mut self, config: collision::CollisionConfig) {
        self.collision_config = config;
    }

    pub fn register_indoor_doorway(
        &mut self,
        min_x: f32,
        max_x: f32,
        min_z: f32,
        max_z: f32,
        from_room_id: u32,
        to_room_id: u32,
    ) -> bool {
        if self.doorways_count < room::MAX_DOORWAYS {
            self.doorways[self.doorways_count] = room::Doorway {
                min_x,
                max_x,
                min_z,
                max_z,
                from_room_id,
                to_room_id,
            };
            self.doorways_count += 1;
            true
        } else {
            false
        }
    }

    /// Player movement speed in tiles per second.
    pub fn player_speed(&self) -> f32 {
        self.collision_config.player_speed
    }

    /// Set player movement speed in tiles per second.
    pub fn set_player_speed(&mut self, speed: f32) {
        self.collision_config.player_speed = speed;
    }

    /// Player collision circle radius in tiles.
    pub fn player_radius(&self) -> f32 {
        self.collision_config.player_radius
    }

    /// Set player collision circle radius in tiles.
    pub fn set_player_radius(&mut self, radius: f32) {
        self.collision_config.player_radius = radius;
    }

    /// Camera look sensitivity in radians per second per unit of look input.
    pub fn look_sensitivity(&self) -> f32 {
        self.collision_config.look_sensitivity
    }

    /// Set camera look sensitivity in radians per second per unit of look input.
    pub fn set_look_sensitivity(&mut self, sensitivity: f32) {
        self.collision_config.look_sensitivity = sensitivity;
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

    pub fn set_indoor_actor(
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
            .indoor_actors
            .set_actor(index, x, y, z, facing, sprite_id, active);
        if ok {
            self.recompute_visibility();
        }
        ok
    }

    pub fn set_outdoor_actor(
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
            .outdoor_actors
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

    pub fn set_indoor_tile(
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
            .indoor_tiles
            .set_tile(index, x, y, z, tile_id, variant, solid, vertical_opening);
        if ok {
            self.recompute_visibility();
        }
        ok
    }

    pub fn set_outdoor_tile(
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
            .outdoor_tiles
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
        self.chunk_streamer.update_for_player_pos(x, z, &mut self.chunk_provider, &mut self.outdoor_tiles);
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
            self.max_sight_distance,
        )
    }

    /// Recompute visibility cull for current camera pose and update output WASM buffers.
    pub fn recompute_visibility(&mut self) {
        let radius = self.sight_radius();
        let cam_x = self.camera.x[0];
        let cam_y = self.camera.y[0];
        let cam_z = self.camera.z[0];

        let use_y_axis = false;

        let active_tiles = if self.active_world_structure() == 0 {
            &self.indoor_tiles
        } else {
            &self.outdoor_tiles
        };
        let active_actors = if self.active_world_structure() == 0 {
            &self.indoor_actors
        } else {
            &self.outdoor_actors
        };

        // Build solid & vertical-opening grid maps from active tiles
        let mut grid_solids = HashMap::new();
        let mut grid_openings = HashMap::new();
        for i in 0..active_tiles.count {
            let pos = visibility::get_grid_pos_3d(
                active_tiles.x[i],
                active_tiles.y[i],
                active_tiles.z[i],
                use_y_axis,
            );
            let solid = active_tiles.solid[i] != 0.0;
            if solid {
                grid_solids.insert(pos, true);
            } else {
                grid_solids.entry(pos).or_insert(false);
            }

            let is_opening = active_tiles.vertical_opening[i] != 0.0;
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
            self.cull_precision_distance,
            &grid_solids,
            &grid_openings,
            use_y_axis,
        );

        // Filter tiles: copy visible active tiles to self.tiles
        let mut visible_tile_count = 0;
        for i in 0..active_tiles.count {
            let tx = active_tiles.x[i];
            let ty = active_tiles.y[i];
            let tz = active_tiles.z[i];
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
                    self.tiles.tile_id[visible_tile_count] = active_tiles.tile_id[i];
                    self.tiles.variant[visible_tile_count] = active_tiles.variant[i];
                    self.tiles.solid[visible_tile_count] = active_tiles.solid[i];
                    self.tiles.vertical_opening[visible_tile_count] =
                        active_tiles.vertical_opening[i];
                    visible_tile_count += 1;
                }
            }
        }
        self.tiles.count = visible_tile_count;

        // Filter actors: update active state in self.actors
        for i in 0..MAX_ACTORS {
            self.actors.x[i] = active_actors.x[i];
            self.actors.y[i] = active_actors.y[i];
            self.actors.z[i] = active_actors.z[i];
            self.actors.facing[i] = active_actors.facing[i];
            self.actors.sprite_id[i] = active_actors.sprite_id[i];

            if active_actors.active[i] != 0.0 {
                let ax = active_actors.x[i];
                let ay = active_actors.y[i];
                let az = active_actors.z[i];
                let pos = visibility::get_grid_pos_3d(ax, ay, az, use_y_axis);

                let dx = ax - cam_x;
                let dy = ay - cam_y;
                let dz = az - cam_z;
                let dist = (dx * dx + dy * dy + dz * dz).sqrt();

                if visible_cells.contains(&pos) && dist <= radius {
                    self.actors.active[i] = active_actors.active[i];
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
        state.set_active_world_structure(0);
        state.set_ambient_light(1.0);

        // Actors
        assert!(!state.actors_x_ptr().is_null());
        assert_eq!(state.actors_x_count(), 64);
        assert_eq!(state.actors_count(), 0);
        state.set_indoor_actor(0, 1.0, 0.0, 3.0, 0.5, 10.0, 1.0);
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
        assert_eq!(state.tiles_x_count(), 32768);
        assert!(!state.tiles_solid_ptr().is_null());
        assert_eq!(state.tiles_solid_count(), 32768);
        assert!(!state.tiles_vertical_opening_ptr().is_null());
        assert_eq!(state.tiles_vertical_opening_count(), 32768);
        assert_eq!(state.tiles_count(), 0);
        state.set_indoor_tile(0, 10.0, 0.0, 20.0, 2.0, 1.0, 1.0, 0.0);
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
        state.set_active_world_structure(0);
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
        state.set_indoor_tile(0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0);
        state.set_indoor_tile(1, 0.0, 0.0, 2.0, 2.0, 0.0, 1.0, 0.0); // Solid wall at z=2
        state.set_indoor_tile(2, 0.0, 0.0, 3.0, 1.0, 0.0, 0.0, 0.0);
        state.set_indoor_tile(3, 0.0, 0.0, 10.0, 1.0, 0.0, 0.0, 0.0);
        state.set_indoor_tile(4, 2.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0);

        // Actors:
        // Actor 0: (0, 0, 1) - near side -> visible
        // Actor 1: (0, 0, 3) - behind wall -> occluded (active cleared)
        // Actor 2: (0, 0, 10) - beyond sight radius -> out of sight (active cleared)
        state.set_indoor_actor(0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0);
        state.set_indoor_actor(1, 0.0, 0.0, 3.0, 0.0, 1.0, 1.0);
        state.set_indoor_actor(2, 0.0, 0.0, 10.0, 0.0, 1.0, 1.0);

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
        state.set_active_world_structure(0);
        state.set_ambient_light(1.0); // Full sight radius

        // Set up wall at (0, 0, 2) and tile behind wall at (0, 0, 3)
        state.set_indoor_tile(0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0);
        state.set_indoor_tile(1, 0.0, 0.0, 2.0, 2.0, 0.0, 1.0, 0.0); // Wall
        state.set_indoor_tile(2, 0.0, 0.0, 3.0, 1.0, 0.0, 0.0, 0.0); // Behind wall

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
        state.set_active_world_structure(0);
        state.set_ambient_light(1.0); // Full sight radius

        // Floor 1 (upper floor, y = 1.0):
        // Tile 0: Player stand tile at (0, 1, 0)
        // Tile 1: Balcony opening tile at (1, 1, 0) with vertical_opening = 1.0
        state.set_indoor_tile(0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0);
        state.set_indoor_tile(1, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0); // Vertical opening!

        // Floor 0 (lower floor, y = 0.0):
        // Tile 2: Tile directly under opening at (1, 0, 0)
        // Tile 3: Tile forward on lower floor at (2, 0, 0)
        // Tile 4: Tile under solid floor at (0, 0, 0)
        state.set_indoor_tile(2, 1.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0);
        state.set_indoor_tile(3, 2.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0);
        state.set_indoor_tile(4, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0);

        // Actor 0 on lower floor forward (2, 0, 0)
        // Actor 1 on lower floor under solid floor (0, 0, 0)
        state.set_indoor_actor(0, 2.0, 0.0, 0.0, 0.0, 1.0, 1.0);
        state.set_indoor_actor(1, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0);

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

    #[test]
    fn test_max_sight_distance_tuning() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);

        // Default max sight distance is DEFAULT_MAX_DRAW_DISTANCE (32.0)
        assert_eq!(state.max_sight_distance(), visibility::DEFAULT_MAX_DRAW_DISTANCE);
        state.set_ambient_light(1.0);
        assert_eq!(state.sight_radius(), 32.0);

        // Lower max_sight_distance to 16.0
        state.set_max_sight_distance(16.0);
        assert_eq!(state.max_sight_distance(), 16.0);
        assert_eq!(state.sight_radius(), 16.0);

        // Ambient light 0.5 with max_sight_distance 10.0 -> sight_radius 5.0
        state.set_ambient_light(0.5);
        state.set_max_sight_distance(10.0);
        assert_eq!(state.sight_radius(), 5.0);
    }

    #[test]
    fn test_cull_precision_distance_tuning() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        state.set_ambient_light(1.0); // Full sight radius (32.0)
        state.set_camera(0.0, 0.0, 0.0, 0.0, 0.0);

        // Default cull_precision_distance equals DEFAULT_MAX_DRAW_DISTANCE (32.0)
        assert_eq!(state.cull_precision_distance(), visibility::DEFAULT_MAX_DRAW_DISTANCE);

        // Fixture:
        // Tile 0: (0, 0, 1) - solid wall at z=1 (dist 1.0)
        // Tile 1: (0, 0, 2) - floor tile behind wall at z=1 (dist 2.0)
        // Tile 2: (0, 0, 4) - floor tile further behind wall (dist 4.0)
        state.set_indoor_tile(0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0); // Solid wall at z=1
        state.set_indoor_tile(1, 0.0, 0.0, 2.0, 1.0, 0.0, 0.0, 0.0); // Behind wall (dist 2.0)
        state.set_indoor_tile(2, 0.0, 0.0, 4.0, 1.0, 0.0, 0.0, 0.0); // Further behind wall (dist 4.0)

        // 1. With default cull_precision_distance (32.0): exact occlusion everywhere
        // Only wall at z=1 is visible; z=2 and z=4 are occluded.
        assert_eq!(state.tiles_count(), 1);

        // 2. Set cull_precision_distance to 2.5 (between z=2 and z=4):
        // Within 2.5 threshold (dist <= 2.5): tile at z=2 (dist 2.0) is occluded by wall at z=1 -> EXCLUDED
        // Beyond 2.5 threshold (dist > 2.5): tile at z=4 (dist 4.0 > 2.5) drops to distance-only -> INCLUDED!
        state.set_cull_precision_distance(2.5);
        assert_eq!(state.cull_precision_distance(), 2.5);

        let mut visible_z = Vec::new();
        unsafe {
            for i in 0..state.tiles_count() {
                visible_z.push((*state.tiles_z_ptr().add(i)).round() as i32);
            }
        }

        // Wall at z=1 is visible (unoccluded, dist 1.0 <= 2.5)
        assert!(visible_z.contains(&1));
        // Tile at z=2 is EXCLUDED (occluded, dist 2.0 <= 2.5 threshold)
        assert!(!visible_z.contains(&2));
        // Tile at z=4 is INCLUDED by distance-only inclusion (dist 4.0 > 2.5 threshold, <= 32.0 sight radius)
        assert!(visible_z.contains(&4));
    }

    #[test]
    fn test_engine_state_outdoor_chunk_streaming() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        // Initial state at (0,0): 25 resident chunks (load_radius 2)
        assert_eq!(state.outdoor_load_radius(), 2);
        assert_eq!(state.outdoor_evict_radius(), 3);
        assert_eq!(state.resident_chunk_count(), 25);
        assert!(state.is_chunk_resident(0, 0));
        assert!(state.is_chunk_resident(-2, 2));

        // Move camera to (64.0, 0.0) -> chunk (2, 0)
        state.set_camera(64.0, 0.0, 0.0, 0.0, 0.0);
        assert!(state.is_chunk_resident(2, 0));
        assert!(state.is_chunk_resident(4, 0)); // inside load radius 2 of (2,0)
        assert!(!state.is_chunk_resident(-2, 0)); // evicted, dist 4 > evict radius 3
    }

    #[test]
    fn test_engine_state_indoor_room_streaming() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        state.add_room_to_graph(10, "Entrance");
        state.add_room_to_graph(11, "Hallway");
        state.add_room_to_graph(12, "Armory");
        state.add_room_to_graph(13, "Dungeon");

        state.add_room_edge(10, 11);
        state.add_room_edge(11, 12);
        state.add_room_edge(12, 13);

        state.set_indoor_current_room(10);
        assert_eq!(state.indoor_hop_depth(), 1);
        assert!(state.is_room_resident(10));
        assert!(state.is_room_resident(11));
        assert!(!state.is_room_resident(12));
        assert!(!state.is_room_resident(13));

        // Move to Room 11
        state.set_indoor_current_room(11);
        assert!(state.is_room_resident(11));
        assert!(state.is_room_resident(10));
        assert!(state.is_room_resident(12));
        assert!(!state.is_room_resident(13));
    }

    #[test]
    fn test_streaming_config_runtime_tuning_and_behavior_changes() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);

        // 1. Initial default streaming config values
        let default_config = state.streaming_config();
        assert_eq!(default_config.outdoor_load_radius, 2);
        assert_eq!(default_config.outdoor_evict_radius, 3);
        assert_eq!(default_config.indoor_hop_depth, 1);
        assert_eq!(default_config.seam_trigger_distance, 5.0);

        // 2. Set streaming config via struct (load radius 1, evict radius 1)
        let new_config = StreamingConfig::new(1, 1, 2, 10.0);
        state.set_streaming_config(new_config);
        assert_eq!(state.streaming_config(), new_config);
        assert_eq!(state.outdoor_load_radius(), 1);
        assert_eq!(state.outdoor_evict_radius(), 1);
        assert_eq!(state.indoor_hop_depth(), 2);
        assert_eq!(state.seam_trigger_distance(), 10.0);

        // 3. Confirm behavior change: moving to far-away position with load radius 1 loads 9 chunks (3x3) instead of 25 (5x5)
        state.set_player_pos(320.0, 320.0);
        assert_eq!(state.resident_chunk_count(), 9);

        // 4. Confirm behavior change: indoor hop depth 2 includes 2-hop room neighbors
        state.add_room_to_graph(1, "Room 1");
        state.add_room_to_graph(2, "Room 2");
        state.add_room_to_graph(3, "Room 3");
        state.add_room_edge(1, 2);
        state.add_room_edge(2, 3);
        state.set_indoor_current_room(1);

        // With hop depth 2, Room 3 (2 hops away) IS resident
        assert!(state.is_room_resident(1));
        assert!(state.is_room_resident(2));
        assert!(state.is_room_resident(3));

        // Lower hop depth to 1: Room 3 (2 hops away) should no longer be resident
        state.set_indoor_hop_depth(1);
        assert!(state.is_room_resident(1));
        assert!(state.is_room_resident(2));
        assert!(!state.is_room_resident(3));
    }

    #[test]
    fn test_streaming_config_per_level_override_independence() {
        let mut level1 = EngineState::new();
        let mut level2 = EngineState::new();

        level1.set_streaming_config(StreamingConfig::new(1, 2, 2, 15.0));
        level2.set_streaming_config(StreamingConfig::new(4, 5, 1, 40.0));

        assert_eq!(level1.outdoor_load_radius(), 1);
        assert_eq!(level1.indoor_hop_depth(), 2);
        assert_eq!(level1.seam_trigger_distance(), 15.0);

        assert_eq!(level2.outdoor_load_radius(), 4);
        assert_eq!(level2.indoor_hop_depth(), 1);
        assert_eq!(level2.seam_trigger_distance(), 40.0);
    }

    #[test]
    fn test_streaming_config_sight_distance_validation_warnings() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        state.set_max_sight_distance(32.0);

        // Outdoor load radius 0 chunks = 0 tiles < 32.0 sight distance -> warning!
        state.set_outdoor_load_radius(0);
        let warnings = state.validate_streaming_config();
        assert!(!warnings.is_empty());
        assert!(warnings.iter().any(|w| w.contains("Outdoor load radius")));

        // Seam trigger distance 5.0 tiles < 32.0 sight distance -> warning!
        state.set_outdoor_load_radius(2); // 64 tiles >= 32.0
        state.set_seam_trigger_distance(5.0); // 5.0 tiles < 32.0
        let warnings = state.validate_streaming_config();
        assert!(!warnings.is_empty());
        assert!(warnings.iter().any(|w| w.contains("Seam trigger distance")));

        // Valid configuration: load radius 2 (64 tiles) and seam trigger distance 32.0 tiles >= 32.0 sight distance
        state.set_seam_trigger_distance(32.0);
        let warnings = state.validate_streaming_config();
        assert!(warnings.is_empty());
    }

    #[test]
    fn test_streaming_config_internal_state_unexposed() {
        let config = StreamingConfig::default();
        // StreamingConfig exposes strictly outdoor_load_radius, outdoor_evict_radius, indoor_hop_depth, seam_trigger_distance
        assert_eq!(config.outdoor_load_radius, 2);
        assert_eq!(config.outdoor_evict_radius, 3);
        assert_eq!(config.indoor_hop_depth, 1);
        assert_eq!(config.seam_trigger_distance, 5.0);
    }

    // ==========================================
    // Collision / Movement integration tests
    // ==========================================

    #[test]
    fn test_collision_config_defaults_on_new_state() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        assert_eq!(state.player_speed(), collision::DEFAULT_PLAYER_SPEED);
        assert_eq!(state.player_radius(), collision::DEFAULT_PLAYER_RADIUS);
        assert_eq!(state.look_sensitivity(), collision::DEFAULT_LOOK_SENSITIVITY);
    }

    #[test]
    fn test_collision_config_app_override() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        state.set_player_speed(6.0);
        state.set_player_radius(0.4);
        state.set_look_sensitivity(3.0);
        assert_eq!(state.player_speed(), 6.0);
        assert_eq!(state.player_radius(), 0.4);
        assert_eq!(state.look_sensitivity(), 3.0);
    }

    #[test]
    fn test_tick_applies_look_input_to_yaw() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        state.set_camera(0.0, 0.0, 0.0, 0.0, 0.0);
        // look_x=1 with default sensitivity (2.0 rad/s) over dt=0.5s → yaw += 1.0
        state.set_input(0.0, 0.0, 1.0, 0.0, 0.0, 0, 0);
        state.tick(0.5);
        let yaw = unsafe { *state.camera_yaw_ptr() };
        assert!((yaw - 1.0).abs() < 1e-4, "yaw={}", yaw);
    }

    #[test]
    fn test_tick_applies_pitch_input_clamped() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        state.set_camera(0.0, 0.0, 0.0, 0.0, 0.0);
        // look_y=1 for 100s → should clamp at ~85°, not exceed π/2
        state.set_input(0.0, 0.0, 0.0, 1.0, 0.0, 0, 0);
        state.tick(100.0);
        let pitch = unsafe { *state.camera_pitch_ptr() };
        assert!(pitch < std::f32::consts::FRAC_PI_2, "pitch={}", pitch);
    }

    #[test]
    fn test_tick_moves_player_forward_at_yaw_zero() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        state.set_ambient_light(1.0);
        state.set_camera(0.0, 0.0, 0.0, 0.0, 0.0); // yaw=0 → forward = -Z
        // move_y=1 (forward), dt=1s, speed=4.0 → dz = -4.0
        state.set_input(0.0, 1.0, 0.0, 0.0, 0.0, 0, 0);
        state.tick(1.0);
        let pz = unsafe { *state.camera_z_ptr() };
        assert!(pz < 0.0, "Expected player moved toward -Z, got z={}", pz);
    }

    #[test]
    fn test_tick_collision_stops_player_before_wall() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        state.set_ambient_light(1.0);
        // Place camera at origin, yaw=0 → facing -Z
        state.set_camera(0.0, 0.0, 0.0, 0.0, 0.0);
        // Solid wall tile at (0, 0, -3): tile AABB Z face at z = -3 + 0.5 = -2.5
        // With radius 0.3, player stops at z >= -2.5 + 0.3 = -2.2
        state.set_indoor_tile(0, 0.0, 0.0, -3.0, 1.0, 0.0, 1.0, 0.0);
        state.set_input(0.0, 1.0, 0.0, 0.0, 0.0, 0, 0);
        // Run for 10 seconds — without collision player would travel 40 tiles
        state.tick(10.0);
        let pz = unsafe { *state.camera_z_ptr() };
        assert!(pz > -2.5 + 0.3 - 1e-3, "Player passed through wall: z={}", pz);
    }

    #[test]
    fn test_tick_non_solid_tile_does_not_block_movement() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        state.set_ambient_light(1.0);
        state.set_camera(0.0, 0.0, 0.0, 0.0, 0.0);
        // Floor tile (solid=0) directly ahead — should not block
        state.set_indoor_tile(0, 0.0, 0.0, -1.0, 1.0, 0.0, 0.0, 0.0);
        state.set_input(0.0, 1.0, 0.0, 0.0, 0.0, 0, 0);
        state.tick(0.1);
        let pz = unsafe { *state.camera_z_ptr() };
        assert!(pz < 0.0, "Non-solid tile incorrectly blocked movement: z={}", pz);
    }

    #[test]
    fn test_tick_sliding_along_wall() {
        let mut state = EngineState::new();
        state.set_active_world_structure(0);
        state.set_ambient_light(1.0);
        // Place player left of a wall running along the Z axis
        // Solid wall at (1, 0, 0): blocks +X movement but not -Z movement
        state.set_camera(-0.5, 0.0, 2.0, 0.0, 0.0); // yaw=0 → facing -Z
        state.set_indoor_tile(0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0);
        // Move diagonally: forward (-Z) and strafe right (+X)
        // The +X component hits the wall but -Z should succeed (slide)
        state.set_input(1.0, 1.0, 0.0, 0.0, 0.0, 0, 0); // move_x=1 (strafe right), move_y=1 (forward)
        let z_before = 2.0_f32;
        state.tick(0.5);
        let pz = unsafe { *state.camera_z_ptr() };
        assert!(pz < z_before, "Expected Z slide (forward movement), got z={}", pz);
    }
}
