//! Camera / Player pose buffer storage (single entry pose: x, y, z, yaw, pitch).

pub const MAX_CAMERA: usize = 1;

#[derive(Debug)]
pub struct CameraBuffer {
    pub x: [f32; MAX_CAMERA],
    pub y: [f32; MAX_CAMERA],
    pub z: [f32; MAX_CAMERA],
    pub yaw: [f32; MAX_CAMERA],
    pub pitch: [f32; MAX_CAMERA],
}

impl CameraBuffer {
    pub fn new() -> Self {
        Self {
            x: [0.0; MAX_CAMERA],
            y: [0.0; MAX_CAMERA],
            z: [0.0; MAX_CAMERA],
            yaw: [0.0; MAX_CAMERA],
            pitch: [0.0; MAX_CAMERA],
        }
    }

    pub fn set_camera(&mut self, x: f32, y: f32, z: f32, yaw: f32, pitch: f32) {
        self.x[0] = x;
        self.y[0] = y;
        self.z[0] = z;
        self.yaw[0] = yaw;
        self.pitch[0] = pitch;
    }
}

impl Default for CameraBuffer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_camera_buffer_max_size() {
        let buffer = CameraBuffer::new();
        assert_eq!(buffer.x.len(), MAX_CAMERA);
        assert_eq!(buffer.y.len(), MAX_CAMERA);
        assert_eq!(buffer.z.len(), MAX_CAMERA);
        assert_eq!(buffer.yaw.len(), MAX_CAMERA);
        assert_eq!(buffer.pitch.len(), MAX_CAMERA);
        assert_eq!(MAX_CAMERA, 1);
    }

    #[test]
    fn test_camera_buffer_write_read_roundtrip() {
        let mut buffer = CameraBuffer::new();
        buffer.set_camera(1.5, 2.5, 3.5, 0.785, -0.2);
        assert_eq!(buffer.x[0], 1.5);
        assert_eq!(buffer.y[0], 2.5);
        assert_eq!(buffer.z[0], 3.5);
        assert_eq!(buffer.yaw[0], 0.785);
        assert_eq!(buffer.pitch[0], -0.2);
    }
}
