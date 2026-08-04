import type { MaterialDescriptor } from './types.js';
import { FALLBACK_DESCRIPTOR } from './types.js';
import { loadKtx2Texture, type TextureLoadResult } from '../textures/index.js';

export type AssetBytesResolver = (key: string) => Promise<ArrayBuffer | Uint8Array>;
export interface MaterialDiagnostic { kind: 'missing-asset' | 'load-failure'; materialId: string; assetKey: string; message: string; }
export interface MaterialResources { descriptor: MaterialDescriptor; textures: ReadonlyMap<string, TextureLoadResult>; diagnostics: readonly MaterialDiagnostic[]; dispose(): void; }

/** Resolves app keys; app retains URL/fetch policy. GPU resources remain renderer-owned. */
export async function resolveMaterialResources(
  gl: WebGL2RenderingContext, descriptor: MaterialDescriptor, resolve: AssetBytesResolver,
  onDiagnostic: (diagnostic: MaterialDiagnostic) => void = () => {},
): Promise<MaterialResources> {
  const textures = new Map<string, TextureLoadResult>(), diagnostics: MaterialDiagnostic[] = [];
  for (const key of descriptor.textureAssetKeys) {
    try {
      const bytes = await resolve(key);
      const resource = await loadKtx2Texture(gl, bytes);
      textures.set(key, resource);
    } catch (error) {
      const diagnostic: MaterialDiagnostic = { kind: 'load-failure', materialId: descriptor.id, assetKey: key, message: error instanceof Error ? error.message : String(error) };
      diagnostics.push(diagnostic); onDiagnostic(diagnostic);
    }
  }
  if (descriptor.textureAssetKeys.length && textures.size === 0) {
    const diagnostic: MaterialDiagnostic = { kind: 'missing-asset', materialId: descriptor.id, assetKey: descriptor.textureAssetKeys[0]!, message: 'No material textures resolved; deterministic fallback required.' };
    diagnostics.push(diagnostic); onDiagnostic(diagnostic);
  }
  return { descriptor: textures.size ? descriptor : FALLBACK_DESCRIPTOR, textures, diagnostics, dispose() { for (const t of textures.values()) gl.deleteTexture(t.texture); } };
}
