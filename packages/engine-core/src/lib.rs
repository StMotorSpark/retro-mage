//! `engine-core`: Rust/WASM simulation core for Retro Mage.
//!
//! This is a placeholder API surface proving the Rust -> WASM -> npm build
//! pipeline end to end. It does not yet contain real simulation logic
//! (world state, fixed-point math, tile/polygon geometry, visibility,
//! collision) — see `world.rs` and `docs/tasks` for that follow-up work.

mod world;

use wasm_bindgen::prelude::*;

/// Placeholder engine state. Currently only tracks an accumulated tick
/// count, enough to prove the WASM round-trip (JS calls `tick`, JS reads
/// the counter back).
#[wasm_bindgen]
pub struct EngineState {
    tick_count: f64,
}

#[wasm_bindgen]
impl EngineState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> EngineState {
        EngineState { tick_count: 0.0 }
    }

    /// Advance the placeholder engine by `dt` seconds.
    pub fn tick(&mut self, dt: f64) {
        self.tick_count += dt;
    }

    /// Read back the accumulated tick count.
    #[wasm_bindgen(getter)]
    pub fn tick_count(&self) -> f64 {
        self.tick_count
    }
}

impl Default for EngineState {
    fn default() -> Self {
        Self::new()
    }
}
