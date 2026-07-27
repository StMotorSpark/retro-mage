//! Authoritative world composition root.
//!
//! `WorldRuntime` is the one engine-owned authority joining application topology,
//! provider resolution, placed instances, transformed content, and lifecycle.
//! Render residency, collision activity, and simulation activity remain separate
//! flags on each authoritative instance record.

use crate::global_collision::GlobalCollisionWorld;
use crate::instance_runtime::GlobalLevelContent;
use crate::level_provider::{FixtureProvider, LevelProvider, LevelProviderMetadata, LevelProviderRequest, LevelProviderResult, ProviderUpdate};
use crate::world::LevelDefinition;
use crate::residency::{PersistenceHandoff, ResidencyError, ResidencyStore};
use crate::world::{LevelInstance, RuntimeState};
use crate::world_manifest::{AnchorRef, CrossingResolution, InstanceDescriptor, WorldManifest, WorldManifestError, WorldTopology};

#[derive(Debug)]
pub enum WorldRuntimeError {
    Topology(WorldManifestError),
    Residency(ResidencyError),
}

impl From<WorldManifestError> for WorldRuntimeError {
    fn from(error: WorldManifestError) -> Self { Self::Topology(error) }
}
impl From<ResidencyError> for WorldRuntimeError {
    fn from(error: ResidencyError) -> Self { Self::Residency(error) }
}

/// Composition root for one global world.
#[derive(Debug)]
pub struct WorldRuntime {
    topology: WorldTopology,
    residency: ResidencyStore,
}

impl WorldRuntime {
    /// Build topology and authoritative lifecycle records from one manifest.
    pub fn from_manifest(manifest: WorldManifest) -> Result<Self, WorldRuntimeError> {
        let topology = WorldTopology::from_manifest(manifest)?;
        let mut residency = ResidencyStore::new();
        for descriptor in topology.instances() {
            residency.register(descriptor.instance.clone())?;
        }
        Ok(Self { topology, residency })
    }

    pub fn new(manifest: WorldManifest) -> Result<Self, WorldRuntimeError> {
        Self::from_manifest(manifest)
    }

    pub fn topology(&self) -> &WorldTopology { &self.topology }
    pub fn instance(&self, id: &str) -> Option<&LevelInstance> { self.residency.instance(id) }
    pub fn instances(&self) -> impl Iterator<Item = &LevelInstance> {
        self.topology.instances().map(|descriptor| &descriptor.instance)
    }

    /// Register application-owned definition metadata before provider resolution.
    pub fn register_definition(&mut self, definition: crate::world_manifest::DefinitionDescriptor) -> Result<(), WorldRuntimeError> {
        self.topology.register_definition(definition)?;
        Ok(())
    }

    /// Convenience adapter for scalar/browser callers that submit a complete
    /// authored definition. Normal applications call `resolve` with their own provider.
    pub fn resolve_definition(&mut self, id: &str, definition: LevelDefinition) -> Result<ProviderUpdate, WorldRuntimeError> {
        let mut provider = FixtureProvider::ready(definition);
        self.resolve(&mut provider, id, Default::default())
    }
    pub fn state(&self, id: &str) -> Option<RuntimeState> { self.residency.state(id) }

    /// Add application-discovered topology and its authoritative lifecycle record.
    pub fn register_link(&mut self, link: crate::world_manifest::LevelLink) -> Result<(), WorldRuntimeError> {
        self.topology.register_link(link)?;
        Ok(())
    }

    pub fn register_instance(&mut self, descriptor: InstanceDescriptor) -> Result<(), WorldRuntimeError> {
        self.topology.register_instance(descriptor.clone())?;
        if let Err(error) = self.residency.register(descriptor.instance) {
            // Topology registration succeeded only after validation. Keep both stores
            // aligned if a future lifecycle validation rule rejects the record.
            return Err(error.into());
        }
        Ok(())
    }

    /// Create definition-backed link target with stable manifest identity, then
    /// expose it to provider-backed residency like any other instance.
    pub fn materialize_link_target(&mut self, link_id: &str) -> Result<String, WorldRuntimeError> {
        let id = self.topology.materialize_link_target(link_id)?;
        if self.residency.instance(&id).is_none() {
            let descriptor = self.topology.instance(&id).expect("materialized instance").clone();
            self.residency.register(descriptor.instance)?;
        }
        Ok(id)
    }

    /// Resolve transition topology, materialize dynamic targets, and commit target
    /// placement to same authoritative lifecycle record.
    pub fn resolve_crossing(&mut self, link_id: &str, from: &AnchorRef, player_pose: crate::world::Transform) -> Result<CrossingResolution, WorldRuntimeError> {
        let target_id = self.materialize_link_target(link_id)?;
        let resolution = self.topology.resolve_crossing(link_id, from, player_pose)?;
        self.residency.set_transform(&target_id, resolution.instance_transform)?;
        self.sync_topology_instance(&target_id);
        Ok(resolution)
    }

    pub fn begin_load(&mut self, id: &str, metadata: LevelProviderMetadata) -> Result<LevelProviderRequest, WorldRuntimeError> {
        let request = self.residency.begin_load(id, metadata)?;
        self.sync_topology_instance(id);
        Ok(request)
    }

    pub fn resolve<P: LevelProvider + ?Sized>(&mut self, provider: &mut P, id: &str, metadata: LevelProviderMetadata) -> Result<ProviderUpdate, WorldRuntimeError> {
        let update = self.residency.resolve(provider, id, metadata)?;
        self.sync_topology_instance(id);
        Ok(update)
    }

    /// Accept async provider result. Accepted definitions and transformed global
    /// content update same authoritative instance record queried by consumers.
    pub fn accept(&mut self, result: LevelProviderResult) -> Result<ProviderUpdate, WorldRuntimeError> {
        let id = result.instance_id.clone();
        let update = self.residency.accept(result)?;
        self.sync_topology_instance(&id);
        Ok(update)
    }

    pub fn cancel_load(&mut self, id: &str) -> Result<Option<LevelProviderRequest>, WorldRuntimeError> {
        let request = self.residency.cancel_load(id)?;
        self.sync_topology_instance(id);
        Ok(request)
    }

    pub fn activate(&mut self, id: &str) -> Result<(), WorldRuntimeError> {
        self.residency.activate(id)?;
        self.sync_topology_instance(id);
        Ok(())
    }
    pub fn activate_for_crossing(&mut self, id: &str, safe_arrival_pose: bool) -> Result<bool, WorldRuntimeError> {
        let activated = self.residency.activate_for_crossing(id, safe_arrival_pose)?;
        self.sync_topology_instance(id);
        Ok(activated)
    }
    pub fn mark_evictable(&mut self, id: &str) -> Result<(), WorldRuntimeError> {
        self.residency.mark_evictable(id)?;
        self.sync_topology_instance(id);
        Ok(())
    }
    pub fn evict(&mut self, id: &str) -> Result<PersistenceHandoff, WorldRuntimeError> {
        let handoff = self.residency.evict(id)?;
        self.sync_topology_instance(id);
        Ok(handoff)
    }
    pub fn set_current(&mut self, id: Option<&str>) -> Result<(), WorldRuntimeError> { Ok(self.residency.set_current(id)?) }
    pub fn pin(&mut self, id: &str, pinned: bool) -> Result<(), WorldRuntimeError> { Ok(self.residency.pin(id, pinned)?) }
    pub fn set_transition_pair(&mut self, a: &str, b: &str, pinned: bool) -> Result<(), WorldRuntimeError> { Ok(self.residency.set_transition_pair(a, b, pinned)?) }

    /// Render query: resident transformed content only.
    pub fn resident_global_content(&self) -> impl Iterator<Item = (&str, &GlobalLevelContent)> {
        self.residency.resident_content()
    }

    /// Collision query: same resident records, filtered by collision activity.
    pub fn active_collision_instance_ids(&self) -> impl Iterator<Item = &str> {
        self.residency.active_collision_ids()
    }

    pub fn collision_world(&self) -> GlobalCollisionWorld { self.residency.collision_world() }
    pub fn render_resident(&self, id: &str) -> bool { self.residency.render_resident(id) }
    pub fn collision_active(&self, id: &str) -> bool { self.residency.collision_active(id) }
    pub fn simulation_active(&self, id: &str) -> bool { self.residency.simulation_active(id) }

    /// Browser adapter lifecycle gate. State changes still execute through
    /// ResidencyStore; transport never owns a second lifecycle record.
    pub fn set_transport_state(&mut self, id: &str, state: RuntimeState, render: bool, collision: bool, simulation: bool) -> Result<(), WorldRuntimeError> {
        match state {
            RuntimeState::Active => self.activate(id)?,
            RuntimeState::Evictable => self.mark_evictable(id)?,
            RuntimeState::Evicted => { let _ = self.evict(id)?; },
            RuntimeState::Resident => self.residency.set_data_readiness(id, render, collision)?,
            RuntimeState::Known | RuntimeState::Loading | RuntimeState::Failed => {
                return Err(ResidencyError::InvalidTransition { instance_id: id.into(), from: self.state(id).unwrap_or(RuntimeState::Known), to: state }.into())
            }
        }
        self.residency.set_bridge_flags(id, render, collision, simulation)?;
        self.sync_topology_instance(id);
        Ok(())
    }

    fn sync_topology_instance(&mut self, id: &str) {
        let Some(runtime) = self.residency.instance(id).cloned() else { return };
        if let Some(topology) = self.topology.instance_mut(id) {
            topology.instance = runtime;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::level_provider::FixtureProvider;
    use crate::world::{Bounds, LevelDefinition, LevelInstance, PersistencePolicy, Transform, Vec3};
    use crate::world_manifest::{DefinitionDescriptor, WorldManifest};

    fn definition() -> LevelDefinition {
        LevelDefinition { id: "room".into(), version: "1".into(), bounds: Bounds { min: Vec3::ZERO, max: Vec3 { x: 1.0, y: 1.0, z: 1.0 } }, tiles: vec![crate::world::LevelTile { position: Vec3::ZERO, tile_id: 0, material_id: 0, variant: 0, orientation: 0, solid: true, openings: Default::default(), stairs: None }], actors: vec![], lights: vec![], polygons: vec![], anchors: vec![], metadata: Default::default() }
    }
    fn manifest() -> WorldManifest {
        WorldManifest { definitions: vec![DefinitionDescriptor { id: "room".into(), version: "1".into(), anchors: vec![] }], instances: vec![InstanceDescriptor { instance: LevelInstance { id: "room-instance".into(), definition_id: "room".into(), definition_version: "1".into(), transform: Transform::IDENTITY, state: RuntimeState::Known, persistence: PersistencePolicy::Session, render_resident: false, collision_active: false, simulation_active: false } }], links: vec![], starting_locations: vec![] }
    }

    #[test]
    fn provider_updates_single_render_collision_query_authority() {
        let mut runtime = WorldRuntime::new(manifest()).unwrap();
        let mut provider = FixtureProvider::ready(definition());
        runtime.resolve(&mut provider, "room-instance", Default::default()).unwrap();
        assert_eq!(runtime.resident_global_content().count(), 1);
        runtime.activate("room-instance").unwrap();
        assert_eq!(runtime.active_collision_instance_ids().collect::<Vec<_>>(), vec!["room-instance"]);
        assert!(runtime.simulation_active("room-instance"));
        assert_eq!(runtime.topology().instance("room-instance").unwrap().instance.state, RuntimeState::Active);
    }
}
