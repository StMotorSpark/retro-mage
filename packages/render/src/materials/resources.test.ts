import { describe, expect, it, vi } from 'vitest';
import { resolveMaterialResources } from './resources.js';
import { loadKtx2Texture } from '../textures/index.js';
vi.mock('../textures/index.js', () => ({ loadKtx2Texture: vi.fn() }));
const descriptor = { id: 'warm', textureAssetKeys: ['stone'], uvMode: 'tile-repeat' as const, flags: ['opaque' as const] };
function gl() { return { deleteTexture: vi.fn() } as unknown as WebGL2RenderingContext; }
describe('material resources', () => {
  it('uses app key resolver, owns cleanup, returns resource', async () => {
    const g = gl(), texture = {} as WebGLTexture;
    vi.mocked(loadKtx2Texture).mockResolvedValue({ texture, width: 4, height: 4, compressed: true, mipLevels: 1 });
    const resolve = vi.fn().mockResolvedValue(new Uint8Array([1]));
    const result = await resolveMaterialResources(g, descriptor, resolve);
    expect(resolve).toHaveBeenCalledWith('stone'); expect(result.textures.get('stone')?.texture).toBe(texture);
    result.dispose(); expect(g.deleteTexture).toHaveBeenCalledWith(texture);
  });
  it('returns fallback and observable diagnostics when asset missing', async () => {
    const diagnostic = vi.fn(), result = await resolveMaterialResources(gl(), descriptor, async () => { throw new Error('missing'); }, diagnostic);
    expect(result.descriptor.id).toBe('system:fallback'); expect(result.diagnostics.map(x => x.kind)).toEqual(['load-failure', 'missing-asset']); expect(diagnostic).toHaveBeenCalledTimes(2);
  });
});
