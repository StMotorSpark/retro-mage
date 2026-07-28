//! Browser-facing transport for authoritative global world content.
//!
//! JS submits level content through scalar calls; Rust contract structs never cross
//! the boundary. Output uses fixed-capacity SoA buffers. Overflow is sticky and
//! observable; no content is silently truncated.

use std::collections::HashMap;

use wasm_bindgen::prelude::*;

use crate::world_runtime::WorldRuntime;
use crate::level_provider::{LevelProviderFailure, LevelProviderMetadata, LevelProviderOutcome, LevelProviderResult, OpaqueProviderData};
use crate::world::{Bounds, LevelActor, LevelAnchor, LevelDefinition, LevelLight, LevelTile, PersistencePolicy, RuntimeState, TileOpenings, Transform, Vec3};
use crate::world_manifest::{AnchorRef, AnchorSharingPolicy, CrossingPolicy, DefinitionDescriptor, LevelLink, LinkDirection, LinkPreloadPolicy, LinkTarget, LinkTransform};

pub const DEFAULT_WORLD_TILES: usize = 4096;
pub const DEFAULT_WORLD_ACTORS: usize = 256;
pub const DEFAULT_WORLD_LIGHTS: usize = 128;
pub const DEFAULT_WORLD_INSTANCES: usize = 64;

struct DefinitionBuilder { definition: LevelDefinition }

#[wasm_bindgen]
pub struct WorldTransport {
    scheduler: crate::streaming_scheduler::StreamingScheduler,
    runtime: WorldRuntime,
    definitions: HashMap<String, LevelDefinition>,
    builders: HashMap<String, DefinitionBuilder>,
    tile_x: Vec<f32>, tile_y: Vec<f32>, tile_z: Vec<f32>, tile_id: Vec<f32>, tile_material: Vec<f32>, tile_variant: Vec<f32>, tile_orientation: Vec<f32>, tile_solid: Vec<f32>, tile_north: Vec<f32>, tile_east: Vec<f32>, tile_south: Vec<f32>, tile_west: Vec<f32>, tile_opening: Vec<f32>,
    actor_x: Vec<f32>, actor_y: Vec<f32>, actor_z: Vec<f32>, actor_facing: Vec<f32>, actor_sprite: Vec<f32>, actor_active: Vec<f32>,
    light_x: Vec<f32>, light_y: Vec<f32>, light_z: Vec<f32>, light_r: Vec<f32>, light_g: Vec<f32>, light_b: Vec<f32>, light_intensity: Vec<f32>, light_active: Vec<f32>,
    instance_ids: Vec<String>, instance_states: Vec<u32>, instance_render: Vec<f32>, instance_collision: Vec<f32>, instance_simulation: Vec<f32>,
    tiles: usize, actors: usize, lights: usize, instances: usize, overflow: bool,
    frame: u64,
    overflow_diagnostics: Vec<String>,
    skipped_instances: Vec<String>,
    crossing_pose: crate::world::Transform,
    block_on_overflow: bool,
    last_crossing_rejection: u32,
    evictions: Vec<crate::residency::PersistenceHandoff>,
}

#[wasm_bindgen]
impl WorldTransport {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self { Self::with_capacity(DEFAULT_WORLD_TILES, DEFAULT_WORLD_ACTORS, DEFAULT_WORLD_LIGHTS, DEFAULT_WORLD_INSTANCES) }

    pub fn with_capacity(tile_capacity: usize, actor_capacity: usize, light_capacity: usize, instance_capacity: usize) -> Self {
        let policy = crate::streaming_scheduler::SchedulerPolicy { relevance_distance: 60.0, retention_hysteresis: 20.0, default_concurrency: 2 };
        Self {
            runtime: WorldRuntime::new(crate::world_manifest::WorldManifest { definitions: vec![], instances: vec![], links: vec![], starting_locations: vec![] }).expect("empty world manifest"), definitions: HashMap::new(), builders: HashMap::new(),
            tile_x: vec![0.; tile_capacity], tile_y: vec![0.; tile_capacity], tile_z: vec![0.; tile_capacity], tile_id: vec![0.; tile_capacity], tile_material: vec![0.; tile_capacity], tile_variant: vec![0.; tile_capacity], tile_orientation: vec![0.; tile_capacity], tile_solid: vec![0.; tile_capacity], tile_north: vec![0.; tile_capacity], tile_east: vec![0.; tile_capacity], tile_south: vec![0.; tile_capacity], tile_west: vec![0.; tile_capacity], tile_opening: vec![0.; tile_capacity],
            actor_x: vec![0.; actor_capacity], actor_y: vec![0.; actor_capacity], actor_z: vec![0.; actor_capacity], actor_facing: vec![0.; actor_capacity], actor_sprite: vec![0.; actor_capacity], actor_active: vec![0.; actor_capacity],
            light_x: vec![0.; light_capacity], light_y: vec![0.; light_capacity], light_z: vec![0.; light_capacity], light_r: vec![0.; light_capacity], light_g: vec![0.; light_capacity], light_b: vec![0.; light_capacity], light_intensity: vec![0.; light_capacity], light_active: vec![0.; light_capacity],
            instance_ids: Vec::with_capacity(instance_capacity), instance_states: vec![0; instance_capacity], instance_render: vec![0.; instance_capacity], instance_collision: vec![0.; instance_capacity], instance_simulation: vec![0.; instance_capacity],
            tiles: 0, actors: 0, lights: 0, instances: 0, overflow: false, crossing_pose: Transform::IDENTITY, scheduler: crate::streaming_scheduler::StreamingScheduler::new(policy),
            frame: 0, overflow_diagnostics: vec![], skipped_instances: vec![], block_on_overflow: true, last_crossing_rejection: 0, evictions: vec![],
        }
    }

    /// Start definition registration. Bounds are local-space.
    pub fn begin_definition(&mut self, id: &str, version: &str, min_x: f32, min_y: f32, min_z: f32, max_x: f32, max_y: f32, max_z: f32) -> bool {
        if id.trim().is_empty() || version.trim().is_empty() { return false; }
        self.builders.insert(id.into(), DefinitionBuilder { definition: LevelDefinition { id: id.into(), version: version.into(), bounds: Bounds { min: Vec3 { x: min_x, y: min_y, z: min_z }, max: Vec3 { x: max_x, y: max_y, z: max_z } }, tiles: vec![], actors: vec![], lights: vec![], polygons: vec![], anchors: vec![], metadata: Default::default() } }); true
    }

    pub fn definition_tile(&mut self, definition_id: &str, x: f32, y: f32, z: f32, tile_id: u32, material_id: u32, variant: u16, orientation: u8, solid: bool, north: bool, east: bool, south: bool, west: bool, vertical: bool) -> bool {
        let Some(builder) = self.builders.get_mut(definition_id) else { return false; };
        builder.definition.tiles.push(LevelTile { position: Vec3 { x, y, z }, tile_id, material_id, variant, orientation, solid, openings: TileOpenings { north, east, south, west, vertical }, stairs: None }); true
    }

    pub fn definition_actor(&mut self, definition_id: &str, x: f32, y: f32, z: f32, actor_id: &str, sprite_id: u32, facing: f32, active: bool, spawn: bool) -> bool {
        let Some(builder) = self.builders.get_mut(definition_id) else { return false; };
        builder.definition.actors.push(LevelActor { position: Vec3 { x, y, z }, actor_id: actor_id.into(), sprite_id, facing, active, spawn }); true
    }

    pub fn definition_light(&mut self, definition_id: &str, x: f32, y: f32, z: f32, r: f32, g: f32, b: f32, intensity: f32, active: bool) -> bool {
        let Some(builder) = self.builders.get_mut(definition_id) else { return false; };
        builder.definition.lights.push(LevelLight { position: Vec3 { x, y, z }, color: [r, g, b], intensity, active }); true
    }

    pub fn definition_anchor(&mut self, definition_id: &str, anchor_id: &str, x: f32, y: f32, z: f32, min_x: f32, min_y: f32, min_z: f32, max_x: f32, max_y: f32, max_z: f32, direction: u32) -> bool {
        self.definition_anchor_oriented(definition_id, anchor_id, x, y, z, 0.0, min_x, min_y, min_z, max_x, max_y, max_z, direction)
    }

    pub fn definition_anchor_oriented(&mut self, definition_id: &str, anchor_id: &str, x: f32, y: f32, z: f32, yaw: f32, min_x: f32, min_y: f32, min_z: f32, max_x: f32, max_y: f32, max_z: f32, direction: u32) -> bool {
        let Some(builder) = self.builders.get_mut(definition_id) else { return false; };
        let direction = match direction { 0 => crate::world::AnchorDirection::In, 1 => crate::world::AnchorDirection::Out, _ => crate::world::AnchorDirection::Both };
        builder.definition.anchors.push(LevelAnchor { id: anchor_id.into(), transform: Transform::from_translation_yaw_scale(Vec3 { x, y, z }, yaw, 1.0), volume: Bounds { min: Vec3 { x: min_x, y: min_y, z: min_z }, max: Vec3 { x: max_x, y: max_y, z: max_z } }, direction }); true
    }

    pub fn finish_definition(&mut self, id: &str) -> bool {
        let Some(builder) = self.builders.remove(id) else { return false; };
        let descriptor = DefinitionDescriptor { id: builder.definition.id.clone(), version: builder.definition.version.clone(), anchors: builder.definition.anchors.clone() };
        if builder.definition.validate().is_err() { return false; }
        if self.runtime.register_definition(descriptor).is_err() { return false; }
        self.definitions.insert(id.into(), builder.definition);
        true
    }

    pub fn register_instance(&mut self, id: &str, definition_id: &str, x: f32, y: f32, z: f32, qx: f32, qy: f32, qz: f32, qw: f32, scale: f32, persistence: u32) -> bool {
        if self.instances >= self.instance_states.len() {
            self.overflow = true;
            return false;
        }
        let policy = match persistence { 0 => PersistencePolicy::Persistent, 2 => PersistencePolicy::Regenerated, _ => PersistencePolicy::Session };
        let transform = Transform { translation: Vec3 { x, y, z }, rotation: crate::world::Quaternion { x: qx, y: qy, z: qz, w: qw }, scale };
        let Some(definition) = self.definitions.get(definition_id).cloned() else { return false; };
        let instance = crate::world::LevelInstance { id: id.into(), definition_id: definition_id.into(), definition_version: definition.version.clone(), transform, state: RuntimeState::Known, persistence: policy, render_resident: false, collision_active: false, simulation_active: false, restore_status: crate::world::RestoreStatus::None, state_version: String::new(), restore_attempts: 0, handoff_status: crate::world::HandoffStatus::None };
        if self.runtime.register_instance(crate::world_manifest::InstanceDescriptor { instance }).is_err() { return false; }
        self.sync(); true
    }

    /// Start explicit application-owned provider resolution for an instance.
    /// Zero means the instance or request could not be started.
    pub fn begin_load(&mut self, id: &str, source: &str) -> u64 {
        let metadata = LevelProviderMetadata { source: OpaqueProviderData(source.as_bytes().to_vec()), ..Default::default() };
        match self.runtime.begin_load(id, metadata) { Ok(request) => request.request_id, Err(_) => 0 }
    }

    pub fn set_application_payload(&mut self, id: &str, payload: &str) -> bool {
        self.runtime.set_application_payload(id, payload.as_bytes().to_vec()).is_ok()
    }

    pub fn accept_definition(&mut self, request_id: u64, id: &str) -> bool {
        let Some(instance) = self.runtime.instance(id) else { return false; };
        let Some(definition) = self.definitions.get(&instance.definition_id).cloned() else { return false; };
        let result = LevelProviderResult { request_id, instance_id: id.into(), outcome: LevelProviderOutcome::Ready(definition) };
        self.scheduler.handle_completion(&mut self.runtime, result);
        self.sync(); true
    }

    pub fn fail_load(&mut self, request_id: u64, id: &str, message: &str) -> bool {
        let result = LevelProviderResult { request_id, instance_id: id.into(), outcome: LevelProviderOutcome::Failed(LevelProviderFailure::Application(message.into())) };
        self.scheduler.handle_completion(&mut self.runtime, result);
        self.sync(); true
    }

    pub fn cancel_load(&mut self, id: &str) -> bool {
        self.runtime.cancel_load(id, "Transport explicitly cancelled").map(|_| { self.sync(); true }).unwrap_or(false)
    }

    pub fn register_bidirectional_link(&mut self, id: &str, source_instance_id: &str, source_anchor_id: &str, target_instance_id: &str, target_anchor_id: &str) -> bool {
        self.runtime.register_link(LevelLink { id: id.into(), source: AnchorRef { instance_id: source_instance_id.into(), anchor_id: source_anchor_id.into() }, target: LinkTarget::Instance(AnchorRef { instance_id: target_instance_id.into(), anchor_id: target_anchor_id.into() }), direction: LinkDirection::Bidirectional, anchor_sharing: AnchorSharingPolicy::Exclusive, transform: LinkTransform::Spatial, crossing_policy: CrossingPolicy::default(), preload_policy: LinkPreloadPolicy::Distance(10.0) }).is_ok()
    }

    pub fn topology_instance_count(&self) -> usize { self.runtime.topology().instances().count() }
    pub fn topology_has_link(&self, id: &str) -> bool { self.runtime.topology().link(id).is_some() }

    pub fn set_instance_state(&mut self, id: &str, state: u32, render_resident: bool, collision_active: bool, simulation_active: bool) -> bool {
        let state = match state { 2 => RuntimeState::Resident, 3 => RuntimeState::Active, 4 => RuntimeState::Evictable, 5 => RuntimeState::Evicted, 6 => RuntimeState::Failed, _ => RuntimeState::Known };
        if self.runtime.set_transport_state(id, state, render_resident, collision_active, simulation_active).is_err() { return false; }
        self.sync(); true
    }

    pub fn set_current_instance(&mut self, id: &str) -> bool {
        self.runtime.set_current(Some(id)).is_ok()
    }

    /// Engine-owned anchor-volume crossing. Returns true only after target
    /// residency/readiness gate and activation succeed.
    pub fn try_crossing(&mut self, x: f32, y: f32, z: f32, movement_x: f32, movement_z: f32) -> bool {
        let pose = Transform { translation: Vec3 { x, y, z }, rotation: crate::world::Quaternion::IDENTITY, scale: 1.0 };
        let overflowed: Vec<&str> = self.skipped_instances.iter().map(|s| s.as_str()).collect();
        match self.runtime.try_crossing(pose, Vec3 { x: movement_x, y: 0.0, z: movement_z }, &overflowed, self.block_on_overflow) {
            Ok(eval) => {
                self.last_crossing_rejection = match eval.rejection {
                    Some(crate::world_runtime::CrossingRejection::NotReady) => 1,
                    Some(crate::world_runtime::CrossingRejection::ProviderFailed) => 2,
                    Some(crate::world_runtime::CrossingRejection::SceneOverflow) => 3,
                    None => 0,
                };
                if let Some(resolution) = eval.resolution {
                    self.crossing_pose = resolution.player_pose; self.sync(); true
                } else { false }
            }
            _ => false,
        }
    }

    pub fn set_block_on_overflow(&mut self, block: bool) { self.block_on_overflow = block; }
    pub fn last_crossing_rejection(&self) -> u32 { self.last_crossing_rejection }

    pub fn active_instance_id(&self) -> String { self.runtime.current_instance().unwrap_or_default().into() }
    pub fn crossing_pose_x(&self) -> f32 { self.crossing_pose.translation.x }
    pub fn crossing_pose_y(&self) -> f32 { self.crossing_pose.translation.y }
    pub fn crossing_pose_z(&self) -> f32 { self.crossing_pose.translation.z }


    /// Drives one world-aware frame: movement against runtime collision,
    /// directional crossing, streaming relevance, and render publication.
    pub fn tick_engine(&mut self, engine: &mut crate::EngineState, dt: f64) {
        let prev_x = engine.camera.x[0];
        let prev_z = engine.camera.z[0];

        engine.tick_world_aware(dt, self.runtime.collision_world_ref());

        let dx = engine.camera.x[0] - prev_x;
        let dz = engine.camera.z[0] - prev_z;

        if self.try_crossing(engine.camera.x[0], engine.camera.y[0], engine.camera.z[0], dx, dz) {
            engine.camera.x[0] = self.crossing_pose_x();
            engine.camera.y[0] = self.crossing_pose_y();
            engine.camera.z[0] = self.crossing_pose_z();
        }

        self.update_scheduler(engine.camera.x[0], engine.camera.y[0], engine.camera.z[0]);
    }

    pub fn refresh(&mut self) { self.sync(); }
    pub fn clear(&mut self) { self.tiles = 0; self.actors = 0; self.lights = 0; self.instances = 0; self.instance_ids.clear(); self.overflow = false; self.frame = 0; self.overflow_diagnostics.clear(); self.skipped_instances.clear(); self.evictions.clear(); }
    pub fn overflowed(&self) -> bool { self.overflow }
    pub fn overflow_diagnostics_json(&self) -> String { format!("[{}]", self.overflow_diagnostics.join(",")) }
    pub fn skipped_instances_json(&self) -> String { format!("[{}]", self.skipped_instances.iter().map(|s| format!("\"{}\"", s)).collect::<Vec<_>>().join(",")) }
    pub fn take_evictions_json(&mut self) -> String {
        let mut out = String::new();
        out.push('[');
        let mut first = true;
        for handoff in self.evictions.drain(..) {
            if !first { out.push(','); }
            first = false;
            let payload = handoff.opaque_payload.map(|p| String::from_utf8_lossy(&p).into_owned()).unwrap_or_default();
            out.push_str(&format!(r#"{{"instance_id":"{}","eviction_reason":"{}","payload":"{}"}}"#, handoff.instance.id, handoff.eviction_reason, payload));
        }
        out.push(']');
        out
    }
    pub fn tile_count(&self) -> usize { self.tiles }
    pub fn actor_count(&self) -> usize { self.actors }
    pub fn light_count(&self) -> usize { self.lights }
    pub fn instance_count(&self) -> usize { self.instances }
    pub fn tile_capacity(&self) -> usize { self.tile_x.len() }
    pub fn actor_capacity(&self) -> usize { self.actor_x.len() }
    pub fn light_capacity(&self) -> usize { self.light_x.len() }
    pub fn instance_capacity(&self) -> usize { self.instance_states.len() }
    pub fn instance_id(&self, index: usize) -> String { self.instance_ids.get(index).cloned().unwrap_or_default() }
    pub fn instance_state(&self, index: usize) -> u32 { self.instance_states.get(index).copied().unwrap_or(0) }
    pub fn instance_render_resident(&self, index: usize) -> bool { self.instance_render.get(index).copied().unwrap_or(0.) != 0. }
    pub fn instance_collision_active(&self, index: usize) -> bool { self.instance_collision.get(index).copied().unwrap_or(0.) != 0. }
    pub fn instance_simulation_active(&self, index: usize) -> bool { self.instance_simulation.get(index).copied().unwrap_or(0.) != 0. }
}

macro_rules! ptr_api { ($($name:ident: $field:ident),* $(,)?) => {
    #[wasm_bindgen]
    impl WorldTransport { $(pub fn $name(&self) -> *const f32 { self.$field.as_ptr() })* }
}; }
ptr_api!(tiles_x_ptr: tile_x, tiles_y_ptr: tile_y, tiles_z_ptr: tile_z, tiles_tile_id_ptr: tile_id, tiles_material_id_ptr: tile_material, tiles_variant_ptr: tile_variant, tiles_orientation_ptr: tile_orientation, tiles_solid_ptr: tile_solid, tiles_north_ptr: tile_north, tiles_east_ptr: tile_east, tiles_south_ptr: tile_south, tiles_west_ptr: tile_west, tiles_opening_ptr: tile_opening, actors_x_ptr: actor_x, actors_y_ptr: actor_y, actors_z_ptr: actor_z, actors_facing_ptr: actor_facing, actors_sprite_id_ptr: actor_sprite, actors_active_ptr: actor_active, lights_x_ptr: light_x, lights_y_ptr: light_y, lights_z_ptr: light_z, lights_r_ptr: light_r, lights_g_ptr: light_g, lights_b_ptr: light_b, lights_intensity_ptr: light_intensity, lights_active_ptr: light_active);

impl WorldTransport {
    fn sync(&mut self) {
        self.frame += 1;
        self.overflow_diagnostics.clear();
        self.skipped_instances.clear();
        self.tiles = 0; self.actors = 0; self.lights = 0; self.instances = 0; self.instance_ids.clear();
        self.overflow = false;
        let entries: Vec<_> = self.runtime.resident_global_content().map(|(id, content)| (id.to_owned(), content.clone())).collect();
        let ids: Vec<_> = self.runtime.instances().map(|instance| instance.id.clone()).collect();
        for id in ids {
            let Some(instance) = self.runtime.instance(&id) else { continue };
            let content_opt = entries.iter().find(|(entry_id, _)| entry_id == &id).map(|(_, content)| content);

            let (t_len, a_len, l_len) = if let Some(c) = content_opt { (c.tiles.len(), c.actors.len(), c.lights.len()) } else { (0, 0, 0) };

            let instances_req = self.instances + 1;
            let t_req = self.tiles + t_len;
            let a_req = self.actors + a_len;
            let l_req = self.lights + l_len;

            if instances_req > self.instance_states.len() {
                self.overflow = true;
                self.overflow_diagnostics.push(format!("{{\"frame\":{},\"category\":\"instances\",\"requested\":{},\"capacity\":{},\"instance_id\":\"{}\"}}", self.frame, instances_req, self.instance_states.len(), id));
                self.skipped_instances.push(id.clone());
                continue;
            }
            if t_req > self.tile_x.len() {
                self.overflow = true;
                self.overflow_diagnostics.push(format!("{{\"frame\":{},\"category\":\"tiles\",\"requested\":{},\"capacity\":{},\"instance_id\":\"{}\"}}", self.frame, t_req, self.tile_x.len(), id));
                self.skipped_instances.push(id.clone());
                continue;
            }
            if a_req > self.actor_x.len() {
                self.overflow = true;
                self.overflow_diagnostics.push(format!("{{\"frame\":{},\"category\":\"actors\",\"requested\":{},\"capacity\":{},\"instance_id\":\"{}\"}}", self.frame, a_req, self.actor_x.len(), id));
                self.skipped_instances.push(id.clone());
                continue;
            }
            if l_req > self.light_x.len() {
                self.overflow = true;
                self.overflow_diagnostics.push(format!("{{\"frame\":{},\"category\":\"lights\",\"requested\":{},\"capacity\":{},\"instance_id\":\"{}\"}}", self.frame, l_req, self.light_x.len(), id));
                self.skipped_instances.push(id.clone());
                continue;
            }

            self.instance_ids.push(id.clone()); self.instance_states[self.instances] = state_code(instance.state); self.instance_render[self.instances] = instance.render_resident as u8 as f32; self.instance_collision[self.instances] = instance.collision_active as u8 as f32; self.instance_simulation[self.instances] = instance.simulation_active as u8 as f32; self.instances += 1;
            if let Some(content) = content_opt {
                for tile in &content.tiles { let i = self.tiles; self.tile_x[i]=tile.position.x; self.tile_y[i]=tile.position.y; self.tile_z[i]=tile.position.z; self.tile_id[i]=tile.tile_id as f32; self.tile_material[i]=tile.material_id as f32; self.tile_variant[i]=tile.variant as f32; self.tile_orientation[i]=tile.orientation as f32; self.tile_solid[i]=tile.solid as u8 as f32; self.tile_north[i]=tile.openings.north as u8 as f32; self.tile_east[i]=tile.openings.east as u8 as f32; self.tile_south[i]=tile.openings.south as u8 as f32; self.tile_west[i]=tile.openings.west as u8 as f32; self.tile_opening[i]=tile.openings.vertical as u8 as f32; self.tiles+=1; }
                for actor in &content.actors { let i=self.actors; self.actor_x[i]=actor.position.x; self.actor_y[i]=actor.position.y; self.actor_z[i]=actor.position.z; self.actor_facing[i]=actor.facing; self.actor_sprite[i]=actor.sprite_id as f32; self.actor_active[i]=actor.active as u8 as f32; self.actors+=1; }
                for light in &content.lights { let i=self.lights; self.light_x[i]=light.position.x; self.light_y[i]=light.position.y; self.light_z[i]=light.position.z; self.light_r[i]=light.color[0]; self.light_g[i]=light.color[1]; self.light_b[i]=light.color[2]; self.light_intensity[i]=light.intensity; self.light_active[i]=light.active as u8 as f32; self.lights+=1; }
            }
        }
    }
}

fn state_code(state: RuntimeState) -> u32 { match state { RuntimeState::Known => 0, RuntimeState::Loading => 1, RuntimeState::Resident => 2, RuntimeState::Active => 3, RuntimeState::Evictable => 4, RuntimeState::Evicted => 5, RuntimeState::Failed => 6 } }

impl Default for WorldTransport { fn default() -> Self { Self::new() } }

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn transforms_and_exports_contract_content() {
        let mut t = WorldTransport::with_capacity(1, 1, 1, 1);
        assert!(t.begin_definition("room", "1", 0., 0., 0., 2., 2., 2.));
        assert!(t.definition_tile("room", 1., 0., 2., 7, 3, 2, 1, true, false, false, false, false, true));
        assert!(t.definition_actor("room", 0., 1., 0., "guard", 4, 1.5, true, true));
        assert!(t.definition_light("room", 2., 1., 0., 1., 0.5, 0.25, 2., true));
        assert!(t.finish_definition("room"));
        assert!(t.register_instance("east", "room", 10., 0., 0., 0., 0., 0., 1., 1., 0));
        let request = t.begin_load("east", "test");
        assert!(request > 0);
        assert!(t.accept_definition(request, "east"));
        assert_eq!(t.tile_count(), 1); assert_eq!(t.actor_count(), 1); assert_eq!(t.light_count(), 1);
        assert_eq!(t.tile_x[0], 11.); assert_eq!(t.instance_state(0), 2); assert!(!t.overflowed());
    }
    #[test]
    fn overflow_sticky_and_counts_never_exceed_capacity() {
        let mut t = WorldTransport::with_capacity(0, 0, 0, 1);
        t.begin_definition("r", "1", 0., 0., 0., 1., 1., 1.0);
        assert!(t.definition_tile("r", 0., 0., 0., 1, 1, 0, 0, true, false, false, false, false, false));
        t.finish_definition("r");
        assert!(t.register_instance("i", "r", 0., 0., 0., 0., 0., 0., 1., 1., 0));
        let request = t.begin_load("i", "test");
        assert!(request > 0);
        assert!(t.accept_definition(request, "i"));
        assert!(t.overflowed()); assert_eq!(t.tile_count(), 0);
    }

    #[test]
    fn registers_authored_anchors_instances_and_bidirectional_link() {
        let mut t = WorldTransport::with_capacity(4, 1, 1, 2);
        assert!(t.begin_definition("dungeon", "1", -1., 0., -1., 2., 2., 2.));
        assert!(t.definition_anchor("dungeon", "out", 1., 0., 0., -0.5, 0., -0.5, 0.5, 2., 0.5, 2));
        assert!(t.finish_definition("dungeon"));
        assert!(t.begin_definition("outdoor", "1", -1., 0., -1., 2., 2., 2.));
        assert!(t.definition_anchor("outdoor", "in", 0., 0., 0., -0.5, 0., -0.5, 0.5, 2., 0.5, 2));
        assert!(t.finish_definition("outdoor"));
        assert!(t.register_instance("dungeon-instance", "dungeon", 0., 0., 0., 0., 0., 0., 1., 1., 1));
        assert!(t.register_instance("outdoor-instance", "outdoor", 3., 0., 0., 0., 0., 0., 1., 1., 1));
        assert!(t.register_bidirectional_link("link", "dungeon-instance", "out", "outdoor-instance", "in"));
        assert_eq!(t.topology_instance_count(), 2);
        assert!(t.topology_has_link("link"));
    }

    #[test]
    fn lifecycle_mutation_updates_authoritative_render_and_collision_projection() {
        let mut t = WorldTransport::with_capacity(4, 4, 4, 1);
        assert!(t.begin_definition("room", "1", 0., 0., 0., 2., 2., 2.));
        assert!(t.definition_tile("room", 0., 0., 0., 1, 1, 0, 0, true, false, false, false, false, false));
        assert!(t.finish_definition("room"));
        assert!(t.register_instance("room-instance", "room", 0., 0., 0., 0., 0., 0., 1., 1., 0));
        let request = t.begin_load("room-instance", "test");
        assert!(request > 0);
        assert!(t.accept_definition(request, "room-instance"));
        assert!(t.set_instance_state("room-instance", 3, true, true, true));
        t.refresh();
        assert_eq!(t.instance_state(0), 3);
        assert!(t.instance_render_resident(0));
        assert!(t.instance_collision_active(0));
        assert!(t.set_instance_state("room-instance", 2, true, false, false));
        assert!(t.set_instance_state("room-instance", 4, true, false, false));
        assert!(t.set_instance_state("room-instance", 5, false, false, false));
        t.refresh();
        assert_eq!(t.tile_count(), 0);
        assert!(!t.instance_render_resident(0));
    }

    #[test]
    fn rejects_invalid_authored_definition_at_finish() {
        let mut t = WorldTransport::default();
        assert!(t.begin_definition("bad", "1", 2., 0., 0., 1., 1., 1.));
        assert!(!t.finish_definition("bad"));
    }

    #[test]
    fn tick_engine_orders_movement_crossing_and_scheduler() {
        let mut t = WorldTransport::with_capacity(4, 1, 1, 2);
        assert!(t.begin_definition("room1", "1", -2., 0., -2., 2., 2., 2.));
        assert!(t.definition_anchor("room1", "out", 1., 0., 0., -0.5, 0., -0.5, 0.5, 2., 0.5, 2));
        assert!(t.finish_definition("room1"));
        assert!(t.begin_definition("room2", "1", -2., 0., -2., 2., 2., 2.));
        assert!(t.definition_anchor("room2", "in", 0., 0., 0., -0.5, 0., -0.5, 0.5, 2., 0.5, 2));
        assert!(t.finish_definition("room2"));

        assert!(t.register_instance("inst1", "room1", 0., 0., 0., 0., 0., 0., 1., 1., 1));
        assert!(t.register_instance("inst2", "room2", 3., 0., 0., 0., 0., 0., 1., 1., 1));
        assert!(t.register_bidirectional_link("link", "inst1", "out", "inst2", "in"));

        let req1 = t.begin_load("inst1", "test");
        assert!(t.accept_definition(req1, "inst1"));
        assert!(t.set_instance_state("inst1", 3, true, true, true));
        assert!(t.set_current_instance("inst1"));

        let mut engine = crate::EngineState::new();
        engine.global_collision_configured = true;
        engine.set_player_speed(10.0);
        engine.camera.x[0] = 0.0;
        engine.camera.y[0] = 0.0;
        engine.camera.z[0] = 0.0;

        // Move towards the anchor
        engine.set_input(0.0, 1.0, 0.0, 0.0, 0.0, 0, 0); // Move forward (Z direction)

        // First tick moves the player closer
        t.tick_engine(&mut engine, 0.05);
        assert_eq!(t.active_instance_id(), "inst1");

        // Ensure scheduler has queued the preload
        assert!(t.scheduler_queue_depth() > 0 || t.scheduler_active_request_count() > 0);

        let req2 = t.begin_load("inst2", "test");
        if req2 > 0 { t.accept_definition(req2, "inst2"); }
        assert!(t.set_instance_state("inst2", 2, true, true, false));

        // Now force the player into the crossing volume (before center to pass directional check)
        engine.camera.x[0] = 0.6;
        engine.camera.z[0] = 0.0;
        engine.set_player_speed(2.0); // Move 0.2 in dt=0.1
        engine.set_input(1.0, 0.0, 0.0, 0.0, 0.0, 0, 0); // Move right (X direction)
        t.tick_engine(&mut engine, 0.1);

        // Crossing should have triggered
        assert_eq!(t.active_instance_id(), "inst2");
    }
}

#[wasm_bindgen]
impl WorldTransport {
    pub fn set_scheduler_policy(&mut self, relevance_distance: f32, retention_hysteresis: f32, max_concurrent_loads: usize) -> bool {
        if !relevance_distance.is_finite() || relevance_distance < 0.0 || !retention_hysteresis.is_finite() || retention_hysteresis < 0.0 || max_concurrent_loads == 0 { return false; }
        self.scheduler.policy.relevance_distance = relevance_distance;
        self.scheduler.policy.retention_hysteresis = retention_hysteresis;
        self.scheduler.policy.default_concurrency = max_concurrent_loads;
        true
    }

    pub fn update_scheduler(&mut self, player_x: f32, player_y: f32, player_z: f32) {
        let player_pose = Transform { translation: Vec3 { x: player_x, y: player_y, z: player_z }, rotation: crate::world::Quaternion::IDENTITY, scale: 1.0 };
        let active_pins = std::collections::HashSet::new();
        let mut residency_states = std::collections::HashMap::new();
        let mut priorities = std::collections::HashMap::new();
        for desc in self.runtime.topology().instances() {
            residency_states.insert(desc.instance.id.clone(), self.runtime.state(&desc.instance.id).unwrap_or(crate::world::RuntimeState::Known));
            priorities.insert(desc.instance.id.clone(), 0);
        }
        let ctx = crate::streaming_scheduler::PlannerContext {
            current_instance: self.runtime.current_instance(),
            player_pose,
            topology: self.runtime.topology(),
            active_pins: &active_pins,
            residency_states: &residency_states,
            priorities: &priorities,
            policy: &self.scheduler.policy,
        };
        let decisions = crate::streaming_scheduler::evaluate_intent(ctx);
        let handoffs = self.scheduler.update(&mut self.runtime, &decisions);
        for h in handoffs { self.evictions.push(h); }
        self.sync();
    }

    pub fn scheduler_active_request_count(&self) -> usize { self.scheduler.active_requests.len() }
    pub fn scheduler_active_request_instance(&self, index: usize) -> String { self.scheduler.active_requests.iter().nth(index).cloned().unwrap_or_default() }
    pub fn scheduler_active_request_id(&self, index: usize) -> f64 {
        let instance = self.scheduler_active_request_instance(index);
        self.scheduler.diagnostics.get(&instance).and_then(|d| d.request_id).unwrap_or(0) as f64
    }

    pub fn scheduler_diagnostic_intent(&self, id: &str) -> u32 {
        match self.scheduler.diagnostics.get(id).map(|d| d.intent).unwrap_or(crate::streaming_scheduler::ResidencyIntent::Unneeded) {
            crate::streaming_scheduler::ResidencyIntent::Unneeded => 0,
            crate::streaming_scheduler::ResidencyIntent::Prefetch => 1,
            crate::streaming_scheduler::ResidencyIntent::Required => 2,
            crate::streaming_scheduler::ResidencyIntent::Pinned => 3,
        }
    }

    pub fn scheduler_queue_depth(&self) -> usize { self.scheduler.queue.len() }

    pub fn pending_requests_json(&self) -> String {
        let mut out = String::new();
        out.push('[');
        let mut first = true;
        for req in &self.scheduler.queue {
            if !first { out.push(','); }
            first = false;
            let intent = self.scheduler.diagnostics.get(&req.instance_id).map(|d| format!("{:?}", d.intent)).unwrap_or_else(|| "Unneeded".into());
            let reason = self.scheduler.diagnostics.get(&req.instance_id).and_then(|d| d.cancel_reason.as_deref()).unwrap_or("Queued");
            out.push_str(&format!(r#"{{"instance_id":"{}","request_id":null,"priority":{},"intent":"{}","reason":"{}"}}"#, req.instance_id, req.priority, intent, reason));
        }
        for id in &self.scheduler.active_requests {
            if !first { out.push(','); }
            first = false;
            let diag = self.scheduler.diagnostics.get(id);
            let intent = diag.map(|d| format!("{:?}", d.intent)).unwrap_or_else(|| "Unneeded".into());
            let reason = diag.and_then(|d| d.cancel_reason.as_deref()).unwrap_or("Active");
            let req_id = diag.and_then(|d| d.request_id).map(|r| r.to_string()).unwrap_or_else(|| "null".into());
            let priority = diag.map(|d| d.priority).unwrap_or(0);
            out.push_str(&format!(r#"{{"instance_id":"{}","request_id":{},"priority":{},"intent":"{}","reason":"{}"}}"#, id, req_id, priority, intent, reason));
        }
        out.push(']');
        out
    }
}
