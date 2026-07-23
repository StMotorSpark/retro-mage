//! Player movement and tile-grid collision resolution.
//!
//! Implements facing-relative movement and circle-vs-AABB tile collision with
//! sliding resolution. Phase 1 scope: single horizontal plane (XZ), Y-axis
//! (elevation) is fixed and ignored during movement resolution.
//!
//! See `docs/architecture/collision.md` for design rationale.

use crate::tiles::TilesBuffer;
use wasm_bindgen::prelude::*;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Default player movement speed in tiles per second.
pub const DEFAULT_PLAYER_SPEED: f32 = 4.0;

/// Default player collision circle radius in tiles.
/// At 0.3, a player fits through a 1-tile-wide doorway with ~0.35 tiles of
/// clearance on each side.
pub const DEFAULT_PLAYER_RADIUS: f32 = 0.3;

/// Default camera look sensitivity in radians per second per unit of look input.
pub const DEFAULT_LOOK_SENSITIVITY: f32 = 2.0;

/// Pitch clamp limit — just under ±90° to prevent gimbal flip.
const PITCH_LIMIT: f32 = std::f32::consts::FRAC_PI_2 * 0.944; // ≈ 85°

// ---------------------------------------------------------------------------
// CollisionConfig
// ---------------------------------------------------------------------------

/// Per-application tunable movement and collision parameters.
///
/// Follows the same app-overridable default pattern as `StreamingConfig` and
/// `max_sight_distance`. Engine ships sensible defaults; a consuming game
/// overrides via `EngineState::set_collision_config`.
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CollisionConfig {
    /// Player movement speed in tiles per second. Default: `DEFAULT_PLAYER_SPEED` (4.0).
    pub player_speed: f32,
    /// Player collision circle radius in tiles. Default: `DEFAULT_PLAYER_RADIUS` (0.3).
    pub player_radius: f32,
    /// Camera look sensitivity (radians/second/unit). Default: `DEFAULT_LOOK_SENSITIVITY` (2.0).
    pub look_sensitivity: f32,
}

#[wasm_bindgen]
impl CollisionConfig {
    #[wasm_bindgen(constructor)]
    pub fn new(player_speed: f32, player_radius: f32, look_sensitivity: f32) -> Self {
        CollisionConfig {
            player_speed,
            player_radius,
            look_sensitivity,
        }
    }
}

impl Default for CollisionConfig {
    fn default() -> Self {
        CollisionConfig {
            player_speed: DEFAULT_PLAYER_SPEED,
            player_radius: DEFAULT_PLAYER_RADIUS,
            look_sensitivity: DEFAULT_LOOK_SENSITIVITY,
        }
    }
}

// ---------------------------------------------------------------------------
// Look input
// ---------------------------------------------------------------------------

/// Apply look input delta to camera yaw and pitch.
///
/// `look_x` rotates yaw (left/right), `look_y` adjusts pitch (up/down).
/// Pitch is clamped to ±85° to prevent gimbal flip.
/// Returns `(new_yaw, new_pitch)`.
pub fn apply_look(
    yaw: f32,
    pitch: f32,
    look_x: f32,
    look_y: f32,
    sensitivity: f32,
    dt: f32,
) -> (f32, f32) {
    let new_yaw = yaw + look_x * sensitivity * dt;
    let new_pitch = (pitch + look_y * sensitivity * dt).clamp(-PITCH_LIMIT, PITCH_LIMIT);
    (new_yaw, new_pitch)
}

// ---------------------------------------------------------------------------
// Movement delta
// ---------------------------------------------------------------------------

/// Compute the desired world-space XZ movement delta from facing-relative input.
///
/// `move_y` = forward/back (positive = forward), `move_x` = strafe right/left
/// (positive = strafe right). Forward and right are derived from `yaw`; pitch
/// is intentionally ignored so horizontal movement stays horizontal.
///
/// Coordinate convention (matches `mat4CameraView` in `packages/render`):
/// - yaw=0 → looking -Z; forward = (+sin(yaw), -cos(yaw)) in XZ
/// - right = (+cos(yaw), -sin(yaw)) in XZ
///
/// Returns `(dx, dz)` — the desired position delta in world XZ.
pub fn compute_movement_delta(
    move_x: f32,
    move_y: f32,
    yaw: f32,
    speed: f32,
    dt: f32,
) -> (f32, f32) {
    let forward_x = yaw.sin();
    let forward_z = -yaw.cos();
    let right_x = yaw.cos();
    let right_z = -yaw.sin();

    let dx = (move_y * forward_x + move_x * right_x) * speed * dt;
    let dz = (move_y * forward_z + move_x * right_z) * speed * dt;
    (dx, dz)
}

// ---------------------------------------------------------------------------
// Collision check
// ---------------------------------------------------------------------------

/// Returns `true` if a circle of `radius` centred at `(px, pz)` overlaps any
/// solid tile in `master_tiles`.
///
/// Each tile is treated as a 1×1 unit AABB centred at `(tile.x, tile.z)` in
/// the XZ plane — i.e. the tile occupies `[tile.x - 0.5, tile.x + 0.5]` in X
/// and `[tile.z - 0.5, tile.z + 0.5]` in Z. Y-axis (elevation) is not
/// considered in phase 1; all solid tiles contribute to XZ collision.
fn check_collision(px: f32, pz: f32, radius: f32, master_tiles: &TilesBuffer) -> bool {
    let r_sq = radius * radius;
    for i in 0..master_tiles.count {
        if master_tiles.solid[i] == 0.0 {
            continue;
        }
        let tx = master_tiles.x[i];
        let tz = master_tiles.z[i];
        // Closest point on tile AABB to player circle centre
        let closest_x = px.clamp(tx - 0.5, tx + 0.5);
        let closest_z = pz.clamp(tz - 0.5, tz + 0.5);
        let dist_sq = (px - closest_x) * (px - closest_x) + (pz - closest_z) * (pz - closest_z);
        if dist_sq < r_sq {
            return true;
        }
    }
    false
}

// ---------------------------------------------------------------------------
// Movement resolution (sliding)
// ---------------------------------------------------------------------------

/// Resolve a desired XZ movement `(dx, dz)` from player position `(px, pz)`
/// against solid tiles, returning the final `(new_px, new_pz)` after collision.
///
/// **Sliding resolution**: if the combined move collides, individual axis
/// components are tried separately so the player slides along walls rather
/// than stopping dead. Resolution order:
///
/// 1. Full move `(dx, dz)` — if clear, take it.
/// 2. X-only move `(dx, 0)` — if clear, accept X.
/// 3. Z-only move `(0, dz)` — if clear, accept Z.
/// 4. Combined accepted axes — if still clear, return.
/// 5. Fallback: stay at `(px, pz)`.
pub fn resolve_movement(
    px: f32,
    pz: f32,
    dx: f32,
    dz: f32,
    radius: f32,
    master_tiles: &TilesBuffer,
) -> (f32, f32) {
    // 1. Full move
    if !check_collision(px + dx, pz + dz, radius, master_tiles) {
        return (px + dx, pz + dz);
    }

    // 2. X-only
    let new_x = if dx.abs() > 1e-6 && !check_collision(px + dx, pz, radius, master_tiles) {
        px + dx
    } else {
        px
    };

    // 3. Z-only
    let new_z = if dz.abs() > 1e-6 && !check_collision(px, pz + dz, radius, master_tiles) {
        pz + dz
    } else {
        pz
    };

    // 4. Combined sliding result
    if !check_collision(new_x, new_z, radius, master_tiles) {
        return (new_x, new_z);
    }

    // 5. Fallback: no movement
    (px, pz)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tiles::TilesBuffer;

    fn make_tiles_with_solid_at(positions: &[(f32, f32, f32)]) -> TilesBuffer {
        let mut buf = TilesBuffer::new();
        for (i, &(x, y, z)) in positions.iter().enumerate() {
            buf.set_tile(i, x, y, z, 1.0, 0.0, 1.0, 0.0);
        }
        buf
    }

    // --- apply_look ---

    #[test]
    fn test_apply_look_yaw_increases_right() {
        let (yaw, _pitch) = apply_look(0.0, 0.0, 1.0, 0.0, 1.0, 1.0);
        assert!((yaw - 1.0).abs() < 1e-5);
    }

    #[test]
    fn test_apply_look_pitch_clamped() {
        // Try to exceed +90°
        let (_yaw, pitch) = apply_look(0.0, 0.0, 0.0, 100.0, 1.0, 1.0);
        assert!(pitch <= PITCH_LIMIT + 1e-5);

        // Try to exceed -90°
        let (_yaw, pitch_neg) = apply_look(0.0, 0.0, 0.0, -100.0, 1.0, 1.0);
        assert!(pitch_neg >= -PITCH_LIMIT - 1e-5);
    }

    // --- compute_movement_delta ---

    #[test]
    fn test_forward_at_yaw_zero_moves_negative_z() {
        // yaw=0 → looking -Z; move_y=1 should produce dz<0
        let (dx, dz) = compute_movement_delta(0.0, 1.0, 0.0, 1.0, 1.0);
        assert!((dx).abs() < 1e-5);
        assert!((dz - (-1.0)).abs() < 1e-5);
    }

    #[test]
    fn test_strafe_right_at_yaw_zero_moves_positive_x() {
        // yaw=0 → right = +X; move_x=1 should produce dx>0
        let (dx, dz) = compute_movement_delta(1.0, 0.0, 0.0, 1.0, 1.0);
        assert!((dx - 1.0).abs() < 1e-5);
        assert!((dz).abs() < 1e-5);
    }

    #[test]
    fn test_forward_at_yaw_quarter_turn_moves_positive_x() {
        use std::f32::consts::FRAC_PI_2;
        // yaw=π/2 → looking +X; move_y=1 should produce dx≈1, dz≈0
        let (dx, dz) = compute_movement_delta(0.0, 1.0, FRAC_PI_2, 1.0, 1.0);
        assert!((dx - 1.0).abs() < 1e-5, "dx={}", dx);
        assert!((dz).abs() < 1e-5, "dz={}", dz);
    }

    #[test]
    fn test_movement_scales_with_speed_and_dt() {
        let (dx1, _) = compute_movement_delta(0.0, 1.0, 0.0, 4.0, 0.016);
        let (dx2, _) = compute_movement_delta(0.0, 1.0, 0.0, 4.0, 1.0);
        assert!((dx1).abs() < 1e-5);
        assert!((dx2).abs() < 1e-5);
        // dz should scale with dt
        let (_, dz1) = compute_movement_delta(0.0, 1.0, 0.0, 4.0, 0.016);
        let (_, dz2) = compute_movement_delta(0.0, 1.0, 0.0, 4.0, 1.0);
        assert!((dz1 - (-4.0 * 0.016)).abs() < 1e-5);
        assert!((dz2 - (-4.0)).abs() < 1e-5);
    }

    // --- check_collision (via resolve_movement) ---

    #[test]
    fn test_open_space_no_collision() {
        let tiles = TilesBuffer::new(); // no tiles
        let (nx, nz) = resolve_movement(0.0, 0.0, 1.0, 1.0, 0.3, &tiles);
        assert!((nx - 1.0).abs() < 1e-5);
        assert!((nz - 1.0).abs() < 1e-5);
    }

    #[test]
    fn test_wall_blocks_direct_movement() {
        // Solid wall at (0, 0, -2); player at (0, 0) moving toward -Z
        let tiles = make_tiles_with_solid_at(&[(0.0, 0.0, -2.0)]);
        // Try to move far forward — should be stopped before wall face at z=-1.5
        let (_, nz) = resolve_movement(0.0, 0.0, 0.0, -5.0, 0.3, &tiles);
        // Must not penetrate the tile face at z = -1.5 minus radius
        assert!(nz > -1.5 + 0.3 - 1e-3, "nz={}", nz);
    }

    #[test]
    fn test_non_solid_tile_does_not_block() {
        let mut tiles = TilesBuffer::new();
        tiles.set_tile(0, 0.0, 0.0, -0.5, 1.0, 0.0, 0.0, 0.0); // solid=0
        let (_, nz) = resolve_movement(0.0, 0.0, 0.0, -1.0, 0.3, &tiles);
        assert!((nz - (-1.0)).abs() < 1e-5);
    }

    #[test]
    fn test_wall_sliding_x_blocked_z_slides() {
        // Solid wall along X at z=0 (tile centred at (0, 0, 0) — right in front)
        // Player at (0, 0) tries to move diagonally (+X, -Z):
        // full move blocked → X alone succeeds, Z blocked by tile
        let tiles = make_tiles_with_solid_at(&[(0.0, 0.0, 0.0)]);
        // Player starts well clear of tile, moves diagonally
        let (nx, nz) = resolve_movement(-2.0, 0.0, 1.5, -0.1, 0.3, &tiles);
        // X moved (slide), Z either blocked or minor
        assert!(nx > -2.0, "Expected X movement (slide), got nx={}", nx);
    }

    #[test]
    fn test_wall_sliding_z_blocked_x_slides() {
        // Solid wall at (0, 0, -0.5) very close ahead; player at (0, 2) moving toward tile
        // and strafing right; Z is blocked, X should slide
        let tiles = make_tiles_with_solid_at(&[(0.0, 0.0, 0.0)]);
        let (nx, _nz) = resolve_movement(0.0, 2.0, 0.5, -3.0, 0.3, &tiles);
        // X should have moved (slide)
        assert!(nx > 0.0, "Expected X slide, got nx={}", nx);
    }

    #[test]
    fn test_player_stays_put_when_fully_blocked() {
        // Surround player with solid tiles in all four cardinal directions
        let tiles = make_tiles_with_solid_at(&[
            (1.0, 0.0, 0.0),
            (-1.0, 0.0, 0.0),
            (0.0, 0.0, 1.0),
            (0.0, 0.0, -1.0),
        ]);
        let (nx, nz) = resolve_movement(0.0, 0.0, 0.5, 0.5, 0.3, &tiles);
        assert!((nx).abs() < 1e-5, "nx={}", nx);
        assert!((nz).abs() < 1e-5, "nz={}", nz);
    }

    #[test]
    fn test_collision_config_defaults() {
        let cfg = CollisionConfig::default();
        assert_eq!(cfg.player_speed, DEFAULT_PLAYER_SPEED);
        assert_eq!(cfg.player_radius, DEFAULT_PLAYER_RADIUS);
        assert_eq!(cfg.look_sensitivity, DEFAULT_LOOK_SENSITIVITY);
    }

    #[test]
    fn test_collision_config_custom() {
        let cfg = CollisionConfig::new(6.0, 0.4, 3.0);
        assert_eq!(cfg.player_speed, 6.0);
        assert_eq!(cfg.player_radius, 0.4);
        assert_eq!(cfg.look_sensitivity, 3.0);
    }
}
