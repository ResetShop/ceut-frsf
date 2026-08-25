# Forking Workflow

> **Audience:** developers who want to use `angular-nx-standalone-starter` as the foundation for one or more applications, while still receiving upstream improvements over time.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Ownership boundaries](#2-ownership-boundaries)
3. [Initial fork setup](#3-initial-fork-setup)
4. [Creating a new app](#4-creating-a-new-app)
5. [Pulling upstream updates](#5-pulling-upstream-updates)
6. [The CHANGELOG contract](#6-the-changelog-contract)
7. [What NOT to do](#7-what-not-to-do)
8. [Upstreaming improvements](#8-upstreaming-improvements)
9. [CI guards on the upstream repository](#9-ci-guards-on-the-upstream-repository)

---

> **Status:** This document describes the fork-distribution model as it exists today. All sections are live; nothing is planned-but-unimplemented at this point.

## 1. Philosophy

This starter uses a **fork + upstream-remote** distribution model instead of publishing `packages/*` to npm. Two reasons:

- **Tighter feedback loops** during the prototype phase. Package boundaries can still move; publishing pins them prematurely.
- **No registry / versioning overhead** for downstream consumers — `git merge upstream/main` is the only update mechanism.

**Which upstream branch to track:** always `upstream/main`, and only `upstream/main`. Upstream develops on `develop` (its integration branch and GitHub default) and promotes to `main` exclusively through an automated release PR — so `main` only ever advances one released, tagged, CHANGELOG-documented version at a time. `develop` is upstream-internal: never merge from it, and don't rely on its state — it carries no CHANGELOG or tag guarantees. Forks are not required to reproduce the two-branch model; a single-branch fork merging `upstream/main` is fully supported. See [`docs/release-process.md`](release-process.md) for how upstream cuts releases.

The model works because the repository is structured so that **starter-owned** files and **app-owned** files live in disjoint directory trees. When upstream lands a change to `packages/angular-core`, your fork's `apps/<your-app>` directory is untouched, and the merge is conflict-free for that area (provided you import via package aliases, not relative paths into `packages/*`). Conflicts only happen in genuinely-shared root config files (`package.json`, `tsconfig.base.json`, `nx.json`, the lockfile), and even there the conventions documented in [§5](#5-pulling-upstream-updates) keep them mechanical.

---

## 2. Ownership boundaries

| Path                                                                                                                                                  | Ownership                                    | Forks may modify?                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `packages/*`                                                                                                                                          | **Starter-owned**                            | ❌ Never. Edits here belong upstream.                                                    |
| `apps/reference-app`                                                                                                                                  | **Starter-owned** (canonical template)       | ❌ Never. It is the source for the schematic. Forks must not rename, delete, or edit it. |
| Root config (`package.json`, `nx.json`, `tsconfig.base.json`, `eslint.config.mjs`, `prettier.config.mjs`, `.stylelintrc.json`, `tailwind.config.css`) | **Starter-owned** with a fork-additions zone | ✏️ Forks add their own deps / aliases here, expecting small mechanical merge conflicts.  |
| `scripts/`                                                                                                                                            | **Starter-owned**                            | ❌ Never. Build/CI helper scripts belong upstream.                                       |
| `drizzle/` (database migrations)                                                                                                                      | **Starter-owned**                            | ❌ Never. Schema migrations belong upstream; forks adopt them via merge.                 |
| `e2e/` (root-level Playwright specs)                                                                                                                  | **Starter-owned**                            | ✏️ Forks may add their own e2e specs alongside, but never edit upstream specs.           |
| `AGENTS.md`                                                                                                                                           | **Starter-owned**                            | ❌ Never edit upstream — manually maintained list of Claude Code agent definitions.      |
| `.github/workflows/`                                                                                                                                  | **Starter-owned**                            | ✏️ Forks may add their own workflow files alongside the starter ones.                    |
| `docs/`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`                                                                                                     | **Starter-owned**                            | ❌ Never edit upstream docs in a fork (you can add your own under `docs/`).              |
| `.claude/`                                                                                                                                            | **Starter-owned**                            | ✏️ Forks may add their own agent definitions; never edit upstream ones.                  |
| `apps/<your-app>` (anything other than `reference-app`)                                                                                               | **App-owned**                                | ✅ Yours. Upstream never touches these paths.                                            |
| `workspace/`                                                                                                                                          | Ephemeral, gitignored                        | n/a                                                                                      |

> **Tag scheme:** All starter-owned projects (`packages/*` and `apps/reference-app`) carry the Nx tag `scope:starter`. Fork-generated apps (created via the schematic) carry `scope:app`. ESLint's `@nx/enforce-module-boundaries` enforces that `scope:starter` projects may only depend on other `scope:starter` projects, while `scope:app` projects may depend on both `scope:starter` and `scope:app`.

The shorthand: **`apps/reference-app` is read-only in a fork; everything under `apps/<your-app>` is yours.**

---

## 3. Initial fork setup

```bash
# 1. Fork on GitHub via the web UI, then:
git clone https://github.com/<your-org>/<your-fork>.git
cd <your-fork>

# 2. Add upstream remote
git remote add upstream https://github.com/ResetShop/angular-nx-standalone-starter.git
git fetch upstream

# 3. Install dependencies
npm install

# 4. Verify a clean baseline
npm run ci
```

If `npm run ci` fails on a clean fork, file an issue upstream — it should always pass on the canonical baseline.

### Private mirror setup

GitHub cannot make a fork of a public repository private — fork visibility is immutable. When a downstream project must stay private (e.g. client work), use a **private mirror** instead of a GitHub fork: a bare clone pushed with `git push --mirror` into a new private repository, plus an `upstream` remote (push URL disabled) pointing back at the public starter. The full git history is shared, so upstream merges behave exactly like a fork's ([§5](#5-pulling-upstream-updates)); only GitHub cosmetics (the fork badge, cross-repo PRs, one-click sync) are lost.

Creating the mirror is a one-time step handled by the standalone [`fork-init`](https://github.com/ResetShop/fork-init) tool, which is **npx-runnable and needs no starter checkout** (`git` and an authenticated `gh` are the only requirements):

```bash
npx github:ResetShop/fork-init --repo=<org>/<name> [--app-name="Display Name"]
```

It automates the one-time setup: preflight (`git`/`gh` available, `gh` authenticated, target repo absent, target directory free), `gh repo create <org>/<name> --private`, a bare-clone `git push --mirror` sourced from the canonical public starter, cloning the mirror into `./<name>` with the `upstream` remote wired and its push URL disabled, stripping any `nxCloudId` from the mirror's `nx.json`, and an optional `npm run generate:app` scaffold when `--app-name` is given. Pass `--dry-run` to preview every command with no side effects. See the [`fork-init` README](https://github.com/ResetShop/fork-init#readme) for full options.

From then on the mirror pulls upstream updates exactly like any fork — via `npm run upstream:pull`, which ships **in the mirror** (see [§5](#5-pulling-upstream-updates)).

---

## 4. Creating a new app

**Always** create a new app via the schematic. Never hand-copy `apps/reference-app` and never run `nx g @nx/angular:application` directly.

```bash
npm run generate:app -- --name="My App"
```

The generator:

- Slugifies the display name into a kebab-case identifier (`"My App"` → `my-app`).
- Clones every file under `apps/reference-app/` into `apps/my-app/`.
- Rewrites every `reference-app` literal in text files to the slug (paths, project name, build target references, output directories).
- Rewrites the `<title>` tag in `index.html` to the human-readable display name (HTML-escaped).
- Rewrites the `scope:starter` Nx tag to `scope:app` so the new project is correctly classified as fork-owned.
- Excludes starter-owned files that don't belong in a fork app (e.g. `IMPORT_MIGRATION.md`).
- Refuses to overwrite an existing directory and refuses reserved slugs (`node`, `dist`, `src`, `app`, `apps`, `packages`, `node_modules`, `tmp`). The authoritative list lives in `RESERVED_SLUGS` inside `packages/generators/src/generators/app/index.ts`.

The optional `--directory` flag overrides the default `apps/` destination if you need to place the new app under a non-standard path:

```bash
npm run generate:app -- --name="My App" --directory="workspace/apps"
```

After generation, `apps/my-app/` is yours. Modify it freely.

---

## 5. Pulling upstream updates

> **Scripted:** `npm run upstream:pull` runs the steps below automatically — fetch, a CHANGELOG-delta preview ([§6](#6-the-changelog-contract)) with a confirmation pause when the delta contains a `### Removed` heading or a "breaking"/"migration" mention (`--yes` skips the pause), a regular merge of `upstream/main`, auto-resolution of lockfile-only conflicts, and a final `npm run ci:verify`. The manual steps below remain the reference for what the script does and for resolving the conflicts it stops on.

```bash
git fetch upstream
git checkout main          # or your fork's primary branch
git merge upstream/main
```

If the boundaries from [§2](#2-ownership-boundaries) hold, conflicts only ever appear in **root config files**. Here's how to resolve each common case:

### `package.json`

Both `dependencies` and `devDependencies` are kept **strictly alphabetized** in the upstream repo. This is a deliberate convention that minimises merge conflict surface: when upstream adds a dependency, it slots into a predictable position rather than appearing as an addition near a fork-added line.

Conflicts here come from upstream adding/removing/upgrading dependencies while your fork added its own. The fix is almost always **union both sides**:

1. Accept upstream's version of every line that touches a starter-owned dep.
2. Re-apply your fork's added lines into the correct alphabetical position.
3. If a fork-added dep collides with a new upstream dep at the same name, prefer upstream's version.
4. Run `npm install` to refresh `package-lock.json`.

**Convention for fork-added deps:** keep them alphabetized inside the same `dependencies` / `devDependencies` block. Don't create a separate "fork additions" section — it would defeat the alphabetization and concentrate every fork's additions in the same block where upstream adds, increasing conflicts.

**Version-disagreement tiebreaker:** if upstream bumps a dependency to a version your fork has intentionally pinned to something different, prefer upstream's version unless your fork has a documented reason to diverge. Track the divergence in a fork-local note (commit message or PR description) so the next merge author knows it's deliberate.

### `package-lock.json`

Always **delete and regenerate**:

```bash
rm -f package-lock.json   # Git Bash / Unix
# PowerShell: Remove-Item package-lock.json
# cmd.exe:    del package-lock.json
npm install
```

Merged lockfiles are syntactically opaque and rarely correct; starting from scratch is safer than resolving them manually.

### `nx.json` / `tsconfig.base.json` / `eslint.config.mjs`

Hand-resolve. These files rarely change upstream, and when they do the change is usually a small targeted addition (a new path alias, a new ESLint rule, a new target default). Accept upstream's change and re-apply any fork additions on top.

**`nx.json` `defaultBase`:** the upstream value is `"develop"` (upstream's integration branch). Update this value once after forking to match **your fork's own primary branch** (`main`, `master`, or whatever you named it) — `nx affected` depends on it. This is a permanent, deliberate divergence for single-branch forks; re-accepting upstream's `"develop"` during a merge would break `nx affected` on your fork.

**`tsconfig.base.json` path aliases convention:** keep all starter `@<scope>/*` aliases grouped at the top of `compilerOptions.paths`. The starter block is ordered by package dependency layering (`util` → `ui` → `angular-core` → `hono-core`), **not alphabetically**, and must not be resorted by fork maintainers during merge resolution — resorting creates an unnecessary diff conflict on every upstream merge. Forks add their own app-scoped aliases (e.g. `@<your-app>/*`) **below** the starter block, alphabetized within that fork section.

### `apps/<your-app>` conflicts

If upstream is producing conflicts in `apps/<your-app>`, **something has gone wrong**: either you committed your app under `apps/reference-app` by mistake, or upstream landed a change in a path it shouldn't have. The boundary CI guard (see [§9](#9-ci-guards-on-the-upstream-repository)) prevents the upstream side; check your fork for the former.

---

## 6. The CHANGELOG contract

[`CHANGELOG.md`](../CHANGELOG.md) at the repo root is the single source of truth for what changed upstream. **Read it before every upstream merge.**

The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). The starter's CI will enforce that any upstream PR touching starter-owned code must add an entry under `## [Unreleased]` (see [§9](#9-ci-guards-on-the-upstream-repository)).

When you merge upstream, scan the entries between the version you last merged and the current head. Anything marked **breaking**, **migration**, or appearing under a `### Removed` heading needs your attention.

---

## 7. What NOT to do

- ❌ **Don't edit `packages/*` in a fork.** If you need a fix there, contribute it upstream ([§8](#8-upstreaming-improvements)). Local edits will conflict on every merge and slowly drift out of date.
- ❌ **Don't edit `apps/reference-app`.** It is the schematic source. Even a small "harmless" edit will make every future `npm run generate:app` produce divergent output and will conflict on upstream merges.
- ❌ **Don't rename or delete `apps/reference-app`.** Same reason.
- ❌ **Don't pin a fork to a specific upstream commit forever.** Merging gets harder the longer you wait. Aim for at most a few weeks between upstream merges.
- ❌ **Don't squash-merge upstream into your fork.** Use a regular merge so the upstream commit history stays visible — it makes future conflict resolution dramatically easier.

---

## 8. Upstreaming improvements

If you fix a bug in `packages/*` or improve `apps/reference-app`, **send it upstream** rather than keeping it in your fork:

1. Fork the upstream repo (or use your existing fork as a contributor branch).
2. Create a topic branch off `upstream/main`.
3. Apply only the starter-relevant change.
4. Add a `## [Unreleased]` entry in [`CHANGELOG.md`](../CHANGELOG.md) describing the change.
5. Open a PR against `ResetShop/angular-nx-standalone-starter`.

Once it's merged upstream, you can drop your local copy and pick it up via the next `git merge upstream/main`.

---

## 9. CI guards on the upstream repository

The upstream repository runs two guard jobs on every PR via `.github/workflows/upstream-guards.yml` (gated to only run on `ResetShop/angular-nx-standalone-starter` via a `github.repository ==` check, so they don't fire on forks):

1. **Boundary guard** — Fails if a PR touches any path under `apps/` other than `apps/reference-app` or its subdirectories. Ensures upstream PRs never modify fork-owned paths. Sibling-named directories such as `apps/reference-app-staging/` are deliberately treated as offending. Bypass label: `allow-app-change` (for the rare legitimate case of renaming the reference app).
2. **Changelog guard** — Fails if a PR modifies starter-owned code without adding an entry to `CHANGELOG.md`. Starter-owned paths are: anything under `packages/`, `apps/reference-app/`, `scripts/`, `docs/`, `drizzle/`, `e2e/`, `.github/`, `.claude/`, plus the root files `package.json`, `package-lock.json`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`, `eslint.config.mjs`, `prettier.config.mjs`, `.stylelintrc.json`, `tailwind.config.css`, `drizzle.config.ts`, `migrations.json`, `vitest.config.ts`, `vitest.integration.config.ts`, `AGENTS.md`, `CLAUDE.md`, and `README.md`. (`CHANGELOG.md` itself is intentionally excluded — it is the requirement, not the trigger.) Bypass label: `skip-changelog` (for trivial typo / comment-only PRs with no fork-visible impact).

A PR template at `.github/pull_request_template.md` reminds contributors of both guards as a checklist before opening the PR. The template applies to all PRs in the repo where it lives, including fork-internal PRs — fork maintainers may delete or replace it with their own.

These guards do not run on forks, so your fork's PRs are unaffected. They exist solely to keep the upstream contract honest.

---

_See also: [`CLAUDE.md`](../CLAUDE.md) for developer conventions, and [`CHANGELOG.md`](../CHANGELOG.md) for what's changed upstream._
