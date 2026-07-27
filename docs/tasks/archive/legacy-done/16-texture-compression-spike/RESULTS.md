---
task: "16"
status: done
---

# Texture Compression Spike — Results

## Tooling used

No native `toktx`/`basisu` binary was installed (no Homebrew available on
this machine, and the `basis_universal` npm package's prebuilt `basisu`
binary is Linux-only — this machine is `darwin arm64`). Used
[`ktx2-encoder`](https://www.npmjs.com/package/ktx2-encoder) instead: a
JS/WASM build of the same Basis Universal encoder core, runnable from
Node via `dist/node/index.js` (`encodeToKTX2`). This is functionally
equivalent to running `basisu`/`toktx` locally — same encoder, just
distributed as a portable WASM module instead of a native binary — and is
a reasonable substitution given the constraint of "whichever is simpler to
install locally" in the task's Implementation Steps.

Compression script: `examples/spike-ktx2/scripts/compress.mjs`. Run via:

```bash
pnpm --filter spike-ktx2 run compress
```

Exact encode call:

```js
await encodeToKTX2(pngBuffer, {
  isUASTC: true,
  generateMipmap: true,
  needSupercompression: false, // see "Issue #1" below
  imageDecoder, // sharp-based PNG decoder, required in Node
});
```

Source → output:
- `example-wall-texture.png` (2816×1536, RGBA) → `wall.ktx2` (12 mip levels, ~5.8MB)
- `example-floor-texture.png` (512×512, RGB) → `floor.ktx2` (10 mip levels, ~350KB)

Both output files verified structurally valid KTX2 containers via
`ktx-parse` (`vkFormat: 0`, `colorModel: 166` = UASTC, correct
`pixelWidth`/`pixelHeight`, correct level count).

## Test harness

`examples/spike-ktx2/` — standalone Vite + vanilla WebGL2 app (sibling to
`examples/bench`, same non-canonical/throwaway pattern). Uses
`@loaders.gl/textures`' `CompressedTextureLoader` (bundles a Basis
Universal transcoder WASM) to transcode `.ktx2` in-browser, then uploads
via raw `gl.compressedTexImage2D` / `gl.texImage2D` and renders on two
textured quads.

## Desktop Chrome baseline — PASS (with two real bugs found & fixed along the way)

Verified via headless Chrome (real GPU backend, not software/SwiftShader —
confirmed separately) driven by Puppeteer, with on-screen debug log and
`gl.readPixels` sampling used to verify actual pixel output (not just
absence of thrown errors). Both textures transcoded and rendered
correctly with no visual artifacts (screenshot inspected: wall texture
shows full-color stone wall photo, floor texture shows full-color tile
grid, no black squares, no corruption).

**Compressed-texture extensions exposed (desktop Chrome / macOS, ANGLE/Metal backend):**
`WEBGL_compressed_texture_s3tc`, `WEBGL_compressed_texture_s3tc_srgb`,
`WEBGL_compressed_texture_etc`, `WEBGL_compressed_texture_etc1`,
`WEBGL_compressed_texture_pvrtc`, `WEBGL_compressed_texture_astc`,
`EXT_texture_compression_bptc`, `EXT_texture_compression_rgtc`.

`astc-4x4` was selected by the transcoder's auto format selection (highest
priority match), transcoded format `37808` = `GL_COMPRESSED_RGBA_ASTC_4x4_KHR`.

### Issue #1 — Zstandard supercompression not transcodable, produced black textures

First compression pass used `ktx2-encoder`'s default
`needSupercompression: true`, which wraps the UASTC level data in
Zstandard supercompression inside the KTX2 container
(`supercompressionScheme: 2`). `@loaders.gl/textures`' bundled transcoder
did not decompress this correctly — it did not throw an error, but
`transcodeImage` silently produced near-all-zero pixel data (confirmed via
byte-level inspection: real header/wrapper bytes present, but body
overwhelmingly zero). Textures rendered solid black.

**Fix:** re-encoded with `needSupercompression: false`
(`supercompressionScheme: 0` / none in the resulting file). This
increases file size (wall: ~5.1MB → ~5.8MB) but transcodes correctly.
**This is a real compatibility gotcha for any future pipeline work**:
whichever encoder + transcoder pairing is chosen for production needs to
be tested end-to-end, not assumed compatible just because both claim
"KTX2/UASTC" support.

### Issue #2 — incomplete mipmap chain samples as black in WebGL

After fixing Issue #1, textures were *still* rendering solid black. Root
cause: the harness uploaded all mip levels with
`gl.TEXTURE_MIN_FILTER = LINEAR_MIPMAP_LINEAR`, but a handful of the
smallest mip levels (non-power-of-two / sub-4px levels) failed to upload
via `compressedTexImage2D` (`INVALID_OPERATION`, buffer-size mismatch —
likely an off-by-rounding issue between the transcoder's reported
level dimensions and ASTC's 4×4 block-alignment requirement at very small
mip sizes). A texture with a partially-uploaded mip chain is **mipmap
incomplete** per the WebGL/OpenGL spec, and incomplete textures sample as
solid black (`0,0,0,255`) — not an error, just silently wrong output. This
is a classic, easy-to-hit gotcha.

**Fix (in scope for this spike only):** upload and render the base mip
level only, with `LINEAR` (non-mipmapped) filtering. Confirmed via
`gl.readPixels` that a genuine texel color (`227,202,166,255` — a
plausible stone-wall tan, not black) is sampled after this fix, and the
screenshot shows both textures rendering with correct visual detail.
**Mipmap chain upload/tuning is explicitly out of scope for this spike**
(see `overview.md` → Out of Scope) but is a real follow-up concern for
whatever pipeline gets built next — the mip-generation and upload
strategy needs a real solution before mipmapping is turned back on
(e.g., re-deriving level dimensions per KTX2/ASTC block-size rules rather
than trusting the transcoder's reported per-level width/height verbatim,
or falling back to `gl.generateMipmap` after uploading only the base
level for the uncompressed-fallback path).

## iPhone Safari verification — PASS (human-confirmed, physical device)

Tested by device owner over LAN (`pnpm --filter spike-ktx2 dev -- --host`),
physical iPhone Safari, on-screen debug log inspected directly (no remote
Web Inspector needed — log surfaced everything necessary).

- WebGL2 context created successfully (renderer string: WebKit/WebGL,
  confirming the real WebKit WebGL2 backend, not a software fallback)
- Safari exposed `WEBGL_compressed_texture_astc` — the expected extension
  on Apple GPUs (ASTC-native hardware)
- No console errors, no `FAIL` lines, no `window.onerror` /
  `unhandledrejection` entries in the on-screen log
- Both textures (wall, floor) rendered correctly, visually confirmed —
  no black squares, no garbling

## Recommendation

**Proceed with KTX2/UASTC** as the engine's texture compression format.
Both desktop and physical iPhone Safari transcode and render correctly,
with real visual output, once the two gotchas below are worked around. Key
carry-forward items for the production pipeline follow-up task:

1. Safari on Apple hardware exposes `WEBGL_compressed_texture_astc` —
   confirmed on real device. The uncompressed RGBA32 fallback path
   (confirmed working in this spike) should still ship as a safety net for
   any device/browser combination that doesn't expose a compressed-texture
   extension, but ASTC is the expected common case for the reference
   device class.
2. Do **not** enable Zstandard supercompression on UASTC KTX2 files unless
   the specific transcoder library chosen for production is verified to
   support it — plain (no supercompression) UASTC is the safer default.
3. Mipmap upload needs a correct dimension/block-alignment strategy before
   `LINEAR_MIPMAP_LINEAR` filtering can be re-enabled; this is real work,
   not a rounding error to hand-wave away.
