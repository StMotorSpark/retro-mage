---
task: "19"
slug: demo-consumes-render-texture-loader
status: parked
depends-on: ["18"]
blocked-by: "task:18"
assigned-to: ""
created: 2026-07-25
outcome: ""
---

# Demo Consumes Render Texture Loader

Replace `examples/demo`'s inline transcode/upload code with `packages/render`'s new `loadKtx2Texture` public API, so the pipeline's runtime half is demonstrated the way `docs/architecture/asset-pipeline.md` actually specifies it — engine owns transcode/upload, app owns fetch.

## Desired Changes

- `examples/demo/src/texture-demo.ts` (`TextureQuadDemo`) no longer contains its own KTX2-detection, transcode, or GPU-upload logic. It fetches the built `.ktx2` bytes (`fetch(url)` → `arrayBuffer()`, as it does today) and hands the resulting bytes to `render`'s `loadKtx2Texture(gl, bytes)`, using the returned `TextureLoadResult.texture` for rendering.
- Remove `@loaders.gl/core` and `@loaders.gl/textures` from `examples/demo/package.json` dependencies — they're no longer used directly by the demo now that `render` owns transcoding.
- `packages/vite-plugin-ktx2/README.md`'s existing "known gap: uncompressed fallback not implemented" note (added in task:17) is corrected to reflect that the fallback now exists in `render`, or removed if no longer accurate.

## Definition of Done

- [ ] `examples/demo/src/texture-demo.ts` imports `loadKtx2Texture` from `render` and contains no direct `@loaders.gl/*` imports or manual `gl.compressedTexImage2D`/`gl.texImage2D` calls
- [ ] `examples/demo/package.json` no longer lists `@loaders.gl/core` or `@loaders.gl/textures`
- [ ] `pnpm --filter examples/demo build` still produces a working build with the textured preview quad visible (manual/visual check, same as task:17's verification)
- [ ] `pnpm --filter examples/demo dev` still serves raw PNG in dev mode, unaffected by this change
- [ ] `packages/vite-plugin-ktx2/README.md`'s fallback known-gap note is updated or removed to match current state
- [ ] `docs/research/known-gaps.md`'s Asset Pipeline entry is updated to remove the "building the `packages/render` texture module" line item, since this task plus task:18 close it

## Out of Scope

- Any change to `packages/render`'s `loadKtx2Texture` implementation itself — that's task:18, already done by the time this task starts
- PNG-fallback path in dev mode (raw PNG rendering via `createImageBitmap`, currently in `texture-demo.ts`) — this is a dev-only convenience unrelated to the KTX2/render contract and can stay as-is, gated separately from the `loadKtx2Texture` call
- Tile/sprite folder conventions, outdoor chunk file format — unrelated gaps
- Physical device re-verification — desktop build/dev checks are sufficient, consistent with task:17's own scope

## Implementation Steps

1. **Confirm task:18 is done** — `render`'s `index.ts` exports `loadKtx2Texture`/`TextureLoadResult` before starting.
2. **Update `examples/demo/src/texture-demo.ts`** — replace the KTX2 branch of `loadTexture()` (the `isKtx2` true branch, from the magic-byte check through `gl.compressedTexImage2D`/`gl.texImage2D` and filter/wrap parameter calls) with a call to `loadKtx2Texture(gl, bytes)` from `render`, storing `result.texture` on `this.texture`. Leave the non-KTX2 (raw PNG passthrough, dev-mode) branch untouched — it's a separate code path unrelated to this task's scope.
3. **Remove now-unused imports** (`load`, `CompressedTextureLoader` from `@loaders.gl/*`) from `texture-demo.ts`.
4. **Update `examples/demo/package.json`** — remove `@loaders.gl/core` and `@loaders.gl/textures` dependency entries, reinstall to update the lockfile.
5. **Verify build and dev** — `pnpm --filter examples/demo build` (visually confirm textured quad still renders, same check as task:17) and `pnpm --filter examples/demo dev` (confirm PNG passthrough still works in dev network tab).
6. **Update `packages/vite-plugin-ktx2/README.md`** — find and correct/remove the known-gap note about the uncompressed-fallback path not being implemented (added during task:17).
7. **Update `docs/research/known-gaps.md`** — remove the "building the `packages/render` texture module" implementation-gap line added when task:18 was created, since both tasks close it. Leave the folder-conventions and outdoor-chunk-format gaps untouched.

## Context

**Read first:**
- `docs/architecture/asset-pipeline.md` — target state this task moves the demo toward
- task:18's `overview.md` — the exact `loadKtx2Texture` signature and behavior this task consumes

**Related work:**
- task:17 — original vite-plugin-ktx2 task; introduced the inline transcode/upload code in `examples/demo` this task now removes, and the README known-gap note this task corrects
- task:18 — produces the `loadKtx2Texture` API this task wires in; hard dependency, must be done first

**Key files:**
- `examples/demo/src/texture-demo.ts` — main file to modify
- `examples/demo/package.json` — dependencies to remove
- `packages/vite-plugin-ktx2/README.md` — known-gap note to correct
- `docs/research/known-gaps.md` — gap entry to narrow further
