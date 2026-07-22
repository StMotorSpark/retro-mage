//! Application-facing streaming configuration surface.
//!
//! Per `docs/architecture/world-streaming.md`'s three-tier control split,
//! app-tunable streaming knobs (outdoor load/evict radius, indoor hop depth,
//! seam trigger distance) are exposed via `StreamingConfig` and engine methods,
//! keeping internal resident-set bookkeeping and LRU tracking unexposed.

use wasm_bindgen::prelude::*;
use crate::chunk::CHUNK_SIZE;

/// Application-tunable streaming configuration.
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StreamingConfig {
    pub outdoor_load_radius: i32,
    pub outdoor_evict_radius: i32,
    pub indoor_hop_depth: u32,
    pub seam_trigger_distance: f32,
}

impl Default for StreamingConfig {
    fn default() -> Self {
        Self {
            outdoor_load_radius: 2,
            outdoor_evict_radius: 3,
            indoor_hop_depth: 1,
            seam_trigger_distance: 5.0,
        }
    }
}

#[wasm_bindgen]
impl StreamingConfig {
    #[wasm_bindgen(constructor)]
    pub fn new(
        outdoor_load_radius: i32,
        outdoor_evict_radius: i32,
        indoor_hop_depth: u32,
        seam_trigger_distance: f32,
    ) -> Self {
        Self {
            outdoor_load_radius,
            outdoor_evict_radius,
            indoor_hop_depth,
            seam_trigger_distance,
        }
    }
}

impl StreamingConfig {
    /// Validates config against a sight distance threshold.
    ///
    /// Per `docs/architecture/world-streaming.md`, outdoor load radius (converted to tiles)
    /// and seam trigger distance must each cover at least `max_sight_distance`.
    pub fn validate_against_sight_distance(&self, max_sight_distance: f32) -> Vec<String> {
        let mut warnings = Vec::new();

        let load_radius_tiles = (self.outdoor_load_radius as f32) * (CHUNK_SIZE as f32);
        if load_radius_tiles < max_sight_distance {
            warnings.push(format!(
                "Outdoor load radius ({} chunks = {:.1} tiles) is less than max sight distance ({:.1} tiles)",
                self.outdoor_load_radius, load_radius_tiles, max_sight_distance
            ));
        }

        if self.seam_trigger_distance < max_sight_distance {
            warnings.push(format!(
                "Seam trigger distance ({:.1} tiles) is less than max sight distance ({:.1} tiles)",
                self.seam_trigger_distance, max_sight_distance
            ));
        }

        warnings
    }
}
