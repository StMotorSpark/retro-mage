---
task: "17"
slug: texture-compression-vite-plugin
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-24
outcome: "Scaffolded packages/vite-plugin-ktx2, registered plugin in examples/demo/vite.config.ts, verified build emits dist/assets/textures/wall.ktx2 (without source PNG), dev server serves raw PNG, demo scene renders textured preview quad."
---

# Texture Compression Vite Plugin

Build a real Vite plugin that automates PNG → KTX2/UASTC texture compression at production build time, replacing task:16's manual one-off compression script, and wire it into `examples/demo` so the pipeline is demonstrable end-to-end in a real (non-throwaway) app.

## Desired Changes

- New package `packages/vite-plugin-ktx2` (TypeScript) exporting a Vite plugin function. This is a real, shippable engine package — not a throwaway example — since consuming game repos need to depend on it the same way they depend on `engine-core`/`render`/`input`.
- Plugin behavior:
  - **Production build**: for source PNGs matched by a configurable glob (default matches a conventional texture folder, e.g. `**/*.png` under a configured `assets`-style directory — pick and document one sane default), compress to `.ktx2` using the same approach proven in task:16's spike (`ktx2-encoder` npm package + `sharp` for PNG decoding — UASTC mode, `needSupercompression: false`, mipmaps generated). Emit `.ktx2` into the build output; do not emit the source PNG into the build output.
  - **Dev server**: serve the raw source PNG unchanged (no compression step in dev) — this is a deliberate iteration-speed decision, already agreed, not open for reinterpretation in this task.
  - Plugin config accepts at minimum: a glob/pattern for which files to compress, and passes through the same encode options used in the spike (UASTC, no supercompression, mipmaps on).
- Wire the plugin into `examples/demo`:
  - Add a texture source folder to `examples/demo` (e.g. `examples/demo/assets/textures/`) containing at least one real PNG (reuse or copy the wall/floor textures from `docs/tasks/done/16-texture-compression-spike/assets/` if convenient, or any placeholder PNG — content doesn't matter, pipeline correctness does)
  - Register the plugin in `examples/demo/vite.config.ts`
  - Add minimal runtime loading code in `examples/demo` that fetches the built `.ktx2`, transcodes it (reuse the transcode approach from `examples/spike-ktx2/src/main.ts` — e.g. `@loaders.gl/textures`'s `CompressedTextureLoader`), and renders it on a simple visible quad/surface within the demo scene so the result is visually confirmable, not just build-output-confirmable
- A short README in `packages/vite-plugin-ktx2` documenting: how to install/configure the plugin in a consuming game's `vite.config.ts`, what the default glob/output behavior is, and the dev-vs-build behavior difference

## Definition of Done

- [x] `pnpm --filter examples/demo build` produces `.ktx2` file(s) in the build output for the configured texture source folder, and does NOT include the raw source PNG(s) in that output
- [x] `pnpm --filter examples/demo dev` serves the raw PNG unchanged (confirm via browser network tab — request resolves to the `.png`, not a `.ktx2`)
- [x] The demo scene visibly renders at least one texture that traveled through the compressed pipeline (visual confirmation in a running build, screenshot or description in task outcome)
- [x] `packages/vite-plugin-ktx2` has a README explaining configuration and usage for a consuming game repo
- [x] Plugin config for the glob/pattern and encode options is documented, not hardcoded to only match `examples/demo`'s specific folder path (a different consuming repo must be able to point it at its own texture folder)

## Out of Scope

- `packages/render` owning texture loading/transcoding as part of its own public API — this task wires transcode/upload directly into `examples/demo` for demonstration purposes only, since `packages/render` has no texture-loading module yet. Moving this into `packages/render` as a proper engine-owned runtime contract (per `docs/architecture/asset-pipeline.md`'s target state) is a separate future task
- Implementing the uncompressed-RGBA32 fallback path for devices without a compressed-texture extension — note it as a known gap in the plugin's README rather than building it here
- Fixing the mipmap upload issue documented in task:16/`docs/architecture/asset-pipeline.md` (incomplete mip chain sampling as black) — continue uploading/rendering base-mip-only with `LINEAR` filtering, same as the spike
- Physical iPhone Safari verification — desktop Chrome visual confirmation is sufficient for this task; device testing already validated the underlying format in task:16 and does not need to be repeated per-task
- Automated CI testing of the compression step
- Sprite atlasing, texture folder conventions for other packages, or the outdoor chunk file format (separate known gaps, not in scope here)

## Implementation Steps

1. **Scaffold `packages/vite-plugin-ktx2`** — new TypeScript package following the monorepo's existing package conventions (see `packages/render`'s `package.json`/`tsconfig.json` for the pattern). Add `ktx2-encoder` and `sharp` as dependencies (same libraries task:16 proved out).
2. **Implement the plugin** — a Vite plugin object with `apply: 'build'` behavior compressing matched PNGs into `.ktx2` and emitting them via Vite's `emitFile`/asset pipeline hooks, plus `apply: 'serve'`/dev behavior that's effectively a no-op passthrough (raw static PNG serving already works without plugin intervention — confirm this is actually true rather than assumed, since Vite's static asset handling in dev may need no additional code here beyond simply not intercepting the request).
3. **Reuse the proven encode call** from `examples/spike-ktx2/scripts/compress.mjs` — same `encodeToKTX2` options (`isUASTC: true`, `generateMipmap: true`, `needSupercompression: false`) and the same `sharp`-based `imageDecoder` function.
4. **Wire into `examples/demo`** — add the texture source folder, register the plugin in `examples/demo/vite.config.ts` with a glob pointing at it.
5. **Add runtime transcode/render code to `examples/demo`** — reuse the transcode-and-upload pattern from `examples/spike-ktx2/src/main.ts` (`@loaders.gl/textures`, `gl.compressedTexImage2D`/fallback to `gl.texImage2D`), rendering the result on a visible quad within the existing demo scene rather than building a whole new scene.
6. **Verify build vs dev behavior** — run both `pnpm --filter examples/demo build` (inspect output for `.ktx2`, absence of source PNG) and `pnpm --filter examples/demo dev` (inspect network tab for raw PNG passthrough).
7. **Write the plugin README** — configuration options, default glob, dev-vs-build behavior, and a note pointing at `docs/architecture/asset-pipeline.md` for the format rationale and known constraints (no supercompression, mipmap limitation, fallback not yet implemented).

## Context

**Read first:**
- `docs/architecture/asset-pipeline.md` — the design doc this task implements (KTX2/UASTC decision, engine-vs-consuming-game responsibility split, mipmap/supercompression constraints)
- `docs/research/known-gaps.md` — "Asset Pipeline" entry, this task resolves the "Vite plugin automation" sub-gap specifically
- `docs/tasks/done/16-texture-compression-spike/RESULTS.md` — the proven encode/transcode approach and the two gotchas (supercompression, mipmap) this task must not reintroduce

**Related work:**
- task:16 — the spike this task turns into real, shippable tooling; reuse its encode options and transcode pattern directly rather than re-deriving them

**Key files:**
- `examples/spike-ktx2/scripts/compress.mjs` — proven compression logic to adapt into the plugin
- `examples/spike-ktx2/src/main.ts` — proven transcode/upload/render logic to adapt into `examples/demo`
- `examples/demo/vite.config.ts` — where the new plugin is registered
- `packages/render/` — existing package structure to follow for the new `packages/vite-plugin-ktx2` package's config/tooling conventions
