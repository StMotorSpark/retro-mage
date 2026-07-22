---
feature: asset-pipeline
tags: [architecture, assets, textures, build, ktx2, vite]
summary: Retro Mage ships texture assets as KTX2/UASTC, compressed by the consuming game's build step and transcoded/uploaded at runtime by the engine's render package, splitting the compression step (build-time, app-owned) from the transcode step (runtime, engine-owned).
relates-to:
  - "[Tech Stack](./tech-stack.md)"
  - "[Rendering](./rendering.md)"
  - "[Repo Structure](./repo-structure.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Asset Pipeline

Retro Mage's texture assets travel through two distinct stages, owned by two different parties: a build-time compression stage owned by the consuming game repo, and a runtime transcode/upload stage owned by the engine's `render` package. This split lets the engine ship a small, stable texture-loading contract while leaving asset authoring, folder layout, and compression tooling to each game built on the engine.

## Overview

PNG is the committed source-of-truth format for every texture — wall textures, floor textures, sprite sheets. PNG never ships as the runtime format. Before a texture reaches the browser, it is compressed to KTX2 using the Basis Universal UASTC mode, which transcodes at load time to a GPU-native compressed format (ASTC on Apple hardware, other formats elsewhere) instead of uploading raw RGBA pixel data. This keeps texture memory and bandwidth cost low on phone-class GPUs — the same motivation as the fixed-point math and low-poly geometry choices elsewhere in the engine's rendering approach.

## Responsibility Split

- **Compression (PNG → KTX2) is a build-time step owned by the consuming game repo, not the engine.** A game built on Retro Mage runs its own asset build step — a Vite plugin — that watches its texture source folder and produces `.ktx2` build artifacts. The engine does not ship a compressor and does not require one specific asset folder layout from consuming games; it only requires the runtime file it receives to be a valid KTX2/UASTC container.
- **Transcode and upload (KTX2 → GPU texture) is a runtime responsibility owned by `packages/render`.** The `render` package's texture-loading path accepts a `.ktx2` file, transcodes it via a Basis Universal transcoder, and uploads the result to a WebGL2 texture using the appropriate compressed-texture extension for the current device. This is the stable, engine-owned contract: consuming games hand `render` a KTX2 file; `render` guarantees it renders correctly across supported devices.
- **Fallback path**: if the runtime WebGL2 context does not expose a usable compressed-texture extension, `render`'s texture loader falls back to uploading the transcoder's uncompressed RGBA32 output via `gl.texImage2D` instead of `gl.compressedTexImage2D`. This preserves correctness at the cost of the memory/bandwidth benefit, rather than failing to render.

This split means the engine's asset contract is narrow and stable (one file format in, one guaranteed render-correct behavior out), while each consuming game owns its own source-asset organization, build tooling, and compression automation.

## Compression Format Decision

- **Container**: KTX2
- **Compression mode**: UASTC (near-lossless), not ETC1S. UASTC is chosen over ETC1S because Retro Mage's texture count and resolution budget (low-poly, retro-scale tile/sprite art) does not make file size a binding constraint, and UASTC avoids per-texture quality tuning decisions.
- **Supercompression**: disabled. KTX2 files ship with no Zstandard supercompression wrapper (`supercompressionScheme: none`). Basis Universal transcoders are not guaranteed to correctly decompress a Zstandard-wrapped UASTC payload — an untested transcoder/encoder pairing that both claim "KTX2/UASTC" support can silently produce all-zero pixel data (renders as solid black, no thrown error) if supercompression is enabled. Plain UASTC without supercompression is the safe default; a specific transcoder library must be verified end-to-end before supercompression is ever turned on.
- **Mipmaps**: not yet enabled at runtime. KTX2 containers carry a full mip chain, generated at compression time, but the render package's transcode/upload path does not yet correctly upload every mip level — very small mip levels (sub-block-size dimensions under ASTC's 4×4 block alignment) can fail to upload, leaving the texture mipmap-incomplete, which the WebGL/OpenGL spec defines as sampling solid black regardless of whether an error is thrown. Until the render package's texture loader derives correct per-level dimensions under ASTC block-alignment rules (or falls back to `gl.generateMipmap` after uploading only the base level), textures upload and render base-mip-only with `LINEAR` filtering, not `LINEAR_MIPMAP_LINEAR`.

## Device Support

KTX2/UASTC transcoding and rendering is confirmed working end-to-end on both desktop Chrome (ANGLE/Metal backend, macOS) and physical iPhone Safari — the engine's actual reference device class. Safari's WebGL2 context exposes `WEBGL_compressed_texture_astc` on Apple GPUs, which is the extension the transcoder selects by default on that hardware. No console errors or visual artifacts occur on either platform once supercompression is disabled and only the base mip level is uploaded, per the constraints above.

## Related Docs

- [Tech Stack](./tech-stack.md) — the WebGL2 baseline and iPhone 16e reference device this format is validated against
- [Rendering](./rendering.md) — the low-poly, retro visual approach this format's memory/bandwidth budget supports
- [Repo Structure](./repo-structure.md) — the engine-package-vs-consuming-game boundary this pipeline's responsibility split follows
- [Known Gaps](../research/known-gaps.md) — remaining undecided asset-pipeline questions: the compression Vite plugin's exact implementation, tile/sprite folder conventions, and the outdoor chunk file format
