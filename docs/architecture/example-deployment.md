---
feature: example-deployment
tags: [architecture, deployment, aws, examples, ci]
summary: Retro Mage example apps deploy as static sites to S3 + CloudFront under pixeldrip.games subdomains, so anyone can test the engine without running a local dev server.
relates-to:
  - "[Repo Structure](./repo-structure.md)"
  - "[Asset Pipeline](./asset-pipeline.md)"
  - "[Tech Stack](./tech-stack.md)"
---

# Example Deployment

Each app under `examples/` is a self-contained Vite build with no server-side component, so it deploys as a static site. `examples/demo` deploys to `retro-mage-demo.pixeldrip.games`, giving anyone a running reference build to test on real devices without a local toolchain.

## Overview

`pixeldrip.games` already hosts several static sites on the same account, each following the same shape: an S3 bucket in static-website-hosting mode, fronted by a CloudFront distribution with a dedicated ACM certificate, aliased to a subdomain. DNS for `pixeldrip.games` is managed outside this AWS account, so the subdomain's CNAME record is added manually once the distribution exists.

Example deployment reuses this exact shape rather than inventing a new hosting pattern. Each deployable example gets its own bucket, cert, distribution, and subdomain — kept independent so examples can be added, redeployed, or torn down without affecting each other.

## Deployed Examples

| Example | Subdomain | Notes |
|---------|-----------|-------|
| `examples/demo` | `retro-mage-demo.pixeldrip.games` | Primary reference build — engine-core (WASM) + render + input wired into a playable dungeon scene, PWA-enabled |

`examples/bench` and `examples/spike-ktx2` are local-only tooling and prototyping harnesses; they are not deployed. A future deployable example follows the same pattern documented here — new bucket, cert, distribution, subdomain.

## Infrastructure Shape (per example)

1. **S3 bucket** — static website hosting enabled, holds the Vite `dist/` output for that example.
2. **ACM certificate** — issued in `us-east-1`, one certificate per subdomain, validated via DNS.
3. **CloudFront distribution** — origin is the S3 bucket's website endpoint (HTTP-only origin, matching the existing `pixeldrip.games` sites), alias set to the example's subdomain, ACM cert attached, TLS-only viewer access.
4. **DNS** — a CNAME for the subdomain pointing at the distribution's `*.cloudfront.net` domain, added manually in the external DNS provider once the distribution's domain name is known.

Bucket names, certificate ARNs, and distribution IDs are operational details tracked in the deploying account, not in this doc. GitHub Actions authenticates to AWS via OIDC (a per-repo IAM role trusted by GitHub's OIDC provider, scoped only to the demo bucket and distribution) rather than long-lived access keys.

## Build Requirements

Deploying `examples/demo` as a static artifact means the build step resolves everything the dev server resolves live:

- The pnpm workspace packages (`engine-core` WASM output, `render`, `input`) are built before the example, so `vite build` bundles compiled output rather than relying on workspace dev-resolution.
- The Vite `base` path is root (`/`) — the example owns its whole subdomain, so no path-prefix rewriting is needed.
- Compressed textures (KTX2) are produced by `vite-plugin-ktx2` at build time per [Asset Pipeline](./asset-pipeline.md) and shipped as static files in `dist/`.
- The PWA service worker (`vite-plugin-pwa`, `generateSW` strategy) precaches the built JS/WASM/CSS/HTML/KTX2 app shell, so the deployed site works offline after first load.
- If `engine-core` uses WASM threads (`SharedArrayBuffer`), the CloudFront distribution attaches a response headers policy setting `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, since cross-origin isolation is enforced by response headers, not by build output.

## Deploy Flow

Deployment runs through a GitHub Actions workflow (`.github/workflows/deploy-demo.yml`), triggered manually with a `branch` input (defaults to `main`). This lets any branch — including an open PR's branch — deploy to the same `retro-mage-demo.pixeldrip.games` URL for pre-merge testing, without a per-PR preview environment.

1. Workflow checks out the requested branch
2. `pnpm -r build` (workspace packages build first via `pnpm -r` ordering), then `pnpm --filter demo build`
3. Sync `examples/demo/dist` to the example's S3 bucket
4. Invalidate the CloudFront distribution so the new build serves immediately
5. Hashed static assets (JS/CSS/KTX2/WASM) are cached long-lived and immutable; `index.html` and the service worker script are served no-cache, so clients always fetch the latest app shell on load

Because the workflow always deploys to the same bucket/distribution, only one branch's build is live at a time — deploying a PR branch to test it temporarily replaces whatever was previously deployed (`main` or another PR). This is a single shared test environment, not one environment per PR.

## Related Docs

- [Repo Structure](./repo-structure.md) — where `examples/demo` sits in the monorepo and its relationship to the engine packages
- [Asset Pipeline](./asset-pipeline.md) — how KTX2 textures are produced at build time, consumed here as static deploy output
- [Tech Stack](./tech-stack.md) — Vite tooling and PWA support that this deployment shape builds on
