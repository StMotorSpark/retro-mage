//! Application-owned world topology registration.
//!
//! This module stores topology only. It does not resolve definitions, load content,
//! or change instance lifecycle state.

use std::collections::{HashMap, HashSet};

use crate::world::{LevelAnchor, LevelInstance, WorldContractError};

#[derive(Debug, Clone, PartialEq)]
pub struct DefinitionDescriptor {
    pub id: String,
    pub version: String,
    pub anchors: Vec<LevelAnchor>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AnchorRef {
    pub instance_id: String,
    pub anchor_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StartLocation {
    pub instance_id: String,
    pub anchor_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LinkTarget {
    Instance(AnchorRef),
    Definition {
        definition_id: String,
        definition_version: String,
        anchor_id: String,
        instance_id: String,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LinkDirection {
    OneWay,
    Bidirectional,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AnchorSharingPolicy {
    Exclusive,
    Shared,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LevelLink {
    pub id: String,
    pub source: AnchorRef,
    pub target: LinkTarget,
    pub direction: LinkDirection,
    pub anchor_sharing: AnchorSharingPolicy,
}

#[derive(Debug, Clone, PartialEq)]
pub struct InstanceDescriptor {
    pub instance: LevelInstance,
}

#[derive(Debug, Clone, PartialEq)]
pub struct WorldManifest {
    pub definitions: Vec<DefinitionDescriptor>,
    pub instances: Vec<InstanceDescriptor>,
    pub links: Vec<LevelLink>,
    pub starting_locations: Vec<StartLocation>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum WorldManifestError {
    EmptyId(&'static str),
    DuplicateId(&'static str, String),
    UnknownDefinition(String),
    UnknownInstance(String),
    UnknownAnchor { instance_id: String, anchor_id: String },
    DefinitionVersionMismatch { instance_id: String },
    InvalidContract(WorldContractError),
    DirectionNotAllowed { instance_id: String, anchor_id: String },
    AnchorAlreadyLinked { instance_id: String, anchor_id: String },
    UnknownLink(String),
}

#[derive(Debug, Clone, Default)]
pub struct WorldTopology {
    definitions: HashMap<String, DefinitionDescriptor>,
    instances: HashMap<String, InstanceDescriptor>,
    links: HashMap<String, LevelLink>,
    anchors: HashMap<(String, String), LevelAnchor>,
    starting_locations: Vec<StartLocation>,
}

impl WorldTopology {
    pub fn from_manifest(manifest: WorldManifest) -> Result<Self, WorldManifestError> {
        let mut topology = Self::default();
        for definition in manifest.definitions {
            topology.register_definition(definition)?;
        }
        for instance in manifest.instances {
            topology.register_instance(instance)?;
        }
        for link in manifest.links {
            topology.register_link(link)?;
        }
        for start in manifest.starting_locations {
            topology.validate_anchor_ref(&start.instance_id, &start.anchor_id)?;
            topology.starting_locations.push(start);
        }
        Ok(topology)
    }

    pub fn register_definition(&mut self, definition: DefinitionDescriptor) -> Result<(), WorldManifestError> {
        validate_id(&definition.id, "definition")?;
        validate_id(&definition.version, "definition version")?;
        let mut anchor_ids = HashSet::new();
        for anchor in &definition.anchors {
            anchor.validate().map_err(WorldManifestError::InvalidContract)?;
            if !anchor_ids.insert(&anchor.id) {
                return Err(WorldManifestError::DuplicateId("anchor", anchor.id.clone()));
            }
        }
        if self.definitions.insert(definition.id.clone(), definition.clone()).is_some() {
            return Err(WorldManifestError::DuplicateId("definition", definition.id));
        }
        Ok(())
    }

    pub fn register_instance(&mut self, descriptor: InstanceDescriptor) -> Result<(), WorldManifestError> {
        descriptor.instance.validate().map_err(WorldManifestError::InvalidContract)?;
        let id = descriptor.instance.id.clone();
        if self.instances.contains_key(&id) {
            return Err(WorldManifestError::DuplicateId("instance", id));
        }
        let definition = self.definitions.get(&descriptor.instance.definition_id)
            .ok_or_else(|| WorldManifestError::UnknownDefinition(descriptor.instance.definition_id.clone()))?;
        if definition.version != descriptor.instance.definition_version {
            return Err(WorldManifestError::DefinitionVersionMismatch { instance_id: id });
        }
        let anchors = definition.anchors.clone();
        self.instances.insert(id.clone(), descriptor);
        for anchor in anchors {
            anchor.validate().map_err(WorldManifestError::InvalidContract)?;
            let key = (id.clone(), anchor.id.clone());
            if self.anchors.insert(key, anchor.clone()).is_some() {
                return Err(WorldManifestError::DuplicateId("anchor", anchor.id));
            }
        }
        Ok(())
    }

    pub fn register_link(&mut self, link: LevelLink) -> Result<(), WorldManifestError> {
        validate_id(&link.id, "link")?;
        if self.links.contains_key(&link.id) {
            return Err(WorldManifestError::DuplicateId("link", link.id));
        }
        self.validate_endpoint(&link.source, true)?;
        let target = link.target_ref();
        if let LinkTarget::Definition { definition_id, definition_version, .. } = &link.target {
            let definition = self.definitions.get(definition_id)
                .ok_or_else(|| WorldManifestError::UnknownDefinition(definition_id.clone()))?;
            if definition.version != *definition_version {
                return Err(WorldManifestError::DefinitionVersionMismatch { instance_id: target.instance_id.clone() });
            }
        }
        self.validate_endpoint(&target, false)?;
        if link.direction == LinkDirection::Bidirectional {
            self.validate_direction(&link.source)?;
            self.validate_direction(&target)?;
        }
        if link.anchor_sharing == AnchorSharingPolicy::Exclusive {
            for endpoint in [&link.source, &target] {
                if self.links.values().any(|existing| existing.uses_anchor(endpoint)) {
                    return Err(WorldManifestError::AnchorAlreadyLinked {
                        instance_id: endpoint.instance_id.clone(),
                        anchor_id: endpoint.anchor_id.clone(),
                    });
                }
            }
        }
        self.links.insert(link.id.clone(), link);
        Ok(())
    }

    pub fn register_starting_location(&mut self, start: StartLocation) -> Result<(), WorldManifestError> {
        self.validate_anchor_ref(&start.instance_id, &start.anchor_id)?;
        self.starting_locations.push(start);
        Ok(())
    }

    pub fn instance(&self, id: &str) -> Option<&InstanceDescriptor> { self.instances.get(id) }
    pub fn link(&self, id: &str) -> Option<&LevelLink> { self.links.get(id) }
    pub fn starting_locations(&self) -> &[StartLocation] { &self.starting_locations }
    pub fn instance_count(&self) -> usize { self.instances.len() }
    pub fn link_count(&self) -> usize { self.links.len() }

    fn validate_endpoint(&self, endpoint: &AnchorRef, source: bool) -> Result<(), WorldManifestError> {
        self.validate_anchor_ref(&endpoint.instance_id, &endpoint.anchor_id)?;
        if source { self.validate_direction(endpoint)?; }
        Ok(())
    }

    fn validate_anchor_ref(&self, instance_id: &str, anchor_id: &str) -> Result<(), WorldManifestError> {
        if !self.instances.contains_key(instance_id) {
            return Err(WorldManifestError::UnknownInstance(instance_id.to_owned()));
        }
        if !self.anchors.contains_key(&(instance_id.to_owned(), anchor_id.to_owned())) {
            return Err(WorldManifestError::UnknownAnchor { instance_id: instance_id.to_owned(), anchor_id: anchor_id.to_owned() });
        }
        Ok(())
    }

    fn validate_direction(&self, endpoint: &AnchorRef) -> Result<(), WorldManifestError> {
        let anchor = &self.anchors[&(endpoint.instance_id.clone(), endpoint.anchor_id.clone())];
        if matches!(anchor.direction, crate::world::AnchorDirection::In) {
            return Err(WorldManifestError::DirectionNotAllowed { instance_id: endpoint.instance_id.clone(), anchor_id: endpoint.anchor_id.clone() });
        }
        Ok(())
    }
}

impl LevelLink {
    fn target_ref(&self) -> AnchorRef {
        match &self.target {
            LinkTarget::Instance(target) => target.clone(),
            LinkTarget::Definition { instance_id, anchor_id, .. } => AnchorRef { instance_id: instance_id.clone(), anchor_id: anchor_id.clone() },
        }
    }

    fn uses_anchor(&self, endpoint: &AnchorRef) -> bool {
        self.source == *endpoint || self.target_ref() == *endpoint
    }
}

fn validate_id(id: &str, kind: &'static str) -> Result<(), WorldManifestError> {
    if id.trim().is_empty() { Err(WorldManifestError::EmptyId(kind)) } else { Ok(()) }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::world::{AnchorDirection, Bounds, Transform, Vec3, RuntimeState, PersistencePolicy};

    fn instance(id: &str, def: &str) -> InstanceDescriptor {
        InstanceDescriptor { instance: LevelInstance { id: id.into(), definition_id: def.into(), definition_version: "1".into(), transform: Transform::IDENTITY, state: RuntimeState::Known, persistence: PersistencePolicy::Session, render_resident: false, collision_active: false, simulation_active: false } }
    }
    fn manifest() -> WorldManifest {
        WorldManifest { definitions: vec![DefinitionDescriptor { id: "room".into(), version: "1".into(), anchors: vec![anchor()] }], instances: vec![instance("a", "room"), instance("b", "room")], links: vec![], starting_locations: vec![] }
    }
    fn anchor() -> LevelAnchor { LevelAnchor { id: "door".into(), transform: Transform::IDENTITY, volume: Bounds { min: Vec3::ZERO, max: Vec3 { x: 1.0, y: 1.0, z: 1.0 } }, direction: AnchorDirection::Both } }

    #[test]
    fn startup_manifest_registers_instances_and_links() {
        let mut topology = WorldTopology::from_manifest(manifest()).unwrap();
        let link = LevelLink { id: "door-link".into(), source: AnchorRef { instance_id: "a".into(), anchor_id: "door".into() }, target: LinkTarget::Instance(AnchorRef { instance_id: "b".into(), anchor_id: "door".into() }), direction: LinkDirection::Bidirectional, anchor_sharing: AnchorSharingPolicy::Exclusive };
        topology.register_link(link).unwrap(); assert_eq!(topology.instance_count(), 2); assert_eq!(topology.link_count(), 1);
    }

    #[test]
    fn rejects_unknown_refs_and_duplicate_exclusive_anchor() {
        let mut topology = WorldTopology::from_manifest(manifest()).unwrap();
        let bad = LevelLink { id: "bad".into(), source: AnchorRef { instance_id: "missing".into(), anchor_id: "door".into() }, target: LinkTarget::Instance(AnchorRef { instance_id: "b".into(), anchor_id: "door".into() }), direction: LinkDirection::OneWay, anchor_sharing: AnchorSharingPolicy::Exclusive };
        assert_eq!(topology.register_link(bad), Err(WorldManifestError::UnknownInstance("missing".into())));
        let link = LevelLink { id: "one".into(), source: AnchorRef { instance_id: "a".into(), anchor_id: "door".into() }, target: LinkTarget::Instance(AnchorRef { instance_id: "b".into(), anchor_id: "door".into() }), direction: LinkDirection::OneWay, anchor_sharing: AnchorSharingPolicy::Exclusive };
        topology.register_link(link.clone()).unwrap(); let mut second = link; second.id = "two".into(); assert!(matches!(topology.register_link(second), Err(WorldManifestError::AnchorAlreadyLinked { .. })));
    }

    #[test]
    fn shared_anchor_and_definition_target_allowed() {
        let mut topology = WorldTopology::from_manifest(manifest()).unwrap();
        let link = LevelLink { id: "generated".into(), source: AnchorRef { instance_id: "a".into(), anchor_id: "door".into() }, target: LinkTarget::Definition { definition_id: "room".into(), definition_version: "1".into(), anchor_id: "door".into(), instance_id: "b".into() }, direction: LinkDirection::OneWay, anchor_sharing: AnchorSharingPolicy::Shared };
        topology.register_link(link).unwrap();
    }
}
