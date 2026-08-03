export type UvMode = 'tile-repeat' | 'explicit' | 'billboard';
export type MaterialFlag = 'opaque' | 'cutout' | 'lit' | 'unlit' | 'emissive' | 'water' | 'sky';

export interface MaterialDescriptor {
  /** Stable string material ID (e.g. "dungeon-stone", "grass") */
  id: string;
  /** Application asset keys for texture resolution */
  textureAssetKeys: string[];
  /** Expected UV mapping behavior */
  uvMode: UvMode;
  /** Rendering capabilities and passes */
  flags: MaterialFlag[];
  /** LUT/palette configuration */
  lutConfig?: unknown;
  /** Emissive configuration */
  emissiveConfig?: unknown;
}

/**
 * Fallback material used when an invalid or missing material is requested.
 * Ensure it is visibly distinct (e.g. solid magenta) in the renderer.
 */
export const FALLBACK_MATERIAL_ID = 'system:fallback';

export const FALLBACK_DESCRIPTOR: MaterialDescriptor = {
  id: FALLBACK_MATERIAL_ID,
  textureAssetKeys: [],
  uvMode: 'tile-repeat',
  flags: ['opaque', 'unlit'],
};
