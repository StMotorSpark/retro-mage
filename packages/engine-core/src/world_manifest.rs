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

/// Controls target placement and player arrival for a crossing.
#[derive(Debug, Clone, PartialEq)]
pub enum LinkTransform {
    /// Place target instance by making target anchor equal source anchor globally.
    Spatial,
    /// Place target instance explicitly; arrive at target anchor plus local offset.
    Explicit { instance_transform: crate::world::Transform, arrival_offset: crate::world::Vec3 },
}

#[derive(Debug, Clone, PartialEq)]
pub struct LevelLink {
    pub id: String,
    pub source: AnchorRef,
    pub target: LinkTarget,
    pub direction: LinkDirection,
    pub anchor_sharing: AnchorSharingPolicy,
    pub transform: LinkTransform,
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
    InvalidArrivalOffset,
    ReverseCrossingNotAllowed,
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
        if let LinkTarget::Definition { definition_id, definition_version, anchor_id, .. } = &link.target {
            let definition = self.definitions.get(definition_id)
                .ok_or_else(|| WorldManifestError::UnknownDefinition(definition_id.clone()))?;
            if definition.version != *definition_version {
                return Err(WorldManifestError::DefinitionVersionMismatch { instance_id: target.instance_id.clone() });
            }
            if !definition.anchors.iter().any(|anchor| anchor.id == *anchor_id) {
                return Err(WorldManifestError::UnknownAnchor { instance_id: target.instance_id.clone(), anchor_id: anchor_id.clone() });
            }
        } else {
            self.validate_endpoint(&target, false)?;
        }
        if let LinkTransform::Explicit { instance_transform, arrival_offset } = &link.transform {
            instance_transform.validate().map_err(WorldManifestError::InvalidContract)?;
            if !arrival_offset.is_finite() {
                return Err(WorldManifestError::InvalidArrivalOffset);
            }
        }
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
    pub(crate) fn instance_mut(&mut self, id: &str) -> Option<&mut InstanceDescriptor> { self.instances.get_mut(id) }
    pub fn instances(&self) -> impl Iterator<Item = &InstanceDescriptor> { self.instances.values() }
    pub fn link(&self, id: &str) -> Option<&LevelLink> { self.links.get(id) }
    pub fn links(&self) -> impl Iterator<Item = &LevelLink> { self.links.values() }
    pub fn starting_locations(&self) -> &[StartLocation] { &self.starting_locations }

    /// Test player position against an anchor's transformed crossing volume.
    pub fn anchor_contains_world(&self, reference: &AnchorRef, point: crate::world::Vec3, padding: f32) -> Result<bool, WorldManifestError> {
        let instance = &self.instances.get(&reference.instance_id).ok_or_else(|| WorldManifestError::UnknownInstance(reference.instance_id.clone()))?.instance;
        let local = instance.transform.inverse().map_err(WorldManifestError::InvalidContract)?.transform_point(point);
        let volume = &self.anchor(reference)?.volume;
        Ok(local.x >= volume.min.x - padding && local.x <= volume.max.x + padding
            && local.y >= volume.min.y - padding && local.y <= volume.max.y + padding
            && local.z >= volume.min.z - padding && local.z <= volume.max.z + padding)
    }

    /// Resolve target instance placement and player pose for one directed crossing.
    pub fn resolve_crossing(
        &self,
        link_id: &str,
        from: &AnchorRef,
        player_pose: crate::world::Transform,
    ) -> Result<CrossingResolution, WorldManifestError> {
        let link = self.links.get(link_id).ok_or_else(|| WorldManifestError::UnknownLink(link_id.to_owned()))?;
        let (source, target, reverse) = if from == &link.source {
            (&link.source, link.target_ref(), false)
        } else if from == &link.target_ref() {
            if link.direction != LinkDirection::Bidirectional {
                return Err(WorldManifestError::ReverseCrossingNotAllowed);
            }
            (&link.target_ref(), link.source.clone(), true)
        } else {
            return Err(WorldManifestError::UnknownAnchor { instance_id: from.instance_id.clone(), anchor_id: from.anchor_id.clone() });
        };
        let source_world = self.anchor_world(source)?;
        let target_world = self.anchor_world(&target)?;
        let (instance_transform, arrival_pose) = match (&link.transform, reverse) {
            (LinkTransform::Spatial, _) => {
                let target_anchor = self.anchor(&target)?;
                let target_local_inverse = target_anchor.transform.inverse().map_err(WorldManifestError::InvalidContract)?;
                let placement = source_world.compose(&target_local_inverse);
                (placement, player_pose)
            }
            (LinkTransform::Explicit { instance_transform, arrival_offset }, false) => {
                let target_anchor = self.anchor(&target)?;
                let arrival = instance_transform.compose(&target_anchor.transform);
                (instance_transform.clone(), arrival.with_translation(arrival.transform_point(*arrival_offset)))
            }
            (LinkTransform::Explicit { arrival_offset, .. }, true) => {
                // Reverse traversal arrives at original source anchor; explicit placement
                // belongs to destination instance, so preserve its registered transform.
                let destination_transform = self.instances.get(&target.instance_id)
                    .ok_or_else(|| WorldManifestError::UnknownInstance(target.instance_id.clone()))?.instance.transform;
                let arrival = destination_transform.compose(&self.anchor(&target)?.transform);
                (destination_transform, arrival.with_translation(arrival.transform_point(*arrival_offset)))
            }
        };
        Ok(CrossingResolution { target_instance_id: target.instance_id.clone(), instance_transform, player_pose: arrival_pose, source_anchor: source_world, target_anchor: target_world })
    }

    fn anchor(&self, reference: &AnchorRef) -> Result<&LevelAnchor, WorldManifestError> {
        self.anchors.get(&(reference.instance_id.clone(), reference.anchor_id.clone())).ok_or_else(|| WorldManifestError::UnknownAnchor { instance_id: reference.instance_id.clone(), anchor_id: reference.anchor_id.clone() })
    }

    fn anchor_world(&self, reference: &AnchorRef) -> Result<crate::world::Transform, WorldManifestError> {
        let descriptor = &self.instances.get(&reference.instance_id).ok_or_else(|| WorldManifestError::UnknownInstance(reference.instance_id.clone()))?.instance;
        descriptor.anchor_world_transform(self.anchor(reference)?).map_err(WorldManifestError::InvalidContract)
    }
    /// Materialize definition-backed link target using link-declared stable identity.
    /// Provider loading remains a separate runtime operation.
    pub fn materialize_link_target(&mut self, link_id: &str) -> Result<String, WorldManifestError> {
        let link = self.links.get(link_id).ok_or_else(|| WorldManifestError::UnknownLink(link_id.to_owned()))?.clone();
        let LinkTarget::Definition { definition_id, definition_version, instance_id, .. } = link.target else {
            return Ok(link.target_ref().instance_id);
        };
        if self.instances.contains_key(&instance_id) {
            return Ok(instance_id);
        }
        let definition = self.definitions.get(&definition_id).ok_or_else(|| WorldManifestError::UnknownDefinition(definition_id.clone()))?;
        if definition.version != definition_version {
            return Err(WorldManifestError::DefinitionVersionMismatch { instance_id });
        }
        let descriptor = InstanceDescriptor { instance: LevelInstance {
            id: instance_id.clone(), definition_id, definition_version,
            transform: crate::world::Transform::IDENTITY,
            state: crate::world::RuntimeState::Known,
            persistence: crate::world::PersistencePolicy::Session,
            render_resident: false, collision_active: false, simulation_active: false,
        }};
        self.register_instance(descriptor)?;
        Ok(instance_id)
    }

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

#[derive(Debug, Clone, PartialEq)]
pub struct CrossingResolution {
    pub target_instance_id: String,
    pub instance_transform: crate::world::Transform,
    pub player_pose: crate::world::Transform,
    pub source_anchor: crate::world::Transform,
    pub target_anchor: crate::world::Transform,
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
        let link = LevelLink { id: "door-link".into(), source: AnchorRef { instance_id: "a".into(), anchor_id: "door".into() }, target: LinkTarget::Instance(AnchorRef { instance_id: "b".into(), anchor_id: "door".into() }), direction: LinkDirection::Bidirectional, anchor_sharing: AnchorSharingPolicy::Exclusive, transform: LinkTransform::Spatial };
        topology.register_link(link).unwrap(); assert_eq!(topology.instance_count(), 2); assert_eq!(topology.link_count(), 1);
    }

    #[test]
    fn rejects_unknown_refs_and_duplicate_exclusive_anchor() {
        let mut topology = WorldTopology::from_manifest(manifest()).unwrap();
        let bad = LevelLink { id: "bad".into(), source: AnchorRef { instance_id: "missing".into(), anchor_id: "door".into() }, target: LinkTarget::Instance(AnchorRef { instance_id: "b".into(), anchor_id: "door".into() }), direction: LinkDirection::OneWay, anchor_sharing: AnchorSharingPolicy::Exclusive, transform: LinkTransform::Spatial };
        assert_eq!(topology.register_link(bad), Err(WorldManifestError::UnknownInstance("missing".into())));
        let link = LevelLink { id: "one".into(), source: AnchorRef { instance_id: "a".into(), anchor_id: "door".into() }, target: LinkTarget::Instance(AnchorRef { instance_id: "b".into(), anchor_id: "door".into() }), direction: LinkDirection::OneWay, anchor_sharing: AnchorSharingPolicy::Exclusive, transform: LinkTransform::Spatial };
        topology.register_link(link.clone()).unwrap(); let mut second = link; second.id = "two".into(); assert!(matches!(topology.register_link(second), Err(WorldManifestError::AnchorAlreadyLinked { .. })));
    }

    #[test]
    fn shared_anchor_and_definition_target_allowed() {
        let mut world = manifest();
        world.instances.pop();
        let mut topology = WorldTopology::from_manifest(world).unwrap();
        let link = LevelLink { id: "generated".into(), source: AnchorRef { instance_id: "a".into(), anchor_id: "door".into() }, target: LinkTarget::Definition { definition_id: "room".into(), definition_version: "1".into(), anchor_id: "door".into(), instance_id: "generated-b".into() }, direction: LinkDirection::OneWay, anchor_sharing: AnchorSharingPolicy::Shared, transform: LinkTransform::Spatial };
        topology.register_link(link).unwrap();
        assert_eq!(topology.instance_count(), 1);
        assert_eq!(topology.materialize_link_target("generated").unwrap(), "generated-b");
        assert!(topology.instance("generated-b").is_some());
    }

    #[test]
    fn spatial_resolution_aligns_rotated_and_vertically_offset_target() {
        let mut world = manifest();
        world.instances[1].instance.transform = Transform::from_translation_yaw_scale(Vec3 { x: 10.0, y: 7.0, z: -3.0 }, std::f32::consts::FRAC_PI_2, 1.0);
        let mut topology = WorldTopology::from_manifest(world).unwrap();
        topology.register_link(LevelLink { id: "spatial".into(), source: AnchorRef { instance_id: "a".into(), anchor_id: "door".into() }, target: LinkTarget::Instance(AnchorRef { instance_id: "b".into(), anchor_id: "door".into() }), direction: LinkDirection::Bidirectional, anchor_sharing: AnchorSharingPolicy::Exclusive, transform: LinkTransform::Spatial }).unwrap();
        let source = AnchorRef { instance_id: "a".into(), anchor_id: "door".into() };
        let result = topology.resolve_crossing("spatial", &source, Transform::IDENTITY).unwrap();
        assert!((result.instance_transform.translation.y - 0.0).abs() < 0.0001);
        assert!((result.instance_transform.transform_point(Vec3::ZERO).x - 0.0).abs() < 0.0001);
        assert_eq!(result.player_pose, Transform::IDENTITY);
    }

    #[test]
    fn one_way_rejects_reverse_crossing() {
        let mut topology = WorldTopology::from_manifest(manifest()).unwrap();
        topology.register_link(LevelLink { id: "one-way".into(), source: AnchorRef { instance_id: "a".into(), anchor_id: "door".into() }, target: LinkTarget::Instance(AnchorRef { instance_id: "b".into(), anchor_id: "door".into() }), direction: LinkDirection::OneWay, anchor_sharing: AnchorSharingPolicy::Exclusive, transform: LinkTransform::Spatial }).unwrap();
        let reverse = AnchorRef { instance_id: "b".into(), anchor_id: "door".into() };
        assert_eq!(topology.resolve_crossing("one-way", &reverse, Transform::IDENTITY), Err(WorldManifestError::ReverseCrossingNotAllowed));
    }

    #[test]
    fn explicit_link_returns_target_pose_with_safe_offset() {
        let mut topology = WorldTopology::from_manifest(manifest()).unwrap();
        topology.register_link(LevelLink { id: "teleport".into(), source: AnchorRef { instance_id: "a".into(), anchor_id: "door".into() }, target: LinkTarget::Instance(AnchorRef { instance_id: "b".into(), anchor_id: "door".into() }), direction: LinkDirection::Bidirectional, anchor_sharing: AnchorSharingPolicy::Exclusive, transform: LinkTransform::Explicit { instance_transform: Transform { translation: Vec3 { x: 20.0, y: 3.0, z: 4.0 }, ..Transform::IDENTITY }, arrival_offset: Vec3 { x: 1.0, y: 2.0, z: 0.0 } } }).unwrap();
        let source = AnchorRef { instance_id: "a".into(), anchor_id: "door".into() };
        let result = topology.resolve_crossing("teleport", &source, Transform::IDENTITY).unwrap();
        assert_eq!(result.player_pose.translation, Vec3 { x: 21.0, y: 5.0, z: 4.0 });
        let reverse = AnchorRef { instance_id: "b".into(), anchor_id: "door".into() };
        let result = topology.resolve_crossing("teleport", &reverse, Transform::IDENTITY).unwrap();
        assert_eq!(result.target_instance_id, "a");
        assert_eq!(result.instance_transform, Transform::IDENTITY);
        assert_eq!(result.player_pose.translation, Vec3 { x: 1.0, y: 2.0, z: 0.0 });
    }
}
