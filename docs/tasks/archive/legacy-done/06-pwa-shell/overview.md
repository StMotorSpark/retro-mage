---
task: "06"
slug: pwa-shell
status: done
depends-on: ["05"]
blocked-by: ""
assigned-to: ""
created: 2025-06-01
outcome: "Added hand-authored manifest.webmanifest + placeholder PNG icons, wired via index.html link/meta tags. Used vite-plugin-pwa (generateSW strategy) instead of hand-written sw.js so precache list stays in sync with hashed build output automatically; disabled its auto-register/manifest injection and registered /sw.js manually from src/main.ts to keep control explicit. Build verified: sw.js precaches index.html, JS bundle, WASM binary, and icons, with a navigation-route fallback to index.html for offline shell reloads."
---

# PWA Shell (Stage 1 Installability)

Add a web manifest and service worker to `examples/demo` so it installs to a home screen and launches its app shell without a network round-trip, per the staged PWA approach in `docs/architecture/tech-stack.md`.

## Desired Changes

- Add `examples/demo/public/manifest.webmanifest` with name, icons (placeholder icon assets acceptable), `display: "standalone"`, theme/background color
- Link the manifest from `examples/demo/index.html`
- Add a service worker (`examples/demo/public/sw.js` or generated via a Vite PWA plugin) that precaches the built app shell (JS bundles, WASM binary, core CSS/HTML) on install and serves it cache-first on repeat loads
- Register the service worker from `src/main.ts` (or an equivalent bootstrap entry)
- Confirm the app is installable (browser install prompt or "Add to Home Screen" available) and reloads without a network request for the shell on a second visit

## Definition of Done

- [ ] Browser dev tools show a valid web app manifest with no errors (Lighthouse/Application tab)
- [ ] Service worker registers successfully and precaches the app shell on first load
- [ ] With network disabled (devtools offline mode), reloading the demo still loads the app shell (canvas renders) — asset caching beyond the shell is not required at this stage
- [ ] App is installable per browser installability criteria (manifest + service worker + HTTPS or localhost)

## Out of Scope

- Caching of game assets (textures, tile sets, audio) beyond the app shell — later stage per `docs/architecture/tech-stack.md`
- Full offline gameplay — later stage, depends on asset budget decisions tracked in `docs/research/known-gaps.md`
- Any non-demo package changes

## Implementation Steps

1. **Manifest** (`examples/demo/public/manifest.webmanifest`)
   - Name, short_name, icons (placeholder PNGs at minimum required sizes), `display: "standalone"`, `start_url`, theme/background color
   - Link via `<link rel="manifest" href="/manifest.webmanifest">` in `index.html`, plus a `<meta name="theme-color">` tag
2. **Service worker**
   - Either hand-write `public/sw.js` with an install-time precache of the built asset list, or add a Vite PWA plugin (e.g. `vite-plugin-pwa`) configured for `injectManifest` or `generateSW` precaching the build output
   - Cache-first strategy for precached shell assets
3. **Registration** (`src/main.ts`)
   - `if ('serviceWorker' in navigator) navigator.serviceWorker.register(...)` on load
4. **Verify**
   - Build (`pnpm --filter demo build`), serve the built output, confirm install prompt/criteria met and offline shell reload works

## Context

**Read first:**
- `docs/architecture/tech-stack.md` — staged PWA approach (shell installability is stage 1)
- `docs/research/known-gaps.md` — asset caching and full offline gameplay remain open, out of scope here

**Related work:**
- task:05 (dependency: demo app must exist and build before adding manifest/service worker)

**Key files:**
- `examples/demo/public/manifest.webmanifest`, `examples/demo/public/sw.js` (or Vite PWA plugin config), `examples/demo/index.html`, `examples/demo/src/main.ts`
