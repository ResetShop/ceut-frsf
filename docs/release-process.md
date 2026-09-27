# Release Process

> **Audience:** upstream maintainers. Forks don't cut starter releases — they consume them by merging `upstream/main`; see [`docs/forking.md`](forking.md). The release workflows are gated to the upstream repository and never run on forks.

## 1. Branch model

```
feature PRs ──▶ develop ──(automated release PR)──▶ main ──▶ tag vX.Y.Z + GitHub Release
                   ▲                                  │
                   └────────── back-merge ◀── hotfix ─┘
```

| Branch    | Role                                                        | How it advances                                                                                          |
| --------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `develop` | Integration branch and GitHub default. All feature PRs.     | Ordinary PR merges                                                                                       |
| `main`    | Stable, release-only. What forks track and Railway deploys. | Exclusively via the automated `develop → main` release PR (plus the hotfix exception, [§4](#4-hotfixes)) |

Every merge to `main` therefore corresponds to exactly one released, tagged, CHANGELOG-documented version.

## 2. The three-piece automation

| Piece                                                              | Kind              | What it does                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`/release-workflow`](../.claude/skills/release-workflow/SKILL.md) | Claude Code skill | Prepares the release from its release issue: milestone-complete check, CHANGELOG promotion, version bump, cold CI gate, extraction dry-run, release-prep PR against `develop`. Two user-approval pauses.                                                                             |
| `.github/workflows/prepare-release-pr.yml`                         | GitHub Action     | Fires when a PR closing a `🚀 release`-labeled issue merges into `develop`. Re-checks the milestone, then creates/updates the `develop → main` release PR and dispatches CI against `develop`. Never merges.                                                                         |
| `.github/workflows/release.yml`                                    | GitHub Action     | Fires on push to `main`. If `v<package.json version>` is not yet a tag, extracts that version's `CHANGELOG.md` section (hard failure if missing) and runs `gh release create` — curated notes plus the auto-generated PR list. Idempotent: pushes without a version bump are no-ops. |

**What triggers what:**

1. Maintainer opens a release issue from the [release template](../.github/ISSUE_TEMPLATE/release.md), assigns it to the `X.Y.Z` milestone, and invokes `/release-workflow <issue-url>`.
2. The skill's release-prep PR merges into `develop` → `prepare-release-pr.yml` opens/updates the `develop → main` PR.
3. A maintainer reviews and merges that PR → `release.yml` tags `vX.Y.Z` and publishes the GitHub Release.
4. Railway deploys `main` through its native Git integration (no workflow involvement); verify `/api/health/v1` afterwards.

## 3. Conventions the automation relies on

- **Milestone title = version.** The release issue's milestone (`1.0.2`) is the single source for the target version; the skill and the milestone gate both resolve it from there.
- **`🚀 release` label.** Applied by the release issue template; `prepare-release-pr.yml` ignores merged PRs whose closed issues don't carry it — that is what makes the workflow a no-op for every ordinary feature PR.
- **Version bump ↔ CHANGELOG coupling.** `release.yml` fails hard when `## [X.Y.Z]` is missing from `CHANGELOG.md`, so a version bump can never ship without its notes. The inverse is covered by the tag-idempotency check: a CHANGELOG-only merge without a bump simply releases nothing.
- **Single root bump.** Only the root `package.json` version matters. `packages/*` versions are inert under the fork-distribution model and are never bumped.
- **Tags are `v`-prefixed** (`v1.0.2`); CHANGELOG headings are bare (`## [1.0.2] — YYYY-MM-DD`).
- **CI signal on the release PR.** The `develop → main` PR is created by `GITHUB_TOKEN`, which cannot trigger `on: pull_request` workflows (GitHub's anti-recursion rule). `prepare-release-pr.yml` therefore dispatches `ci.yml` against `develop` explicitly — the CI evidence for a release lives on that `develop` run, not on the release PR's checks tab.

## 4. Hotfixes

The one flow that bypasses `develop`:

1. Branch off `main` (`hotfix/<issue>-<kebab-title>`), fix, **bump the patch version**, add the CHANGELOG section for the new version, PR back to `main`.
2. Merging that PR triggers `release.yml` exactly like a normal release — the version bump is what makes it release (no separate hotfix mechanism exists).
3. **Back-merge `main → develop`** immediately afterwards via a PR, so `develop` contains the fix and the next regular release doesn't regress it.

## 5. Dry-running the automation

Both Actions accept `workflow_dispatch` with a `dry_run` input — they resolve versions, gates, and notes, log everything, and skip the mutating call:

```bash
# Validate issue/milestone resolution + the milestone gate, without creating a PR:
gh workflow run prepare-release-pr.yml --ref develop -f dry_run=true

# Validate version detection + notes extraction, without tagging or releasing:
gh workflow run release.yml --ref main -f dry_run=true
```

`prepare-release-pr.yml` also accepts `version` (override the `package.json` value) and `force` (skip the milestone-complete check — use when an open issue is deliberately deferred).

The notes extraction can be simulated locally at any time:

```bash
awk -v ver="1.0.2" '
  BEGIN { header = "## [" ver "]" }
  index($0, header) == 1 { found = 1; next }
  found && index($0, "## [") == 1 { exit }
  found { print }
' CHANGELOG.md
```

## 6. Repository settings the model depends on

Maintained in GitHub settings (not in-repo); re-verify after any settings change:

- `develop` is the repository **default branch** (PRs auto-target it; Nx cache warms on it via `ci.yml`'s `push: [develop]` trigger).
- `main` is **branch-protected**: PRs required, review required, status checks recommended. Protection blocks merging, not PR creation — the automation only ever creates PRs.
- **Railway** must deploy the explicit `main` branch — not "the default branch" — otherwise flipping the default to `develop` would point production at unreleased code.
- **`v*` tags — protection ruleset (⚠ specified here, _not yet applied_).** Unlike the three settings above, this one is **not in place yet**. `main` advances only through the automated release PR and `release.yml` is the only thing that should ever mint a tag, but nothing currently prevents a `vX.Y.Z` tag from being created by hand, moved, or deleted — the repository has two `target: branch` rulesets (`develop`, `main`) and no tag ruleset. This bullet is the specification and the rollout procedure; update it to past tense once the ruleset exists and has been promoted.

  **Intended shape:** `target: tag`, pattern `refs/tags/v*`, restricting creation, update, and deletion. Bypass actors: the `GitHub Actions` app — required, so `release.yml`'s `gh release create` can still mint the tag — and repo/org admins, as a manual-recovery escape hatch. Because a ruleset matches by pattern rather than creation date, it will also cover the already-published `v1.0.0`–`v1.0.2`.

  **Step 1 — create it in `evaluate` enforcement.** `15368` is the global `GitHub Actions` app id (confirmed via `gh api apps/github-actions`). Equivalent UI path: Settings → Rules → Rulesets → New tag ruleset.

  ```bash
  gh api repos/ResetShop/angular-nx-standalone-starter/rulesets --method POST --input - <<'JSON'
  {
    "name": "protect release tags",
    "target": "tag",
    "enforcement": "evaluate",
    "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
    "rules": [{ "type": "creation" }, { "type": "update" }, { "type": "deletion" }],
    "bypass_actors": [
      { "actor_id": 15368, "actor_type": "Integration", "bypass_mode": "always" },
      { "actor_id": null, "actor_type": "OrganizationAdmin", "bypass_mode": "always" }
    ]
  }
  JSON
  ```

  `evaluate` records what _would_ have been blocked without blocking anything, so a misconfigured bypass cannot break a release while in this mode.

  **Step 2 — verify the bypass against a real release, then promote.** The bypass actor is the one unverified assumption: if it is wrong, an `active` ruleset hard-fails `release.yml` at `gh release create`, leaving the tag uncreated and the Release unpublished.

  ```bash
  # Look up the ruleset id:
  gh api repos/ResetShop/angular-nx-standalone-starter/rulesets \
    --jq '.[] | select(.name == "protect release tags") | {id, enforcement}'

  # After a release ships, confirm the workflow's tag push was allowed through:
  gh api repos/ResetShop/angular-nx-standalone-starter/rulesets/rule-suites \
    --jq '.[] | select(.ref == "refs/tags/v<version>") | {ref, result, actor_name}'
  # Expect "result": "bypass". Only then promote:
  gh api --method PATCH repos/ResetShop/angular-nx-standalone-starter/rulesets/<id> -f enforcement=active
  ```

  **`workflow_dispatch` with `dry_run: true` cannot substitute for this** — that branch returns before `gh release create` runs, so it never pushes a tag and never exercises the rule. Only a real release does.

  **Not inherited by forks or private mirrors.** Rulesets are repository settings, so a fork or mirror wanting the same guarantee must create its own, adjusted to its own tag prefix and branch names; `fork-init` does not provision it.
