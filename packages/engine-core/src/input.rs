//! Input state storage for engine-core.

/// Internal representation of normalized per-frame input.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct InputState {
    pub move_x: f32,
    pub move_y: f32,
    pub look_x: f32,
    pub look_y: f32,
    pub vertical: f32,
    pub buttons: u32,
    pub buttons_pressed: u32,
}

impl InputState {
    pub fn new() -> Self {
        Self::default()
    }
}
