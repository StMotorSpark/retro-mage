// Lighting vertical slice.
//
// Owns lighting lookup tables (LUTs): mapping a surface's base color and a
// light intensity/color input to a final shaded color. Supports dynamic
// light sources (moving, flickering, colored) and the emissive LUT variant
// used by sprite effects. See docs/architecture/rendering.md.
export {};
