//! Global XZ collision against transformed, collision-active level instances.
//!
//! Keeps player pose/global coordinates independent from residency and topology.

use std::collections::HashMap;

use crate::instance_runtime::GlobalLevelContent;
use crate::world::{Bounds, LevelDefinition, LevelInstance, Transform, Vec3};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SolidAabb {
    pub min: Vec3,
    pub max: Vec3,
}

impl SolidAabb {
    fn intersects_circle(&self, x: f32, y: f32, z: f32, radius: f32, height: f32) -> bool {
        if y >= self.max.y || y + height <= self.min.y { return false; }
        let cx = x.clamp(self.min.x, self.max.x);
        let cz = z.clamp(self.min.z, self.max.z);
        (x - cx).powi(2) + (z - cz).powi(2) < radius * radius
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct CollisionInstance {
    pub id: String,
    pub solids: Vec<SolidAabb>,
    pub surfaces: Vec<crate::world::SupportSurface>,
}

impl CollisionInstance {
    /// Project collision from same transformed content consumed by rendering.
    pub fn from_content(instance_id: &str, content: &GlobalLevelContent) -> Self {
        let solids = content.tiles.iter().filter(|tile| tile.solid).map(|tile| {
            let center = tile.position;
            let local = Bounds {
                min: Vec3 { x: center.x - 0.5, y: center.y, z: center.z - 0.5 },
                max: Vec3 { x: center.x + 0.5, y: center.y + 1.0, z: center.z + 0.5 },
            };
            let mut min = Vec3 { x: f32::INFINITY, y: f32::INFINITY, z: f32::INFINITY };
            let mut max = Vec3 { x: f32::NEG_INFINITY, y: f32::NEG_INFINITY, z: f32::NEG_INFINITY };
            for x in [local.min.x, local.max.x] {
                for y in [local.min.y, local.max.y] {
                    for z in [local.min.z, local.max.z] {
                        let p = Vec3 { x, y, z };
                        min.x = min.x.min(p.x); min.y = min.y.min(p.y); min.z = min.z.min(p.z);
                        max.x = max.x.max(p.x); max.y = max.y.max(p.y); max.z = max.z.max(p.z);
                    }
                }
            }
            SolidAabb { min, max }
        }).collect();
        Self { id: instance_id.to_owned(), solids, surfaces: content.surfaces.clone() }
    }

    /// Compatibility constructor; runtime projection uses `from_content`.
    pub fn from_level(instance: &LevelInstance, definition: &LevelDefinition) -> Self {
        let content = GlobalLevelContent::from_definition(definition, &instance.transform)
            .expect("validated level transform");
        Self::from_content(&instance.id, &content)
    }
}

#[derive(Debug, Default, Clone)]
pub struct GlobalCollisionWorld {
    instances: HashMap<String, CollisionInstance>,
    active: HashMap<String, bool>,
}

impl GlobalCollisionWorld {
    pub fn new() -> Self { Self::default() }

    pub fn set_instance(&mut self, instance: CollisionInstance, collision_active: bool) {
        let id = instance.id.clone();
        self.instances.insert(id.clone(), instance);
        self.active.insert(id, collision_active);
    }

    /// Register one global solid for browser-facing incremental content upload.
    pub fn add_solid(&mut self, instance_id: &str, solid: SolidAabb, collision_active: bool) {
        self.instances
            .entry(instance_id.to_owned())
            .or_insert_with(|| CollisionInstance { id: instance_id.to_owned(), solids: Vec::new(), surfaces: Vec::new() })
            .solids
            .push(solid);
        self.active.insert(instance_id.to_owned(), collision_active);
    }

    pub fn is_empty(&self) -> bool { self.instances.is_empty() }

    pub fn remove_instance(&mut self, id: &str) {
        self.instances.remove(id);
        self.active.remove(id);
    }

    pub fn set_collision_active(&mut self, id: &str, active: bool) -> bool {
        if let Some(value) = self.active.get_mut(id) { *value = active; true } else { false }
    }

    pub fn collision_active(&self, id: &str) -> bool { self.active.get(id).copied().unwrap_or(false) }
    pub fn has_active_geometry(&self) -> bool { self.solids().next().is_some() }

    pub fn solids(&self) -> impl Iterator<Item = &SolidAabb> {
        self.instances.iter().filter(|(id, _)| self.active.get(*id).copied().unwrap_or(false)).flat_map(|(_, instance)| instance.solids.iter())
    }

    pub fn collides(&self, pose: Transform, radius: f32, height: f32) -> bool {
        self.solids().any(|solid| solid.intersects_circle(pose.translation.x, pose.translation.y, pose.translation.z, radius, height))
    }

    /// Resolve horizontal movement in global XZ. Failed combined movement slides
    /// by trying each axis; Y/rotation/scale remain untouched.
    pub fn resolve_movement(&self, pose: Transform, dx: f32, dz: f32, mut vy: f32, config: &crate::collision::CollisionConfig, dt: f32) -> (Transform, f32) {
        let mut result = pose;
        let radius = config.player_radius;
        let height = config.player_height;

        let distance = (dx * dx + dz * dz).sqrt();
        let steps = (distance / (radius.max(0.05) * 0.5)).ceil().max(1.0) as usize;
        let sx = dx / steps as f32;
        let sz = dz / steps as f32;
        
        let min_slope = config.max_walkable_slope.cos();

        for _ in 0..steps {
            let mut combined = result;
            combined.translation.x += sx; combined.translation.z += sz;
            
            let is_blocked = |t: Transform| -> bool {
                if self.collides(t, radius, height) { return true; }
                let check_y = t.translation.y;
                for instance in self.instances.values() {
                    if !self.active.get(&instance.id).copied().unwrap_or(false) { continue; }
                    for s in &instance.surfaces {
                        if !s.walkable || s.normal.y < min_slope {
                            if t.translation.x + radius >= s.bounds.min.x && t.translation.x - radius <= s.bounds.max.x &&
                               t.translation.z + radius >= s.bounds.min.z && t.translation.z - radius <= s.bounds.max.z {
                                let sy = s.height_function[0] * t.translation.x + s.height_function[1] * t.translation.z + s.height_function[2];
                                if sy > check_y && sy < check_y + height { return true; }
                            }
                        }
                    }
                }
                false
            };

            if !is_blocked(combined) { result = combined; continue; }
            let mut x_only = result; x_only.translation.x += sx;
            if !is_blocked(x_only) { result = x_only; }
            let mut z_only = result; z_only.translation.z += sz;
            if !is_blocked(z_only) { result = z_only; }
        }

        let sub_dt = dt / config.max_vertical_substeps as f32;
        let mut rem_dt = dt;
        for _ in 0..config.max_vertical_substeps {
            let step = sub_dt.min(rem_dt);
            if step <= 0.0 { break; }
            rem_dt -= step;
            
            let mut best_y = None;
            for instance in self.instances.values() {
                if !self.active.get(&instance.id).copied().unwrap_or(false) { continue; }
                for s in &instance.surfaces {
                    if !s.walkable || s.normal.y < min_slope { continue; }
                    if result.translation.x + radius >= s.bounds.min.x && result.translation.x - radius <= s.bounds.max.x &&
                       result.translation.z + radius >= s.bounds.min.z && result.translation.z - radius <= s.bounds.max.z {
                        let sy = s.height_function[0] * result.translation.x + s.height_function[1] * result.translation.z + s.height_function[2];
                        if sy <= result.translation.y + 0.1 {
                            if let Some(by) = best_y { if sy > by { best_y = Some(sy); } } else { best_y = Some(sy); }
                        }
                    }
                }
            }
            
            let mut grounded = false;
            if let Some(sy) = best_y {
                if result.translation.y >= sy - config.support_snap_distance && result.translation.y <= sy + 0.1 && vy <= 0.0 {
                    result.translation.y = sy;
                    vy = 0.0;
                    grounded = true;
                }
            }
            
            if !grounded {
                vy -= config.gravity * step;
                if vy < -config.max_fall_speed { vy = -config.max_fall_speed; }
                let mut next_y = result.translation.y + vy * step;
                if let Some(sy) = best_y {
                    if vy < 0.0 && next_y <= sy {
                        next_y = sy;
                        vy = 0.0;
                    }
                }
                result.translation.y = next_y;
            }
            
            let mut lowest_c = None;
            for solid in self.solids() {
                if result.translation.x + radius >= solid.min.x && result.translation.x - radius <= solid.max.x &&
                   result.translation.z + radius >= solid.min.z && result.translation.z - radius <= solid.max.z {
                    if solid.min.y >= result.translation.y {
                        if let Some(cy) = lowest_c { if solid.min.y < cy { lowest_c = Some(solid.min.y); } } else { lowest_c = Some(solid.min.y); }
                    }
                }
            }
            if let Some(cy) = lowest_c {
                if result.translation.y + height > cy {
                    result.translation.y = cy - height;
                    if vy > 0.0 { vy = 0.0; }
                }
            }
        }
        
        (result, vy)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::world::{Bounds, PersistencePolicy, RuntimeState};

    fn level(id: &str, transform: Transform) -> (LevelInstance, LevelDefinition) {
        (LevelInstance { id: id.into(), definition_id: "d".into(), definition_version: "1".into(), transform, state: RuntimeState::Active, persistence: PersistencePolicy::Session, render_resident: true, collision_active: true, simulation_active: true, restore_status: crate::world::RestoreStatus::None, state_version: String::new(), restore_attempts: 0, handoff_status: crate::world::HandoffStatus::None }, LevelDefinition { id: "d".into(), version: "1".into(), bounds: Bounds { min: Vec3::ZERO, max: Vec3 { x: 4.0, y: 2.0, z: 4.0 } }, tiles: vec![crate::world::LevelTile { position: Vec3 { x: 0.0, y: 0.0, z: -2.0 }, tile_id: 0, material_id: 0, variant: 0, orientation: 0, solid: true, openings: Default::default(), stairs: None }], actors: vec![], lights: vec![], polygons: vec![], anchors: vec![], surfaces: vec![], metadata: Default::default() })
    }

    #[test]
    fn rotated_translated_instance_blocks_in_global_space() {
        let (instance, definition) = level("target", Transform::from_translation_yaw_scale(Vec3 { x: 10.0, y: 0.0, z: 5.0 }, std::f32::consts::FRAC_PI_2, 1.0));
        let mut world = GlobalCollisionWorld::new();
        world.set_instance(CollisionInstance::from_level(&instance, &definition), true);
        let pose = Transform { translation: Vec3 { x: 8.0, y: 0.0, z: 5.0 }, ..Transform::IDENTITY };
        assert!(world.collides(pose, 0.3, 1.6));
    }

    #[test]
    fn projection_uses_render_global_tile_positions_without_second_transform() {
        let content = GlobalLevelContent {
            bounds: Bounds { min: Vec3::ZERO, max: Vec3 { x: 12.0, y: 2.0, z: 2.0 } },
            tiles: vec![crate::world::LevelTile { position: Vec3 { x: 10.0, y: 0.0, z: 1.0 }, tile_id: 1, material_id: 2, variant: 0, orientation: 0, solid: true, openings: Default::default(), stairs: None }],
            actors: vec![], lights: vec![], polygons: vec![], surfaces: vec![],
        };
        let projection = CollisionInstance::from_content("global", &content);
        assert_eq!(projection.solids[0].min.x, 9.5);
        assert_eq!(projection.solids[0].max.x, 10.5);
        assert_eq!(projection.solids[0].min.z, 0.5);
        assert_eq!(projection.solids[0].max.z, 1.5);
    }

    #[test]
    fn inactive_target_does_not_block_crossing() {
        let (instance, definition) = level("target", Transform::IDENTITY);
        let mut world = GlobalCollisionWorld::new();
        world.set_instance(CollisionInstance::from_level(&instance, &definition), false);
        let pose = Transform { translation: Vec3 { x: 0.0, y: 0.0, z: -2.0 }, ..Transform::IDENTITY };
        assert!(!world.collides(pose, 0.3, 1.6));
        world.set_collision_active("target", true);
        assert!(world.collides(pose, 0.3, 1.6));
    }

    #[test]
    fn non_solid_tile_and_opening_do_not_block_collision() {
        let (instance, mut definition) = level("open", Transform::IDENTITY);
        definition.tiles[0].solid = false;
        definition.tiles[0].openings.vertical = true;
        let world_instance = CollisionInstance::from_level(&instance, &definition);
        assert!(world_instance.solids.is_empty());
    }

    #[test]
    fn movement_preserves_global_pose_data() {
        let world = GlobalCollisionWorld::new();
        let pose = Transform { translation: Vec3 { x: 2.0, y: 7.0, z: 3.0 }, rotation: crate::world::Quaternion { y: 0.5, w: 0.8660254, ..crate::world::Quaternion::IDENTITY }, scale: 1.0 };
        let mut config = crate::collision::CollisionConfig::default();
        config.gravity = 0.0;
        let (moved, _) = world.resolve_movement(pose, 1.0, -2.0, 0.0, &config, 0.1);
        assert_eq!(moved.translation.y, 7.0); assert_eq!(moved.rotation, pose.rotation);
    }

    #[test]
    fn multiple_incremental_instances_respect_independent_activation() {
        let mut world = GlobalCollisionWorld::new();
        world.add_solid("source", SolidAabb { min: Vec3 { x: -1.0, y: 0.0, z: -1.0 }, max: Vec3 { x: 1.0, y: 2.0, z: 0.0 } }, true);
        world.add_solid("target", SolidAabb { min: Vec3 { x: 9.0, y: 0.0, z: -1.0 }, max: Vec3 { x: 11.0, y: 2.0, z: 0.0 } }, false);
        let source_pose = Transform { translation: Vec3 { x: 0.0, y: 0.0, z: -0.5 }, ..Transform::IDENTITY };
        let target_pose = Transform { translation: Vec3 { x: 10.0, y: 0.0, z: -0.5 }, ..Transform::IDENTITY };
        assert!(world.collides(source_pose, 0.3, 1.6));
        assert!(!world.collides(target_pose, 0.3, 1.6));
        assert!(world.set_collision_active("target", true));
        assert!(world.collides(target_pose, 0.3, 1.6));
        assert!(world.set_collision_active("source", false));
        assert!(!world.collides(source_pose, 0.3, 1.6));
    }

    #[test]
    fn vertical_movement_tests() {
        let mut world = GlobalCollisionWorld::new();
        let mut instance = CollisionInstance { id: "test".into(), solids: vec![], surfaces: vec![] };
        
        instance.surfaces.push(crate::world::SupportSurface {
            bounds: Bounds { min: Vec3 { x: -5.0, y: 0.0, z: -5.0 }, max: Vec3 { x: 5.0, y: 0.0, z: 5.0 } },
            height_function: [0.0, 0.0, 0.0],
            normal: Vec3 { x: 0.0, y: 1.0, z: 0.0 },
            walkable: true,
            metadata: std::collections::HashMap::new(),
        });
        
        instance.solids.push(SolidAabb { min: Vec3 { x: -5.0, y: 2.0, z: -5.0 }, max: Vec3 { x: 5.0, y: 3.0, z: 5.0 } });
        
        world.set_instance(instance, true);
        
        let mut config = crate::collision::CollisionConfig::default();
        config.gravity = 10.0;
        config.player_height = 1.0;
        
        let pose = Transform { translation: Vec3 { x: 0.0, y: 0.0, z: 0.0 }, rotation: crate::world::Quaternion::IDENTITY, scale: 1.0 };
        let (moved, vy) = world.resolve_movement(pose, 0.0, 1.0, 0.0, &config, 0.1);
        assert_eq!(moved.translation.y, 0.0);
        assert_eq!(vy, 0.0);
        
        let pose2 = Transform { translation: Vec3 { x: 6.0, y: 0.0, z: 0.0 }, rotation: crate::world::Quaternion::IDENTITY, scale: 1.0 };
        let (moved2, vy2) = world.resolve_movement(pose2, 0.0, 0.0, 0.0, &config, 0.1);
        assert!(vy2 < 0.0);
        assert!(moved2.translation.y < 0.0);
        
        let pose3 = Transform { translation: Vec3 { x: 0.0, y: 1.0, z: 0.0 }, rotation: crate::world::Quaternion::IDENTITY, scale: 1.0 };
        let (moved3, _vy3) = world.resolve_movement(pose3, 0.0, 0.0, 5.0, &config, 0.1);
        assert!(moved3.translation.y <= 1.0);
    }
}
