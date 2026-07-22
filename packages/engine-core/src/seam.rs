//! Seam coordinate translation and indoor/outdoor streaming handoff implementation.
//!
//! Per `docs/architecture/world-streaming.md` ("Coordinate Translation at the Seam"),
//! indoor rooms and outdoor terrain chunks have independent coordinate spaces.
//! Each seam specifies a 2D rigid transform (offset + rotation) mapping room-local
//! coordinates to outdoor global coordinates (and back) for that link only.
//!
//! Approaching a seam within `seam_trigger_distance` preloads the far-side structure.
//! Crossing a seam converts player position through the seam transform and switches
//! the active driving data structure with no global coordinate reconciliation elsewhere.

use std::collections::HashMap;

use crate::chunk::{ChunkProvider, OutdoorChunkStreamer};
use crate::room::{IndoorRoomStreamer, RoomId, RoomProvider};

pub type SeamId = u32;

/// Default trigger distance (in tiles) to preload the far side of a seam.
pub const DEFAULT_SEAM_TRIGGER_DISTANCE: f32 = 5.0;

/// Default crossing threshold (in tiles) from seam pin point to execute handoff.
pub const DEFAULT_SEAM_CROSSING_THRESHOLD: f32 = 1.0;

/// The active data structure driving world simulation and visibility culling.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ActiveWorldStructure {
    Indoor,
    Outdoor,
}

/// 2D rigid transform mapping room-local tile coordinates to outdoor global tile coordinates.
///
/// Math:
///   Outdoor = Rotation(rotation_rad) * Room + Offset
///   Room    = Rotation(-rotation_rad) * (Outdoor - Offset)
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SeamTransform {
    pub offset_x: f32,
    pub offset_y: f32,
    pub rotation_rad: f32,
}

impl SeamTransform {
    pub fn new(offset_x: f32, offset_y: f32, rotation_rad: f32) -> Self {
        Self {
            offset_x,
            offset_y,
            rotation_rad,
        }
    }

    /// Construct transform given a room-local anchor coordinate and corresponding outdoor global anchor coordinate + rotation.
    pub fn from_pinned_points(
        room_x: f32,
        room_y: f32,
        outdoor_x: f32,
        outdoor_y: f32,
        rotation_rad: f32,
    ) -> Self {
        let cos_r = rotation_rad.cos();
        let sin_r = rotation_rad.sin();
        let offset_x = outdoor_x - (room_x * cos_r - room_y * sin_r);
        let offset_y = outdoor_y - (room_x * sin_r + room_y * cos_r);
        Self {
            offset_x,
            offset_y,
            rotation_rad,
        }
    }

    /// Convert room-local coordinates (x, y) to outdoor global coordinates (x, y).
    pub fn room_to_outdoor(&self, room_x: f32, room_y: f32) -> (f32, f32) {
        let cos_r = self.rotation_rad.cos();
        let sin_r = self.rotation_rad.sin();
        let out_x = room_x * cos_r - room_y * sin_r + self.offset_x;
        let out_y = room_x * sin_r + room_y * cos_r + self.offset_y;
        (out_x, out_y)
    }

    /// Convert outdoor global coordinates (x, y) to room-local coordinates (x, y).
    pub fn outdoor_to_room(&self, out_x: f32, out_y: f32) -> (f32, f32) {
        let cos_r = self.rotation_rad.cos();
        let sin_r = self.rotation_rad.sin();
        let dx = out_x - self.offset_x;
        let dy = out_y - self.offset_y;
        let room_x = dx * cos_r + dy * sin_r;
        let room_y = -dx * sin_r + dy * cos_r;
        (room_x, room_y)
    }

    /// Convert room heading angle to outdoor heading angle.
    pub fn room_to_outdoor_angle(&self, room_angle_rad: f32) -> f32 {
        room_angle_rad + self.rotation_rad
    }

    /// Convert outdoor heading angle to room heading angle.
    pub fn outdoor_to_room_angle(&self, outdoor_angle_rad: f32) -> f32 {
        outdoor_angle_rad - self.rotation_rad
    }
}

/// Seam portal connecting a room tile location to an outdoor global tile location.
#[derive(Debug, Clone, PartialEq)]
pub struct Seam {
    pub id: SeamId,
    pub room_id: RoomId,
    pub room_tile_x: f32,
    pub room_tile_y: f32,
    pub outdoor_tile_x: f32,
    pub outdoor_tile_y: f32,
    pub transform: SeamTransform,
}

impl Seam {
    pub fn new(
        id: SeamId,
        room_id: RoomId,
        room_tile_x: f32,
        room_tile_y: f32,
        outdoor_tile_x: f32,
        outdoor_tile_y: f32,
        transform: SeamTransform,
    ) -> Self {
        Self {
            id,
            room_id,
            room_tile_x,
            room_tile_y,
            outdoor_tile_x,
            outdoor_tile_y,
            transform,
        }
    }

    pub fn outdoor_chunk_coord(&self) -> (i32, i32) {
        OutdoorChunkStreamer::world_to_chunk_coord(self.outdoor_tile_x, self.outdoor_tile_y)
    }
}

/// Manages active world structure, seam registration, trigger distance preloading, and handoff crossings.
#[derive(Debug, Clone)]
pub struct WorldSeamManager {
    seams: HashMap<SeamId, Seam>,
    room_to_seams: HashMap<RoomId, Vec<SeamId>>,
    active_structure: ActiveWorldStructure,
    seam_trigger_distance: f32,
    crossing_threshold: f32,
}

impl WorldSeamManager {
    pub fn new(active_structure: ActiveWorldStructure) -> Self {
        Self {
            seams: HashMap::new(),
            room_to_seams: HashMap::new(),
            active_structure,
            seam_trigger_distance: DEFAULT_SEAM_TRIGGER_DISTANCE,
            crossing_threshold: DEFAULT_SEAM_CROSSING_THRESHOLD,
        }
    }

    pub fn register_seam(&mut self, seam: Seam) {
        let room_id = seam.room_id;
        let seam_id = seam.id;
        self.room_to_seams.entry(room_id).or_default().push(seam_id);
        self.seams.insert(seam_id, seam);
    }

    pub fn get_seam(&self, id: SeamId) -> Option<&Seam> {
        self.seams.get(&id)
    }

    pub fn seams_for_room(&self, room_id: RoomId) -> Vec<&Seam> {
        if let Some(ids) = self.room_to_seams.get(&room_id) {
            ids.iter().filter_map(|id| self.seams.get(id)).collect()
        } else {
            Vec::new()
        }
    }

    pub fn active_structure(&self) -> ActiveWorldStructure {
        self.active_structure
    }

    pub fn set_active_structure(&mut self, structure: ActiveWorldStructure) {
        self.active_structure = structure;
    }

    pub fn seam_trigger_distance(&self) -> f32 {
        self.seam_trigger_distance
    }

    pub fn set_seam_trigger_distance(&mut self, dist: f32) {
        self.seam_trigger_distance = dist;
    }

    pub fn crossing_threshold(&self) -> f32 {
        self.crossing_threshold
    }

    pub fn set_crossing_threshold(&mut self, dist: f32) {
        self.crossing_threshold = dist;
    }

    /// Evaluates current player position against seams for preloading and handoff crossing.
    ///
    /// - Performs preloading of the destination structure when within `seam_trigger_distance`.
    /// - Executes handoff crossing (converting player position & switching active structure) when within `crossing_threshold`.
    /// Returns `Some(crossed_seam_id)` if a crossing occurred, otherwise `None`.
    pub fn update_and_check_crossing<
        P1: RoomProvider + ?Sized,
        P2: ChunkProvider + ?Sized,
    >(
        &mut self,
        player_x: &mut f32,
        player_y: &mut f32,
        indoor_streamer: &mut IndoorRoomStreamer,
        room_provider: &mut P1,
        chunk_streamer: &mut OutdoorChunkStreamer,
        chunk_provider: &mut P2,
    ) -> Option<SeamId> {
        match self.active_structure {
            ActiveWorldStructure::Indoor => {
                let current_room_id = indoor_streamer.current_room_id();
                // Check seams attached to current room (and resident rooms)
                let resident_room_ids = indoor_streamer.resident_keys();
                let mut candidate_seams: Vec<Seam> = Vec::new();
                for rid in resident_room_ids {
                    for seam in self.seams_for_room(rid) {
                        if !candidate_seams.iter().any(|s| s.id == seam.id) {
                            candidate_seams.push(seam.clone());
                        }
                    }
                }

                let mut crossed_seam: Option<Seam> = None;

                for seam in candidate_seams {
                    // Only check distance to seam's room tile if we're in the seam's room
                    if seam.room_id == current_room_id {
                        let dist = ( (*player_x - seam.room_tile_x).powi(2) + (*player_y - seam.room_tile_y).powi(2) ).sqrt();

                        // Preload far side (outdoor chunk) when approaching within trigger distance
                        if dist <= self.seam_trigger_distance {
                            chunk_streamer.update_for_player_pos(seam.outdoor_tile_x, seam.outdoor_tile_y, chunk_provider);
                        }

                        // Crossing check
                        if dist <= self.crossing_threshold && crossed_seam.is_none() {
                            crossed_seam = Some(seam);
                        }
                    }
                }

                if let Some(seam) = crossed_seam {
                    let (new_out_x, new_out_y) = seam.transform.room_to_outdoor(*player_x, *player_y);
                    self.active_structure = ActiveWorldStructure::Outdoor;
                    *player_x = new_out_x;
                    *player_y = new_out_y;
                    chunk_streamer.update_for_player_pos(new_out_x, new_out_y, chunk_provider);
                    return Some(seam.id);
                }
            }

            ActiveWorldStructure::Outdoor => {
                let mut candidate_seams: Vec<Seam> = self.seams.values().cloned().collect();
                // Sort by distance to player
                candidate_seams.sort_by(|a, b| {
                    let dist_a = ( (*player_x - a.outdoor_tile_x).powi(2) + (*player_y - a.outdoor_tile_y).powi(2) ).sqrt();
                    let dist_b = ( (*player_x - b.outdoor_tile_x).powi(2) + (*player_y - b.outdoor_tile_y).powi(2) ).sqrt();
                    dist_a.partial_cmp(&dist_b).unwrap_or(std::cmp::Ordering::Equal)
                });

                let mut crossed_seam: Option<Seam> = None;

                for seam in candidate_seams {
                    let dist = ( (*player_x - seam.outdoor_tile_x).powi(2) + (*player_y - seam.outdoor_tile_y).powi(2) ).sqrt();

                    // Preload far side (indoor room + graph neighbors) when approaching within trigger distance
                    if dist <= self.seam_trigger_distance {
                        indoor_streamer.preload_room_tree(seam.room_id, room_provider);
                    }

                    // Crossing check
                    if dist <= self.crossing_threshold && crossed_seam.is_none() {
                        crossed_seam = Some(seam);
                    }
                }

                if let Some(seam) = crossed_seam {
                    let (new_room_x, new_room_y) = seam.transform.outdoor_to_room(*player_x, *player_y);
                    self.active_structure = ActiveWorldStructure::Indoor;
                    indoor_streamer.set_current_room(seam.room_id, room_provider);
                    *player_x = new_room_x;
                    *player_y = new_room_y;
                    return Some(seam.id);
                }
            }
        }

        None
    }
}

impl Default for WorldSeamManager {
    fn default() -> Self {
        Self::new(ActiveWorldStructure::Outdoor)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chunk::FlatChunkProvider;
    use crate::room::{RoomGraph, RoomNode, RoomTile};
    use std::f32::consts::PI;

    fn create_test_room_graph() -> RoomGraph {
        let mut graph = RoomGraph::new();

        let mut r0 = RoomNode::new(0, "Entrance Hall");
        r0.add_tile(RoomTile::new(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0));
        r0.add_tile(RoomTile::new(10.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0));

        let mut r1 = RoomNode::new(1, "Inner Courtyard");
        r1.add_tile(RoomTile::new(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0));

        graph.add_room(r0);
        graph.add_room(r1);
        graph.add_edge(0, 1);

        graph
    }

    /// DoD Criterion 1:
    /// Round-trip position conversion through seam transform in both directions.
    #[test]
    fn test_seam_transform_roundtrip_conversion() {
        // Pinned room anchor (10.0, 5.0), outdoor anchor (100.0, 200.0), rotation 90 degrees (PI / 2)
        let transform = SeamTransform::from_pinned_points(10.0, 5.0, 100.0, 200.0, PI / 2.0);

        let room_pos = (7.0, 3.0);
        let outdoor_converted = transform.room_to_outdoor(room_pos.0, room_pos.1);
        let room_roundtrip = transform.outdoor_to_room(outdoor_converted.0, outdoor_converted.1);

        assert!((room_roundtrip.0 - room_pos.0).abs() < 1e-4);
        assert!((room_roundtrip.1 - room_pos.1).abs() < 1e-4);

        let outdoor_pos = (150.0, 250.0);
        let room_converted = transform.outdoor_to_room(outdoor_pos.0, outdoor_pos.1);
        let outdoor_roundtrip = transform.room_to_outdoor(room_converted.0, room_converted.1);

        assert!((outdoor_roundtrip.0 - outdoor_pos.0).abs() < 1e-4);
        assert!((outdoor_roundtrip.1 - outdoor_pos.1).abs() < 1e-4);
    }

    /// DoD Criterion 2:
    /// Approaching a seam within trigger distance causes the far side to become resident before crossing boundary.
    #[test]
    fn test_seam_trigger_distance_preloading() {
        let mut room_graph = create_test_room_graph();
        let mut chunk_provider = FlatChunkProvider::new(1, 0.0);

        let mut indoor_streamer = IndoorRoomStreamer::new(0, 1, 1);
        let mut chunk_streamer = OutdoorChunkStreamer::new(1, 2);

        // Seam at room 0 tile (10.0, 0.0) -> outdoor tile (160.0, 160.0) [chunk (5, 5)]
        let transform = SeamTransform::from_pinned_points(10.0, 0.0, 160.0, 160.0, 0.0);
        let seam = Seam::new(1, 0, 10.0, 0.0, 160.0, 160.0, transform);

        let mut seam_manager = WorldSeamManager::new(ActiveWorldStructure::Indoor);
        seam_manager.set_seam_trigger_distance(5.0);
        seam_manager.set_crossing_threshold(1.0);
        seam_manager.register_seam(seam);

        indoor_streamer.update_for_current_room(&mut room_graph);

        // Outdoor chunk (5, 5) initially NOT resident
        assert!(!chunk_streamer.is_chunk_resident(5, 5));

        // Player at room (3.0, 0.0): distance to seam (10.0, 0.0) is 7.0 > trigger 5.0
        let mut player_x = 3.0f32;
        let mut player_y = 0.0f32;
        let crossed = seam_manager.update_and_check_crossing(
            &mut player_x,
            &mut player_y,
            &mut indoor_streamer,
            &mut room_graph,
            &mut chunk_streamer,
            &mut chunk_provider,
        );
        assert!(crossed.is_none());
        assert!(!chunk_streamer.is_chunk_resident(5, 5));

        // Player approaches to room (6.0, 0.0): distance is 4.0 <= trigger 5.0 (and > crossing 1.0)
        player_x = 6.0;
        let crossed = seam_manager.update_and_check_crossing(
            &mut player_x,
            &mut player_y,
            &mut indoor_streamer,
            &mut room_graph,
            &mut chunk_streamer,
            &mut chunk_provider,
        );
        assert!(crossed.is_none()); // NO crossing yet
        assert_eq!(seam_manager.active_structure(), ActiveWorldStructure::Indoor);

        // BUT far side outdoor chunk (5, 5) IS NOW RESIDENT!
        assert!(chunk_streamer.is_chunk_resident(5, 5));

        // Now test Outdoor -> Indoor preloading:
        let mut seam_manager_out = WorldSeamManager::new(ActiveWorldStructure::Outdoor);
        seam_manager_out.set_seam_trigger_distance(5.0);
        seam_manager_out.set_crossing_threshold(1.0);
        let seam_out = Seam::new(2, 1, 0.0, 0.0, 300.0, 300.0, SeamTransform::new(300.0, 300.0, 0.0));
        seam_manager_out.register_seam(seam_out);

        let mut indoor_streamer_2 = IndoorRoomStreamer::new(0, 1, 1);
        // Room 1 initially NOT resident in indoor_streamer_2 (current room is 0, but pretend 1 not loaded)
        indoor_streamer_2.set_current_room(0, &mut room_graph);

        // Approach outdoor seam at (304.0, 300.0) -> distance = 4.0 <= trigger 5.0
        let mut out_px = 304.0;
        let mut out_py = 300.0;
        let crossed_out = seam_manager_out.update_and_check_crossing(
            &mut out_px,
            &mut out_py,
            &mut indoor_streamer_2,
            &mut room_graph,
            &mut chunk_streamer,
            &mut chunk_provider,
        );
        assert!(crossed_out.is_none());
        assert_eq!(seam_manager_out.active_structure(), ActiveWorldStructure::Outdoor);

        // Far side Room 1 IS NOW RESIDENT!
        assert!(indoor_streamer_2.is_room_resident(1));
    }

    /// DoD Criterion 3:
    /// Crossing seam switches active driving data structure and converts player position correctly.
    #[test]
    fn test_seam_crossing_handoff_and_position_continuity() {
        let mut room_graph = create_test_room_graph();
        let mut chunk_provider = FlatChunkProvider::new(1, 0.0);

        let mut indoor_streamer = IndoorRoomStreamer::new(0, 1, 1);
        let mut chunk_streamer = OutdoorChunkStreamer::new(1, 2);

        // Seam at room 0 tile (10.0, 0.0) -> outdoor tile (100.0, 50.0) with offset (90.0, 50.0), rot 0
        let transform = SeamTransform::new(90.0, 50.0, 0.0);
        let seam = Seam::new(1, 0, 10.0, 0.0, 100.0, 50.0, transform);

        let mut seam_manager = WorldSeamManager::new(ActiveWorldStructure::Indoor);
        seam_manager.set_crossing_threshold(1.0);
        seam_manager.register_seam(seam);

        indoor_streamer.update_for_current_room(&mut room_graph);

        // Player moves onto seam tile (10.0, 0.0)
        let mut player_x = 9.8f32;
        let mut player_y = 0.0f32;

        let crossed = seam_manager.update_and_check_crossing(
            &mut player_x,
            &mut player_y,
            &mut indoor_streamer,
            &mut room_graph,
            &mut chunk_streamer,
            &mut chunk_provider,
        );

        assert_eq!(crossed, Some(1));
        assert_eq!(seam_manager.active_structure(), ActiveWorldStructure::Outdoor);

        // Converted player position: (9.8 + 90.0, 0.0 + 50.0) = (99.8, 50.0)
        assert!((player_x - 99.8).abs() < 1e-4);
        assert!((player_y - 50.0).abs() < 1e-4);

        // Now move back towards outdoor seam at (100.0, 50.0)
        player_x = 100.2;
        player_y = 50.0;

        let crossed_back = seam_manager.update_and_check_crossing(
            &mut player_x,
            &mut player_y,
            &mut indoor_streamer,
            &mut room_graph,
            &mut chunk_streamer,
            &mut chunk_provider,
        );

        assert_eq!(crossed_back, Some(1));
        assert_eq!(seam_manager.active_structure(), ActiveWorldStructure::Indoor);

        // Converted player position back: (100.2 - 90.0, 50.0 - 50.0) = (10.2, 0.0)
        assert!((player_x - 10.2).abs() < 1e-4);
        assert!((player_y - 0.0).abs() < 1e-4);
        assert_eq!(indoor_streamer.current_room_id(), 0);
    }

    /// DoD Criterion 4:
    /// Single room with two independent seams to two different outdoor locations, each with its own transform.
    #[test]
    fn test_single_room_multiple_independent_seams() {
        let mut room_graph = create_test_room_graph();
        let mut chunk_provider = FlatChunkProvider::new(1, 0.0);

        let mut indoor_streamer = IndoorRoomStreamer::new(0, 1, 1);
        let mut chunk_streamer = OutdoorChunkStreamer::new(1, 2);

        // Room 0 has:
        // Seam 1 (West exit) at (0.0, 5.0) -> Outdoor A at (100.0, 100.0) [chunk (3, 3)]
        // Seam 2 (East exit) at (20.0, 5.0) -> Outdoor B at (500.0, 500.0) [chunk (15, 15)]
        let transform_a = SeamTransform::from_pinned_points(0.0, 5.0, 100.0, 100.0, 0.0);
        let seam_a = Seam::new(1, 0, 0.0, 5.0, 100.0, 100.0, transform_a);

        let transform_b = SeamTransform::from_pinned_points(20.0, 5.0, 500.0, 500.0, 0.0);
        let seam_b = Seam::new(2, 0, 20.0, 5.0, 500.0, 500.0, transform_b);

        let mut seam_manager = WorldSeamManager::new(ActiveWorldStructure::Indoor);
        seam_manager.set_seam_trigger_distance(5.0);
        seam_manager.set_crossing_threshold(1.0);
        seam_manager.register_seam(seam_a);
        seam_manager.register_seam(seam_b);

        indoor_streamer.update_for_current_room(&mut room_graph);

        // Player approaches Seam A at room (3.0, 5.0) -> distance to Seam A (0.0, 5.0) is 3.0 <= trigger 5.0
        let mut player_x = 3.0f32;
        let mut player_y = 5.0f32;
        seam_manager.update_and_check_crossing(
            &mut player_x,
            &mut player_y,
            &mut indoor_streamer,
            &mut room_graph,
            &mut chunk_streamer,
            &mut chunk_provider,
        );

        // Outdoor chunk (3, 3) preloaded, but NOT (15, 15)
        assert!(chunk_streamer.is_chunk_resident(3, 3));
        assert!(!chunk_streamer.is_chunk_resident(15, 15));

        // Cross Seam A at room (0.2, 5.0)
        player_x = 0.2;
        let crossed_a = seam_manager.update_and_check_crossing(
            &mut player_x,
            &mut player_y,
            &mut indoor_streamer,
            &mut room_graph,
            &mut chunk_streamer,
            &mut chunk_provider,
        );
        assert_eq!(crossed_a, Some(1));
        assert_eq!(seam_manager.active_structure(), ActiveWorldStructure::Outdoor);
        assert!((player_x - 100.2).abs() < 1e-4);
        assert!((player_y - 100.0).abs() < 1e-4);

        // Reset back to Indoor in room 0, now walk towards Seam B at (17.0, 5.0) -> distance to Seam B (20.0, 5.0) is 3.0 <= trigger 5.0
        seam_manager.set_active_structure(ActiveWorldStructure::Indoor);
        player_x = 17.0;
        player_y = 5.0;

        seam_manager.update_and_check_crossing(
            &mut player_x,
            &mut player_y,
            &mut indoor_streamer,
            &mut room_graph,
            &mut chunk_streamer,
            &mut chunk_provider,
        );

        // Outdoor chunk (15, 15) NOW preloaded!
        assert!(chunk_streamer.is_chunk_resident(15, 15));

        // Cross Seam B at room (19.8, 5.0)
        player_x = 19.8;
        let crossed_b = seam_manager.update_and_check_crossing(
            &mut player_x,
            &mut player_y,
            &mut indoor_streamer,
            &mut room_graph,
            &mut chunk_streamer,
            &mut chunk_provider,
        );
        assert_eq!(crossed_b, Some(2));
        assert_eq!(seam_manager.active_structure(), ActiveWorldStructure::Outdoor);
        assert!((player_x - 499.8).abs() < 1e-4);
        assert!((player_y - 500.0).abs() < 1e-4);
    }
}
