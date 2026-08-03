import { describe, it, expect, vi } from 'vitest';
import { MaterialRegistry } from './registry.js';
import { FALLBACK_MATERIAL_ID, FALLBACK_DESCRIPTOR, MaterialDescriptor } from './types.js';

describe('MaterialRegistry', () => {
  it('resolves fallback for unknown material ID', () => {
    const registry = new MaterialRegistry();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const mat = registry.resolve('unknown-id');
    expect(mat).toEqual(FALLBACK_DESCRIPTOR);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Missing material requested: "unknown-id"'));
    
    consoleSpy.mockRestore();
  });

  it('registers and resolves valid materials', () => {
    const registry = new MaterialRegistry();
    const desc: MaterialDescriptor = {
      id: 'stone',
      textureAssetKeys: ['stone_diffuse'],
      uvMode: 'tile-repeat',
      flags: ['opaque', 'lit']
    };
    
    registry.register(desc);
    
    expect(registry.has('stone')).toBe(true);
    const resolved = registry.resolve('stone');
    expect(resolved).toEqual(desc);
  });

  it('handles invalid descriptor registration gracefully', () => {
    const registry = new MaterialRegistry();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // @ts-ignore - intentional bad data for testing
    registry.register({ id: 'bad-uv', textureAssetKeys: [] });
    
    const resolved = registry.resolve('bad-uv');
    expect(resolved.uvMode).toBe('explicit'); // fallback applied by validation
    expect(resolved.flags).toEqual([]);
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('missing uvMode'));
    
    consoleSpy.mockRestore();
  });

  it('allows replacing an existing material', () => {
    const registry = new MaterialRegistry();
    const initial: MaterialDescriptor = {
      id: 'stone',
      textureAssetKeys: ['stone_diffuse'],
      uvMode: 'tile-repeat',
      flags: ['opaque']
    };
    
    registry.register(initial);
    expect(registry.resolve('stone').flags).toEqual(['opaque']);
    
    const updated: MaterialDescriptor = {
      id: 'stone',
      textureAssetKeys: ['stone_diffuse_v2'],
      uvMode: 'tile-repeat',
      flags: ['opaque', 'lit']
    };
    
    registry.register(updated);
    expect(registry.resolve('stone').flags).toEqual(['opaque', 'lit']);
    expect(registry.resolve('stone').textureAssetKeys).toEqual(['stone_diffuse_v2']);
  });
});
