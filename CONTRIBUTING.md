# Contributing

This repository is **public for transparency and reuse** under the [Apache-2.0](./LICENSE.md) license.

## Contribution policy

- **Issues are welcome from anyone.** Bug reports and feature requests from outside the org are
  encouraged — please open an issue.
- **Pull requests are accepted from [ResetShop](https://github.com/ResetShop) org members only.**
  Anyone can fork and open a PR, but PRs from non-members are automatically closed by a GitHub
  Actions workflow with a short policy note. If you are a ResetShop member and your PR was closed in
  error, the membership-check token (`ORG_READ_TOKEN`) may have expired — please contact a maintainer.

If you have found a security vulnerability, do **not** open a public issue — see
[`SECURITY.md`](./SECURITY.md).

The rest of this document is the internal workflow for org members.

## Branch naming

`<issue#>-<kebab-title>`

```
87-add-user-authentication
203-fix-pagination-off-by-one-error
```

## Commit messages

`[#<issue>] - <title>`

```
[#87] - Add login form component
[#203] - Fix off-by-one error in pagination component
```

## Pull requests

- **Title:** `[#<issue>] - <title>` (same format as commits).
- **Body:** include a `Closes #<issue>` line so the PR links and auto-closes its issue on merge.
- Keep the PR scoped to a single issue.

## CHANGELOG requirement

Every PR that touches starter-owned code (`packages/*`, `apps/reference-app`, root config, `scripts/`,
`.github/`, `docs/`) must add an entry under `## [Unreleased]` in [`CHANGELOG.md`](./CHANGELOG.md).
This is enforced by the `changelog-guard` job in `.github/workflows/upstream-guards.yml`.

Two bypass labels exist for legitimate exceptions (applying or removing a label re-runs the guard, so
you don't need to push a new commit):

- `skip-changelog` — for typo fixes, comment-only edits, or internal refactors with no fork-visible impact.
- `allow-app-change` — for a PR that legitimately modifies a path under `apps/` other than `apps/reference-app`.

Note: the root community-health files (this `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`) are **not** matched by the `changelog-guard` regex, so changes to them won't be flagged automatically — please add a CHANGELOG entry voluntarily when a change to them is fork-visible (e.g. a policy change).

## CI gate

`npm run ci` must pass with exit code `0` before a PR is opened. All task execution goes through
`npm run <task>` — direct `nx` commands are not supported.

## Issue & development workflow

The `/issue-workflow <issue-url>` Claude Code skill (`.claude/skills/issue-workflow/SKILL.md`)
orchestrates the full lifecycle — Setup → Plan → Implement → Review → Fix → Ship — and is the
recommended entry point for any new issue.

## Forking

For fork-specific guidance (creating apps from the schematic, pulling upstream changes, ownership
boundaries, the changelog contract), see [`docs/forking.md`](./docs/forking.md).

## Code of Conduct

All participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).
