import { describe, expect, it, vi, beforeEach } from 'vitest';
import { loadKtx2Texture } from './index.js';
import { parse } from '@loaders.gl/core';

vi.mock('@loaders.gl/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@loaders.gl/core')>();
  return {
    ...mod,
    parse: vi.fn(),
  };
});

const KTX2_HEADER = new Uint8Array([
  0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);

function createMockGl(hasAstc: boolean) {
  const getExtension = vi.fn().mockImplementation((name: string) => {
    if (name === 'WEBGL_compressed_texture_astc') {
      return hasAstc ? { COMPRESSED_RGBA_ASTC_4x4_KHR: 0x93b0 } : null;
    }
    return null;
  });

  const compressedTexImage2D = vi.fn();
  const texImage2D = vi.fn();
  const texParameteri = vi.fn();
  const createTexture = vi.fn().mockReturnValue({});
  const bindTexture = vi.fn();

  const gl = {
    getExtension,
    compressedTexImage2D,
    texImage2D,
    texParameteri,
    createTexture,
    bindTexture,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MAX_LEVEL: 0x813d,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    LINEAR_MIPMAP_LINEAR: 0x2703,
    LINEAR: 0x2601,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
  } as unknown as WebGL2RenderingContext;

  return {
    gl,
    getExtension,
    compressedTexImage2D,
    texImage2D,
    texParameteri,
    createTexture,
    bindTexture,
  };
}

describe('loadKtx2Texture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws synchronously / rejects on malformed input (bad magic bytes)', async () => {
    const mockGl = createMockGl(true).gl;
    const badBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    await expect(loadKtx2Texture(mockGl, badBytes)).rejects.toThrow(
      'Invalid KTX2 header: magic bytes do not match KTX2 specification',
    );

    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    await expect(loadKtx2Texture(mockGl, pngHeader)).rejects.toThrow(
      'Invalid KTX2 header',
    );
  });

  it('calls compressedTexImage2D when ASTC extension is present', async () => {
    const mock = createMockGl(true);
    vi.mocked(parse).mockResolvedValueOnce([
      { width: 16, height: 16, data: new Uint8Array(16), compressed: true, format: 0x93b0 },
      { width: 8, height: 8, data: new Uint8Array(8), compressed: true, format: 0x93b0 },
    ]);

    const result = await loadKtx2Texture(mock.gl, KTX2_HEADER);

    expect(mock.getExtension).toHaveBeenCalledWith('WEBGL_compressed_texture_astc');
    expect(mock.compressedTexImage2D).toHaveBeenCalledTimes(2);
    expect(mock.texImage2D).not.toHaveBeenCalled();
    expect(result.compressed).toBe(true);
    expect(result.mipLevels).toBe(2);
  });

  it('calls texImage2D with uncompressed RGBA32 when ASTC extension is absent', async () => {
    const mock = createMockGl(false);
    vi.mocked(parse).mockResolvedValueOnce([
      { width: 16, height: 16, data: new Uint8Array(1024), compressed: false },
    ]);

    const result = await loadKtx2Texture(mock.gl, KTX2_HEADER);

    expect(mock.getExtension).toHaveBeenCalledWith('WEBGL_compressed_texture_astc');
    expect(mock.texImage2D).toHaveBeenCalledTimes(1);
    expect(mock.compressedTexImage2D).not.toHaveBeenCalled();
    expect(result.compressed).toBe(false);
    expect(result.mipLevels).toBe(1);
  });

  it('stops mip upload before any sub-4px level and sets TEXTURE_MAX_LEVEL', async () => {
    const mock = createMockGl(true);
    vi.mocked(parse).mockResolvedValueOnce([
      { width: 16, height: 16, data: new Uint8Array(16), compressed: true, format: 0x93b0 }, // level 0 (uploaded)
      { width: 8, height: 8, data: new Uint8Array(8), compressed: true, format: 0x93b0 },   // level 1 (uploaded)
      { width: 4, height: 4, data: new Uint8Array(4), compressed: true, format: 0x93b0 },   // level 2 (uploaded)
      { width: 2, height: 2, data: new Uint8Array(2), compressed: true, format: 0x93b0 },   // level 3 (stop - sub-4px)
      { width: 1, height: 1, data: new Uint8Array(1), compressed: true, format: 0x93b0 },   // level 4 (ignored)
    ]);

    const result = await loadKtx2Texture(mock.gl, KTX2_HEADER);

    expect(mock.compressedTexImage2D).toHaveBeenCalledTimes(3);
    expect(result.mipLevels).toBe(3);
    expect(mock.texParameteri).toHaveBeenCalledWith(
      mock.gl.TEXTURE_2D,
      mock.gl.TEXTURE_MAX_LEVEL,
      2, // last uploaded level index (0, 1, 2 -> 2)
    );
  });

  it('sets TEXTURE_MIN_FILTER to LINEAR_MIPMAP_LINEAR when multiple levels uploaded', async () => {
    const mock = createMockGl(true);
    vi.mocked(parse).mockResolvedValueOnce([
      { width: 16, height: 16, data: new Uint8Array(16), compressed: true, format: 0x93b0 },
      { width: 8, height: 8, data: new Uint8Array(8), compressed: true, format: 0x93b0 },
    ]);

    await loadKtx2Texture(mock.gl, KTX2_HEADER);

    expect(mock.texParameteri).toHaveBeenCalledWith(
      mock.gl.TEXTURE_2D,
      mock.gl.TEXTURE_MIN_FILTER,
      mock.gl.LINEAR_MIPMAP_LINEAR,
    );
    expect(mock.texParameteri).toHaveBeenCalledWith(
      mock.gl.TEXTURE_2D,
      mock.gl.TEXTURE_MAG_FILTER,
      mock.gl.LINEAR,
    );
  });

  it('sets TEXTURE_MIN_FILTER to LINEAR when single level uploaded', async () => {
    const mock = createMockGl(true);
    vi.mocked(parse).mockResolvedValueOnce([
      { width: 4, height: 4, data: new Uint8Array(4), compressed: true, format: 0x93b0 },
    ]);

    await loadKtx2Texture(mock.gl, KTX2_HEADER);

    expect(mock.texParameteri).toHaveBeenCalledWith(
      mock.gl.TEXTURE_2D,
      mock.gl.TEXTURE_MIN_FILTER,
      mock.gl.LINEAR,
    );
  });
});
