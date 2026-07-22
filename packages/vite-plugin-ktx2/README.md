# vite-plugin-ktx2

Vite plugin for Retro Mage that automates PNG to KTX2/UASTC texture compression during production builds while serving raw PNGs during development.

## Installation

In your game project (which depends on Retro Mage):

```bash
pnpm add -D vite-plugin-ktx2
```

## Usage

Register the plugin in your `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { vitePluginKtx2 } from 'vite-plugin-ktx2';

export default defineConfig({
  plugins: [
    vitePluginKtx2({
      assetsDir: 'assets/textures',
      include: '**/*.png',
      encodeOptions: {
        isUASTC: true,
        generateMipmap: true,
        needSupercompression: false,
      },
    }),
  ],
});
```

## How It Works

### Production Build (`pnpm build`)
During production build, the plugin matches all PNG files specified by `include` inside `assetsDir`. Each PNG is decoded via `sharp` and encoded into a `.ktx2` container via `ktx2-encoder` (using Basis Universal UASTC mode).

The plugin emits the compressed `.ktx2` files into the build output directory (`dist/assets/textures/*.ktx2`) and **does not** emit the raw source PNG files into the build output.

### Dev Server (`pnpm dev`)
During development, the plugin intercepts requests for texture files under `assetsDir` (or `outputDir`). Requests for `.ktx2` or `.png` are served directly as raw PNGs from your source `assetsDir` without any build-time or runtime compression overhead, preserving fast iteration cycles.

## Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `assetsDir` | `string` | `'assets/textures'` | Source directory containing PNG textures, relative to Vite project root. |
| `include` | `string \| string[]` | `'**/*.png'` | Glob pattern(s) to match PNG texture files within `assetsDir`. |
| `exclude` | `string \| string[]` | `undefined` | Glob pattern(s) to exclude from compression. |
| `outputDir` | `string` | matches `assetsDir` | Output directory path relative to `dist/`. |
| `encodeOptions` | `VitePluginKtx2EncodeOptions` | See below | Passthrough options for `ktx2-encoder`. |

### `encodeOptions` Defaults

- `isUASTC`: `true` (uses Basis Universal UASTC mode for near-lossless quality)
- `generateMipmap`: `true` (generates mip levels into the KTX2 container)
- `needSupercompression`: `false` (Zstandard supercompression disabled for transcoder compatibility)

## Known Constraints & Architecture Notes

For full rationale and architecture details, see [`docs/architecture/asset-pipeline.md`](../../docs/architecture/asset-pipeline.md).

- **Supercompression**: Disabled by default (`needSupercompression: false`). Basis Universal transcoders are not guaranteed to correctly decompress Zstandard-wrapped UASTC payloads, which can cause textures to silently render as solid black.
- **Mipmaps**: While mipmap levels are generated during build-time compression, runtime rendering in `packages/render` currently uploads the base mip level with `LINEAR` filtering to avoid incomplete mipmap chain sampling bugs under ASTC block alignment.
- **Fallback Path**: The uncompressed RGBA32 fallback path for WebGL2 contexts lacking compressed texture extensions is handled at runtime by `loadKtx2Texture` in `packages/render`.
