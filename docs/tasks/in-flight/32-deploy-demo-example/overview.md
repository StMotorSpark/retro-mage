---
task: "32"
slug: deploy-demo-example
status: in-flight
depends-on: []
blocked-by: ""
assigned-to: "agent"
created: 2026-01-01
outcome: ""
---

# Deploy Demo Example

Stand up the AWS infrastructure and GitHub Actions pipeline described in `docs/architecture/example-deployment.md` so `examples/demo` deploys to `retro-mage-demo.pixeldrip.games` on demand via a GitHub Action, with no manual AWS console steps required afterward.

## Desired Changes

- Provision AWS infra for `retro-mage-demo.pixeldrip.games`: S3 bucket (static website hosting), ACM certificate (`us-east-1`, DNS-validated), CloudFront distribution (origin = S3 website endpoint, alias = subdomain, ACM cert attached, TLS-only)
- Provide the CloudFront distribution's `*.cloudfront.net` domain name back to the user so they can add the external DNS CNAME (DNS for `pixeldrip.games` is managed outside this AWS account — the implementer does not have access to add this record and must hand it off)
- Create IAM resources scoped for CI deploys (e.g. an IAM user or role with least-privilege access to: put/delete objects in the demo bucket, create CloudFront invalidations on the demo distribution only)
- Add a GitHub Actions workflow (e.g. `.github/workflows/deploy-demo.yml`) that: builds workspace packages, builds `examples/demo`, syncs `dist/` to the S3 bucket, invalidates the CloudFront distribution
- Workflow triggers via `workflow_dispatch` with a required `branch` input (defaults to `main`) so any branch, including an open PR's branch, can be deployed to the same demo URL for pre-merge testing
- Set the GitHub Actions secrets/variables the workflow needs (AWS credentials or OIDC role ARN, bucket name, distribution ID) on the repo using `gh secret set` / `gh variable set`
- Trigger the workflow (or run the deploy manually once) to confirm the pipeline works end to end, and confirm the demo is reachable once DNS is added

## Definition of Done

- [ ] S3 bucket exists, static website hosting enabled, holds a successful build of `examples/demo`
- [ ] ACM certificate for `retro-mage-demo.pixeldrip.games` issued and validated (or validation records handed to the user if DNS validation requires external DNS access)
- [ ] CloudFront distribution exists, aliased to `retro-mage-demo.pixeldrip.games`, cert attached, serving the S3 bucket
- [ ] User has been given the CloudFront domain name and told exactly what CNAME record to add externally
- [ ] `.github/workflows/deploy-demo.yml` exists, triggered via `workflow_dispatch` with a `branch` input (default `main`); workflow checks out that ref before building
- [ ] Workflow runs build → sync → invalidate steps and completes successfully against the real infra when manually triggered
- [ ] All secrets/variables the workflow reads are set on the GitHub repo via `gh secret set` / `gh variable set` — no secrets committed to the repo
- [ ] IAM credentials used by the workflow are scoped to only this bucket/distribution, not full AWS account access
- [ ] `docs/architecture/example-deployment.md` updated if any implementation detail deviates from what it currently describes (e.g. IAM auth method chosen, workflow trigger conditions)

## Out of Scope

- Adding the DNS CNAME record itself — external DNS provider access is not available to the implementer; hand the CloudFront domain name to the user
- Deploying `examples/bench` or `examples/spike-ktx2` — not in scope per `docs/architecture/example-deployment.md`
- CI-based automated testing/linting as part of this workflow (deploy workflow is deploy-only; existing `pnpm test`/`pnpm lint` CI, if any, is untouched)
- Cross-origin isolation headers (COOP/COEP) — only add if `engine-core` currently requires `SharedArrayBuffer`; check before adding, and if not currently needed, skip and note it in the doc rather than adding unused config
- Custom domain purchase/registration — `pixeldrip.games` already exists, this task only adds a subdomain

## Implementation Steps

1. Read `docs/architecture/example-deployment.md` in full — this is the source of truth for the infra shape (S3 + CloudFront + ACM, matching existing `pixeldrip.games` sites like `hacknscratch.pixeldrip.games`)
2. Inspect the existing `hacknscratch.pixeldrip.games` CloudFront distribution/bucket config via `aws cloudfront get-distribution-config` and `aws s3api get-bucket-website` as a reference for exact settings to mirror (origin protocol policy, cache behaviors, etc.)
3. Provision the bucket (`aws s3 mb` + `aws s3 website` config), matching the reference bucket's static-website-hosting settings
4. Request the ACM certificate (`aws acm request-certificate --domain-name retro-mage-demo.pixeldrip.games --validation-method DNS --region us-east-1`); surface the DNS validation CNAME record to the user immediately, since ACM validation requires it in external DNS before the cert issues
5. Once the cert is validated, create the CloudFront distribution (`aws cloudfront create-distribution` or via a config JSON file), aliased to the subdomain, cert attached
6. Create a scoped IAM user or OIDC role for GitHub Actions with a policy limited to `s3:PutObject`/`s3:DeleteObject`/`s3:ListBucket` on the demo bucket ARN and `cloudfront:CreateInvalidation` on the demo distribution ARN
7. Write `.github/workflows/deploy-demo.yml`: `workflow_dispatch` with required `branch` input (default `main`) → checkout that ref → pnpm install → `pnpm -r build` (or targeted `pnpm --filter demo... build` respecting workspace dependency order) → `aws s3 sync examples/demo/dist s3://<bucket>` → `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`
8. Set repo secrets/variables via `gh secret set` (credentials) and `gh variable set` (bucket name, distribution ID) so the workflow file references `${{ secrets.* }}` / `${{ vars.* }}` rather than hardcoded values
9. Manually trigger the workflow (`gh workflow run`) and confirm it completes successfully; verify the S3 bucket/website endpoint serves the built app directly (before DNS is live) as a sanity check
10. Report back to the user: CloudFront domain name + exact CNAME record to add, and confirmation the deploy pipeline works
11. Update `docs/architecture/example-deployment.md` if anything implemented differs from what's described

## Context

**Read first:**
- `docs/architecture/example-deployment.md` — source of truth for the infra shape and deploy flow this task implements
- `docs/architecture/repo-structure.md` — where `examples/demo` sits and its package dependencies
- `docs/architecture/asset-pipeline.md` — KTX2 build-time compression that must succeed as part of the build step

**Related work:**
- None — first implementation task for this design doc

**Key files:**
- `examples/demo/` — the app being deployed
- `.github/workflows/` — new workflow file goes here
- AWS account `982251360280` — existing `hacknscratch.pixeldrip.games` infra is the reference pattern to mirror

**Access available to implementer:**
- AWS CLI, already authenticated via SSO in the working session
- GitHub CLI (`gh`), already authenticated
- Full latitude to provision AWS resources and set repo secrets/variables directly — no need to ask the user to run commands, except handing off the final DNS CNAME record (user must add this in the external DNS provider)
