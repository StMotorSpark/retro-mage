---
feature: demo-experience
tags: [features, demo, world, rendering, lighting, vertical-space]
summary: The Retro Mage showcase demo presents one continuous first-person journey from a torch-lit dungeon through a forest, stream crossing, and vertically layered castle.
relates-to:
  - "[Demo Scope](./demo-scope.md)"
  - "[World Model](./world-model.md)"
  - "[Level Transitions](./level-transitions.md)"
  - "[Rendering](../architecture/rendering.md)"
  - "[Lighting](../architecture/lighting.md)"
  - "[Collision](../architecture/collision.md)"
  - "[Vertical Movement](../architecture/vertical-movement.md)"
  - "[Asset Pipeline](../architecture/asset-pipeline.md)"
---

# Demo Experience

The Retro Mage showcase demo presents one continuous first-person journey through authored indoor and outdoor spaces. The route demonstrates warm local dungeon lighting, vertical sightlines, dense billboard vegetation, a visible castle landmark, a stream crossing, and a brighter cool-toned castle interior in one global world.

## Player Experience

The player uses the existing first-person free-look camera and free movement behavior. The route remains bounded by authored collision geometry and mountain terrain. Doorways are open traversable openings; door interaction is outside this showcase slice. Decorative items and statues are billboard sprites rather than interactable actors.

The player route is:

```text
Dungeon sub-room
  → torch-lit doorway
  → vaulted hallway
  → two side rooms
  → stair or ramp
  → upper balcony overlooking the start room
  → outdoor doorway
  → dense forest
  → clearing and road
  → stream barrier
  → cobblestone crossing
  → castle exterior
  → castle entry hall
  → grand staircase
  → balcony
  → throne-room approach
```

## Dungeon

The starting space is a small sub-room containing one warm torch light. A doorway opens into a larger hallway with taller walls and vaulted ceilings. Two rooms of different sizes branch from the hallway and contain billboard decorative items and additional light sources.

A stair or ramp along the hallway's left side leads to an upper balcony. The balcony provides a clear downward view toward the starting sub-room and demonstrates authored support surfaces, multi-height geometry, and vertical visibility.

Dungeon lighting is warm and dim. Torch lights have tight falloff. Lighting uses ambient contribution plus the strongest relevant point light, with no multi-light color blending and no dynamic shadows.

## Outdoor Journey

An opening at the far side of the dungeon leads into a dense forest. Billboard trees form a navigable corridor that gradually opens into a clearing. A road begins in the clearing and crosses varied grass terrain toward the castle.

The outdoor scene uses blue sky, global cool lighting, and static stylized cloud visuals. Day/night progression remains application-owned and is not part of the engine showcase contract.

A stream crosses the route. The stream surface uses an opaque water texture and a slight downward visual slope. An invisible collision wall prevents entry into the stream. A cobblestone path provides the traversable crossing.

Mountains surround the outdoor play area. Their textured steep ramps form the natural-looking world boundary and block travel beyond the authored region.

## Castle

The castle is visible as a textured exterior landmark from the clearing and road. Dense forest limits earlier views; the clearing provides the primary reveal. The castle exterior participates in the same global scene as the outdoor terrain and remains visible through the open entry doorway before crossing.

The interior entry hall contains three distinct vertical layers:

1. ground-level entry space with columns and billboard statues
2. balcony level surrounding the entry space
3. upper route toward the throne-room approach

A large staircase connects the entry level to the balcony. The balcony provides a downward view into the entry hall. Rooms flank the balcony, with shell content acceptable where full traversal is not required. A second staircase leads toward the throne room.

Castle lighting is brighter and cooler than dungeon lighting. Broad point-light falloff mimics overhead illumination. Castle lighting uses the same ambient-plus-strongest-light rule, with no multi-light color blending and no dynamic shadows.

## Content and Visual Rules

Showcase content uses supplied textures and sprite images. The renderer does not require generated art for the target scene.

Initial showcase materials include:

- dungeon stone wall, floor, and ceiling
- castle exterior and interior stone
- grass
- road
- cobblestone
- mountain rock
- opaque water
- billboard sprite cutouts
- emissive torch content
- sky and cloud content

Sprites use camera-facing billboards with alpha cutout. Translucent sprite blending is outside this slice. Water is opaque and does not require reflections or a transparent pass.

Render geometry and collision geometry remain separate. The stream blocker and mountain boundary are collision-only or collision-dominant authored geometry. Ramps and stairs use authored support surfaces for movement.

## Showcase and Proof Boundaries

The showcase route uses coherent authored content and supplied assets. It proves:

- first-person free movement through indoor and outdoor spaces
- warm dungeon and cool castle lighting contrast
- vaulted and multi-height geometry
- balcony look-down sightlines
- dense forest and clearing transitions
- road and cobblestone stream crossing
- textured castle exterior visibility before entry
- seamless indoor/outdoor entry
- vertically layered castle traversal
- bounded mountain terrain

Deterministic runtime fixtures remain separate from showcase art and layout. Provider failures, eviction and reload, persistence, scene overflow, crossing hysteresis, steep-slope blocking, low-ceiling clearance, and exact movement diagnostics remain test concerns rather than required showcase spaces.

## Content Layout Boundary

The target experience uses authored content that may be represented by multiple level instances while preserving one global coordinate space. Dungeon, outdoor journey, and castle content can use separate instances and explicit links. The player experience does not expose instance boundaries.

The initial traversable route includes the start room, vaulted hallway, at least one side room, upper balcony, forest corridor, clearing, road, stream crossing, castle exterior approach, entry hall, balcony, and throne-room approach. Additional side rooms, deep forest, and castle flank rooms can remain visual shell content while retaining correct global rendering and collision boundaries.

## Related Docs

- [Demo Scope](./demo-scope.md) — overall engine proof scene scope
- [World Model](./world-model.md) — global level-instance model
- [Level Transitions](./level-transitions.md) — open connected level boundaries
- [Rendering](../architecture/rendering.md) — global scene and render behavior
- [Lighting](../architecture/lighting.md) — LUT and dynamic light rules
- [Collision](../architecture/collision.md) — transformed collision and boundaries
- [Vertical Movement](../architecture/vertical-movement.md) — ramp and support-surface movement
- [Asset Pipeline](../architecture/asset-pipeline.md) — supplied texture loading
