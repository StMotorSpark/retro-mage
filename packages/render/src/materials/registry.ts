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
