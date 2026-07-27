//! Provider-backed level-instance residency and activation lifecycle.
//!
//! This layer owns transient runtime content only. Application topology and
//! persistence remain outside it.

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use crate::instance_runtime::{GlobalLevelContent, RuntimeLevelInstance};
use crate::level_provider::{
    LevelProvider, LevelProviderMetadata, LevelProviderRequest, LevelProviderResult,
    LevelProviderFailure, LevelProviderOutcome, LevelProviderCoordinator, ProviderCoordinatorError,
    ProviderUpdate,
};
use crate::world::{LevelInstance, RuntimeState, WorldContractError};

#[derive(Debug, Clone, PartialEq)]
pub struct PersistenceHandoff {
    pub instance: LevelInstance,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ResidencyError {
    UnknownInstance(String),
    InvalidTransition { instance_id: String, from: RuntimeState, to: RuntimeState },
    Pinned(String),
    NotEvictable(String),
    Provider(ProviderCoordinatorError),
    InvalidDefinition(WorldContractError),
}

impl From<ProviderCoordinatorError> for ResidencyError {
    fn from(error: ProviderCoordinatorError) -> Self { Self::Provider(error) }
}

#[derive(Debug)]
struct Record {
    descriptor: LevelInstance,
    definition: Option<Arc<crate::world::LevelDefinition>>,
    global: Option<GlobalLevelContent>,
    render_ready: bool,
    collision_ready: bool,
}

/// Runtime lifecycle controller for application-supplied level instances.
#[derive(Debug, Default)]
pub struct ResidencyStore {
    records: HashMap<String, Record>,
    provider: LevelProviderCoordinator,
    current: Option<String>,
    transition_pairs: HashSet<(String, String)>,
    explicit_pins: HashSet<String>,
}

impl ResidencyStore {
    pub fn new() -> Self { Self::default() }

    pub fn register(&mut self, instance: LevelInstance) -> Result<(), ResidencyError> {
        instance.validate().map_err(ResidencyError::InvalidDefinition)?;
        let id = instance.id.clone();
        if self.records.contains_key(&id) {
            return Err(ResidencyError::InvalidTransition { instance_id: id, from: instance.state, to: instance.state });
        }
        self.records.insert(id, Record { descriptor: instance, definition: None, global: None, render_ready: false, collision_ready: false });
        Ok(())
    }

    pub fn instance(&self, id: &str) -> Option<&LevelInstance> { self.records.get(id).map(|r| &r.descriptor) }
    pub fn state(&self, id: &str) -> Option<RuntimeState> { self.instance(id).map(|i| i.state) }
    pub fn current(&self) -> Option<&str> { self.current.as_deref() }
    pub fn render_resident(&self, id: &str) -> bool { self.records.get(id).is_some_and(|r| r.descriptor.render_resident) }
    pub fn collision_active(&self, id: &str) -> bool { self.records.get(id).is_some_and(|r| r.descriptor.collision_active) }
    pub fn simulation_active(&self, id: &str) -> bool { self.records.get(id).is_some_and(|r| r.descriptor.simulation_active) }
    pub(crate) fn set_bridge_flags(&mut self, id: &str, render: bool, collision: bool, simulation: bool) -> Result<(), ResidencyError> {
        let record = self.records.get_mut(id).ok_or_else(|| ResidencyError::UnknownInstance(id.into()))?;
        record.descriptor.render_resident = render;
        record.descriptor.collision_active = collision;
        record.descriptor.simulation_active = simulation;
        Ok(())
    }
    pub fn content(&self, id: &str) -> Option<&GlobalLevelContent> { self.records.get(id).and_then(|r| r.global.as_ref()) }

    /// Move instance while retaining authoritative transformed content.
    pub fn set_transform(&mut self, id: &str, transform: crate::world::Transform) -> Result<(), ResidencyError> {
        transform.validate().map_err(ResidencyError::InvalidDefinition)?;
        let record = self.records.get_mut(id).ok_or_else(|| ResidencyError::UnknownInstance(id.into()))?;
        record.descriptor.transform = transform;
        if let Some(definition) = record.definition.as_deref() {
            record.global = Some(GlobalLevelContent::from_definition(definition, &transform).map_err(ResidencyError::InvalidDefinition)?);
        }
        Ok(())
    }

    /// All render-resident content, already transformed into global coordinates.
    pub fn resident_content(&self) -> impl Iterator<Item = (&str, &GlobalLevelContent)> {
        self.records.iter().filter_map(|(id, record)| {
            record.descriptor.render_resident.then_some((id.as_str(), record.global.as_ref()?))
        })
    }

    /// Instance IDs currently participating in collision.
    pub fn active_collision_ids(&self) -> impl Iterator<Item = &str> {
        self.records.iter().filter_map(|(id, record)| record.descriptor.collision_active.then_some(id.as_str()))
    }

    /// Snapshot collision-active transformed geometry. Render residency alone
    /// never contributes solids.
    pub fn collision_world(&self) -> crate::global_collision::GlobalCollisionWorld {
        let mut world = crate::global_collision::GlobalCollisionWorld::new();
        for record in self.records.values() {
            if record.descriptor.collision_active {
                if let Some(definition) = record.definition.as_deref() {
                    world.set_instance(
                        crate::global_collision::CollisionInstance::from_level(&record.descriptor, definition),
                        true,
                    );
                }
            }
        }
        world
    }

    /// Activate target only after render/collision data and safe arrival pose
    /// are ready. Source remains untouched on failure.
    pub fn activate_for_crossing(&mut self, id: &str, safe_arrival_pose: bool) -> Result<bool, ResidencyError> {
        if !self.crossing_ready(id, safe_arrival_pose) { return Ok(false); }
        if self.state(id) != Some(RuntimeState::Active) { self.activate(id)?; }
        Ok(true)
    }

    /// Begin provider resolution. Replacing an existing request makes its old
    /// result stale, which prevents late callbacks from reviving old content.
    pub fn begin_load(&mut self, id: &str, metadata: LevelProviderMetadata) -> Result<LevelProviderRequest, ResidencyError> {
        let record = self.records.get(id).ok_or_else(|| ResidencyError::UnknownInstance(id.into()))?;
        if !matches!(record.descriptor.state, RuntimeState::Known | RuntimeState::Evicted | RuntimeState::Failed | RuntimeState::Loading) {
            return Err(ResidencyError::InvalidTransition { instance_id: id.into(), from: record.descriptor.state, to: RuntimeState::Loading });
        }
        let request = self.provider.begin(id, &record.descriptor.definition_id, &record.descriptor.definition_version, metadata)?;
        let record = self.records.get_mut(id).expect("record checked");
        record.descriptor.state = RuntimeState::Loading;
        record.descriptor.render_resident = false;
        record.descriptor.collision_active = false;
        record.descriptor.simulation_active = false;
        record.render_ready = false;
        record.collision_ready = false;
        Ok(request)
    }

    /// Preload target reached through a topology link. Link policy decides when
    /// this method is called; residency only guarantees target readiness.
    pub fn preload_linked(&mut self, target_id: &str, metadata: LevelProviderMetadata) -> Result<LevelProviderRequest, ResidencyError> {
        self.begin_load(target_id, metadata)
    }

    pub fn resolve<P: LevelProvider + ?Sized>(&mut self, provider: &mut P, id: &str, metadata: LevelProviderMetadata) -> Result<ProviderUpdate, ResidencyError> {
        let request = self.begin_load(id, metadata)?;
        let result = provider.resolve(request);
        self.accept(result)
    }

    pub fn mark_failed(&mut self, id: &str) -> Result<(), ResidencyError> {
        let record = self.record_mut(id)?;
        record.descriptor.state = RuntimeState::Failed;
        record.descriptor.render_resident = false;
        record.descriptor.collision_active = false;
        record.descriptor.simulation_active = false;
        record.render_ready = false;
        record.collision_ready = false;
        Ok(())
    }

    pub fn cancel_load(&mut self, id: &str) -> Result<Option<LevelProviderRequest>, ResidencyError> {
        let record = self.records.get_mut(id).ok_or_else(|| ResidencyError::UnknownInstance(id.into()))?;
        let request = self.provider.cancel(id);
        if request.is_some() && record.descriptor.state == RuntimeState::Loading {
            record.descriptor.state = RuntimeState::Known;
        }
        Ok(request)
    }

    pub fn accept(&mut self, result: LevelProviderResult) -> Result<ProviderUpdate, ResidencyError> {
        let id = result.instance_id.clone();
        let update = self.provider.accept(result)?;
        let record = match self.records.get_mut(&id) {
            Some(record) => record,
            None => return Err(ResidencyError::UnknownInstance(id)),
        };
        match &update {
            ProviderUpdate::Ready(definition) => {
                let global = GlobalLevelContent::from_definition(definition, &record.descriptor.transform)
                    .map_err(ResidencyError::InvalidDefinition)?;
                record.definition = Some(Arc::new(definition.clone()));
                record.global = Some(global);
                record.render_ready = true;
                record.collision_ready = true;
                record.descriptor.render_resident = true;
                record.descriptor.state = RuntimeState::Resident;
            }
            ProviderUpdate::Cancelled => {
                record.descriptor.state = RuntimeState::Known;
                record.descriptor.render_resident = false;
            }
            ProviderUpdate::Failed(_) => {
                record.descriptor.state = RuntimeState::Failed;
                record.descriptor.render_resident = false;
                record.descriptor.collision_active = false;
                record.descriptor.simulation_active = false;
            }
            ProviderUpdate::Pending | ProviderUpdate::Stale => {}
        }
        Ok(update)
    }

    /// Mark separate render/collision readiness. Both must be ready to cross.
    pub fn set_data_readiness(&mut self, id: &str, render: bool, collision: bool) -> Result<(), ResidencyError> {
        let record = self.record_mut(id)?;
        record.render_ready = render;
        record.collision_ready = collision;
        record.descriptor.render_resident = render;
        Ok(())
    }

    pub fn crossing_ready(&self, id: &str, safe_arrival_pose: bool) -> bool {
        self.records.get(id).is_some_and(|r| matches!(r.descriptor.state, RuntimeState::Resident | RuntimeState::Active) && r.render_ready && r.collision_ready && safe_arrival_pose)
    }

    pub fn activate(&mut self, id: &str) -> Result<(), ResidencyError> {
        let record = self.record_mut(id)?;
        if record.descriptor.state != RuntimeState::Resident || !record.render_ready || !record.collision_ready {
            return Err(ResidencyError::InvalidTransition { instance_id: id.into(), from: record.descriptor.state, to: RuntimeState::Active });
        }
        record.descriptor.state = RuntimeState::Active;
        record.descriptor.collision_active = true;
        record.descriptor.simulation_active = true;
        Ok(())
    }

    pub fn mark_evictable(&mut self, id: &str) -> Result<(), ResidencyError> {
        if self.is_pinned(id) { return Err(ResidencyError::Pinned(id.into())); }
        let record = self.record_mut(id)?;
        if record.descriptor.state != RuntimeState::Active && record.descriptor.state != RuntimeState::Resident {
            return Err(ResidencyError::InvalidTransition { instance_id: id.into(), from: record.descriptor.state, to: RuntimeState::Evictable });
        }
        record.descriptor.state = RuntimeState::Evictable;
        record.descriptor.collision_active = false;
        record.descriptor.simulation_active = false;
        Ok(())
    }

    pub fn evict(&mut self, id: &str) -> Result<PersistenceHandoff, ResidencyError> {
        if self.is_pinned(id) { return Err(ResidencyError::Pinned(id.into())); }
        let record = self.record_mut(id)?;
        if record.descriptor.state != RuntimeState::Evictable {
            return Err(ResidencyError::NotEvictable(id.into()));
        }
        let handoff = PersistenceHandoff { instance: record.descriptor.clone() };
        record.descriptor.state = RuntimeState::Evicted;
        record.descriptor.render_resident = false;
        record.descriptor.collision_active = false;
        record.descriptor.simulation_active = false;
        record.definition = None;
        record.global = None;
        record.render_ready = false;
        record.collision_ready = false;
        Ok(handoff)
    }

    pub fn set_current(&mut self, id: Option<&str>) -> Result<(), ResidencyError> {
        if let Some(id) = id { if !self.records.contains_key(id) { return Err(ResidencyError::UnknownInstance(id.into())); } }
        self.current = id.map(str::to_owned);
        Ok(())
    }

    pub fn set_transition_pair(&mut self, a: &str, b: &str, pinned: bool) -> Result<(), ResidencyError> {
        if !self.records.contains_key(a) { return Err(ResidencyError::UnknownInstance(a.into())); }
        if !self.records.contains_key(b) { return Err(ResidencyError::UnknownInstance(b.into())); }
        let pair = if a <= b { (a.into(), b.into()) } else { (b.into(), a.into()) };
        if pinned { self.transition_pairs.insert(pair); } else { self.transition_pairs.remove(&pair); }
        Ok(())
    }

    pub fn pin(&mut self, id: &str, pinned: bool) -> Result<(), ResidencyError> {
        if !self.records.contains_key(id) { return Err(ResidencyError::UnknownInstance(id.into())); }
        if pinned { self.explicit_pins.insert(id.into()); } else { self.explicit_pins.remove(id); }
        Ok(())
    }

    pub fn is_pinned(&self, id: &str) -> bool {
        self.current.as_deref() == Some(id) || self.explicit_pins.contains(id) || self.transition_pairs.iter().any(|(a, b)| a == id || b == id)
    }

    fn record_mut(&mut self, id: &str) -> Result<&mut Record, ResidencyError> { self.records.get_mut(id).ok_or_else(|| ResidencyError::UnknownInstance(id.into())) }
}

/// Compatibility name for callers that used the pre-composition-root lifecycle type.
pub type ResidencyManager = ResidencyStore;

// Keep provider failure type part of this module's public API surface for apps
// handling failed preload notifications.
pub type ResidencyFailure = LevelProviderFailure;
pub type ResidencyOutcome = LevelProviderOutcome;
pub type ResidencyInstance = RuntimeLevelInstance;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::level_provider::FixtureProvider;
    use crate::world::{Bounds, Transform, Vec3, PersistencePolicy};

    fn instance(id: &str) -> LevelInstance { LevelInstance { id: id.into(), definition_id: "room".into(), definition_version: "1".into(), transform: Transform::IDENTITY, state: RuntimeState::Known, persistence: PersistencePolicy::Persistent, render_resident: false, collision_active: false, simulation_active: false } }
    fn definition() -> crate::world::LevelDefinition { crate::world::LevelDefinition { id: "room".into(), version: "1".into(), bounds: Bounds { min: Vec3::ZERO, max: Vec3 { x: 1.0, y: 1.0, z: 1.0 } }, tiles: vec![], actors: vec![], lights: vec![], polygons: vec![], anchors: vec![], metadata: Default::default() } }
    fn metadata() -> LevelProviderMetadata { LevelProviderMetadata::default() }

    #[test]
    fn preload_crossing_activation_and_separate_data_gate() {
        let mut manager = ResidencyManager::new(); manager.register(instance("a")).unwrap();
        let mut provider = FixtureProvider::ready(definition());
        assert!(matches!(manager.resolve(&mut provider, "a", metadata()).unwrap(), ProviderUpdate::Ready(_)));
        assert!(manager.crossing_ready("a", true));
        manager.set_data_readiness("a", true, false).unwrap(); assert!(!manager.crossing_ready("a", true));
        manager.set_data_readiness("a", true, true).unwrap();
        assert!(manager.activate_for_crossing("a", true).unwrap());
        assert!(manager.simulation_active("a"));
    }

    #[test]
    fn failed_target_does_not_affect_source_and_stale_results_ignored() {
        let mut manager = ResidencyManager::new(); manager.register(instance("source")).unwrap(); manager.register(instance("target")).unwrap();
        let mut provider = FixtureProvider::ready(definition()); manager.resolve(&mut provider, "source", metadata()).unwrap(); manager.activate("source").unwrap();
        let old = manager.begin_load("target", metadata()).unwrap(); let new = manager.begin_load("target", metadata()).unwrap();
        assert_eq!(manager.accept(LevelProviderResult { request_id: old.request_id, instance_id: "target".into(), outcome: LevelProviderOutcome::Ready(definition()) }).unwrap(), ProviderUpdate::Stale);
        manager.accept(LevelProviderResult { request_id: new.request_id, instance_id: "target".into(), outcome: LevelProviderOutcome::Failed(LevelProviderFailure::Application("no".into())) }).unwrap();
        assert_eq!(manager.state("source"), Some(RuntimeState::Active)); assert_eq!(manager.state("target"), Some(RuntimeState::Failed));
    }

    #[test]
    fn pinning_hysteresis_and_eviction_release_content_not_descriptor() {
        let mut manager = ResidencyManager::new(); manager.register(instance("a")).unwrap(); let mut provider = FixtureProvider::ready(definition()); manager.resolve(&mut provider, "a", metadata()).unwrap(); manager.set_current(Some("a")).unwrap(); assert!(manager.mark_evictable("a").is_err()); manager.set_current(None).unwrap(); manager.mark_evictable("a").unwrap(); let handoff = manager.evict("a").unwrap(); assert_eq!(handoff.instance.id, "a"); assert_eq!(manager.state("a"), Some(RuntimeState::Evicted)); assert!(manager.content("a").is_none());
    }
}
