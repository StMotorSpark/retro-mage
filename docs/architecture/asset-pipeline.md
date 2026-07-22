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
- **Transcode and upload (KTX2 → GPU texture) is a runtime responsibility owned by `packages/render`.** The `render` package's public texture-loading function accepts already-fetched KTX2 bytes (`ArrayBuffer`/`Uint8Array`) rather than a URL — network fetching stays the consuming app's responsibility, not the engine's. `render` transcodes the bytes via a Basis Universal transcoder (`@loaders.gl/core` + `@loaders.gl/textures`, kept as direct `render` dependencies rather than re-implemented) and uploads the result to a WebGL2 texture using the appropriate compressed-texture extension for the current device. This is the stable, engine-owned contract: consuming games hand `render` KTX2 bytes; `render` guarantees it renders correctly across supported devices, or throws.
- **Error handling**: the texture-loading function throws on failure (bad magic bytes, transcode failure, GPU upload failure) rather than swallowing errors and logging. `render` is a library, not an app — it surfaces failures to the caller, who decides how to present or recover from them.
- **Fallback path**: `render` does not rely on a transcoder library's automatic "pick the best available compressed format" behavior. It explicitly probes `gl.getExtension('WEBGL_compressed_texture_astc')` itself, since ASTC is the only compressed format Retro Mage validates (see Device Support below). If the extension is present, `render` requests an ASTC transcode and uploads via `gl.compressedTexImage2D`. If absent, `render` explicitly requests the transcoder's uncompressed RGBA32 output and uploads via `gl.texImage2D`. This keeps the fallback decision explicit, narrow, and unit-testable (mock `gl.getExtension`), rather than delegating format selection to a transcoder library's internal, wider-than-validated format search. Supporting additional compressed formats (ETC2, BC7) for devices outside the current validated set is a separate future decision, not part of this fallback contract.

This split means the engine's asset contract is narrow and stable (bytes in, one guaranteed render-correct behavior out, throws on failure), while each consuming game owns its own source-asset organization, build tooling, compression automation, and network fetching.

## Compression Format Decision

- **Container**: KTX2
- **Compression mode**: UASTC (near-lossless), not ETC1S. UASTC is chosen over ETC1S because Retro Mage's texture count and resolution budget (low-poly, retro-scale tile/sprite art) does not make file size a binding constraint, and UASTC avoids per-texture quality tuning decisions.
- **Supercompression**: disabled. KTX2 files ship with no Zstandard supercompression wrapper (`supercompressionScheme: none`). Basis Universal transcoders are not guaranteed to correctly decompress a Zstandard-wrapped UASTC payload — an untested transcoder/encoder pairing that both claim "KTX2/UASTC" support can silently produce all-zero pixel data (renders as solid black, no thrown error) if supercompression is enabled. Plain UASTC without supercompression is the safe default; a specific transcoder library must be verified end-to-end before supercompression is ever turned on.
- **Mipmaps**: `render`'s texture loader uploads every mip level the transcoder returns down to the first level whose dimensions drop below ASTC's 4×4 block alignment, then stops and sets `gl.TEXTURE_MAX_LEVEL` to the last successfully uploaded level. This yields a complete, spec-valid mip chain (missing only the smallest, least visually significant tail levels) instead of the mipmap-incomplete state that samples solid black. `gl.generateMipmap` is not an option here — WebGL2 does not support generating mipmaps for compressed-texture formats — so the render package must derive and upload each level itself rather than delegate to the GPU. Textures upload and render with `LINEAR_MIPMAP_LINEAR` filtering once the mip chain is uploaded this way.

## Device Support

KTX2/UASTC transcoding and rendering is confirmed working end-to-end on both desktop Chrome (ANGLE/Metal backend, macOS) and physical iPhone Safari — the engine's actual reference device class. Safari's WebGL2 context exposes `WEBGL_compressed_texture_astc` on Apple GPUs, which is the extension `render`'s explicit probe finds on that hardware. No console errors or visual artifacts occur on either platform once supercompression is disabled, per the constraints above.

## Testing

`packages/render`'s texture-loading module carries unit tests against a mocked `WebGL2RenderingContext` (stubbing `getExtension`, `compressedTexImage2D`, `texImage2D`, `texParameteri`) plus a small checked-in KTX2 fixture file, following the engine's test-driven development principle for boundary code. Tests cover: ASTC-extension-present → compressed upload path taken; ASTC-extension-absent → uncompressed RGBA32 fallback path taken; mip chain uploads stop at the correct level and `TEXTURE_MAX_LEVEL` is set accordingly; malformed/non-KTX2 input throws rather than silently failing.

## Related Docs

- [Tech Stack](./tech-stack.md) — the WebGL2 baseline and iPhone 16e reference device this format is validated against
- [Rendering](./rendering.md) — the low-poly, retro visual approach this format's memory/bandwidth budget supports
- [Repo Structure](./repo-structure.md) — the engine-package-vs-consuming-game boundary this pipeline's responsibility split follows
- [Known Gaps](../research/known-gaps.md) — remaining undecided asset-pipeline questions: the compression Vite plugin's exact implementation, tile/sprite folder conventions, and the outdoor chunk file format
