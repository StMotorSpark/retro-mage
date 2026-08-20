---
feature: material-contract
tags: [architecture, rendering, materials, textures, lighting]
summary: Retro Mage keeps material and visual asset ownership in the application while the renderer owns GPU resources, shader execution, render passes, and runtime LUT generation.
relates-to:
  - "[Rendering](./rendering.md)"
  - "[Lighting](./lighting.md)"
  - "[Asset Pipeline](./asset-pipeline.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Scene Capacity](./scene-capacity.md)"
  - "[Demo Experience](../features/demo-experience.md)"
  - "[Demo Slices](../features/demo-slices.md)"
---

# Material Contract

Retro Mage separates application-owned visual content from renderer-owned GPU execution. Applications register stable material IDs, supply texture assets, and define LUT appearance. The renderer resolves those descriptors into GPU resources, executes shader and pass behavior, and generates runtime LUT textures from application-owned lighting configuration.

## Ownership

### Application-owned

The consuming application owns:

- stable material IDs
- material descriptors
- texture assets and asset keys
- texture loading policy and source URLs
- palette and LUT configuration
- optional baked LUT assets
- material assignment in level content

The application may use authored, generated, or remote assets. The renderer consumes resolved resources without prescribing source folder layout or authoring tools.

### Renderer-owned

The renderer owns:

- GPU texture upload and lifetime
- WebGL texture and sampler objects
- shader programs
- render passes and ordering
- batching and draw submission
- runtime LUT texture generation and upload
- backend-specific resource conversion

GPU objects do not cross the application, engine-core, or WASM content boundary.

## Material Registration

Material descriptors use stable application-defined string IDs. The engine does not prescribe a catalog of game-specific materials such as stone or grass.

A descriptor references application asset keys and declares renderer capabilities:

```text
material ID
texture asset key(s)
UV mode
render flags
LUT/palette configuration
emissive configuration
```

The same shader capability can serve dungeon stone, castle stone, grass, road, and mountain materials while separate IDs preserve application-level tuning freedom.

## Initial Capabilities

The initial material contract supports these flags:

- `opaque` — depth-tested solid surface
- `cutout` — alpha-tested surface with no translucent blending
- `lit` — participates in ambient and point-light evaluation
- `unlit` — bypasses dynamic lighting
- `emissive` — contributes self-lit output
- `water` — identifies opaque water surface behavior
- `sky` — identifies unlit sky-layer behavior

Terrain and sprite identity comes from geometry/content categories, not material flags. A billboard can use `cutout` and `lit`; a terrain surface can use `opaque` and `lit`.

The initial contract does not require PBR, normal maps, reflections, transparent glass, dynamic shadows, or translucent blending.

## Texture and UV Rules

Material descriptors reference application asset keys. The renderer receives resolved texture resources through the application-owned asset integration boundary and owns their GPU representation.

Initial UV modes are:

- tile-repeat UV for grid-aligned floors, walls, and terrain
- explicit polygon UV for castle, mountain, road, water, and other authored surfaces
- billboard UV for sprite images

Texture atlasing is not required. Asset compression and runtime transcode follow the asset-pipeline contract. Filtering, wrap modes, and color-space handling remain renderer configuration derived from material descriptors and asset metadata.

## Sprite Rules

Sprite materials use camera-facing billboards with Y-axis orientation. Sprites are depth-tested and depth-writing. Cutout alpha determines visible pixels. Translucent blending is outside the initial contract.

This supports trees, statues, dungeon decorations, clouds, and other non-interactable showcase content without requiring actor gameplay semantics.

## Water and Sky

Water is an opaque textured surface with explicit UVs. It participates in normal depth testing and may use the lit material path. Reflections, transparency, and animated water are outside the initial contract.

Sky is an unlit background-layer material. Clouds use cutout billboard or plane materials. Volumetric clouds, dynamic weather, and day/night simulation are application-level capabilities outside this contract.

## Lighting and LUT

The application owns the visual palette and LUT configuration. The renderer generates the runtime LUT texture from that configuration and uploads it through its normal GPU resource path. An optional application-supplied baked LUT can provide an equivalent override without changing material IDs or scene transport.

Initial light evaluation is:

```text
ambient contribution + strongest relevant point light
  → RGB-aware quantization
  → LUT lookup
  → final material color
```

Multiple point lights do not blend their colors. Material descriptors can identify emissive output, which bypasses or supplements ordinary light evaluation according to the LUT configuration.

The application tunes dungeon and castle appearance through separate material IDs, ambient values, light colors, intensities, and falloff. Dungeon lights use warm colors and tight falloff. Castle lights use cool colors and broad falloff.

The initial LUT configuration contains:

- palette colors
- intensity band count
- ambient level
- RGB light-color mode
- emissive mapping

Fog and depth atmospheric treatment remain separate from the core LUT lookup.

## Geometry and Collision Boundary

Scene geometry carries material identity while level definitions remain local-space and instance transforms place content globally. Tiles, authored polygons, terrain, support surfaces, and billboards can all reference material descriptors.

Render geometry and collision geometry remain independent. Collision-only geometry supports stream barriers and mountain boundaries without requiring visible material output. A support surface can use the same or a different material from adjacent collision geometry.

## Render Categories

The renderer consumes material-bound content through explicit categories:

1. sky layer
2. opaque lit or unlit geometry
3. cutout billboard and geometry content
4. debug content
5. native-resolution application UI

The initial contract has no translucent pass. Material batching can group compatible content across level instances while preserving global depth correctness.

## Missing Assets and Invalid Materials

A missing texture, unknown material ID, or invalid descriptor produces an observable renderer diagnostic and a deterministic fallback appearance. It does not silently drop geometry. Applications can replace or retry asset resolution without changing world instance identity.

The fallback remains visibly distinct from authored content so browser playtests expose incomplete asset wiring.

## Related Docs

- [Rendering](./rendering.md) — global scene and pass behavior
- [Lighting](./lighting.md) — LUT and dynamic light architecture
- [Asset Pipeline](./asset-pipeline.md) — texture compression and runtime upload
- [WASM Bridge](./wasm-bridge.md) — typed scene transport boundary
- [Scene Capacity](./scene-capacity.md) — fixed capacities and overflow
- [Demo Experience](../features/demo-experience.md) — target visual route
- [Demo Slices](../features/demo-slices.md) — staged implementation and playtesting
