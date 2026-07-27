//! Runtime-owned placement of immutable level definitions.
//!
//! A definition stays local-space and shareable. Each runtime instance owns one
//! transformed snapshot plus mutable lifecycle/persistence state.

use std::collections::HashMap;
use std::sync::Arc;

use crate::world::{
    Bounds, LevelDefinition, LevelInstance, PersistencePolicy, RuntimeState, Transform,
    Vec3, WorldContractError,
};

#[derive(Debug, Clone, PartialEq)]
pub struct GlobalLevelContent {
    pub bounds: Bounds,
    pub tiles: Vec<Vec3>,
    pub actors: Vec<Vec3>,
    pub lights: Vec<Vec3>,
}

impl GlobalLevelContent {
    pub(crate) fn from_definition(
        definition: &LevelDefinition,
        transform: &Transform,
    ) -> Result<Self, WorldContractError> {
        Ok(Self {
            bounds: definition.bounds.transformed(transform)?,
            tiles: transform_points(&definition.tiles, transform),
            actors: transform_points(&definition.actors, transform),
            lights: transform_points(&definition.lights, transform),
        })
    }
}

fn transform_points(points: &[Vec3], transform: &Transform) -> Vec<Vec3> {
    points.iter().map(|point| transform.transform_point(*point)).collect()
}

#[derive(Debug, Clone)]
pub struct RuntimeLevelInstance {
    pub descriptor: LevelInstance,
    pub definition: Arc<LevelDefinition>,
    pub global: GlobalLevelContent,
}

impl RuntimeLevelInstance {
    pub fn id(&self) -> &str {
        &self.descriptor.id
    }

    pub fn set_state(&mut self, state: RuntimeState) {
        self.descriptor.state = state;
    }

    pub fn set_persistence(&mut self, persistence: PersistencePolicy) {
        self.descriptor.persistence = persistence;
    }
}

#[derive(Debug, Default)]
pub struct LevelInstanceRuntime {
    definitions: HashMap<String, Arc<LevelDefinition>>,
    instances: HashMap<String, RuntimeLevelInstance>,
}

impl LevelInstanceRuntime {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn register_definition(
        &mut self,
        definition: LevelDefinition,
    ) -> Result<(), WorldContractError> {
        definition.validate()?;
        if self.definitions.contains_key(&definition.id) {
            return Err(WorldContractError::DuplicateDefinition(definition.id));
        }
        self.definitions
            .insert(definition.id.clone(), Arc::new(definition));
        Ok(())
    }

    pub fn definition(&self, id: &str) -> Option<&LevelDefinition> {
        self.definitions.get(id).map(Arc::as_ref)
    }

    pub fn create_instance(
        &mut self,
        id: impl Into<String>,
        definition_id: impl Into<String>,
        transform: Transform,
        persistence: PersistencePolicy,
    ) -> Result<&RuntimeLevelInstance, WorldContractError> {
        let id = id.into();
        let definition_id = definition_id.into();
        if id.trim().is_empty() {
            return Err(WorldContractError::EmptyId("instance"));
        }
        if self.instances.contains_key(&id) {
            return Err(WorldContractError::DuplicateInstance(id));
        }
        transform.validate()?;
        let definition = self
            .definitions
            .get(&definition_id)
            .cloned()
            .ok_or(WorldContractError::UnknownDefinition(definition_id.clone()))?;
        let global = GlobalLevelContent::from_definition(&definition, &transform)?;
        let descriptor = LevelInstance {
            id: id.clone(),
            definition_id,
            definition_version: definition.version.clone(),
            transform,
            state: RuntimeState::Resident,
            persistence,
            render_resident: true,
            collision_active: false,
            simulation_active: false,
        };
        self.instances.insert(
            id.clone(),
            RuntimeLevelInstance {
                descriptor,
                definition,
                global,
            },
        );
        Ok(self.instances.get(&id).expect("inserted instance"))
    }

    pub fn instance(&self, id: &str) -> Option<&RuntimeLevelInstance> {
        self.instances.get(id)
    }

    pub fn instance_mut(&mut self, id: &str) -> Option<&mut RuntimeLevelInstance> {
        self.instances.get_mut(id)
    }

    /// Remove runtime-owned content. Missing IDs are harmless, enabling stale
    /// lifecycle callbacks to safely destroy an already-evicted instance.
    pub fn destroy_instance(&mut self, id: &str) -> Option<RuntimeLevelInstance> {
        self.instances.remove(id)
    }

    pub fn instance_count(&self) -> usize {
        self.instances.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::world::Bounds;

    fn definition() -> LevelDefinition {
        LevelDefinition {
            id: "room".into(),
            version: "1".into(),
            bounds: Bounds {
                min: Vec3::ZERO,
                max: Vec3 { x: 2.0, y: 1.0, z: 3.0 },
            },
            tiles: vec![Vec3 { x: 1.0, y: 0.0, z: 2.0 }],
            actors: vec![Vec3 { x: 0.0, y: 1.0, z: 0.0 }],
            lights: vec![Vec3 { x: 2.0, y: 1.0, z: 3.0 }],
            anchors: vec![],
            metadata: Default::default(),
        }
    }

    #[test]
    fn two_instances_share_definition_but_have_independent_global_content() {
        let mut runtime = LevelInstanceRuntime::new();
        runtime.register_definition(definition()).unwrap();
        runtime
            .create_instance(
                "east",
                "room",
                Transform { translation: Vec3 { x: 10.0, y: 0.0, z: 0.0 }, ..Transform::IDENTITY },
                PersistencePolicy::Persistent,
            )
            .unwrap();
        runtime
            .create_instance(
                "west",
                "room",
                Transform { translation: Vec3 { x: -10.0, y: 2.0, z: 4.0 }, ..Transform::IDENTITY },
                PersistencePolicy::Session,
            )
            .unwrap();

        let east = runtime.instance("east").unwrap();
        let west = runtime.instance("west").unwrap();
        assert!(Arc::ptr_eq(&east.definition, &west.definition));
        assert_eq!(east.global.tiles[0], Vec3 { x: 11.0, y: 0.0, z: 2.0 });
        assert_eq!(west.global.tiles[0], Vec3 { x: -9.0, y: 2.0, z: 6.0 });
        assert_eq!(east.global.bounds.min, Vec3 { x: 10.0, y: 0.0, z: 0.0 });
        assert_eq!(west.descriptor.persistence, PersistencePolicy::Session);
    }

    #[test]
    fn runtime_state_mutation_does_not_mutate_definition() {
        let mut runtime = LevelInstanceRuntime::new();
        runtime.register_definition(definition()).unwrap();
        runtime.create_instance("room-1", "room", Transform::IDENTITY, PersistencePolicy::Session).unwrap();
        runtime.instance_mut("room-1").unwrap().set_state(RuntimeState::Active);
        assert_eq!(runtime.instance("room-1").unwrap().descriptor.state, RuntimeState::Active);
        assert_eq!(runtime.definition("room").unwrap().metadata, HashMap::new());
        assert_eq!(runtime.definition("room").unwrap().bounds, definition().bounds);
    }

    #[test]
    fn destruction_is_idempotent_and_duplicate_ids_rejected() {
        let mut runtime = LevelInstanceRuntime::new();
        runtime.register_definition(definition()).unwrap();
        runtime.create_instance("room-1", "room", Transform::IDENTITY, PersistencePolicy::Session).unwrap();
        assert!(matches!(runtime.create_instance("room-1", "room", Transform::IDENTITY, PersistencePolicy::Session), Err(WorldContractError::DuplicateInstance(_))));
        assert!(runtime.destroy_instance("room-1").is_some());
        assert!(runtime.destroy_instance("room-1").is_none());
    }
}
