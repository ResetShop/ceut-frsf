# Nx Cloud — intentionally not used

> **TL;DR:** This workspace does **not** use Nx Cloud. Task caching is **local only** (Nx's on-disk `.nx/cache`). There is no `nxCloudId` in `nx.json`, no `NX_CLOUD_ACCESS_TOKEN` in CI, and `.github/workflows/ci.yml` sets `NX_NO_CLOUD: 'true'` at the workflow level. This is a deliberate decision — do not re-wire Nx Cloud without revisiting the rationale below.

## Why it was removed

Nx Cloud remote caching was previously wired up, then removed. The reasons:

- **Marginal benefit at this size.** The workspace is small (~8 projects; a cold `npm run ci` completes in well under a minute). Remote cache restoration saved little over the local cache that CI already carries via the repository cache snapshot.
- **A bad token was fatal, not degrading.** A **missing** `NX_CLOUD_ACCESS_TOKEN` degrades gracefully to the local cache, but a **present-but-invalid** token made Nx return `401` and exit non-zero — turning a caching optimization into a hard CI failure mode.
- **Cross-workspace leakage risk.** A token left set in a developer's shell environment could make an unrelated repository (e.g. a private mirror created via `npm run fork:init`) report into **this** repo's public Nx Cloud workspace — the token activates the cloud independently of `nxCloudId`, so stripping the id from a mirror was not sufficient protection.

## What "local cache only" means

- `npm run ci:verify` rides Nx's **local** cache (fast inner-loop reruns on an unchanged tree).
- `npm run ci` runs cold (`--skip-nx-cache`) as the authoritative gate.
- CI jobs restore a per-SHA repository snapshot and run Nx directly (`npx nx …`); no cloud round-trip is ever attempted.

## If you ever reconsider

Re-enabling Nx Cloud is a deliberate decision, not a default. It would mean: connecting a workspace (`npx nx connect`), provisioning a **valid** `NX_CLOUD_ACCESS_TOKEN` as a GitHub Actions secret, removing the workflow-level `NX_NO_CLOUD`, and — critically — solving the stray-token leakage that motivated this removal before any fork/mirror workflow is exposed to it. See the CHANGELOG entry for the removal ([#542](https://github.com/ResetShop/angular-nx-standalone-starter/issues/542)) for the full context.
