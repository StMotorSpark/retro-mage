//! Shared local-definition and global-instance contracts.
//!
//! Definitions contain only immutable local-space content. Instances own placement
//! and transient runtime state. This module intentionally contains no loading,
//! generation, streaming, or rendering policy.

use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    pub const ZERO: Self = Self { x: 0.0, y: 0.0, z: 0.0 };

    fn is_finite(self) -> bool {
        self.x.is_finite() && self.y.is_finite() && self.z.is_finite()
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Quaternion {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub w: f32,
}

impl Quaternion {
    pub const IDENTITY: Self = Self { x: 0.0, y: 0.0, z: 0.0, w: 1.0 };

    fn is_valid(self) -> bool {
        self.x.is_finite()
            && self.y.is_finite()
            && self.z.is_finite()
            && self.w.is_finite()
            && (self.x * self.x + self.y * self.y + self.z * self.z + self.w * self.w) > f32::EPSILON
    }

    fn multiply(self, other: Self) -> Self {
        Self {
            x: self.w * other.x + self.x * other.w + self.y * other.z - self.z * other.y,
            y: self.w * other.y - self.x * other.z + self.y * other.w + self.z * other.x,
            z: self.w * other.z + self.x * other.y - self.y * other.x + self.z * other.w,
            w: self.w * other.w - self.x * other.x - self.y * other.y - self.z * other.z,
        }
    }

    fn rotate(self, point: Vec3) -> Vec3 {
        let q = self;
        let uv = Vec3 {
            x: q.y * point.z - q.z * point.y,
            y: q.z * point.x - q.x * point.z,
            z: q.x * point.y - q.y * point.x,
        };
        let uuv = Vec3 {
            x: q.y * uv.z - q.z * uv.y,
            y: q.z * uv.x - q.x * uv.z,
            z: q.x * uv.y - q.y * uv.x,
        };
        Vec3 {
            x: point.x + 2.0 * (q.w * uv.x + uuv.x),
            y: point.y + 2.0 * (q.w * uv.y + uuv.y),
            z: point.z + 2.0 * (q.w * uv.z + uuv.z),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Transform {
    pub translation: Vec3,
    pub rotation: Quaternion,
    pub scale: f32,
}

impl Transform {
    pub const IDENTITY: Self = Self {
        translation: Vec3::ZERO,
        rotation: Quaternion::IDENTITY,
        scale: 1.0,
    };

    /// Construct initial ground-plane placement while retaining full 3D rotation.
    pub fn from_translation_yaw_scale(translation: Vec3, yaw: f32, scale: f32) -> Self {
        Self {
            translation,
            rotation: Quaternion { x: 0.0, y: (yaw * 0.5).sin(), z: 0.0, w: (yaw * 0.5).cos() },
            scale,
        }
    }

    pub fn validate(&self) -> Result<(), WorldContractError> {
        if !self.translation.is_finite() {
            return Err(WorldContractError::NonFinite("transform translation"));
        }
        if !self.rotation.is_valid() {
            return Err(WorldContractError::InvalidRotation);
        }
        if !self.scale.is_finite() || self.scale < 0.0 {
            return Err(WorldContractError::InvalidScale);
        }
        Ok(())
    }

    pub fn transform_point(&self, point: Vec3) -> Vec3 {
        let rotated = self.rotation.rotate(point);
        Vec3 {
            x: self.translation.x + rotated.x * self.scale,
            y: self.translation.y + rotated.y * self.scale,
            z: self.translation.z + rotated.z * self.scale,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Bounds {
    pub min: Vec3,
    pub max: Vec3,
}

impl Bounds {
    pub fn validate(&self) -> Result<(), WorldContractError> {
        if !self.min.is_finite() || !self.max.is_finite() {
            return Err(WorldContractError::NonFinite("bounds"));
        }
        if self.min.x > self.max.x || self.min.y > self.max.y || self.min.z > self.max.z {
            return Err(WorldContractError::InvertedBounds);
        }
        Ok(())
    }

    pub fn transformed(&self, transform: &Transform) -> Result<Self, WorldContractError> {
        self.validate()?;
        transform.validate()?;
        let mut min = Vec3 { x: f32::INFINITY, y: f32::INFINITY, z: f32::INFINITY };
        let mut max = Vec3 { x: f32::NEG_INFINITY, y: f32::NEG_INFINITY, z: f32::NEG_INFINITY };
        for x in [self.min.x, self.max.x] {
            for y in [self.min.y, self.max.y] {
                for z in [self.min.z, self.max.z] {
                    let p = transform.transform_point(Vec3 { x, y, z });
                    min.x = min.x.min(p.x); min.y = min.y.min(p.y); min.z = min.z.min(p.z);
                    max.x = max.x.max(p.x); max.y = max.y.max(p.y); max.z = max.z.max(p.z);
                }
            }
        }
        Ok(Self { min, max })
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AnchorDirection { In, Out, Both }

#[derive(Debug, Clone, PartialEq)]
pub struct LevelAnchor {
    pub id: String,
    pub transform: Transform,
    pub volume: Bounds,
    pub direction: AnchorDirection,
}

impl LevelAnchor {
    pub fn validate(&self) -> Result<(), WorldContractError> {
        validate_id(&self.id, "anchor")?;
        self.transform.validate()?;
        self.volume.validate()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct LevelDefinition {
    pub id: String,
    pub version: String,
    pub bounds: Bounds,
    pub tiles: Vec<Vec3>,
    pub actors: Vec<Vec3>,
    pub lights: Vec<Vec3>,
    pub anchors: Vec<LevelAnchor>,
    pub metadata: HashMap<String, String>,
}

impl LevelDefinition {
    pub fn validate(&self) -> Result<(), WorldContractError> {
        validate_id(&self.id, "definition")?;
        validate_id(&self.version, "definition version")?;
        self.bounds.validate()?;
        for point in self.tiles.iter().chain(self.actors.iter()).chain(self.lights.iter()) {
            if !point.is_finite() { return Err(WorldContractError::NonFinite("local content")); }
        }
        let mut ids = std::collections::HashSet::new();
        for anchor in &self.anchors {
            anchor.validate()?;
            if !ids.insert(&anchor.id) { return Err(WorldContractError::DuplicateAnchor(anchor.id.clone())); }
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RuntimeState { Known, Loading, Resident, Active, Evictable, Evicted, Failed }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PersistencePolicy { Persistent, Session, Regenerated }

#[derive(Debug, Clone, PartialEq)]
pub struct LevelInstance {
    pub id: String,
    pub definition_id: String,
    pub definition_version: String,
    pub transform: Transform,
    pub state: RuntimeState,
    pub persistence: PersistencePolicy,
    pub render_resident: bool,
    pub collision_active: bool,
    pub simulation_active: bool,
}

impl LevelInstance {
    pub fn validate(&self) -> Result<(), WorldContractError> {
        validate_id(&self.id, "instance")?;
        validate_id(&self.definition_id, "definition")?;
        validate_id(&self.definition_version, "definition version")?;
        self.transform.validate()
    }

    pub fn world_bounds(&self, definition: &LevelDefinition) -> Result<Bounds, WorldContractError> {
        self.validate()?;
        definition.validate()?;
        if self.definition_id != definition.id || self.definition_version != definition.version {
            return Err(WorldContractError::DefinitionMismatch);
        }
        definition.bounds.transformed(&self.transform)
    }

    pub fn anchor_world_transform(&self, anchor: &LevelAnchor) -> Result<Transform, WorldContractError> {
        self.validate()?;
        anchor.validate()?;
        Ok(Transform {
            translation: self.transform.transform_point(anchor.transform.translation),
            rotation: self.transform.rotation.multiply(anchor.transform.rotation),
            scale: self.transform.scale * anchor.transform.scale,
        })
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum WorldContractError {
    EmptyId(&'static str),
    NonFinite(&'static str),
    InvalidScale,
    InvalidRotation,
    InvertedBounds,
    DuplicateAnchor(String),
    DefinitionMismatch,
    DuplicateDefinition(String),
    DuplicateInstance(String),
    UnknownDefinition(String),
}

fn validate_id(id: &str, kind: &'static str) -> Result<(), WorldContractError> {
    if id.trim().is_empty() { Err(WorldContractError::EmptyId(kind)) } else { Ok(()) }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bounds() -> Bounds { Bounds { min: Vec3 { x: -1.0, y: 0.0, z: -2.0 }, max: Vec3 { x: 1.0, y: 2.0, z: 2.0 } } }

    #[test]
    fn transforms_local_point_to_global_space() {
        let transform = Transform { translation: Vec3 { x: 10.0, y: 3.0, z: 4.0 }, rotation: Quaternion::IDENTITY, scale: 2.0 };
        assert_eq!(transform.transform_point(Vec3 { x: 1.0, y: 2.0, z: 3.0 }), Vec3 { x: 12.0, y: 7.0, z: 10.0 });
    }

    #[test]
    fn derives_world_bounds_from_all_corners() {
        let instance = LevelInstance { id: "room".into(), definition_id: "d".into(), definition_version: "1".into(), transform: Transform { translation: Vec3 { x: 5.0, y: 2.0, z: -1.0 }, ..Transform::IDENTITY }, state: RuntimeState::Known, persistence: PersistencePolicy::Session, render_resident: false, collision_active: false, simulation_active: false };
        let definition = LevelDefinition { id: "d".into(), version: "1".into(), bounds: bounds(), tiles: vec![], actors: vec![], lights: vec![], anchors: vec![], metadata: HashMap::new() };
        assert_eq!(instance.world_bounds(&definition).unwrap(), Bounds { min: Vec3 { x: 4.0, y: 2.0, z: -3.0 }, max: Vec3 { x: 6.0, y: 4.0, z: 1.0 } });
    }

    #[test]
    fn rejects_invalid_contract_inputs() {
        let mut transform = Transform::IDENTITY; transform.scale = -1.0;
        assert_eq!(transform.validate(), Err(WorldContractError::InvalidScale));
        assert_eq!((Bounds { min: Vec3 { x: 1.0, y: 0.0, z: 0.0 }, max: Vec3::ZERO }).validate(), Err(WorldContractError::InvertedBounds));
        let mut definition = LevelDefinition { id: "".into(), version: "1".into(), bounds: bounds(), tiles: vec![], actors: vec![], lights: vec![], anchors: vec![], metadata: HashMap::new() };
        assert_eq!(definition.validate(), Err(WorldContractError::EmptyId("definition")));
        definition.id = "d".into(); definition.anchors.push(LevelAnchor { id: "".into(), transform: Transform::IDENTITY, volume: bounds(), direction: AnchorDirection::Both });
        assert_eq!(definition.validate(), Err(WorldContractError::EmptyId("anchor")));
    }
}
