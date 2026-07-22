//! Actors buffer storage (SoA fixed-size array for max 64 actors).

pub const MAX_ACTORS: usize = 64;

#[derive(Debug)]
pub struct ActorsBuffer {
    pub x: [f32; MAX_ACTORS],
    pub y: [f32; MAX_ACTORS],
    pub z: [f32; MAX_ACTORS],
    pub facing: [f32; MAX_ACTORS],
    pub sprite_id: [f32; MAX_ACTORS],
    pub active: [f32; MAX_ACTORS],
}

impl ActorsBuffer {
    pub fn new() -> Self {
        Self {
            x: [0.0; MAX_ACTORS],
            y: [0.0; MAX_ACTORS],
            z: [0.0; MAX_ACTORS],
            facing: [0.0; MAX_ACTORS],
            sprite_id: [0.0; MAX_ACTORS],
            active: [0.0; MAX_ACTORS],
        }
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
        if index >= MAX_ACTORS {
            return false;
        }
        self.x[index] = x;
        self.y[index] = y;
        self.z[index] = z;
        self.facing[index] = facing;
        self.sprite_id[index] = sprite_id;
        self.active[index] = active;
        true
    }

    pub fn active_count(&self) -> usize {
        self.active.iter().filter(|&&a| a != 0.0).count()
    }
}

impl Default for ActorsBuffer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_actors_buffer_max_size() {
        let buffer = ActorsBuffer::new();
        assert_eq!(buffer.x.len(), MAX_ACTORS);
        assert_eq!(buffer.y.len(), MAX_ACTORS);
        assert_eq!(buffer.z.len(), MAX_ACTORS);
        assert_eq!(buffer.facing.len(), MAX_ACTORS);
        assert_eq!(buffer.sprite_id.len(), MAX_ACTORS);
        assert_eq!(buffer.active.len(), MAX_ACTORS);
        assert_eq!(MAX_ACTORS, 64);
    }

    #[test]
    fn test_actors_buffer_write_read_roundtrip() {
        let mut buffer = ActorsBuffer::new();
        let ok = buffer.set_actor(0, 10.5, 20.25, 5.0, 1.57, 42.0, 1.0);
        assert!(ok);
        assert_eq!(buffer.x[0], 10.5);
        assert_eq!(buffer.y[0], 20.25);
        assert_eq!(buffer.z[0], 5.0);
        assert_eq!(buffer.facing[0], 1.57);
        assert_eq!(buffer.sprite_id[0], 42.0);
        assert_eq!(buffer.active[0], 1.0);
    }

    #[test]
    fn test_actors_buffer_active_flag_semantics() {
        let mut buffer = ActorsBuffer::new();
        assert_eq!(buffer.active_count(), 0);
        buffer.set_actor(0, 1.0, 2.0, 3.0, 0.0, 1.0, 1.0);
        buffer.set_actor(5, 4.0, 5.0, 6.0, 0.0, 2.0, 1.0);
        assert_eq!(buffer.active_count(), 2);

        // Deactivate actor 0
        buffer.active[0] = 0.0;
        assert_eq!(buffer.active_count(), 1);
    }

    #[test]
    fn test_actors_buffer_out_of_bounds() {
        let mut buffer = ActorsBuffer::new();
        let ok = buffer.set_actor(64, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0);
        assert!(!ok);
    }
}
