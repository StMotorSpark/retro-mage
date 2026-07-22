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
}
