---
task: "122"
slug: demo-update-observability
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-06
outcome: "Added Git SHA/local build IDs to the overlay and debug snapshot. Production service-worker registration now bypasses HTTP cache checks and reloads once on controller change; generated workers skip waiting, claim clients, and remove outdated caches. Demo typecheck and production build pass."
---

# Make Demo Deploy Updates Observable

Activate updated PWA workers promptly and expose the exact running build in demo diagnostics.

## Desired Changes

- Configure the generated service worker to replace outdated precaches, claim active clients, and bypass HTTP cache when checking its script.
- Keep service-worker registration application-owned while safely reloading once when a newly activated worker gains control.
- Define a compile-time build ID from the GitHub SHA or a local build timestamp and expose it in the performance overlay and `__retroMageDebug`.

## Definition of Done

- [ ] Production service-worker registration uses `updateViaCache: 'none'` and updated workers take control without a manual site-data reset.
- [ ] The generated worker enables `skipWaiting`, `clientsClaim`, and cache cleanup.
- [ ] The current build ID is visible in both debug state and overlay output.
- [ ] Demo typecheck and production build pass.

## Out of Scope

- Content-hashed runtime asset URLs and deployment cache-header policy.
- User-facing update prompts or reload controls.
- CloudFront infrastructure changes.

## Implementation Steps

1. Add a Vite build constant using `GITHUB_SHA` when available and a distinct local fallback otherwise.
2. Add the value to `DemoDebugSnapshot` and `PerfOverlay` stats.
3. Configure Workbox update/activation behavior in `examples/demo/vite.config.ts`.
4. Harden manual production worker registration in `examples/demo/src/main.ts` with no-cache update checks and a single controller-change reload.
5. Verify typecheck and build, inspecting the generated worker configuration.

## Context

- Read: `docs/architecture/example-deployment.md` — deployed example and PWA lifecycle.
- Read: `docs/architecture/asset-pipeline.md` — asset ownership and runtime fetch boundary.
- Key files: `examples/demo/vite.config.ts`, `examples/demo/src/main.ts`, `examples/demo/src/perf-overlay.ts`.
