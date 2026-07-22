//! Indoor room graph and room-as-chunk streaming implementation.
//!
//! Per `docs/architecture/world-streaming.md`, indoor space uses rooms as the chunk unit,
//! connected via a room graph. Streaming in/out is governed by graph-hop depth rather
//! than spatial distance.

use std::collections::{HashMap, HashSet, VecDeque};

pub type RoomId = u32;

/// Tile geometry within a room's local space.
///
/// Follows `TilesBuffer` convention per `docs/architecture/wasm-bridge.md`.
#[derive(Debug, Clone, PartialEq)]
pub struct RoomTile {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub tile_id: f32,
    pub variant: f32,
    pub solid: f32,
    pub vertical_opening: f32,
}

impl RoomTile {
    pub fn new(
        x: f32,
        y: f32,
        z: f32,
        tile_id: f32,
        variant: f32,
        solid: f32,
        vertical_opening: f32,
    ) -> Self {
        Self {
            x,
            y,
            z,
            tile_id,
            variant,
            solid,
            vertical_opening,
        }
    }
}

/// Indoor room node containing local geometry and graph connection topology.
#[derive(Debug, Clone, PartialEq)]
pub struct RoomNode {
    pub id: RoomId,
    pub name: String,
    pub tiles: Vec<RoomTile>,
    pub connected_room_ids: Vec<RoomId>,
}

impl RoomNode {
    pub fn new(id: RoomId, name: impl Into<String>) -> Self {
        Self {
            id,
            name: name.into(),
            tiles: Vec::new(),
            connected_room_ids: Vec::new(),
        }
    }

    pub fn add_tile(&mut self, tile: RoomTile) {
        self.tiles.push(tile);
    }

    pub fn connect_to(&mut self, other_id: RoomId) {
        if !self.connected_room_ids.contains(&other_id) {
            self.connected_room_ids.push(other_id);
        }
    }
}

/// Topology of rooms and doorway/traversable connections between them.
#[derive(Debug, Clone, Default)]
pub struct RoomGraph {
    nodes: HashMap<RoomId, RoomNode>,
}

impl RoomGraph {
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
        }
    }

    pub fn add_room(&mut self, room: RoomNode) {
        self.nodes.insert(room.id, room);
    }

    pub fn add_edge(&mut self, room1: RoomId, room2: RoomId) {
        if let Some(r1) = self.nodes.get_mut(&room1) {
            r1.connect_to(room2);
        }
        if let Some(r2) = self.nodes.get_mut(&room2) {
            r2.connect_to(room1);
        }
    }

    pub fn get_room(&self, id: RoomId) -> Option<&RoomNode> {
        self.nodes.get(&id)
    }

    pub fn neighbors(&self, id: RoomId) -> Vec<RoomId> {
        self.nodes
            .get(&id)
            .map(|r| r.connected_room_ids.clone())
            .unwrap_or_default()
    }
}

/// Result of requesting room data from a `RoomProvider`.
#[derive(Debug, Clone, PartialEq)]
pub enum RoomResult {
    /// Room data is ready and available.
    Ready(RoomNode),
    /// Room data is loading or asynchronous.
    Pending,
    /// Room request failed with error message.
    Failed(String),
}

/// Interface for applications/storages to provide indoor room data.
pub trait RoomProvider {
    fn request_room(&mut self, id: RoomId) -> RoomResult;
    fn get_neighbors(&self, id: RoomId) -> Vec<RoomId>;
}

impl RoomProvider for RoomGraph {
    fn request_room(&mut self, id: RoomId) -> RoomResult {
        match self.get_room(id) {
            Some(node) => RoomResult::Ready(node.clone()),
            None => RoomResult::Failed(format!("Room {} not found in graph", id)),
        }
    }

    fn get_neighbors(&self, id: RoomId) -> Vec<RoomId> {
        self.neighbors(id)
    }
}

/// Resident indoor room entry tracking data and last access sequence for LRU eviction.
#[derive(Debug, Clone, PartialEq)]
pub struct ResidentRoom {
    pub node: RoomNode,
    pub last_accessed: u64,
}

/// Sane default hop-depth for loading indoor rooms (1 hop = current room + direct neighbors).
pub const DEFAULT_HOP_DEPTH: u32 = 1;
/// Sane default hop-depth for evicting indoor rooms (1 hop).
pub const DEFAULT_EVICT_HOP_DEPTH: u32 = 1;

/// Streamer that manages a resident set of indoor rooms around the player by graph-hop depth.
#[derive(Debug, Clone)]
pub struct IndoorRoomStreamer {
    pub hop_depth: u32,
    pub evict_hop_depth: u32,
    pub max_resident_rooms: usize,
    pub current_room_id: RoomId,
    resident_rooms: HashMap<RoomId, ResidentRoom>,
    access_counter: u64,
}

impl IndoorRoomStreamer {
    pub fn new(current_room_id: RoomId, hop_depth: u32, evict_hop_depth: u32) -> Self {
        Self {
            hop_depth,
            evict_hop_depth,
            max_resident_rooms: 16,
            current_room_id,
            resident_rooms: HashMap::new(),
            access_counter: 0,
        }
    }

    pub fn new_with_cap(
        current_room_id: RoomId,
        hop_depth: u32,
        evict_hop_depth: u32,
        max_resident_rooms: usize,
    ) -> Self {
        Self {
            hop_depth,
            evict_hop_depth,
            max_resident_rooms,
            current_room_id,
            resident_rooms: HashMap::new(),
            access_counter: 0,
        }
    }

    pub fn hop_depth(&self) -> u32 {
        self.hop_depth
    }

    pub fn set_hop_depth(&mut self, depth: u32) {
        self.hop_depth = depth;
    }

    pub fn evict_hop_depth(&self) -> u32 {
        self.evict_hop_depth
    }

    pub fn set_evict_hop_depth(&mut self, depth: u32) {
        self.evict_hop_depth = depth;
    }

    pub fn max_resident_rooms(&self) -> usize {
        self.max_resident_rooms
    }

    pub fn set_max_resident_rooms(&mut self, max: usize) {
        self.max_resident_rooms = max;
    }

    pub fn current_room_id(&self) -> RoomId {
        self.current_room_id
    }

    pub fn resident_room_count(&self) -> usize {
        self.resident_rooms.len()
    }

    pub fn is_room_resident(&self, id: RoomId) -> bool {
        self.resident_rooms.contains_key(&id)
    }

    pub fn get_room(&self, id: RoomId) -> Option<&RoomNode> {
        self.resident_rooms.get(&id).map(|r| &r.node)
    }

    pub fn resident_keys(&self) -> Vec<RoomId> {
        let mut keys: Vec<RoomId> = self.resident_rooms.keys().copied().collect();
        keys.sort_unstable();
        keys
    }

    pub fn set_current_room<P: RoomProvider + ?Sized>(
        &mut self,
        current_room_id: RoomId,
        provider: &mut P,
    ) {
        self.current_room_id = current_room_id;
        self.update_for_current_room(provider);
    }

    pub fn update_for_current_room<P: RoomProvider + ?Sized>(&mut self, provider: &mut P) {
        self.access_counter += 1;
        let current_access = self.access_counter;

        // 1. BFS to find all rooms within hop_depth from current_room_id
        let target_rooms =
            compute_rooms_within_hops(self.current_room_id, self.hop_depth, provider);

        for rid in target_rooms {
            if let Some(resident) = self.resident_rooms.get_mut(&rid) {
                resident.last_accessed = current_access;
            } else {
                match provider.request_room(rid) {
                    RoomResult::Ready(node) => {
                        self.resident_rooms.insert(
                            rid,
                            ResidentRoom {
                                node,
                                last_accessed: current_access,
                            },
                        );
                    }
                    RoomResult::Pending | RoomResult::Failed(_) => {}
                }
            }
        }

        // 2. Eviction: rooms beyond evict_hop_depth from current_room_id
        let evict_band_rooms =
            compute_rooms_within_hops(self.current_room_id, self.evict_hop_depth, provider);
        let evict_set: HashSet<RoomId> = evict_band_rooms.into_iter().collect();

        let mut to_evict = Vec::new();
        for &rid in self.resident_rooms.keys() {
            if !evict_set.contains(&rid) {
                to_evict.push(rid);
            }
        }
        for rid in to_evict {
            self.resident_rooms.remove(&rid);
        }

        // 3. Hard cap + LRU fallback: if resident count exceeds max_resident_rooms
        if self.resident_rooms.len() > self.max_resident_rooms {
            let excess = self.resident_rooms.len() - self.max_resident_rooms;

            // Sort non-current resident rooms by last_accessed ascending (oldest first)
            let mut candidates: Vec<(RoomId, u64)> = self
                .resident_rooms
                .iter()
                .filter(|(&rid, _)| rid != self.current_room_id)
                .map(|(&rid, res)| (rid, res.last_accessed))
                .collect();

            candidates.sort_by_key(|&(_, last_acc)| last_acc);

            for (rid, _) in candidates.into_iter().take(excess) {
                self.resident_rooms.remove(&rid);
            }
        }
    }

    /// Preload a room tree (root room + neighbors within hop_depth) without altering `current_room_id`.
    pub fn preload_room_tree<P: RoomProvider + ?Sized>(
        &mut self,
        root_room_id: RoomId,
        provider: &mut P,
    ) {
        self.access_counter += 1;
        let current_access = self.access_counter;
        let target_rooms = compute_rooms_within_hops(root_room_id, self.hop_depth, provider);

        for rid in target_rooms {
            if let Some(resident) = self.resident_rooms.get_mut(&rid) {
                resident.last_accessed = current_access;
            } else {
                if let RoomResult::Ready(node) = provider.request_room(rid) {
                    self.resident_rooms.insert(
                        rid,
                        ResidentRoom {
                            node,
                            last_accessed: current_access,
                        },
                    );
                }
            }
        }
    }
}

impl Default for IndoorRoomStreamer {
    fn default() -> Self {
        Self::new(0, DEFAULT_HOP_DEPTH, DEFAULT_EVICT_HOP_DEPTH)
    }
}

/// Helper function to perform BFS on RoomProvider graph.
fn compute_rooms_within_hops<P: RoomProvider + ?Sized>(
    start_id: RoomId,
    max_hops: u32,
    provider: &P,
) -> Vec<RoomId> {
    let mut visited = HashSet::new();
    let mut queue = VecDeque::new();

    visited.insert(start_id);
    queue.push_back((start_id, 0u32));

    let mut result = Vec::new();

    while let Some((curr, depth)) = queue.pop_front() {
        result.push(curr);
        if depth < max_hops {
            for next_id in provider.get_neighbors(curr) {
                if visited.insert(next_id) {
                    queue.push_back((next_id, depth + 1));
                }
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Create a branching test room graph:
    /// Room 0 connected to 1, 2
    /// Room 1 connected to 3, 4
    /// Room 2 connected to 5
    /// Room 3 connected to 6
    fn create_branching_fixture() -> RoomGraph {
        let mut graph = RoomGraph::new();

        for i in 0..=6 {
            let mut node = RoomNode::new(i, format!("Room {}", i));
            node.add_tile(RoomTile::new(
                0.0,
                0.0,
                0.0,
                1.0,
                0.0,
                0.0,
                0.0,
            ));
            graph.add_room(node);
        }

        graph.add_edge(0, 1);
        graph.add_edge(0, 2);
        graph.add_edge(1, 3);
        graph.add_edge(1, 4);
        graph.add_edge(2, 5);
        graph.add_edge(3, 6);

        graph
    }

    #[test]
    fn test_branching_graph_1hop_resident_set_and_movement() {
        let mut graph = create_branching_fixture();
        let mut streamer = IndoorRoomStreamer::new(0, 1, 1);

        // Initial update for room 0
        streamer.update_for_current_room(&mut graph);

        // Room 0 plus 1-hop neighbors (1, 2) must be resident
        assert_eq!(streamer.resident_room_count(), 3);
        assert!(streamer.is_room_resident(0));
        assert!(streamer.is_room_resident(1));
        assert!(streamer.is_room_resident(2));
        assert!(!streamer.is_room_resident(3));
        assert!(!streamer.is_room_resident(4));
        assert!(!streamer.is_room_resident(5));

        // Move to Room 1 (neighbors: 0, 3, 4)
        streamer.set_current_room(1, &mut graph);

        assert_eq!(streamer.resident_room_count(), 4);
        assert!(streamer.is_room_resident(1));
        assert!(streamer.is_room_resident(0));
        assert!(streamer.is_room_resident(3));
        assert!(streamer.is_room_resident(4));
        // Room 2 was 1-hop from Room 0, but is 2-hops from Room 1 -> evicted
        assert!(!streamer.is_room_resident(2));
    }

    #[test]
    fn test_lru_beyond_band_eviction_hard_cap() {
        let mut graph = create_branching_fixture();
        // Load depth 2, evict depth 2, max_resident_rooms = 3
        let mut streamer = IndoorRoomStreamer::new_with_cap(0, 2, 2, 3);

        // At room 0 with hop_depth 2, BFS reaches: 0, 1, 2, 3, 4, 5 (6 rooms total)
        // With max_resident_rooms = 3, only 3 rooms stay resident. Room 0 (current) is preserved.
        streamer.update_for_current_room(&mut graph);

        assert_eq!(streamer.resident_room_count(), 3);
        assert!(streamer.is_room_resident(0));
    }

    #[test]
    fn test_hop_depth_getters_and_setters() {
        let mut streamer = IndoorRoomStreamer::new(0, 1, 1);
        assert_eq!(streamer.hop_depth(), 1);
        assert_eq!(streamer.evict_hop_depth(), 1);
        assert_eq!(streamer.max_resident_rooms(), 16);

        streamer.set_hop_depth(2);
        streamer.set_evict_hop_depth(3);
        streamer.set_max_resident_rooms(8);

        assert_eq!(streamer.hop_depth(), 2);
        assert_eq!(streamer.evict_hop_depth(), 3);
        assert_eq!(streamer.max_resident_rooms(), 8);
    }
}
