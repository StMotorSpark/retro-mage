//! Tile geometry buffer storage (SoA fixed-size array for max 1024 visible tiles).

pub const MAX_TILES: usize = 1024;

#[derive(Debug)]
pub struct TilesBuffer {
    pub x: [f32; MAX_TILES],
    pub y: [f32; MAX_TILES],
    pub z: [f32; MAX_TILES],
    pub tile_id: [f32; MAX_TILES],
    pub variant: [f32; MAX_TILES],
    pub solid: [f32; MAX_TILES],
    pub vertical_opening: [f32; MAX_TILES],
    pub count: usize,
}

impl TilesBuffer {
    pub fn new() -> Self {
        Self {
            x: [0.0; MAX_TILES],
            y: [0.0; MAX_TILES],
            z: [0.0; MAX_TILES],
            tile_id: [0.0; MAX_TILES],
            variant: [0.0; MAX_TILES],
            solid: [0.0; MAX_TILES],
            vertical_opening: [0.0; MAX_TILES],
            count: 0,
        }
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
        if index >= MAX_TILES {
            return false;
        }
        self.x[index] = x;
        self.y[index] = y;
        self.z[index] = z;
        self.tile_id[index] = tile_id;
        self.variant[index] = variant;
        self.solid[index] = solid;
        self.vertical_opening[index] = vertical_opening;
        if index >= self.count {
            self.count = index + 1;
        }
        true
    }

    pub fn set_count(&mut self, count: usize) -> bool {
        if count > MAX_TILES {
            return false;
        }
        self.count = count;
        true
    }
}

impl Default for TilesBuffer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tiles_buffer_max_size() {
        let buffer = TilesBuffer::new();
        assert_eq!(buffer.x.len(), MAX_TILES);
        assert_eq!(buffer.y.len(), MAX_TILES);
        assert_eq!(buffer.z.len(), MAX_TILES);
        assert_eq!(buffer.tile_id.len(), MAX_TILES);
        assert_eq!(buffer.variant.len(), MAX_TILES);
        assert_eq!(buffer.solid.len(), MAX_TILES);
        assert_eq!(buffer.vertical_opening.len(), MAX_TILES);
        assert_eq!(MAX_TILES, 1024);
    }

    #[test]
    fn test_tiles_buffer_write_read_roundtrip() {
        let mut buffer = TilesBuffer::new();
        assert_eq!(buffer.solid[0], 0.0);
        assert_eq!(buffer.vertical_opening[0], 0.0);
        let ok = buffer.set_tile(0, 1.0, 0.0, -1.0, 12.0, 3.0, 1.0, 1.0);
        assert!(ok);
        assert_eq!(buffer.x[0], 1.0);
        assert_eq!(buffer.y[0], 0.0);
        assert_eq!(buffer.z[0], -1.0);
        assert_eq!(buffer.tile_id[0], 12.0);
        assert_eq!(buffer.variant[0], 3.0);
        assert_eq!(buffer.solid[0], 1.0);
        assert_eq!(buffer.vertical_opening[0], 1.0);
        assert_eq!(buffer.count, 1);
    }

    #[test]
    fn test_tiles_buffer_out_of_bounds() {
        let mut buffer = TilesBuffer::new();
        let ok = buffer.set_tile(1024, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0);
        assert!(!ok);
    }
}
