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

    pub fn is_finite(self) -> bool {
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

    pub(crate) fn normalized(self) -> Self {
        let length = (self.x * self.x + self.y * self.y + self.z * self.z + self.w * self.w).sqrt();
        Self { x: self.x / length, y: self.y / length, z: self.z / length, w: self.w / length }
    }

    fn conjugate(self) -> Self {
        Self { x: -self.x, y: -self.y, z: -self.z, w: self.w }
    }

    fn multiply(self, other: Self) -> Self {
        Self {
            x: self.w * other.x + self.x * other.w + self.y * other.z - self.z * other.y,
            y: self.w * other.y - self.x * other.z + self.y * other.w + self.z * other.x,
            z: self.w * other.z + self.x * other.y - self.y * other.x + self.z * other.w,
            w: self.w * other.w - self.x * other.x - self.y * other.y - self.z * other.z,
        }
    }

    pub(crate) fn rotate(self, point: Vec3) -> Vec3 {
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
        if !self.scale.is_finite() || self.scale <= f32::EPSILON {
            return Err(WorldContractError::InvalidScale);
        }
        Ok(())
    }

    pub fn transform_point(&self, point: Vec3) -> Vec3 {
        let rotated = self.rotation.normalized().rotate(point);
        Vec3 {
            x: self.translation.x + rotated.x * self.scale,
            y: self.translation.y + rotated.y * self.scale,
            z: self.translation.z + rotated.z * self.scale,
        }
    }

    /// Compose transforms, applying `other` in this transform's local space.
    pub fn compose(&self, other: &Self) -> Self {
        Self {
            translation: self.transform_point(other.translation),
            rotation: self.rotation.normalized().multiply(other.rotation.normalized()).normalized(),
            scale: self.scale * other.scale,
        }
    }

    /// Invert uniform-scale transform. Zero scale has no usable inverse.
    pub fn inverse(&self) -> Result<Self, WorldContractError> {
        self.validate()?;
        if self.scale <= f32::EPSILON {
            return Err(WorldContractError::InvalidScale);
        }
        let inverse_rotation = self.rotation.normalized().conjugate();
        let inverse_scale = 1.0 / self.scale;
        let inverse = Self { translation: Vec3::ZERO, rotation: inverse_rotation, scale: inverse_scale };
        Ok(Self { translation: inverse.transform_point(Vec3 { x: -self.translation.x, y: -self.translation.y, z: -self.translation.z }), ..inverse })
    }

    pub fn with_translation(self, translation: Vec3) -> Self {
        Self { translation, ..self }
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
        self.volume.validate()?;
        if self.volume.min.x >= self.volume.max.x || self.volume.min.y >= self.volume.max.y || self.volume.min.z >= self.volume.max.z {
            return Err(WorldContractError::InvalidAnchorVolume);
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TileOpenings {
    pub north: bool,
    pub east: bool,
    pub south: bool,
    pub west: bool,
    pub vertical: bool,
}

impl Default for TileOpenings {
    fn default() -> Self { Self { north: false, east: false, south: false, west: false, vertical: false } }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StairMetadata {
    pub rise: i32,
    pub run: i32,
    pub direction: u8,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LevelTile {
    pub position: Vec3,
    pub tile_id: u32,
    pub material_id: u32,
    /// Renderer-neutral UV mode/data and material contract flags.
    /// Defaults: tile-repeat, (0, 0), opaque|lit (0b0101).
    pub uv_mode: u8,
    pub uv_u: f32,
    pub uv_v: f32,
    pub render_flags: u32,
    pub variant: u16,
    pub orientation: u8,
    pub solid: bool,
    pub openings: TileOpenings,
    pub stairs: Option<StairMetadata>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LevelActor {
    pub position: Vec3,
    pub actor_id: String,
    pub sprite_id: u32,
    pub facing: f32,
    pub active: bool,
    pub spawn: bool,
    /// Renderer-neutral billboard material metadata. Legacy actors use defaults.
    pub material_id: u32,
    pub uv_mode: u8,
    pub uv_u: f32,
    pub uv_v: f32,
    pub render_flags: u32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LevelLight {
    pub position: Vec3,
    pub color: [f32; 3],
    pub intensity: f32,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LevelPolygon {
    pub vertices: Vec<Vec3>,
    pub normals: Vec<Vec3>,
    pub uvs: Vec<(f32, f32)>,
    pub material_id: u32,
    pub uv_mode: u8,
    pub render_flags: u32,
    pub source_id: u32,
    pub solid: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SupportSurface {
    pub bounds: Bounds,
    pub height_function: [f32; 3], // [a, b, c] for y = a*x + b*z + c
    pub normal: Vec3,
    pub walkable: bool,
    pub metadata: HashMap<String, String>,
}

impl SupportSurface {
    pub fn validate(&self) -> Result<(), WorldContractError> {
        self.bounds.validate()?;
        if !self.height_function.iter().all(|v| v.is_finite()) {
            return Err(WorldContractError::NonFinite("height_function"));
        }
        if !self.normal.is_finite() {
            return Err(WorldContractError::NonFinite("normal"));
        }
        Ok(())
    }

    pub fn transformed(&self, transform: &Transform) -> Result<Self, WorldContractError> {
        let new_bounds = self.bounds.transformed(transform)?;
        let p0 = Vec3 { x: 0.0, y: self.height_function[2], z: 0.0 };
        let new_p0 = transform.transform_point(p0);

        let new_normal = transform.rotation.normalized().rotate(self.normal);

        let mut new_height_function = [0.0, 0.0, 0.0];
        if new_normal.y.abs() > f32::EPSILON {
            new_height_function[0] = -new_normal.x / new_normal.y;
            new_height_function[1] = -new_normal.z / new_normal.y;
            new_height_function[2] = new_p0.y + (new_normal.x * new_p0.x + new_normal.z * new_p0.z) / new_normal.y;
        }

        Ok(Self {
            bounds: new_bounds,
            height_function: new_height_function,
            normal: new_normal,
            walkable: self.walkable,
            metadata: self.metadata.clone(),
        })
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct DynamicContentContribution {
    pub tiles: Vec<LevelTile>,
    pub actors: Vec<LevelActor>,
    pub lights: Vec<LevelLight>,
    pub polygons: Vec<LevelPolygon>,
    pub surfaces: Vec<SupportSurface>,
}

impl DynamicContentContribution {
    pub fn validate(&self) -> Result<(), WorldContractError> {
        let definition = LevelDefinition { id: "dynamic-content".into(), version: "1".into(), bounds: Bounds { min: Vec3::ZERO, max: Vec3::ZERO }, tiles: self.tiles.clone(), actors: self.actors.clone(), lights: self.lights.clone(), polygons: self.polygons.clone(), anchors: vec![], surfaces: self.surfaces.clone(), metadata: HashMap::new(), dynamic_content: vec![] };
        definition.validate()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct DynamicContentVariant { pub id: String, pub contribution: DynamicContentContribution }

#[derive(Debug, Clone, PartialEq)]
pub struct DynamicContentSlot { pub content_id: String, pub default_variant_id: String, pub variants: Vec<DynamicContentVariant> }

#[derive(Debug, Clone, PartialEq)]
pub struct LevelDefinition {
    pub id: String,
    pub version: String,
    pub bounds: Bounds,
    pub tiles: Vec<LevelTile>,
    pub actors: Vec<LevelActor>,
    pub lights: Vec<LevelLight>,
    pub polygons: Vec<LevelPolygon>,
    pub anchors: Vec<LevelAnchor>,
    pub surfaces: Vec<SupportSurface>,
    pub metadata: HashMap<String, String>,
    pub dynamic_content: Vec<DynamicContentSlot>,
}

impl LevelDefinition {
    pub fn validate(&self) -> Result<(), WorldContractError> {
        validate_id(&self.id, "definition")?;
        validate_id(&self.version, "definition version")?;
        self.bounds.validate()?;
        for tile in &self.tiles { if !tile.position.is_finite() { return Err(WorldContractError::NonFinite("tile position")); } }
        for actor in &self.actors { validate_id(&actor.actor_id, "actor")?; if !actor.position.is_finite() { return Err(WorldContractError::NonFinite("actor position")); } }
        for light in &self.lights { if !light.position.is_finite() || light.color.iter().any(|value| !value.is_finite()) || !light.intensity.is_finite() { return Err(WorldContractError::NonFinite("light")); } }
        for polygon in &self.polygons { if polygon.vertices.len() < 3 || polygon.vertices.iter().any(|point| !point.is_finite()) || polygon.normals.len() != polygon.vertices.len() || polygon.normals.iter().any(|normal| !normal.is_finite()) || polygon.uvs.len() != polygon.vertices.len() || polygon.uvs.iter().any(|(u, v)| !u.is_finite() || !v.is_finite()) || polygon.uv_mode > 2 { return Err(WorldContractError::InvalidPolygon); } }
        for surface in &self.surfaces { surface.validate()?; }
        let mut content_ids = std::collections::HashSet::new();
        for slot in &self.dynamic_content {
            validate_id(&slot.content_id, "content")?;
            validate_id(&slot.default_variant_id, "variant")?;
            if !content_ids.insert(&slot.content_id) { return Err(WorldContractError::DuplicateContentId(slot.content_id.clone())); }
            let mut variant_ids = std::collections::HashSet::new();
            let mut has_default = false;
            for variant in &slot.variants {
                validate_id(&variant.id, "variant")?;
                if !variant_ids.insert(&variant.id) { return Err(WorldContractError::DuplicateVariantId { content_id: slot.content_id.clone(), variant_id: variant.id.clone() }); }
                has_default |= variant.id == slot.default_variant_id;
                variant.contribution.validate()?;
            }
            if !has_default { return Err(WorldContractError::UnknownDefaultVariant(slot.content_id.clone())); }
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
pub enum PersistencePolicy { Persistent, Session, Regenerated, ApplicationManaged }

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RestoreStatus { None, Pending, Restored, Failed(String) }

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HandoffStatus { None, Pending, Acknowledged, Failed(String) }

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
    pub restore_status: RestoreStatus,
    pub state_version: String,
    pub restore_attempts: u32,
    pub handoff_status: HandoffStatus,
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
    InvalidPolygon,
    InvalidAnchorVolume,
    DuplicateContentId(String),
    DuplicateVariantId { content_id: String, variant_id: String },
    UnknownDefaultVariant(String),
}

fn validate_id(id: &str, kind: &'static str) -> Result<(), WorldContractError> {
    if id.trim().is_empty() { Err(WorldContractError::EmptyId(kind)) } else { Ok(()) }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bounds() -> Bounds { Bounds { min: Vec3 { x: -1.0, y: 0.0, z: -2.0 }, max: Vec3 { x: 1.0, y: 2.0, z: 2.0 } } }

    #[test]
    fn transforms_support_surface_correctly() {
        let mut transform = Transform::IDENTITY;
        transform.translation = Vec3 { x: 10.0, y: 5.0, z: 0.0 };
        let surface = SupportSurface {
            bounds: Bounds { min: Vec3::ZERO, max: Vec3 { x: 10.0, y: 0.0, z: 10.0 } },
            height_function: [0.0, 0.0, 0.0],
            normal: Vec3 { x: 0.0, y: 1.0, z: 0.0 },
            walkable: true,
            metadata: HashMap::new(),
        };
        let new_surface = surface.transformed(&transform).unwrap();
        assert_eq!(new_surface.height_function, [0.0, 0.0, 5.0]);
        assert_eq!(new_surface.normal, Vec3 { x: 0.0, y: 1.0, z: 0.0 });
    }

    #[test]
    fn transforms_local_point_to_global_space() {
        let transform = Transform { translation: Vec3 { x: 10.0, y: 3.0, z: 4.0 }, rotation: Quaternion::IDENTITY, scale: 2.0 };
        assert_eq!(transform.transform_point(Vec3 { x: 1.0, y: 2.0, z: 3.0 }), Vec3 { x: 12.0, y: 7.0, z: 10.0 });
    }

    #[test]
    fn derives_world_bounds_from_all_corners() {
        let instance = LevelInstance { id: "room".into(), definition_id: "d".into(), definition_version: "1".into(), transform: Transform { translation: Vec3 { x: 5.0, y: 2.0, z: -1.0 }, ..Transform::IDENTITY }, state: RuntimeState::Known, persistence: PersistencePolicy::Session, render_resident: false, collision_active: false, simulation_active: false, restore_status: RestoreStatus::None, state_version: String::new(), restore_attempts: 0, handoff_status: HandoffStatus::None };
        let definition = LevelDefinition { id: "d".into(), version: "1".into(), bounds: bounds(), tiles: vec![], actors: vec![], lights: vec![], polygons: vec![], anchors: vec![], surfaces: vec![], metadata: HashMap::new(), dynamic_content: vec![] };
        assert_eq!(instance.world_bounds(&definition).unwrap(), Bounds { min: Vec3 { x: 4.0, y: 2.0, z: -3.0 }, max: Vec3 { x: 6.0, y: 4.0, z: 1.0 } });
    }

    #[test]
    fn rejects_invalid_contract_inputs() {
        let mut transform = Transform::IDENTITY; transform.scale = -1.0;
        assert_eq!(transform.validate(), Err(WorldContractError::InvalidScale));
        transform.scale = 0.0;
        assert_eq!(transform.validate(), Err(WorldContractError::InvalidScale));
        assert_eq!((Bounds { min: Vec3 { x: 1.0, y: 0.0, z: 0.0 }, max: Vec3::ZERO }).validate(), Err(WorldContractError::InvertedBounds));
        let mut definition = LevelDefinition { id: "".into(), version: "1".into(), bounds: bounds(), tiles: vec![], actors: vec![], lights: vec![], polygons: vec![], anchors: vec![], surfaces: vec![], metadata: HashMap::new(), dynamic_content: vec![] };
        assert_eq!(definition.validate(), Err(WorldContractError::EmptyId("definition")));
        definition.id = "d".into(); definition.anchors.push(LevelAnchor { id: "".into(), transform: Transform::IDENTITY, volume: bounds(), direction: AnchorDirection::Both });
        assert_eq!(definition.validate(), Err(WorldContractError::EmptyId("anchor")));
    }

    #[test]
    fn non_unit_quaternion_is_normalized_for_transform_math() {
        let transform = Transform { rotation: Quaternion { x: 0.0, y: 0.0, z: 0.0, w: 2.0 }, ..Transform::IDENTITY };
        assert!(transform.validate().is_ok());
        assert_eq!(transform.transform_point(Vec3 { x: 1.0, y: 2.0, z: 3.0 }), Vec3 { x: 1.0, y: 2.0, z: 3.0 });
    }

    #[test]
    fn rejects_degenerate_anchor_volume() {
        let anchor = LevelAnchor { id: "door".into(), transform: Transform::IDENTITY, volume: Bounds { min: Vec3::ZERO, max: Vec3::ZERO }, direction: AnchorDirection::Both };
        assert_eq!(anchor.validate(), Err(WorldContractError::InvalidAnchorVolume));
    }
}
