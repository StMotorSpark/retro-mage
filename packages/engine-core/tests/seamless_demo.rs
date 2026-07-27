//! End-to-end contract proof for the authored dungeon/outdoor transition.
use engine_core::global_collision::{CollisionInstance, GlobalCollisionWorld};
use engine_core::level_provider::{FixtureProvider, LevelProvider, LevelProviderMetadata, ProviderUpdate};
use engine_core::residency::ResidencyManager;
use engine_core::world::{AnchorDirection, Bounds, LevelAnchor, LevelDefinition, LevelInstance, PersistencePolicy, RuntimeState, Transform, Vec3};
use engine_core::world_manifest::{AnchorRef, AnchorSharingPolicy, CrossingPolicy, DefinitionDescriptor, InstanceDescriptor, LevelLink, LinkDirection, LinkTarget, LinkTransform, StartLocation, WorldManifest, WorldTopology};

fn anchor(id: &str, x: f32) -> LevelAnchor {
    LevelAnchor { id: id.into(), transform: Transform { translation: Vec3 { x, y: 0.0, z: 0.0 }, ..Transform::IDENTITY }, volume: Bounds { min: Vec3 { x: -0.5, y: 0.0, z: -0.5 }, max: Vec3 { x: 0.5, y: 1.0, z: 0.5 } }, direction: AnchorDirection::Both }
}

fn dungeon() -> LevelDefinition {
    LevelDefinition { id: "dungeon".into(), version: "1".into(), bounds: Bounds { min: Vec3 { x: -3.0, y: 0.0, z: -3.0 }, max: Vec3 { x: 3.0, y: 1.0, z: 3.0 } }, tiles: vec![engine_core::world::LevelTile { position: Vec3 { x: 0.0, y: 0.0, z: -2.0 }, tile_id: 0, material_id: 0, variant: 0, orientation: 0, solid: true, openings: Default::default(), stairs: None }], actors: vec![], lights: vec![], polygons: vec![], anchors: vec![anchor("outdoor-gate", 3.0)], metadata: [("kind".into(), "authored-dungeon".into())].into_iter().collect() }
}

fn outdoor() -> LevelDefinition {
    LevelDefinition { id: "outdoor".into(), version: "1".into(), bounds: Bounds { min: Vec3 { x: -4.0, y: 0.0, z: -4.0 }, max: Vec3 { x: 4.0, y: 1.0, z: 4.0 } }, tiles: vec![engine_core::world::LevelTile { position: Vec3 { x: 0.0, y: 0.0, z: 2.0 }, tile_id: 0, material_id: 0, variant: 0, orientation: 0, solid: true, openings: Default::default(), stairs: None }], actors: vec![], lights: vec![], polygons: vec![], anchors: vec![anchor("dungeon-gate", -3.0)], metadata: [("kind".into(), "authored-outdoor".into())].into_iter().collect() }
}

fn instance(id: &str, definition_id: &str) -> InstanceDescriptor {
    InstanceDescriptor { instance: LevelInstance { id: id.into(), definition_id: definition_id.into(), definition_version: "1".into(), transform: Transform::IDENTITY, state: RuntimeState::Known, persistence: PersistencePolicy::Session, render_resident: false, collision_active: false, simulation_active: false } }
}

fn manifest() -> WorldManifest {
    WorldManifest {
        definitions: vec![DefinitionDescriptor { id: "dungeon".into(), version: "1".into(), anchors: dungeon().anchors }, DefinitionDescriptor { id: "outdoor".into(), version: "1".into(), anchors: outdoor().anchors }],
        instances: vec![instance("dungeon-instance", "dungeon"), instance("outdoor-instance", "outdoor")],
        links: vec![LevelLink { id: "dungeon-outdoor".into(), source: AnchorRef { instance_id: "dungeon-instance".into(), anchor_id: "outdoor-gate".into() }, target: LinkTarget::Instance(AnchorRef { instance_id: "outdoor-instance".into(), anchor_id: "dungeon-gate".into() }), direction: LinkDirection::Bidirectional, anchor_sharing: AnchorSharingPolicy::Exclusive, transform: LinkTransform::Spatial, crossing_policy: CrossingPolicy::default() }],
        starting_locations: vec![StartLocation { instance_id: "dungeon-instance".into(), anchor_id: "outdoor-gate".into() }],
    }
}

#[test]
fn manifest_is_bidirectional_and_target_is_explicitly_anchored() {
    let topology = WorldTopology::from_manifest(manifest()).unwrap();
    assert_eq!(topology.instance_count(), 2);
    assert_eq!(topology.link_count(), 1);
    let pose = Transform { translation: Vec3 { x: 2.0, y: 0.0, z: 0.0 }, ..Transform::IDENTITY };
    let forward = topology.resolve_crossing("dungeon-outdoor", &AnchorRef { instance_id: "dungeon-instance".into(), anchor_id: "outdoor-gate".into() }, pose).unwrap();
    let reverse = topology.resolve_crossing("dungeon-outdoor", &AnchorRef { instance_id: "outdoor-instance".into(), anchor_id: "dungeon-gate".into() }, pose).unwrap();
    assert_eq!(forward.target_instance_id, "outdoor-instance");
    assert_eq!(reverse.target_instance_id, "dungeon-instance");
}

#[test]
fn provider_preload_failure_keeps_source_active() {
    let mut residency = ResidencyManager::new();
    let source = instance("dungeon-instance", "dungeon").instance;
    let target = instance("outdoor-instance", "outdoor").instance;
    residency.register(source).unwrap();
    residency.register(target).unwrap();
    let mut provider = FixtureProvider::ready(dungeon());
    assert!(matches!(residency.resolve(&mut provider, "dungeon-instance", LevelProviderMetadata::default()).unwrap(), ProviderUpdate::Ready(_)));
    residency.activate("dungeon-instance").unwrap();
    let request = residency.begin_load("outdoor-instance", LevelProviderMetadata::default()).unwrap();
    let mut failing = FixtureProvider::default();
    let result = failing.resolve(request);
    residency.accept(result).unwrap();
    assert_eq!(residency.state("dungeon-instance"), Some(RuntimeState::Active));
    assert_eq!(residency.state("outdoor-instance"), Some(RuntimeState::Failed));
    assert!(residency.collision_active("dungeon-instance"));
}

#[test]
fn transformed_source_and_target_collide_in_one_global_world() {
    let source = instance("dungeon-instance", "dungeon").instance;
    let target = instance("outdoor-instance", "outdoor").instance;
    let mut world = GlobalCollisionWorld::new();
    world.set_instance(CollisionInstance::from_level(&source, &dungeon()), true);
    let mut placed_target = target;
    placed_target.transform = Transform { translation: Vec3 { x: 8.0, y: 0.0, z: 0.0 }, ..Transform::IDENTITY };
    world.set_instance(CollisionInstance::from_level(&placed_target, &outdoor()), true);
    assert!(world.has_active_geometry());
    assert!(world.collides(Transform { translation: Vec3 { x: 8.0, y: 0.0, z: 2.0 }, ..Transform::IDENTITY }, 0.3, 1.6));
}
