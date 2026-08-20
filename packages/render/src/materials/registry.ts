import { MaterialDescriptor, FALLBACK_DESCRIPTOR, FALLBACK_MATERIAL_ID } from './types.js';

export class MaterialRegistry {
  private materials = new Map<string, MaterialDescriptor>();

  constructor() {
    this.materials.set(FALLBACK_MATERIAL_ID, FALLBACK_DESCRIPTOR);
  }

  /**
   * Registers a material descriptor.
   * Validation is performed to ensure the descriptor is well-formed.
   */
  register(descriptor: MaterialDescriptor): void {
    if (!descriptor.id) {
      console.warn('MaterialRegistry: Cannot register material without an ID.');
      return;
    }
    if (!descriptor.uvMode) {
      console.warn(`MaterialRegistry: Material ${descriptor.id} missing uvMode. Falling back to explicit.`);
      descriptor = { ...descriptor, uvMode: 'explicit' };
    }
    if (!descriptor.flags || !Array.isArray(descriptor.flags)) {
      console.warn(`MaterialRegistry: Material ${descriptor.id} missing or invalid flags.`);
      descriptor = { ...descriptor, flags: [] };
    }
    if (descriptor.lutConfig) {
      if (!Array.isArray(descriptor.lutConfig.paletteColors)) {
        console.warn(`MaterialRegistry: Material ${descriptor.id} has invalid lutConfig.paletteColors.`);
      }
      if (typeof descriptor.lutConfig.intensityBandCount !== 'number') {
        console.warn(`MaterialRegistry: Material ${descriptor.id} has invalid lutConfig.intensityBandCount.`);
      }
    }
    if (descriptor.emissiveConfig) {
      if (typeof descriptor.emissiveConfig.intensity !== 'number') {
        console.warn(`MaterialRegistry: Material ${descriptor.id} has invalid emissiveConfig.intensity.`);
      }
      if (typeof descriptor.emissiveConfig.color !== 'string') {
        console.warn(`MaterialRegistry: Material ${descriptor.id} has invalid emissiveConfig.color.`);
      }
    }
    this.materials.set(descriptor.id, descriptor);
  }

  /**
   * Resolves a material by ID.
   * If the material is not found, issues a console warning and returns the fallback material.
   */
  resolve(id: string): MaterialDescriptor {
    const material = this.materials.get(id);
    if (!material) {
      console.warn(`MaterialRegistry: Missing material requested: "${id}". Using fallback.`);
      return this.materials.get(FALLBACK_MATERIAL_ID)!;
    }
    return material;
  }

  /**
   * Checks if a material is registered.
   */
  has(id: string): boolean {
    return this.materials.has(id);
  }
}
