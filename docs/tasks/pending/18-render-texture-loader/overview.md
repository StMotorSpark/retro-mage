---
task: "18"
slug: render-texture-loader
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-25
outcome: ""
---

# Render Package Texture Loader

Give `packages/render` a public, tested texture-loading module that transcodes KTX2 bytes and uploads them to a WebGL2 texture, per the target state in `docs/architecture/asset-pipeline.md`.

## Desired Changes

- Add `@loaders.gl/core` and `@loaders.gl/textures` (`^4.4.3`, matching the version already used in `examples/demo`) as direct dependencies of `packages/render`.
- New module `packages/render/src/textures/` (or equivalent slice folder, following the package's existing `world-tiles/`, `sprites/` slice convention) exporting a `loadKtx2Texture` function with this signature:

  ```ts
  export interface TextureLoadResult {
    texture: WebGLTexture;
    width: number;
    height: number;
    compressed: boolean;
    mipLevels: number;
  }

  export function loadKtx2Texture(
    gl: WebGL2RenderingContext,
    bytes: ArrayBuffer | Uint8Array,
  ): Promise<TextureLoadResult>;
  ```

- Behavior the function must implement (all from `docs/architecture/asset-pipeline.md`'s Responsibility Split and Compression Format Decision sections):
  - Validate the KTX2 magic header on `bytes`; throw a descriptive `Error` if it doesn't match (do not silently fall back to treating input as PNG or anything else — this function's contract is KTX2 bytes in, nothing else).
  - Probe `gl.getExtension('WEBGL_compressed_texture_astc')` explicitly. If present, request an ASTC transcode from the Basis transcoder and upload each returned mip level via `gl.compressedTexImage2D`. If absent, request the transcoder's uncompressed RGBA32 output and upload via `gl.texImage2D`. Do not rely on `@loaders.gl/textures`' `format: 'auto'` behavior to make this decision — the extension probe is the source of truth.
  - Upload mip levels in order starting at level 0, stopping at (and not uploading) the first level whose width or height drops below 4 pixels (ASTC's block-alignment minimum). After the loop, set `gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, <last uploaded level index>)`.
  - Set `gl.TEXTURE_MIN_FILTER` to `gl.LINEAR_MIPMAP_LINEAR` when more than one mip level uploaded, `gl.LINEAR` when only the base level uploaded (e.g. a 4x4-or-smaller source texture with no further levels). Set `gl.TEXTURE_MAG_FILTER` to `gl.LINEAR` in both cases.
  - On any failure (transcode error, GPU upload error, unexpected transcoder output shape), throw rather than logging and returning a partial/null result.
  - Return a `TextureLoadResult` with the created `WebGLTexture`, base-level width/height, whether the compressed path was taken, and how many mip levels were uploaded.
- Export `loadKtx2Texture` and `TextureLoadResult` from `packages/render/src/index.ts`.
- Add a small checked-in KTX2 test fixture (reuse/copy `examples/spike-ktx2/public/assets/wall.ktx2` or re-encode one of the PNGs in `docs/tasks/done/16-texture-compression-spike/assets/` — either is fine, content doesn't matter) into `packages/render/src/textures/__fixtures__/` or similar, small enough to keep the repo light.
- Unit tests (`packages/render/src/textures/index.test.ts` or co-located) against a mocked `WebGL2RenderingContext` — stub `getExtension`, `compressedTexImage2D`, `texImage2D`, `texParameteri`, `createTexture`, `bindTexture` as `vi.fn()`s recording calls — covering:
  - ASTC extension present → `compressedTexImage2D` called, not `texImage2D`
  - ASTC extension absent → `texImage2D` called with uncompressed RGBA32 data, not `compressedTexImage2D`
  - Mip upload stops before any sub-4px level; `TEXTURE_MAX_LEVEL` set to the correct last index
  - `TEXTURE_MIN_FILTER` set to `LINEAR_MIPMAP_LINEAR` when multiple levels uploaded
  - Malformed input (bad magic bytes, e.g. a PNG's header) throws synchronously/rejects, does not attempt to load

## Definition of Done

- [ ] `packages/render` exports `loadKtx2Texture` and `TextureLoadResult` from its public `index.ts`
- [ ] `@loaders.gl/core` and `@loaders.gl/textures` are listed in `packages/render/package.json` dependencies
- [ ] `pnpm --filter render test` passes, including all five test cases listed above
- [ ] `pnpm --filter render typecheck` passes
- [ ] Function throws (never silently swallows) on malformed input or transcode/upload failure
- [ ] No network/`fetch` calls anywhere in the new module — bytes are a function parameter, not fetched internally

## Out of Scope

- Wiring `examples/demo` to use this new function — separate task (task:19), depends on this one
- Supporting compressed formats beyond ASTC (ETC2, BC7) — separate future gap if non-ASTC devices enter scope
- Physical device testing — desktop unit tests with mocked `gl` are sufficient here; the underlying KTX2/ASTC format was already validated end-to-end on iPhone Safari in task:16
- Sprite atlasing, texture folder conventions, outdoor chunk file format — unrelated gaps
- Changing `packages/vite-plugin-ktx2` or the build-time compression step — this task is runtime-only

## Implementation Steps

1. **Add dependencies** to `packages/render/package.json` — `@loaders.gl/core` and `@loaders.gl/textures` at `^4.4.3`. Run install so the workspace lockfile picks them up.
2. **Add the KTX2 fixture file** under `packages/render/src/textures/__fixtures__/` (copy an existing small `.ktx2` from `examples/spike-ktx2/public/assets/` — pick the smaller of `wall.ktx2`/`floor.ktx2`).
3. **Build `loadKtx2Texture`** in `packages/render/src/textures/index.ts`, reusing the transcode call pattern already proven in `examples/demo/src/texture-demo.ts` (`load(blobUrl, CompressedTextureLoader, {...})`) as a starting point, but:
   - Replace its `format: 'auto'` config with an explicit ASTC-vs-uncompressed request driven by the `gl.getExtension` probe (check `@loaders.gl/textures`' `CompressedTextureLoader`/basis options for how to force a specific target format vs uncompressed output — if the library doesn't expose a direct "force uncompressed" flag, request `'auto'` only when the extension is absent, and pin the option that requests ASTC specifically when the extension is present; document whichever mechanism is used in a code comment since this is filling a gap the library's own docs may not spell out cleanly).
   - Replace the current single-level (`result[0]`) upload with a loop over all returned levels, applying the sub-4px stopping rule.
   - Replace URL/`fetch`-based entry point with a `bytes` parameter — no `fetch`, no `Blob`/`createObjectURL` URL fetching step is needed for network purposes, though a `Blob`+object-URL may still be needed internally as a transport step to hand bytes to `loaders.gl`'s `load()` function if its API requires a URL rather than accepting raw bytes directly (verify this against `@loaders.gl/core`'s API — it may accept a `Blob` or `ArrayBuffer` directly without needing an object URL).
4. **Write the mocked-`gl` test suite** described above. Look at `packages/render/src/index.test.ts` for the repo's existing vitest conventions (no gl-mocking precedent exists yet in this package, so this test file establishes the pattern — keep the mock minimal, a plain object with `vi.fn()` properties for only the methods this module calls).
5. **Export from `packages/render/src/index.ts`** alongside the other `export * from` lines.
6. **Run `pnpm --filter render test` and `pnpm --filter render typecheck`**, fix until green.

## Context

**Read first:**
- `docs/architecture/asset-pipeline.md` — source of truth for all behavior in this task (Responsibility Split, Compression Format Decision, Testing sections specifically)
- `docs/research/known-gaps.md` — "Asset Pipeline" entry, this task is the "building the `packages/render` texture module itself" next-step it names
- `docs/principles/test-driven-development.md` — testing discipline this task's boundary-code tests follow

**Related work:**
- task:16 — texture-compression-spike, proved the encode/transcode approach this task formalizes
- task:17 — vite-plugin-ktx2, the build-time half of the pipeline this task's runtime half completes; `examples/demo/src/texture-demo.ts` from that task is the closest existing prior art for the transcode/upload logic, but is not itself reused wholesale (it fetches by URL, swallows errors, and only uploads the base mip — all three are deliberately different in this task)
- task:19 — wires `examples/demo` onto this task's `loadKtx2Texture` output, depends on this task

**Key files:**
- `packages/render/src/index.ts` — public export surface to extend
- `packages/render/package.json` — dependencies to add
- `examples/demo/src/texture-demo.ts` — prior art for the transcode/upload call pattern (do not copy its URL-fetching, error-swallowing, or base-mip-only behavior)
- `examples/spike-ktx2/public/assets/` — source of a fixture `.ktx2` file
