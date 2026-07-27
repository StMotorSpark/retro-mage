//! Application-owned level resolution boundary.
//!
//! The engine assigns request identities, validates resolved definitions, and
//! ignores results that no longer belong to the active request. Provider data is
//! intentionally opaque: authored loaders and procedural applications decide
//! how to interpret it.

use std::collections::HashMap;

use crate::world::{LevelDefinition, WorldContractError};

pub type ProviderRequestId = u64;

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct OpaqueProviderData(pub Vec<u8>);

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct LevelProviderMetadata {
    pub seed: OpaqueProviderData,
    pub generator_id: OpaqueProviderData,
    pub generator_version: OpaqueProviderData,
    pub source: OpaqueProviderData,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LevelProviderRequest {
    pub request_id: ProviderRequestId,
    pub instance_id: String,
    pub definition_id: String,
    pub definition_version: String,
    pub metadata: LevelProviderMetadata,
}

#[derive(Debug, Clone, PartialEq)]
pub enum LevelProviderFailure {
    Application(String),
    InvalidDefinition(WorldContractError),
}

#[derive(Debug, Clone, PartialEq)]
pub enum LevelProviderOutcome {
    Ready(LevelDefinition),
    Pending,
    Cancelled,
    Failed(LevelProviderFailure),
}

#[derive(Debug, Clone, PartialEq)]
pub struct LevelProviderResult {
    pub request_id: ProviderRequestId,
    pub instance_id: String,
    pub outcome: LevelProviderOutcome,
}

/// Provider implementation owned by consuming application.
///
/// Method is synchronous at boundary: `Pending` represents work that completes
/// later through another `LevelProviderResult`.
pub trait LevelProvider {
    fn resolve(&mut self, request: LevelProviderRequest) -> LevelProviderResult;

    fn cancel(&mut self, request: &LevelProviderRequest) -> LevelProviderResult {
        LevelProviderResult {
            request_id: request.request_id,
            instance_id: request.instance_id.clone(),
            outcome: LevelProviderOutcome::Cancelled,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum ProviderUpdate {
    Ready(LevelDefinition),
    Pending,
    Cancelled,
    Failed(LevelProviderFailure),
    Stale,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ProviderCoordinatorError {
    EmptyId(&'static str),
    InvalidDefinition(WorldContractError),
    ResultIdentityMismatch,
    UnknownRequest,
}

/// Owns request identity and the currently accepted resolved definition per instance.
#[derive(Debug, Default)]
pub struct LevelProviderCoordinator {
    next_request_id: ProviderRequestId,
    active: HashMap<String, LevelProviderRequest>,
    resolved: HashMap<String, LevelDefinition>,
}

impl LevelProviderCoordinator {
    pub fn new() -> Self { Self { next_request_id: 1, ..Self::default() } }

    pub fn begin(
        &mut self,
        instance_id: impl Into<String>,
        definition_id: impl Into<String>,
        definition_version: impl Into<String>,
        metadata: LevelProviderMetadata,
    ) -> Result<LevelProviderRequest, ProviderCoordinatorError> {
        let request = LevelProviderRequest {
            request_id: self.next_request_id,
            instance_id: instance_id.into(),
            definition_id: definition_id.into(),
            definition_version: definition_version.into(),
            metadata,
        };
        validate_id(&request.instance_id, "instance")?;
        validate_id(&request.definition_id, "definition")?;
        validate_id(&request.definition_version, "definition version")?;
        self.next_request_id = self.next_request_id.checked_add(1).unwrap_or(1);
        self.active.insert(request.instance_id.clone(), request.clone());
        Ok(request)
    }

    pub fn cancel(&mut self, instance_id: &str) -> Option<LevelProviderRequest> {
        self.active.remove(instance_id)
    }

    pub fn accept(&mut self, result: LevelProviderResult) -> Result<ProviderUpdate, ProviderCoordinatorError> {
        let Some(request) = self.active.get(&result.instance_id) else {
            return Ok(ProviderUpdate::Stale);
        };
        if request.request_id != result.request_id {
            return Ok(ProviderUpdate::Stale);
        }
        let update = match result.outcome {
            LevelProviderOutcome::Ready(definition) => {
                definition.validate().map_err(ProviderCoordinatorError::InvalidDefinition)?;
                if definition.id != request.definition_id || definition.version != request.definition_version {
                    return Err(ProviderCoordinatorError::ResultIdentityMismatch);
                }
                self.resolved.insert(request.instance_id.clone(), definition.clone());
                ProviderUpdate::Ready(definition)
            }
            LevelProviderOutcome::Pending => ProviderUpdate::Pending,
            LevelProviderOutcome::Cancelled => {
                self.active.remove(&result.instance_id);
                ProviderUpdate::Cancelled
            }
            LevelProviderOutcome::Failed(error) => ProviderUpdate::Failed(error),
        };
        Ok(update)
    }

    pub fn resolved(&self, instance_id: &str) -> Option<&LevelDefinition> {
        self.resolved.get(instance_id)
    }

    pub fn active_request(&self, instance_id: &str) -> Option<&LevelProviderRequest> {
        self.active.get(instance_id)
    }
}

fn validate_id(id: &str, kind: &'static str) -> Result<(), ProviderCoordinatorError> {
    if id.trim().is_empty() { Err(ProviderCoordinatorError::EmptyId(kind)) } else { Ok(()) }
}

/// Small deterministic provider for engine and integration tests.
#[derive(Debug, Default)]
pub struct FixtureProvider {
    responses: HashMap<String, LevelProviderOutcome>,
}

impl FixtureProvider {
    pub fn ready(definition: LevelDefinition) -> Self {
        let mut provider = Self::default();
        provider.responses.insert(definition.id.clone(), LevelProviderOutcome::Ready(definition));
        provider
    }

    pub fn response(&mut self, definition_id: impl Into<String>, outcome: LevelProviderOutcome) {
        self.responses.insert(definition_id.into(), outcome);
    }
}

impl LevelProvider for FixtureProvider {
    fn resolve(&mut self, request: LevelProviderRequest) -> LevelProviderResult {
        let outcome = self.responses.get(&request.definition_id).cloned()
            .unwrap_or_else(|| LevelProviderOutcome::Failed(LevelProviderFailure::Application("fixture response missing".into())));
        LevelProviderResult { request_id: request.request_id, instance_id: request.instance_id, outcome }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::world::{Bounds, Vec3};

    fn definition(id: &str, version: &str) -> LevelDefinition {
        LevelDefinition { id: id.into(), version: version.into(), bounds: Bounds { min: Vec3::ZERO, max: Vec3 { x: 1.0, y: 1.0, z: 1.0 } }, tiles: vec![], actors: vec![], lights: vec![], anchors: vec![], metadata: Default::default() }
    }

    fn request(coordinator: &mut LevelProviderCoordinator, instance: &str) -> LevelProviderRequest {
        coordinator.begin(instance, "room", "1", LevelProviderMetadata {
            seed: OpaqueProviderData(vec![7]), generator_id: OpaqueProviderData(vec![8]),
            generator_version: OpaqueProviderData(vec![9]), source: OpaqueProviderData(vec![10]),
        }).unwrap()
    }

    #[test]
    fn fixture_resolves_authored_definition_and_metadata_stays_opaque() {
        let mut provider = FixtureProvider::ready(definition("room", "1"));
        let mut coordinator = LevelProviderCoordinator::new();
        let req = request(&mut coordinator, "room-instance");
        assert_eq!(req.metadata.seed, OpaqueProviderData(vec![7]));
        assert!(matches!(coordinator.accept(provider.resolve(req)).unwrap(), ProviderUpdate::Ready(_)));
    }

    #[test]
    fn pending_and_failed_are_observable() {
        let mut provider = FixtureProvider::default();
        provider.response("room", LevelProviderOutcome::Pending);
        let mut coordinator = LevelProviderCoordinator::new();
        let req = request(&mut coordinator, "pending");
        assert_eq!(coordinator.accept(provider.resolve(req)).unwrap(), ProviderUpdate::Pending);
        provider.response("room", LevelProviderOutcome::Failed(LevelProviderFailure::Application("nope".into())));
        let req = coordinator.active_request("pending").unwrap().clone();
        assert!(matches!(coordinator.accept(provider.resolve(req)).unwrap(), ProviderUpdate::Failed(_)));
    }

    #[test]
    fn cancellation_and_stale_results_cannot_replace_current_definition() {
        let mut coordinator = LevelProviderCoordinator::new();
        let old = request(&mut coordinator, "room-instance");
        assert_eq!(coordinator.cancel("room-instance").unwrap().request_id, old.request_id);
        assert_eq!(coordinator.accept(LevelProviderResult { request_id: old.request_id, instance_id: old.instance_id.clone(), outcome: LevelProviderOutcome::Ready(definition("room", "1")) }).unwrap(), ProviderUpdate::Stale);
        let first = request(&mut coordinator, "room-instance");
        let second = request(&mut coordinator, "room-instance");
        assert_eq!(coordinator.accept(LevelProviderResult { request_id: first.request_id, instance_id: first.instance_id, outcome: LevelProviderOutcome::Ready(definition("room", "1")) }).unwrap(), ProviderUpdate::Stale);
        coordinator.accept(LevelProviderResult { request_id: second.request_id, instance_id: second.instance_id, outcome: LevelProviderOutcome::Ready(definition("room", "1")) }).unwrap();
        assert_eq!(coordinator.resolved("room-instance").unwrap().version, "1");
    }
}
