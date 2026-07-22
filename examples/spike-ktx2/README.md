# KTX2/UASTC Spike (Non-Canonical)

> **NOTE:** This package is a **standalone, throwaway spike** built for task:16
> (`docs/tasks/*/16-texture-compression-spike`). It is not part of the canonical
> engine (`packages/render`) or demo app. Follows the precedent set by
> `examples/bench` (task:12) for throwaway, LAN-reachable test harnesses.

## What this proves

Whether a PNG texture, compressed offline to `.ktx2` (UASTC mode, Basis
Universal), can be transcoded in-browser and rendered via raw WebGL2 —
specifically on physical iPhone Safari.

## One-time texture compression

Source PNGs live in `public/assets/` (`example-wall-texture.png`,
`example-floor-texture.png`, copied from the task's `assets/` folder).

Compression uses the `ktx2-encoder` npm package — a JS/WASM build of the Basis
Universal encoder. This was used instead of the native `toktx`/`basisu` CLI
because no native binary was available for this machine's architecture
(arm64 macOS); `ktx2-encoder` bundles the same Basis Universal encoder core as
a portable WASM module and produces equivalent output.

Run:

```bash
pnpm --filter spike-ktx2 run compress
```

This regenerates `public/assets/wall.ktx2` and `public/assets/floor.ktx2`.
Important encoder option: `needSupercompression: false` — see `RESULTS.md`
for why (Zstandard supercompression on the UASTC payload was not
transcodable by the bundled `@loaders.gl/textures` transcoder and produced
black/garbage output; disabling it fixed decoding).

## Running the harness

```bash
pnpm --filter spike-ktx2 dev -- --host
```

Then, on the same LAN, open `http://<host-lan-ip>:5173/` on the phone
(same pattern as task:12's bench app). The page renders two quads (wall,
floor) and an on-screen debug log reporting:

- WebGL2 context creation success/failure
- Which `WEBGL_compressed_texture_*` / `EXT_texture_compression_*`
  extensions the browser exposes
- Transcode result per texture (dimensions, format, byte counts)
- Any JS errors (`window.onerror` / unhandled promise rejections are also
  captured and logged on-screen, not just to devtools console — useful
  since remote debugging isn't always available)

## Implementation notes

- Uses `@loaders.gl/textures`' `CompressedTextureLoader` (`useBasis: true`)
  to transcode `.ktx2` → whatever compressed-texture format the browser's
  WebGL2 context supports (falls back to RGBA32 if none). This bundles its
  own Basis Universal transcoder WASM, so no separate `basis_universal` JS
  glue file needs to be wired up manually.
- Only the base mip level is uploaded/rendered — mipmap chain tuning is
  explicitly out of scope for this spike (see task `overview.md`). Using
  `LINEAR_MIPMAP_LINEAR` with a partial mip chain makes WebGL treat the
  texture as **incomplete**, which samples as solid black — a real bug
  that was hit and fixed during this spike (see `RESULTS.md`).
