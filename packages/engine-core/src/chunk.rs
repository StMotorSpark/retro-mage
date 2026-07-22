//! Outdoor chunk data contract and provider interface.
//!
//! Per `docs/architecture/world-streaming.md`, outdoor terrain streams as fixed 32×32 tile
//! grid chunks. This module defines the engine-owned `ChunkData` contract, the `ChunkProvider`
//! trait, and a reference implementation (`FlatChunkProvider`).

/// Fixed dimensions for an outdoor chunk: 32×32 tiles (1024 total tiles).
pub const CHUNK_SIZE: usize = 32;
pub const CHUNK_TILES: usize = CHUNK_SIZE * CHUNK_SIZE;

/// Placement specification for an entity/decoration within a chunk.
#[derive(Debug, Clone, PartialEq)]
pub struct EntityPlacement {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub entity_type: u32,
    pub rotation: f32,
}

impl EntityPlacement {
    pub fn new(x: f32, y: f32, z: f32, entity_type: u32, rotation: f32) -> Self {
        Self {
            x,
            y,
            z,
            entity_type,
            rotation,
        }
    }
}

/// Fixed shape every resident outdoor chunk resolves to at runtime.
///
/// Contains:
/// - Grid coordinates (`chunk_x`, `chunk_y`)
/// - 32×32 tile IDs (`tiles`: `[u16; 1024]`)
/// - 32×32 tile heights (`heights`: `[f32; 1024]`)
/// - 32×32 tile solidity flags (`solid`: `[u8; 1024]`, 0 = open, 1 = solid)
/// - List of entity/decoration placements within chunk space (`entities`: `Vec<EntityPlacement>`)
#[derive(Debug, Clone, PartialEq)]
pub struct ChunkData {
    pub chunk_x: i32,
    pub chunk_y: i32,
    pub tiles: [u16; CHUNK_TILES],
    pub heights: [f32; CHUNK_TILES],
    pub solid: [u8; CHUNK_TILES],
    pub entities: Vec<EntityPlacement>,
}

impl ChunkData {
    /// Create a new `ChunkData` filled with default tile IDs, heights, and solidity.
    pub fn new(chunk_x: i32, chunk_y: i32, default_tile_id: u16) -> Self {
        Self {
            chunk_x,
            chunk_y,
            tiles: [default_tile_id; CHUNK_TILES],
            heights: [0.0; CHUNK_TILES],
            solid: [0; CHUNK_TILES],
            entities: Vec::new(),
        }
    }

    /// Calculate linear array index for local tile grid coordinate (lx, ly).
    /// Returns `None` if local coordinates are out of bounds (0..32).
    #[inline]
    pub fn tile_index(lx: usize, ly: usize) -> Option<usize> {
        if lx < CHUNK_SIZE && ly < CHUNK_SIZE {
            Some(ly * CHUNK_SIZE + lx)
        } else {
            None
        }
    }

    /// Get tile ID at local tile coordinate (lx, ly).
    pub fn get_tile(&self, lx: usize, ly: usize) -> Option<u16> {
        Self::tile_index(lx, ly).map(|idx| self.tiles[idx])
    }

    /// Set tile ID at local tile coordinate (lx, ly).
    pub fn set_tile(&mut self, lx: usize, ly: usize, tile_id: u16) -> bool {
        if let Some(idx) = Self::tile_index(lx, ly) {
            self.tiles[idx] = tile_id;
            true
        } else {
            false
        }
    }

    /// Get height at local tile coordinate (lx, ly).
    pub fn get_height(&self, lx: usize, ly: usize) -> Option<f32> {
        Self::tile_index(lx, ly).map(|idx| self.heights[idx])
    }

    /// Set height at local tile coordinate (lx, ly).
    pub fn set_height(&mut self, lx: usize, ly: usize, height: f32) -> bool {
        if let Some(idx) = Self::tile_index(lx, ly) {
            self.heights[idx] = height;
            true
        } else {
            false
        }
    }

    /// Get solidity at local tile coordinate (lx, ly).
    pub fn get_solid(&self, lx: usize, ly: usize) -> Option<u8> {
        Self::tile_index(lx, ly).map(|idx| self.solid[idx])
    }

    /// Set solidity at local tile coordinate (lx, ly).
    pub fn set_solid(&mut self, lx: usize, ly: usize, solid: u8) -> bool {
        if let Some(idx) = Self::tile_index(lx, ly) {
            self.solid[idx] = solid;
            true
        } else {
            false
        }
    }

    /// Add an entity placement to the chunk.
    pub fn add_entity(&mut self, placement: EntityPlacement) {
        self.entities.push(placement);
    }
}

/// Result of requesting chunk data from a `ChunkProvider`.
#[derive(Debug, Clone, PartialEq)]
pub enum ChunkResult {
    /// Chunk data is ready and available immediately.
    Ready(ChunkData),
    /// Chunk loading/generation is in progress (asynchronous/multi-frame).
    Pending,
    /// Chunk loading failed with an error message.
    Failed(String),
}

/// Interface that applications implement to supply chunk data to `engine-core`.
///
/// Supports synchronous resolution (e.g. procedural generation or in-memory cache)
/// as well as asynchronous multi-frame resolution (returning `ChunkResult::Pending`
/// until JS/I/O resolves data).
pub trait ChunkProvider {
    /// Request chunk data for chunk coordinate (chunk_x, chunk_y).
    fn request_chunk(&mut self, chunk_x: i32, chunk_y: i32) -> ChunkResult;
}

/// Minimal reference `ChunkProvider` implementation that returns flat terrain for any chunk coordinate.
///
/// Used for testing, engine defaults, and proof of interface.
#[derive(Debug, Clone)]
pub struct FlatChunkProvider {
    pub default_tile_id: u16,
    pub default_height: f32,
}

impl FlatChunkProvider {
    pub fn new(default_tile_id: u16, default_height: f32) -> Self {
        Self {
            default_tile_id,
            default_height,
        }
    }
}

impl Default for FlatChunkProvider {
    fn default() -> Self {
        Self::new(1, 0.0)
    }
}

impl ChunkProvider for FlatChunkProvider {
    fn request_chunk(&mut self, chunk_x: i32, chunk_y: i32) -> ChunkResult {
        let mut chunk = ChunkData::new(chunk_x, chunk_y, self.default_tile_id);
        if self.default_height != 0.0 {
            chunk.heights = [self.default_height; CHUNK_TILES];
        }
        ChunkResult::Ready(chunk)
    }
}

/// A resident outdoor chunk entry tracking chunk data and access order for LRU eviction.
#[derive(Debug, Clone, PartialEq)]
pub struct ResidentChunk {
    pub data: ChunkData,
    pub last_accessed: u64,
}

/// Sane default radius for loading outdoor chunks (2 chunks = 5x5 window).
pub const DEFAULT_LOAD_RADIUS: i32 = 2;
/// Sane default radius for evicting outdoor chunks (3 chunks = 7x7 window).
pub const DEFAULT_EVICT_RADIUS: i32 = 3;

/// Streamer that manages a resident set of 32x32 outdoor chunks around the player.
///
/// Implements load logic within `load_radius`, distance eviction outside `evict_radius`,
/// and an LRU fallback mechanism if `max_resident_chunks` is reached.
#[derive(Debug, Clone)]
pub struct OutdoorChunkStreamer {
    pub load_radius: i32,
    pub evict_radius: i32,
    pub max_resident_chunks: usize,
    resident_chunks: std::collections::HashMap<(i32, i32), ResidentChunk>,
    access_counter: u64,
}

impl OutdoorChunkStreamer {
    /// Create a new streamer with the specified load and evict radii.
    /// Default `max_resident_chunks` is derived from `evict_radius`: (2 * evict_radius + 1)^2.
    pub fn new(load_radius: i32, evict_radius: i32) -> Self {
        let side = (2 * evict_radius + 1) as usize;
        let max_resident = side * side;
        Self {
            load_radius,
            evict_radius,
            max_resident_chunks: max_resident,
            resident_chunks: std::collections::HashMap::new(),
            access_counter: 0,
        }
    }

    /// Create a new streamer with custom load radius, evict radius, and hard cap on resident chunks.
    pub fn new_with_cap(load_radius: i32, evict_radius: i32, max_resident_chunks: usize) -> Self {
        Self {
            load_radius,
            evict_radius,
            max_resident_chunks,
            resident_chunks: std::collections::HashMap::new(),
            access_counter: 0,
        }
    }

    /// Convert world tile coordinate (x, y) into global chunk coordinate (chunk_x, chunk_y).
    #[inline]
    pub fn world_to_chunk_coord(x: f32, y: f32) -> (i32, i32) {
        let chunk_x = (x / CHUNK_SIZE as f32).floor() as i32;
        let chunk_y = (y / CHUNK_SIZE as f32).floor() as i32;
        (chunk_x, chunk_y)
    }

    /// Get current load radius.
    pub fn load_radius(&self) -> i32 {
        self.load_radius
    }

    /// Set current load radius.
    pub fn set_load_radius(&mut self, radius: i32) {
        self.load_radius = radius;
    }

    /// Get current evict radius.
    pub fn evict_radius(&self) -> i32 {
        self.evict_radius
    }

    /// Set current evict radius.
    pub fn set_evict_radius(&mut self, radius: i32) {
        self.evict_radius = radius;
    }

    /// Get maximum resident chunks limit (hard cap).
    pub fn max_resident_chunks(&self) -> usize {
        self.max_resident_chunks
    }

    /// Set maximum resident chunks limit (hard cap).
    pub fn set_max_resident_chunks(&mut self, max: usize) {
        self.max_resident_chunks = max;
    }

    /// Number of currently resident chunks.
    pub fn resident_chunk_count(&self) -> usize {
        self.resident_chunks.len()
    }

    /// Check if chunk at (chunk_x, chunk_y) is resident.
    pub fn is_chunk_resident(&self, chunk_x: i32, chunk_y: i32) -> bool {
        self.resident_chunks.contains_key(&(chunk_x, chunk_y))
    }

    /// Get reference to resident chunk data at (chunk_x, chunk_y) if present.
    pub fn get_chunk(&self, chunk_x: i32, chunk_y: i32) -> Option<&ChunkData> {
        self.resident_chunks.get(&(chunk_x, chunk_y)).map(|rc| &rc.data)
    }

    /// Get list of all currently resident chunk coordinates.
    pub fn resident_keys(&self) -> Vec<(i32, i32)> {
        self.resident_chunks.keys().copied().collect()
    }

    /// Update resident set based on player's world position (x, y).
    pub fn update_for_player_pos<P: ChunkProvider + ?Sized>(
        &mut self,
        player_x: f32,
        player_y: f32,
        provider: &mut P,
    ) {
        let (cx, cy) = Self::world_to_chunk_coord(player_x, player_y);
        self.update_for_player_chunk(cx, cy, provider);
    }

    /// Update resident set based on player's global chunk coordinate (player_chunk_x, player_chunk_y).
    pub fn update_for_player_chunk<P: ChunkProvider + ?Sized>(
        &mut self,
        player_chunk_x: i32,
        player_chunk_y: i32,
        provider: &mut P,
    ) {
        self.access_counter += 1;
        let current_access = self.access_counter;

        // 1. Load phase: request all chunks within load_radius
        for dx in -self.load_radius..=self.load_radius {
            for dy in -self.load_radius..=self.load_radius {
                let cx = player_chunk_x + dx;
                let cy = player_chunk_y + dy;

                if let Some(resident) = self.resident_chunks.get_mut(&(cx, cy)) {
                    resident.last_accessed = current_access;
                } else {
                    match provider.request_chunk(cx, cy) {
                        ChunkResult::Ready(data) => {
                            self.resident_chunks.insert(
                                (cx, cy),
                                ResidentChunk {
                                    data,
                                    last_accessed: current_access,
                                },
                            );
                        }
                        ChunkResult::Pending | ChunkResult::Failed(_) => {}
                    }
                }
            }
        }

        // 2. Distance-based eviction: drop chunks where Chebyshev distance > evict_radius
        let mut to_evict = Vec::new();
        for (&(cx, cy), _) in self.resident_chunks.iter() {
            let dist_x = (cx - player_chunk_x).abs();
            let dist_y = (cy - player_chunk_y).abs();
            let dist = dist_x.max(dist_y);
            if dist > self.evict_radius {
                to_evict.push((cx, cy));
            }
        }
        for key in to_evict {
            self.resident_chunks.remove(&key);
        }

        // 3. Hard cap + LRU fallback: if count > max_resident_chunks,
        // evict least-recently-accessed chunks outside load_radius first.
        if self.resident_chunks.len() > self.max_resident_chunks {
            let mut candidates: Vec<((i32, i32), u64)> = self
                .resident_chunks
                .iter()
                .filter_map(|(&(cx, cy), chunk)| {
                    let dist_x = (cx - player_chunk_x).abs();
                    let dist_y = (cy - player_chunk_y).abs();
                    let dist = dist_x.max(dist_y);
                    if dist > self.load_radius {
                        Some(((cx, cy), chunk.last_accessed))
                    } else {
                        None
                    }
                })
                .collect();

            // Sort candidates ascending by last_accessed (least recently accessed first)
            candidates.sort_by_key(|&(_, last_accessed)| last_accessed);

            for (key, _) in candidates {
                if self.resident_chunks.len() <= self.max_resident_chunks {
                    break;
                }
                self.resident_chunks.remove(&key);
            }
        }
    }
}

impl Default for OutdoorChunkStreamer {
    fn default() -> Self {
        Self::new(DEFAULT_LOAD_RADIUS, DEFAULT_EVICT_RADIUS)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunk_data_creation_and_defaults() {
        let chunk = ChunkData::new(5, -3, 42);
        assert_eq!(chunk.chunk_x, 5);
        assert_eq!(chunk.chunk_y, -3);
        assert_eq!(chunk.tiles.len(), CHUNK_TILES);
        assert_eq!(chunk.tiles[0], 42);
        assert_eq!(chunk.heights[0], 0.0);
        assert_eq!(chunk.solid[0], 0);
        assert!(chunk.entities.is_empty());
    }

    #[test]
    fn test_chunk_data_tile_set_get() {
        let mut chunk = ChunkData::new(0, 0, 1);
        assert_eq!(chunk.get_tile(10, 20), Some(1));
        assert!(chunk.set_tile(10, 20, 99));
        assert_eq!(chunk.get_tile(10, 20), Some(99));

        assert_eq!(chunk.get_tile(32, 0), None);
        assert!(!chunk.set_tile(32, 0, 99));
    }

    #[test]
    fn test_chunk_data_height_and_solid() {
        let mut chunk = ChunkData::new(0, 0, 1);
        assert!(chunk.set_height(5, 5, 2.5));
        assert_eq!(chunk.get_height(5, 5), Some(2.5));

        assert!(chunk.set_solid(5, 5, 1));
        assert_eq!(chunk.get_solid(5, 5), Some(1));
    }

    #[test]
    fn test_chunk_data_entity_placement() {
        let mut chunk = ChunkData::new(1, 2, 1);
        let entity = EntityPlacement::new(4.5, 12.0, 0.0, 101, 1.57);
        chunk.add_entity(entity.clone());
        assert_eq!(chunk.entities.len(), 1);
        assert_eq!(chunk.entities[0], entity);
    }

    #[test]
    fn test_flat_chunk_provider_roundtrip() {
        let mut provider = FlatChunkProvider::new(7, 1.5);
        let result = provider.request_chunk(-2, 4);
        match result {
            ChunkResult::Ready(chunk) => {
                assert_eq!(chunk.chunk_x, -2);
                assert_eq!(chunk.chunk_y, 4);
                assert_eq!(chunk.get_tile(0, 0), Some(7));
                assert_eq!(chunk.get_height(15, 15), Some(1.5));
            }
            _ => panic!("Expected ChunkResult::Ready"),
        }
    }

    #[test]
    fn test_world_to_chunk_coord() {
        assert_eq!(OutdoorChunkStreamer::world_to_chunk_coord(0.0, 0.0), (0, 0));
        assert_eq!(OutdoorChunkStreamer::world_to_chunk_coord(31.9, 31.9), (0, 0));
        assert_eq!(OutdoorChunkStreamer::world_to_chunk_coord(32.0, 64.0), (1, 2));
        assert_eq!(OutdoorChunkStreamer::world_to_chunk_coord(-0.1, -32.0), (-1, -1));
        assert_eq!(OutdoorChunkStreamer::world_to_chunk_coord(-32.1, -64.1), (-2, -3));
    }

    #[test]
    fn test_load_and_evict_radii_getters_setters() {
        let mut streamer = OutdoorChunkStreamer::new(2, 4);
        assert_eq!(streamer.load_radius(), 2);
        assert_eq!(streamer.evict_radius(), 4);
        assert_eq!(streamer.max_resident_chunks(), 81); // (2*4+1)^2

        streamer.set_load_radius(3);
        streamer.set_evict_radius(5);
        streamer.set_max_resident_chunks(100);

        assert_eq!(streamer.load_radius(), 3);
        assert_eq!(streamer.evict_radius(), 5);
        assert_eq!(streamer.max_resident_chunks(), 100);
    }

    #[test]
    fn test_load_within_radius() {
        let mut streamer = OutdoorChunkStreamer::new(2, 3);
        let mut provider = FlatChunkProvider::default();

        streamer.update_for_player_chunk(0, 0, &mut provider);

        // Load radius = 2 => [-2..=2] x [-2..=2] = 25 chunks resident
        assert_eq!(streamer.resident_chunk_count(), 25);
        for cx in -2..=2 {
            for cy in -2..=2 {
                assert!(streamer.is_chunk_resident(cx, cy));
                assert!(streamer.get_chunk(cx, cy).is_some());
            }
        }

        // Chunks outside load radius should not be resident yet
        assert!(!streamer.is_chunk_resident(3, 0));
        assert!(!streamer.is_chunk_resident(0, -3));
    }

    #[test]
    fn test_evict_outside_radius_and_hysteresis() {
        let mut streamer = OutdoorChunkStreamer::new(2, 3);
        let mut provider = FlatChunkProvider::default();

        // 1. Player at (0, 0): load radius 2 loads [-2..=2] x [-2..=2]
        streamer.update_for_player_chunk(0, 0, &mut provider);
        assert_eq!(streamer.resident_chunk_count(), 25);

        // 2. Player moves to (1, 0): loads [-1..=3] x [-2..=2]
        // Chunks at x = -2 (distance 3 from x = 1) remain resident because 3 <= evict_radius(3)
        streamer.update_for_player_chunk(1, 0, &mut provider);
        assert!(streamer.is_chunk_resident(-2, 0));
        assert!(streamer.is_chunk_resident(3, 0));
        assert_eq!(streamer.resident_chunk_count(), 30); // 6 x 5 window

        // 3. Player moves back to (0, 0): no thrashing, (-2, 0) was never evicted
        streamer.update_for_player_chunk(0, 0, &mut provider);
        assert!(streamer.is_chunk_resident(-2, 0));

        // 4. Player moves far away to (4, 0): distance to (-2, 0) is |-2 - 4| = 6 > evict_radius(3)
        streamer.update_for_player_chunk(4, 0, &mut provider);
        assert!(!streamer.is_chunk_resident(-2, 0));
        assert!(streamer.is_chunk_resident(4, 0));
    }

    #[test]
    fn test_hard_cap_and_lru_fallback() {
        // Construct streamer with load_radius 1, evict_radius 3, but artificial hard cap = 10
        let mut streamer = OutdoorChunkStreamer::new_with_cap(1, 3, 10);
        let mut provider = FlatChunkProvider::default();

        // Step 1: Player at (0, 0) loads 3x3 = 9 chunks
        streamer.update_for_player_chunk(0, 0, &mut provider);
        assert_eq!(streamer.resident_chunk_count(), 9);

        // Step 2: Player moves to (1, 0).
        // Load radius 1 requires (2,-1), (2,0), (2,1).
        // Total candidate resident chunks would be 12.
        // Candidates outside load_radius 1 of (1,0) are (-1,-1), (-1,0), (-1,1) (accessed at tick 1).
        // Cap is 10, so 2 oldest chunks are evicted via LRU fallback.
        streamer.update_for_player_chunk(1, 0, &mut provider);
        assert_eq!(streamer.resident_chunk_count(), 10);

        // Chunks inside load radius 1 of (1, 0) MUST remain resident
        for cx in 0..=2 {
            for cy in -1..=1 {
                assert!(
                    streamer.is_chunk_resident(cx, cy),
                    "Chunk ({}, {}) inside load radius should be resident",
                    cx,
                    cy
                );
            }
        }
    }

    #[test]
    fn test_derived_count_budget_continuous_movement() {
        let mut streamer = OutdoorChunkStreamer::new(2, 3);
        let mut provider = FlatChunkProvider::default();

        let budget = streamer.max_resident_chunks(); // 49 for evict_radius = 3

        // Move player across 15 chunk steps along a line
        for step in 0..15 {
            streamer.update_for_player_chunk(step, step / 2, &mut provider);
            assert!(
                streamer.resident_chunk_count() <= budget,
                "Step {}: resident count {} exceeded budget {}",
                step,
                streamer.resident_chunk_count(),
                budget
            );
        }
    }
}

