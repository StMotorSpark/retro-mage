---
task: "64"
slug: pwa-regression-proof
status: done
depends-on: ["62"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Verified production PWA output after runtime migration. Added manifest precaching, confirmed 11-entry precache covering shell, icons, WASM, KTX2 textures, and JS, and verified cached shell startup with network disabled. Documented that bundled runtime-generated content works offline while network-fetched application content does not."
---

# Verify PWA Integration After Runtime Migration

Confirm the reset demo retains installability, asset caching, and offline shell behavior after world-runtime migration.

## Desired Changes

- Verify manifest and service worker output.
- Verify JS, WASM, textures, and required demo assets precache correctly.
- Verify app shell launches from cached output.
- Document any runtime-generated content caching requirements.

## Definition of Done

- [ ] Production demo build emits valid PWA assets.
- [ ] Required engine/runtime assets are included in precache.
- [ ] Cached app shell starts without network access.
- [ ] Offline behavior failure is explicit for uncached application content.
- [ ] Deployment docs match actual build output.

## Out of Scope

- Background sync.
- Push notifications.
- Advanced cache invalidation.
- Native app packaging.

## Implementation Steps

1. Read example deployment, tech stack, and demo-scope docs.
2. Build production demo after task 62.
3. Inspect manifest, service worker, and precache list.
4. Run offline shell verification and update docs if needed.

## Context

- Read: `docs/architecture/example-deployment.md`
- Read: `docs/architecture/tech-stack.md`
- Depends on task 62.
