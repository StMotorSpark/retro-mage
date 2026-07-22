//! Lights buffer storage (SoA fixed-size array for max 32 lights).

pub const MAX_LIGHTS: usize = 32;

#[derive(Debug)]
pub struct LightsBuffer {
    pub x: [f32; MAX_LIGHTS],
    pub y: [f32; MAX_LIGHTS],
    pub z: [f32; MAX_LIGHTS],
    pub r: [f32; MAX_LIGHTS],
    pub g: [f32; MAX_LIGHTS],
    pub b: [f32; MAX_LIGHTS],
    pub intensity: [f32; MAX_LIGHTS],
    pub active: [f32; MAX_LIGHTS],
}

impl LightsBuffer {
    pub fn new() -> Self {
        Self {
            x: [0.0; MAX_LIGHTS],
            y: [0.0; MAX_LIGHTS],
            z: [0.0; MAX_LIGHTS],
            r: [0.0; MAX_LIGHTS],
            g: [0.0; MAX_LIGHTS],
            b: [0.0; MAX_LIGHTS],
            intensity: [0.0; MAX_LIGHTS],
            active: [0.0; MAX_LIGHTS],
        }
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
        if index >= MAX_LIGHTS {
            return false;
        }
        self.x[index] = x;
        self.y[index] = y;
        self.z[index] = z;
        self.r[index] = r;
        self.g[index] = g;
        self.b[index] = b;
        self.intensity[index] = intensity;
        self.active[index] = active;
        true
    }

    pub fn active_count(&self) -> usize {
        self.active.iter().filter(|&&a| a != 0.0).count()
    }
}

impl Default for LightsBuffer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lights_buffer_max_size() {
        let buffer = LightsBuffer::new();
        assert_eq!(buffer.x.len(), MAX_LIGHTS);
        assert_eq!(buffer.y.len(), MAX_LIGHTS);
        assert_eq!(buffer.z.len(), MAX_LIGHTS);
        assert_eq!(buffer.r.len(), MAX_LIGHTS);
        assert_eq!(buffer.g.len(), MAX_LIGHTS);
        assert_eq!(buffer.b.len(), MAX_LIGHTS);
        assert_eq!(buffer.intensity.len(), MAX_LIGHTS);
        assert_eq!(buffer.active.len(), MAX_LIGHTS);
        assert_eq!(MAX_LIGHTS, 32);
    }

    #[test]
    fn test_lights_buffer_write_read_roundtrip() {
        let mut buffer = LightsBuffer::new();
        let ok = buffer.set_light(0, 1.0, 2.0, 3.0, 0.8, 0.5, 0.2, 10.0, 1.0);
        assert!(ok);
        assert_eq!(buffer.x[0], 1.0);
        assert_eq!(buffer.y[0], 2.0);
        assert_eq!(buffer.z[0], 3.0);
        assert_eq!(buffer.r[0], 0.8);
        assert_eq!(buffer.g[0], 0.5);
        assert_eq!(buffer.b[0], 0.2);
        assert_eq!(buffer.intensity[0], 10.0);
        assert_eq!(buffer.active[0], 1.0);
    }

    #[test]
    fn test_lights_buffer_active_flag_semantics() {
        let mut buffer = LightsBuffer::new();
        assert_eq!(buffer.active_count(), 0);
        buffer.set_light(0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0);
        buffer.set_light(1, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0);
        assert_eq!(buffer.active_count(), 2);

        buffer.active[0] = 0.0;
        assert_eq!(buffer.active_count(), 1);
    }

    #[test]
    fn test_lights_buffer_out_of_bounds() {
        let mut buffer = LightsBuffer::new();
        let ok = buffer.set_light(32, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0);
        assert!(!ok);
    }
}
