use std::collections::{HashMap, HashSet};
use crate::world::{Transform, Vec3, RuntimeState};
use crate::world_manifest::{WorldTopology, LinkPreloadPolicy};

#[derive(Debug, Clone, PartialEq)]
pub struct SchedulerPolicy {
    pub relevance_distance: f32,
    pub retention_hysteresis: f32,
    pub default_concurrency: usize,
}

impl Default for SchedulerPolicy {
    fn default() -> Self {
        Self {
            relevance_distance: 100.0,
            retention_hysteresis: 20.0,
            default_concurrency: 2,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum ResidencyIntent {
    Unneeded,
    Prefetch,
    Required,
    Pinned,
}

#[derive(Debug, Clone, PartialEq)]
pub struct IntentDecision {
    pub intent: ResidencyIntent,
    pub priority: i32,
    pub reason: String,
}

#[derive(Debug)]
pub struct PlannerContext<'a> {
    pub current_instance: Option<&'a str>,
    pub player_pose: Transform,
    pub topology: &'a WorldTopology,
    pub active_pins: &'a HashSet<String>,
    pub residency_states: &'a HashMap<String, RuntimeState>,
    pub priorities: &'a HashMap<String, i32>,
    pub policy: &'a SchedulerPolicy,
}

pub fn evaluate_intent(ctx: PlannerContext) -> HashMap<String, IntentDecision> {
    let mut decisions: HashMap<String, IntentDecision> = HashMap::new();

    // 1. Initialize all known instances with Unneeded
    for descriptor in ctx.topology.instances() {
        decisions.insert(descriptor.instance.id.clone(), IntentDecision {
            intent: ResidencyIntent::Unneeded,
            priority: *ctx.priorities.get(&descriptor.instance.id).unwrap_or(&0),
            reason: "Default unneeded".into(),
        });
    }

    // 2. Evaluate finite bounds and pins
    for descriptor in ctx.topology.instances() {
        let id = &descriptor.instance.id;
        let mut intent = ResidencyIntent::Unneeded;
        let mut reason = "Out of range".to_string();

        if ctx.active_pins.contains(id) || ctx.current_instance == Some(id.as_str()) {
            intent = ResidencyIntent::Pinned;
            reason = "Explicit pin or current".into();
        } else {
            // Simplified distance check: center of the bounds to player pose
            // In a real implementation this would check bounds properly.
            // Using translation for coarse planner relevance check.
            let center = descriptor.instance.transform.translation;
            let dist = distance(ctx.player_pose.translation, center);
            let threshold = ctx.policy.relevance_distance;
            let state = ctx.residency_states.get(id).unwrap_or(&RuntimeState::Known);
            
            let mut active_dist = threshold;
            if matches!(state, RuntimeState::Resident | RuntimeState::Active | RuntimeState::Evictable) {
                active_dist += ctx.policy.retention_hysteresis;
            }

            if dist <= active_dist {
                intent = ResidencyIntent::Prefetch;
                reason = "Within relevance bounds".into();
            }
        }
        
        if let Some(current) = decisions.get_mut(id) {
            if intent > current.intent {
                current.intent = intent;
                current.reason = reason;
            }
        }
    }

    // 3. Evaluate reachable links from current
    if let Some(current_id) = ctx.current_instance {
        for link in ctx.topology.links() {
            if link.source.instance_id == current_id {
                let target_id = match &link.target {
                    crate::world_manifest::LinkTarget::Instance(tgt) => &tgt.instance_id,
                    crate::world_manifest::LinkTarget::Definition { instance_id, .. } => instance_id, // Definition is resolved to instance_id in materialized target
                };
                
                let policy = &link.preload_policy;
                let intent = match policy {
                    LinkPreloadPolicy::Immediate => ResidencyIntent::Required,
                    LinkPreloadPolicy::Distance(d) => {
                        let center = match ctx.topology.anchor_center_world(&link.source) {
                            Ok(p) => p,
                            Err(_) => continue,
                        };
                        if distance(ctx.player_pose.translation, center) <= *d {
                            ResidencyIntent::Prefetch
                        } else {
                            ResidencyIntent::Unneeded
                        }
                    },
                    LinkPreloadPolicy::Manual => ResidencyIntent::Unneeded,
                };
                
                if let Some(current) = decisions.get_mut(target_id) {
                    if intent > current.intent {
                        current.intent = intent;
                        current.reason = "Link preload policy".into();
                    } else if intent == current.intent && intent != ResidencyIntent::Unneeded {
                         current.reason = "Link preload policy".into();
                    }
                }
            }
        }
    }

    decisions
}

fn distance(a: Vec3, b: Vec3) -> f32 {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    let dz = a.z - b.z;
    (dx*dx + dy*dy + dz*dz).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::world::{LevelInstance, PersistencePolicy, Quaternion, LevelAnchor, AnchorDirection, Bounds};
    use crate::world_manifest::{InstanceDescriptor, DefinitionDescriptor, WorldManifest, LevelLink, AnchorRef, LinkTarget, LinkDirection, CrossingPolicy, LinkPreloadPolicy};

    fn setup_topology() -> WorldTopology {
        let manifest = WorldManifest {
            definitions: vec![
                DefinitionDescriptor { id: "def1".into(), version: "1".into(), anchors: vec![
                    LevelAnchor { id: "door1".into(), transform: Transform::IDENTITY, volume: Bounds { min: Vec3::ZERO, max: Vec3 { x: 1.0, y: 1.0, z: 1.0 } }, direction: AnchorDirection::Both },
                    LevelAnchor { id: "door2".into(), transform: Transform::IDENTITY, volume: Bounds { min: Vec3::ZERO, max: Vec3 { x: 1.0, y: 1.0, z: 1.0 } }, direction: AnchorDirection::Both },
                ] },
            ],
            instances: vec![
                InstanceDescriptor {
                    instance: LevelInstance {
                        id: "current".into(),
                        definition_id: "def1".into(),
                        definition_version: "1".into(),
                        transform: Transform { translation: Vec3 { x: 0.0, y: 0.0, z: 0.0 }, rotation: Quaternion { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }, scale: 1.0 },
                        state: RuntimeState::Known,
                        persistence: PersistencePolicy::Session,
                        render_resident: false,
                        collision_active: false,
                        simulation_active: false,
                    }
                },
                InstanceDescriptor {
                    instance: LevelInstance {
                        id: "nearby".into(),
                        definition_id: "def1".into(),
                        definition_version: "1".into(),
                        transform: Transform { translation: Vec3 { x: 50.0, y: 0.0, z: 0.0 }, rotation: Quaternion { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }, scale: 1.0 },
                        state: RuntimeState::Known,
                        persistence: PersistencePolicy::Session,
                        render_resident: false,
                        collision_active: false,
                        simulation_active: false,
                    }
                },
                InstanceDescriptor {
                    instance: LevelInstance {
                        id: "far".into(),
                        definition_id: "def1".into(),
                        definition_version: "1".into(),
                        transform: Transform { translation: Vec3 { x: 150.0, y: 0.0, z: 0.0 }, rotation: Quaternion { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }, scale: 1.0 },
                        state: RuntimeState::Known,
                        persistence: PersistencePolicy::Session,
                        render_resident: false,
                        collision_active: false,
                        simulation_active: false,
                    }
                },
                InstanceDescriptor {
                    instance: LevelInstance {
                        id: "linked".into(),
                        definition_id: "def1".into(),
                        definition_version: "1".into(),
                        transform: Transform { translation: Vec3 { x: 200.0, y: 0.0, z: 0.0 }, rotation: Quaternion { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }, scale: 1.0 },
                        state: RuntimeState::Known,
                        persistence: PersistencePolicy::Session,
                        render_resident: false,
                        collision_active: false,
                        simulation_active: false,
                    }
                }
            ],
            links: vec![
                LevelLink {
                    id: "link1".into(),
                    source: AnchorRef { instance_id: "current".into(), anchor_id: "door1".into() },
                    target: LinkTarget::Instance(AnchorRef { instance_id: "linked".into(), anchor_id: "door2".into() }),
                    transform: crate::world_manifest::LinkTransform::Spatial,
                    direction: LinkDirection::OneWay,
                    crossing_policy: CrossingPolicy::default(),
                    preload_policy: LinkPreloadPolicy::Immediate,
                    anchor_sharing: crate::world_manifest::AnchorSharingPolicy::Exclusive,
                }
            ],
            starting_locations: vec![],
        };
        WorldTopology::from_manifest(manifest).unwrap()
    }

    #[test]
    fn intent_precedence() {
        let topology = setup_topology();
        let mut active_pins = HashSet::new();
        active_pins.insert("far".into());
        let residency_states = HashMap::new();
        let priorities = HashMap::new();
        let policy = SchedulerPolicy::default();

        let ctx = PlannerContext {
            current_instance: Some("current"),
            player_pose: Transform::IDENTITY,
            topology: &topology,
            active_pins: &active_pins,
            residency_states: &residency_states,
            priorities: &priorities,
            policy: &policy,
        };

        let decisions = evaluate_intent(ctx);

        assert_eq!(decisions.get("current").unwrap().intent, ResidencyIntent::Pinned); // Current is pinned
        assert_eq!(decisions.get("nearby").unwrap().intent, ResidencyIntent::Prefetch); // Inside 100.0 relevance
        assert_eq!(decisions.get("far").unwrap().intent, ResidencyIntent::Pinned); // Explicit pin
        assert_eq!(decisions.get("linked").unwrap().intent, ResidencyIntent::Required); // Link Preload Immediate
    }

    #[test]
    fn retention_hysteresis() {
        let topology = setup_topology();
        let active_pins = HashSet::new();
        let mut residency_states = HashMap::new();
        residency_states.insert("far".into(), RuntimeState::Resident);
        let priorities = HashMap::new();
        
        let mut policy = SchedulerPolicy::default();
        policy.relevance_distance = 100.0;
        policy.retention_hysteresis = 60.0; // Total retention = 160.0

        let ctx = PlannerContext {
            current_instance: None,
            player_pose: Transform::IDENTITY, // distance to "far" is 150.0
            topology: &topology,
            active_pins: &active_pins,
            residency_states: &residency_states,
            priorities: &priorities,
            policy: &policy,
        };

        let decisions = evaluate_intent(ctx);

        // "far" is resident, distance is 150.0 <= 160.0 -> Prefetch
        assert_eq!(decisions.get("far").unwrap().intent, ResidencyIntent::Prefetch);
    }
}
