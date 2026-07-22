---
task: "16"
slug: texture-compression-spike
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-23
outcome: "KTX2/UASTC confirmed viable on desktop Chrome and physical iPhone Safari (WEBGL_compressed_texture_astc exposed, no errors, correct visual render). Two gotchas found + solved: Zstd supercompression breaks transcode (must ship plain UASTC, no supercompression); incomplete mip chain upload samples as black (mip strategy needs real solution before re-enabling). See RESULTS.md. Recommendation: proceed to build production Vite plugin pipeline.
---

# Texture Compression Spike (KTX2/UASTC on iPhone Safari)

Prove that PNG source textures compressed to KTX2 (UASTC mode, Basis Universal) can be transcoded and rendered via WebGL2 on real iPhone Safari hardware, before committing to this as the engine's texture pipeline.

## Desired Changes

- A standalone, throwaway test harness (not part of `packages/render` or `examples/demo`) that:
  - Loads a `.ktx2` texture (UASTC mode) via a Basis Universal transcoder
  - Uploads the transcoded result to a WebGL2 texture
  - Renders it on a simple textured quad, visible on screen
- Manual, one-time compression of the two provided source PNGs (`assets/wall.png`, `assets/floor.png` in this task folder) to `.ktx2` using `toktx` or `basisu` CLI — this task does NOT build the Vite plugin or automated pipeline, only proves the format works
- A short written report of results (pass/fail per texture, any console errors, visual artifacts observed) — add as a `RESULTS.md` file in this task's folder

## Definition of Done

- [ ] Both `wall.png` and `floor.png` compressed to `.ktx2` in UASTC mode using a standard CLI tool (`toktx` or `basisu`), commands used documented in `RESULTS.md`
- [ ] Test harness runs as a page reachable from a phone browser over LAN (same pattern as task:12's bench app — Vite dev server with `--host`)
- [ ] Textures render correctly (visually inspected, no black/garbled output) in desktop Chrome first as a baseline sanity check
- [ ] Same test page loaded and visually verified on physical iPhone Safari (device provided by task owner, not the worker agent)
- [ ] `RESULTS.md` records: whether Safari's WebGL2 context exposed the needed compressed-texture extension, whether transcode+render succeeded, any errors/warnings from console, and a visual pass/fail judgment for each texture
- [ ] Recommendation captured in `RESULTS.md`: proceed with KTX2/UASTC, or fall back to alternative (plain PNG only, different compression mode, etc.)

## Out of Scope

- Building the Vite plugin that automates PNG → KTX2 compression at build time — that is a follow-up task, only created if this spike passes
- Wiring compressed textures into `packages/render`'s actual texture loading path — this is a standalone harness only
- Mipmap generation tuning, ETC1S mode comparison, or texture atlasing — single UASTC compression pass per texture is sufficient for this spike
- Automated CI testing — this is a manual, human-driven spike like task:12's bench app
- Editing `docs/architecture/tech-stack.md` or `docs/research/known-gaps.md` with the final decision — that happens in a follow-up design conversation once results are in, not as part of this task

## Implementation Steps

1. **Install compression tooling** — `toktx` (from KTX-Software) or `basisu` CLI, whichever is simpler to install locally. Document the install method used in `RESULTS.md`.
2. **Compress source PNGs** — run compression against `assets/wall.png` and `assets/floor.png` in UASTC mode, output `.ktx2` files alongside them in the same `assets/` folder (or a `assets/compressed/` subfolder — worker's choice). Record exact CLI commands in `RESULTS.md`.
3. **Scaffold test harness** — new standalone folder (e.g. `examples/spike-ktx2/`, sibling to `examples/demo/` and `examples/bench/`, following task:12's precedent for throwaway/non-canonical apps). Minimal Vite + vanilla WebGL2 setup, no dependency on `packages/render` internals.
4. **Add Basis transcoder** — use the standard `basis_universal` transcoder (WASM/JS build, typically distributed via npm as `basis_universal` or pulled from KTX-Software's transcoder build) to decode `.ktx2` at load time in the browser.
5. **Render textured quad** — load each `.ktx2`, transcode, upload as a WebGL2 texture, draw on a simple full-screen or centered quad so the texture is clearly visible for visual inspection.
6. **Verify in desktop Chrome** — confirm both textures render without errors as a baseline before mobile testing.
7. **Verify over LAN on iPhone Safari** — start dev server with `--host`, load the page on the physical iPhone provided, visually inspect both textures, check for any console errors (remote debug via Safari's Web Inspector from a Mac if available, otherwise note visual result only).
8. **Write `RESULTS.md`** in this task's folder — pass/fail, console output, visual notes, and a clear recommendation for the follow-up design conversation.

## Context

**Read first:**
- `docs/architecture/rendering.md` — draw-distance and mipmap-relevant context for why texture compression matters here
- `docs/architecture/tech-stack.md` — WebGL2 baseline target, iPhone 16e reference device
- `docs/research/known-gaps.md` — "Asset Pipeline" open question this spike feeds into

**Related work:**
- task:12 — precedent for a throwaway, non-canonical bench/spike app structure and LAN-reachable dev server pattern

**Key files:**
- `docs/tasks/pending/16-texture-compression-spike/assets/wall.png` — source texture (provided by task owner)
- `docs/tasks/pending/16-texture-compression-spike/assets/floor.png` — source texture (provided by task owner)
- `examples/bench/` — reference structure for a throwaway example app (do not modify)
- `examples/spike-ktx2/` — new folder this task creates

## Parking Notes

Compression, harness build, and desktop-Chrome verification are complete
— see `RESULTS.md` in this folder for full detail. Two real bugs were
found and fixed along the way (Zstandard supercompression not
transcodable by the chosen library; incomplete mipmap chain sampling as
solid black in WebGL). Desktop baseline now PASSES with correct visual
output for both textures, confirmed via headless Chrome + `gl.readPixels`
+ screenshot inspection.

**What's needed to unblock:** physical iPhone Safari testing (task owner
has the device, not the worker agent, per task scope). Steps to run are
documented in `examples/spike-ktx2/README.md` and `RESULTS.md` →
"iPhone Safari verification" section:

1. `pnpm --filter spike-ktx2 dev -- --host`
2. Open `http://<lan-ip>:5173/` in iPhone Safari
3. Read on-screen debug log + visually inspect both quads
4. Fill in the "iPhone Safari verification" section of `RESULTS.md` with
   the actual result and finalize the recommendation

Once that's done, this task can move to `done/` (update `status`,
`outcome`, clear `blocked-by`).
