import { parse } from '@loaders.gl/core';
import { CompressedTextureLoader } from '@loaders.gl/textures';

export interface TextureLoadResult {
  texture: WebGLTexture;
  width: number;
  height: number;
  compressed: boolean;
  mipLevels: number;
}

const KTX2_MAGIC = new Uint8Array([
  0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * Validates KTX2 magic header, transcodes KTX2 payload via loaders.gl Basis transcoder,
 * and uploads mip levels to a WebGL2 texture.
 *
 * Explicitly probes `WEBGL_compressed_texture_astc` extension to select ASTC
 * compressed transcoding vs uncompressed RGBA32 transcoding.
 */
export async function loadKtx2Texture(
  gl: WebGL2RenderingContext,
  bytes: ArrayBuffer | Uint8Array,
): Promise<TextureLoadResult> {
  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  if (uint8.length < KTX2_MAGIC.length) {
    throw new Error('Invalid KTX2 header: buffer too short');
  }

  for (let i = 0; i < KTX2_MAGIC.length; i++) {
    if (uint8[i] !== KTX2_MAGIC[i]) {
      throw new Error('Invalid KTX2 header: magic bytes do not match KTX2 specification');
    }
  }

  const arrayBuffer =
    bytes instanceof Uint8Array
      ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      : bytes;

  const astcExt = gl.getExtension('WEBGL_compressed_texture_astc');
  const hasAstc = Boolean(astcExt);

  // Probe gl.getExtension('WEBGL_compressed_texture_astc') explicitly.
  // When present, request ASTC 4x4 compressed transcoding ('astc-4x4').
  // When absent, request uncompressed RGBA32 transcoding ('rgba32').
  // We specify basis options directly rather than relying on 'auto'.
  let result: Array<{
    width: number;
    height: number;
    data: Uint8Array;
    compressed: boolean;
    format?: number;
  }>;

  try {
    result = (await parse(arrayBuffer, CompressedTextureLoader, {
      worker: false,
      'compressed-texture': { useBasis: true },
      basis: {
        format: hasAstc ? 'astc-4x4' : 'rgba32',
        containerFormat: 'ktx2',
      },
    })) as Array<{
      width: number;
      height: number;
      data: Uint8Array;
      compressed: boolean;
      format?: number;
    }>;
  } catch (err) {
    throw new Error(`KTX2 transcode failure: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!result || !Array.isArray(result) || result.length === 0) {
    throw new Error('KTX2 transcode failure: transcoder returned empty or invalid output');
  }

  const base = result[0];
  if (!base) {
    throw new Error('KTX2 transcode failure: missing base level');
  }

  const texture = gl.createTexture();
  if (!texture) {
    throw new Error('Failed to create WebGLTexture');
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);

  let uploadedMipLevels = 0;
  const baseWidth = base.width;
  const baseHeight = base.height;

  for (let level = 0; level < result.length; level++) {
    const mip = result[level];
    if (!mip || mip.width < 4 || mip.height < 4) {
      break;
    }

    if (hasAstc && mip.compressed && mip.format !== undefined) {
      gl.compressedTexImage2D(
        gl.TEXTURE_2D,
        level,
        mip.format,
        mip.width,
        mip.height,
        0,
        mip.data,
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        gl.RGBA,
        mip.width,
        mip.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        mip.data,
      );
    }
    uploadedMipLevels++;
  }

  if (uploadedMipLevels === 0) {
    throw new Error('No valid mip levels uploaded (base texture smaller than 4x4)');
  }

  const maxLevel = uploadedMipLevels - 1;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, maxLevel);

  if (uploadedMipLevels > 1) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return {
    texture,
    width: baseWidth,
    height: baseHeight,
    compressed: hasAstc,
    mipLevels: uploadedMipLevels,
  };
}
