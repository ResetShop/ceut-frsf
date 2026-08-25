---
name: release-workflow
description: Orchestrates a release in 4 phases — Pre-flight, Prepare, Verify, Ship — from the release issue URL. The issue's milestone title is the target version. Invoke with /release-workflow <issue-url>.
---

# Release Workflow

Orchestrates a **release** of the starter from its release-management issue (e.g. "Release v1.0.2"). Unlike [`issue-workflow`](../issue-workflow/SKILL.md), a release is **not a code feature** but a **deterministic checklist**: its steps are fixed, and the only variables are what fills them in (the milestone's issues in the CHANGELOG section, the target version). That is why this skill encodes the checklist directly instead of reusing the feature flow (no `plan-writer`, no generic `code-reviewer`).

Each invocation overwrites `workspace/RELEASE.md` — save any prior session artifact before starting a new invocation. (`workspace/` is gitignored.)

The rules in [`CLAUDE.md`](../../../CLAUDE.md) and [`coding-agent-policies.md`](../../references/coding-agent-policies.md) apply throughout. Full release mechanics (branch model, Actions, hotfixes): [`docs/release-process.md`](../../../docs/release-process.md).

## Usage

```
/release-workflow <issue-url>
```

Example: `/release-workflow https://github.com/ResetShop/angular-nx-standalone-starter/issues/545`

## Assumptions

- The issue is a **release-management issue** created from `.github/ISSUE_TEMPLATE/release.md`: it carries the **`🚀 release`** label (the `prepare-release-pr` Action gates on it), and its **milestone title is the target version** (e.g. milestone `1.0.2` → version `1.0.2`).
- The release ships by merging **`develop → main`**, which triggers `release.yml` (tag `v<version>` + GitHub Release from the CHANGELOG section). This skill prepares the release commits on a branch against `develop`; it **never** merges to `main`. After the prep PR merges into `develop`, the `prepare-release-pr` Action creates/updates the `develop → main` release PR.

---

## Phase 1 — Pre-flight

**Purpose:** Gather everything the release needs and surface blockers, without committing anything yet.

1. Run `gh issue view <issue-url> --json number,title,milestone` → issue number, title, and **target version** (from `milestone.title`).
2. **Verify the milestone is complete (acceptance criterion):** `gh issue list --milestone "<version>" --state open`. No issue may remain open **except the release issue itself**. If others remain, report them and pause — the release is not ready.
3. **Branch:** `git checkout develop && git pull --ff-only`, then `git checkout -b <number>-<kebab-case-title>` (branch convention from `CLAUDE.md`). Releases always branch from `develop` — never from the resolved default branch of a fork.
4. **Draft the CHANGELOG promotion:** the release section is the current `## [Unreleased]` content. Cross-check it two ways: every issue closed in the milestone has an entry, and every entry's issue was actually shipped in `git log v<previous-version>..develop` (an entry whose PR merged after the previous tag but which belongs to a future milestone is a red flag — report it). Do not edit `CHANGELOG.md` yet.
5. **Check documented tool versions:** compare `docs/` and `README.md` version references (Node, npm, major framework versions) against `package.json` (`engines`, key dependency majors). Only a documentable major jump requires an edit — not routine minor/patch bumps.
6. Write `workspace/RELEASE.md` with: target version, milestone status, the documentation delta (if any), and the **draft CHANGELOG section** exactly as it will read after promotion.

**⏸ PAUSE — User approval required.**

> The release scope and the CHANGELOG draft are in `workspace/RELEASE.md`. Review it and reply **approve**, or give me feedback on the grouping/prose.

Do not proceed until the user approves.

---

## Phase 2 — Prepare

**Purpose:** Materialize the version bump and CHANGELOG promotion as atomic commits.

1. **Promote the CHANGELOG:** rename `## [Unreleased]` to `## [<version>] — <today's date, YYYY-MM-DD>`, insert a fresh empty `## [Unreleased]` heading above it, and update the link references at the bottom of the file: `[Unreleased]` now compares `v<version>...HEAD`, and a new `[<version>]: …/releases/tag/v<version>` line is added. Commit: `[#<issue>] - Promote CHANGELOG to <version>`.
2. **Bump the version:** set `"version": "<version>"` in the root `package.json`, then run `npm install` so `package-lock.json` mirrors it. This is a **single root bump** — `packages/*` versions are inert under the fork-distribution model and must not be touched. Commit: `[#<issue>] - Bump version to <version>`.

Each commit leaves the repo buildable.

---

## Phase 3 — Verify

**Purpose:** Prove the release will not break the automated pipeline.

1. Run **`npm run ci`** (cold, `--skip-nx-cache`) — the authoritative final gate per `CLAUDE.md`. A bump + CHANGELOG promotion touches no runtime code, but the gate runs regardless, by policy.
2. **Dry-run the release-notes extraction from `release.yml`:** the workflow extracts the body between `## [<version>]` and the next `## [` heading with a literal-match `awk`. Simulate it and confirm it returns a **non-empty** section (if it comes back empty, the release job will fail):

   ```bash
   awk -v ver="<version>" '
     BEGIN { header = "## [" ver "]" }
     index($0, header) == 1 { found = 1; next }
     found && index($0, "## [") == 1 { exit }
     found { print }
   ' CHANGELOG.md
   ```

3. **Tag availability:** confirm `git ls-remote --tags origin "refs/tags/v<version>"` returns nothing — a pre-existing tag would turn the release job into a silent no-op.
4. **Re-confirm the milestone gate** (Phase 1 step 2) — issues may have been reopened while preparing.

Record the results in `workspace/RELEASE.md`. If anything fails: diagnose, fix with an atomic commit, and re-verify.

**⏸ PAUSE — User decision required.**

> Verification results are in `workspace/RELEASE.md`. Reply **proceed** to open the PR, or give me feedback.

Do not proceed until the user decides.

---

## Phase 4 — Ship + manual handoff

**Purpose:** Open the release-prep PR and hand off the manual steps that trigger the release.

1. `git push -u origin <branch-name>`.
2. Create the PR with `gh pr create --base develop` (milestone set to the target version):
   - Title: `[#<issue>] - <issue title>`.
   - Body with **`Closes #<issue>`** (hard constraint: the closing keyword must be in the body — the title prefix does not create the link).
   - Include the manual-steps block (below) so it is recorded on the PR.
3. Present the PR URL and the **manual handoff block** to the user:

   ```
   Manual steps to complete the release:
   1. Merge this PR into `develop` (the release issue must carry the 🚀 release label).
   2. After the merge, the `prepare-release-pr` Action creates/updates the `develop → main`
      release PR and dispatches ci.yml against develop (the PR cannot trigger checks itself
      because it is created by GITHUB_TOKEN; the CI signal is the run on develop).
      Review that PR and merge it into `main`
      → triggers release.yml (tag v<version> + GitHub Release from the CHANGELOG section).
      Railway deploys `main` via its native Git integration — no workflow involvement.
      If the milestone was not complete, the Action skips with a warning; re-trigger via
      workflow_dispatch with force=true if appropriate.
   3. Verify post-release: Release workflow green, Release v<version> published with the
      CHANGELOG notes, and the production app healthy via /api/health/v1.
   ```

4. Present the final summary (version, branch, PR, commits, verification results).

---

## Constraints (apply to all phases)

- Never use direct `nx` commands — always `npm run <task>`.
- Never prefix git commands with `cd` — the working directory is already at project root.
- Never use HEREDOC (`$(cat <<'EOF'...)`) substitution in commit messages.
- Never merge `develop → main` from this skill: that merge is the release trigger and belongs to the user.
- Never run `gh release create` or push tags from this skill: `release.yml` owns tag and Release creation.
- Never open the PR without `Closes #<issue>` in the body, nor before the cold `npm run ci` gate and Phase 3 verification pass.
- The version bump is a **single root bump** (`package.json` + regenerated `package-lock.json`); `packages/*` versions are never touched.
- Never skip Phase 3 step 2 (the extraction dry-run) — it is the only pre-merge proof that `release.yml` will find the release notes.
- All `.claude/references/coding-agent-policies.md` rules apply throughout.
