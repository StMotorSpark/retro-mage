---
feature: lighting
tags: [architecture, rendering, lighting, webgl, lut]
summary: Retro Mage computes surface shading using dynamic 2D lighting lookup tables (LUTs) generated at runtime, mapping surface base colors and active point lights read from engine-core's WASM buffer to shaded pixel colors.
relates-to:
  - "[Rendering](./rendering.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Demo Scope](../features/demo-scope.md)"
  - "[Repo Structure](./repo-structure.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Lighting & LUT System

`packages/render` owns GPU-facing rendering, including surface shading and point light evaluation. Lighting in Retro Mage relies on 2D lighting lookup tables (LUTs) to achieve fast, stylized color quantization and distance falloff without the overhead of per-pixel physically based shading.

## Overview

The lighting vertical slice (`packages/render/src/lighting`) converts point light data from `engine-core`'s WASM buffer and ambient light scalars into surface illumination. Surface shaders evaluate distance attenuation from active point lights, combine them with global ambient light, and look up final pixel colors in a 2D WebGL LUT texture.

## Current Implementation State

The `packages/render/src/lighting/index.ts` file acts as the module entry point for the lighting slice. It defines the vertical slice boundary and re-exports LUT generation and lighting binding interfaces. Implementation logic for procedural LUT generation, texture creation, and point-light uniform binding is structured within this slice.

## LUT Dimensions & Format

The renderer uses a 2D WebGL texture lookup table with dimensions of **256 × 32 texels**:

- **X Axis (256 texels, index 0..255)**: Represents base surface color intensity or palette color index (0 = minimum base luminance / black, 255 = maximum base luminance / white).
- **Y Axis (32 texels, level 0..31)**: Represents the quantized light level (0 = pitch black / zero light, 31 = peak direct illumination).

### Pixel Format & WebGL Upload

- **In-Memory Format**: Flat `Uint8Array` of size 256 × 32 × 4 bytes (32,768 bytes), formatted as RGBA (4 bytes per texel).
- **WebGL Texture Target**: `TEXTURE_2D`, internal format `RGBA8` (or `RGBA` in WebGL1 fallbacks), uploaded via `texImage2D`.
- **Filtering & Wrap**:
  - `TEXTURE_MIN_FILTER`: `NEAREST` (preserves distinct retro lighting steps).
  - `TEXTURE_MAG_FILTER`: `NEAREST` (or `LINEAR` along the Y axis when smooth intensity gradients are configured).
  - `TEXTURE_WRAP_S` and `TEXTURE_WRAP_T`: `CLAMP_TO_EDGE`.

### Emissive LUT Variant

Sprite effects (magic, fireballs, glowing runes) use an emissive LUT variant texture generated alongside the primary LUT. In the emissive variant, low light levels ($y = 0..15$) do not dim the base color, ensuring self-lit sprites read brightly against dark dungeon surroundings.

## Authoring Method & Procedural Generation

LUTs are generated procedurally in JavaScript at renderer startup rather than loaded as static image assets.

Procedural generation provides two key properties:
1. **Zero Asset Overhead**: Shipped engine bundles require no external PNG/image downloads for lighting tables.
2. **Runtime Configuration**: Apps configure lighting curves (ambient tint, falloff exponent, contrast boost, dither strength) by passing a `LightingConfig` object during context initialization.

```ts
export interface LightingConfig {
  ambientColor: [number, number, number]; // RGB tint multiplier (default: [1.0, 1.0, 1.0])
  falloffExponent: number;                 // Falloff curve shape (default: 2.0)
  contrastBoost: number;                   // Midtone contrast adjustment (default: 1.0)
  ditherPattern: boolean;                  // Enable 2x2 Bayer dithering across light levels
}
```

The generation algorithm computes each texel $(x, y)$ in $O(256 \times 32)$ operations at startup (< 1ms execution time) and re-uploads the 32KB texture buffer whenever `LightingConfig` changes.

## Consuming Point Lights from WASM Buffer

`engine-core` exposes up to 32 active point lights via Struct-of-Arrays (SoA) WASM buffers (`lights_x_ptr`, `lights_y_ptr`, `lights_z_ptr`, `lights_r_ptr`, `lights_g_ptr`, `lights_b_ptr`, `lights_intensity_ptr`, `lights_active_ptr`).

Per frame, `packages/render` reads active lights from linear memory:

1. **Light Filtering**: The lighting slice reads `lights_active` flags and populates uniform arrays containing position `(x, y, z)`, color `(r, g, b)`, and `intensity` for all active entries.
2. **Shader Uniforms**: Shaders receive active point lights as uniform arrays:
   - `u_lightPos[32]` (`vec3`)
   - `u_lightColor[32]` (`vec3`)
   - `u_lightIntensity[32]` (`float`)
   - `u_lightCount` (`int`)
   - `u_ambientLight` (`float`)
   - `u_lightingLut` (`sampler2D`)

3. **Fragment Attenuation & Shading**:
   For each fragment at world position $P$:
   - Distance to light $i$: $d_i = \|P - L_i\|$
   - Distance falloff: $A_i = \text{clamp}\left(1.0 - \left(\frac{d_i}{\text{radius}_i}\right)^2, 0.0, 1.0\right) \times \text{intensity}_i$
   - Total accumulated light intensity:
     $$I_{\text{total}} = \text{clamp}\left(u\_ambientLight + \sum_{i=0}^{N-1} A_i, 0.0, 1.0\right)$$
   - The fragment shader converts $I_{\text{total}}$ to a row index $y = \text{floor}(I_{\text{total}} \times 31.0)$, samples `u_lightingLut` at coordinate $(u = \text{baseColor}, v = (y + 0.5) / 32.0)$, and multiplies by light color accumulation.

## Application API — Torch Point Lights Example

In `examples/demo`, four torch point lights illuminate dark dungeon rooms (`ambient_light = 0.05`). A consuming application configures and updates torch lights in `engine-core` via plain WASM calls:

```ts
// 1. App sets low indoor ambient light
engine.set_ambient_light(0.05);

// 2. App defines 4 torch point lights in dungeon rooms
// Entry Hall Torch 1
engine.set_light(0, 4.0, 1.5, 4.0, 1.0, 0.7, 0.3, 1.0);
// Entry Hall Torch 2
engine.set_light(1, 8.0, 1.5, 4.0, 1.0, 0.7, 0.3, 1.0);
// Armory Torch
engine.set_light(2, 14.0, 1.5, 2.0, 1.0, 0.7, 0.3, 1.0);
// Gate Room Torch
engine.set_light(3, 4.0, 1.5, 12.0, 1.0, 0.7, 0.3, 1.0);
```

During each render frame:
- `engine-core` updates light positions and intensities in the WASM `lights` buffer.
- `packages/render` reads active lights from the bridge and passes them into fragment shader uniforms.
- Tile and actor geometry fragments sample the 256×32 LUT texture to produce warm, flickering torchlight effects across stone surfaces.

## Related Docs

- [Rendering](./rendering.md) — overall tile/sprite/LUT rendering architecture
- [WASM Bridge](./wasm-bridge.md) — `lights` buffer layout and pointers in linear memory
- [Demo Scope](../features/demo-scope.md) — demo dungeon layout and torch light specification
- [Repo Structure](./repo-structure.md) — vertical slice organization within `packages/render`
- [Known Gaps](../research/known-gaps.md) — tracking resolved and open design questions
