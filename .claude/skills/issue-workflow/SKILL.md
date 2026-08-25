---
name: issue-workflow
description: Orchestrates the full 6-phase issue resolution lifecycle — Setup, Plan, Implement, Review, Fix, Ship — for a GitHub issue URL. Invoke with /issue-workflow <issue-url>.
---

# Issue Workflow

Orchestrates the complete lifecycle for resolving a GitHub issue in this project. Each invocation overwrites `workspace/PLAN.md` and `workspace/CODE_REVIEW.md` — save any prior session artifacts before starting a new invocation.

## Usage

```
/issue-workflow <issue-url>
```

Example: `/issue-workflow https://github.com/ResetShop/angular-nx-standalone-starter/issues/349`

---

## Phase 1 — Setup

**Purpose:** Create a clean feature branch from the latest default branch.

1. Run `gh issue view <issue-url> --json number,title` to extract the issue number and title.
2. Derive the branch name:
   - Format: `<number>-<kebab-case-title>`
   - Transformation: lowercase the title, replace spaces and non-alphanumeric characters with hyphens, collapse consecutive hyphens, trim leading/trailing hyphens, truncate to 60 characters.
   - Example: issue #349 "Add /issue-workflow skill to standardize the issue resolution lifecycle" → `349-add-issue-workflow-skill-to-standardize-the-issue-resolution-lifecycle` (truncated at a word boundary if needed).
3. Resolve the repo's default branch: `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`. This is `<default-branch>` for the rest of the workflow — on the upstream repo it resolves to `develop` (the integration branch; `main` is release-only), while a single-branch fork resolves to its own primary branch, so the skill works unmodified in both.
4. Run `git checkout <default-branch> && git pull` to ensure the base is current.
5. Run `git checkout -b <branch-name>` to create the feature branch.
6. Report to the user: issue number, title, default branch, and branch name created.

---

## Phase 2 — Plan

**Purpose:** Produce a detailed implementation plan for user approval.

1. Delegate to the `plan-writer` agent. Pass the issue URL, issue description, and branch name as context.
2. The plan-writer produces `workspace/PLAN.md`.
3. Present a brief summary of the plan to the user (goal, approach, affected files, key decisions).

**⏸ PAUSE — User approval required.**

Present this message:

> Plan is ready at `workspace/PLAN.md`. Review it, then reply **approve** to begin implementation or provide feedback to revise.

Do not proceed to Phase 3 until the user explicitly approves.

---

## Phase 3 — Implement

**Purpose:** Execute the plan with atomic commits.

1. Execute the plan steps from `workspace/PLAN.md` in order.
2. Create one atomic git commit per logical unit of work.
3. Before writing new components, services, or files: check whether a matching generator exists in `packages/generators/src/generators/`. If one exists, use it. If none exists, inform the user and proceed only after acknowledgment.
4. **Update the `CHANGELOG.md` — this is mandatory, not optional.** Every issue resolved through this workflow MUST add an entry under the `## [Unreleased]` section before the work is considered complete. This is the single hardest thing to remember and the easiest to skip — do not skip it.
   - **Subsection:** `### Added` for new features/files/endpoints, `### Changed` for modifications to existing behavior (including any fork-visible breaking change), `### Fixed` for bug fixes. Create the subsection under `## [Unreleased]` if it does not already exist.
   - **Entry format** (match the existing entries' density): a **bold lead-in** naming what changed, then prose covering the concrete files/APIs touched, and — for any breaking change — an explicit **Migration:** note describing what a fork must do. End every entry with the issue link `([#<issue>](<issue-url>))`.
   - **Commit it** as its own atomic commit, message `[#<issue>] - Document <feature> in CHANGELOG`, OR fold it into the final logical commit of the feature. It must land before Phase 6.
   - If the change is genuinely invisible to forks (no behavior, API, schema, file, doc, or tooling change — e.g. a comment-only tweak), state that explicitly to the user and skip the entry. This exemption is rare; when in doubt, add the entry.

### Commit rules

- Message format: `[#<issue>] - <description of what changed and why>`
- One commit per distinct logical change (e.g., new component + spec is one commit; new story is a separate commit if it's a separate concern).
- Each commit must leave the codebase buildable (`npm run ci` would pass if run).
- Never use "WIP", "fix review", "update", or other non-descriptive messages.
- Never amend commits; create new commits after pre-commit hook failures.
- Use simple `git commit -m "message"` — never HEREDOC substitution.

### Do not:

- Push during this phase.
- Skip tests for any runtime behavior change.
- Create barrel imports/exports.
- Introduce commented-out code.

---

## Phase 4 — Review

**Purpose:** Verify CI passes and run the code-reviewer agent.

1. Run `npm run ci`. If it exits non-zero:
   - Report which batch/step failed.
   - Diagnose and fix the issue.
   - Commit the fix following Phase 3 commit rules.
   - Re-run `npm run ci` until it passes.
2. Delegate to the `code-reviewer` agent to review all changes on the branch vs. `<default-branch>`.
3. The code-reviewer writes findings to `workspace/CODE_REVIEW.md`.
4. Present the findings table to the user (Critical Issues, Warnings, Suggestions).

**⏸ PAUSE — User decision required.**

Present this message:

> Review complete. See `workspace/CODE_REVIEW.md`. Reply **proceed** to address findings, or **ship** if there are no blocking issues to fix.

---

## Phase 5 — Fix

**Purpose:** Address review findings with atomic commits.

1. Address each **Critical Issue** and **Warning** from `workspace/CODE_REVIEW.md` in priority order (Critical first, then Warnings).
2. After each fix, immediately update the **Addressed** column in `workspace/CODE_REVIEW.md` (values: Fixed, Discarded, Deferred, Won't Fix).
3. For each fix, create one atomic commit. The commit message describes the actual change — never references the review finding number.
   - ✅ `[#349] - Scope constant to function body — was incorrectly at module level`
   - ❌ `[#349] - Fix review finding #2`
4. If an issue is **Deferred**, create a GitHub issue for it (`gh issue create`) and add the URL to the Addressed column.
5. After all Critical Issues and Warnings are addressed, run `npm run ci` again. Fix any regressions before continuing.
6. **Suggestions** are optional. Present them to the user and let the user decide which (if any) to address.

---

## Phase 6 — Ship

**Purpose:** Push, create the PR, and update the original issue.

0. **CHANGELOG gate.** Before pushing, verify a `## [Unreleased]` entry for this issue exists (`git diff <default-branch>...HEAD -- CHANGELOG.md` must be non-empty, unless the rare fork-invisible exemption from Phase 3 step 4 was explicitly declared to the user). If it is missing, stop and add it now (Phase 3 step 4) — do not push or open the PR without it.
1. Run `git push -u origin <branch-name>`.
2. Create the PR using `gh pr create` with:
   - Title: `[#<issue>] - <issue-title>`
   - Body format:

     ```
     ## Summary
     <1-3 bullet points>

     Closes #<issue>.

     ## Test plan
     [Bulleted checklist of testing done]

     🤖 Generated with [Claude Code](https://claude.com/claude-code)
     ```

   - **The PR MUST link its originating issue (hard constraint).** Because `/issue-workflow` always starts from a real issue, the PR body MUST contain a GitHub closing keyword — `Closes #<issue>` (or `Fixes #<issue>` / `Resolves #<issue>`) — referencing that issue's number. This creates the GitHub issue↔PR link and auto-closes the issue on merge. The bare `[#<issue>]` prefix in the title does **not** create this link; the closing keyword in the body is required. Place it on its own line right after the Summary bullets, as shown above.
   - If the issue is a **child of an epic**, additionally reference the epic without a closing keyword (e.g., a `Part of #<epic>.` line) so the epic is cross-linked but not auto-closed.

3. Present the PR URL to the user.
4. Scan the session for items that went **out of scope** (fixes, discoveries, enhancements beyond the original issue). If any exist:
   - Update the original issue's description (via `gh issue edit`) with an "Out of scope (addressed in this PR)" section listing what was done beyond the original scope.
   - Prompt the user: "The following out-of-scope items were addressed. Would you like me to create separate GitHub issues for any future follow-ups?" Wait for confirmation before creating issues.
5. Present the final summary as **exactly** this Item/Value table — no other format, no additional summary forms substituted. The table is the authoritative completion artifact for the workflow. Render it after the PR is opened and the issue body has been updated.

   **Required structure:**

   ```markdown
   **Workflow complete.**

   | Item               | Value                                                         |
   | ------------------ | ------------------------------------------------------------- |
   | Issue              | [#<number>](issue-url) — <issue-title>                        |
   | Branch             | `<branch-name>`                                               |
   | PR                 | [#<pr-number>](pr-url)                                        |
   | Commits            | <N> atomic commits                                            |
   | Findings addressed | <X> critical · <Y> warnings · <Z> suggestions — <disposition> |
   | CI status          | <Green locally / Red — see <reason>>                          |
   ```

   **Cell rules:**
   - `Issue` and `PR` cells must use markdown links with the actual numeric IDs and URLs.
   - `Commits` counts only commits on the feature branch (`git rev-list --count <default-branch>..HEAD`).
   - `Findings addressed` lists the counts from `workspace/CODE_REVIEW.md` and a disposition phrase. Use `all fixed`, `none required`, or `<n> deferred — see <issue-url(s)>` as appropriate. If a review category had zero findings, still list it with `0 critical` / `0 warnings` / `0 suggestions` — never omit a row or cell.
   - `CI status` reports the result of the last `npm run ci` run on this branch.

   Optional content that may follow the table — never replace it:
   - A bulleted list of commit messages (helps reviewers).
   - A closing sentence about out-of-scope items if any were addressed in this PR.
   - A prompt asking whether to file follow-up issues (per step 4).

   **Ordering assertion:** The table MUST be rendered only after steps 1–4 of this phase have completed — i.e., after `git push` succeeded, after `gh pr create` returned a real PR URL, and after the issue body has been edited if out-of-scope items existed. Do not synthesise the table from anticipated values before these steps complete; every cell must reflect verified state from the prior steps (PR URL from `gh pr create` output, commit count from `git rev-list --count <default-branch>..HEAD`, etc.). If any of those steps failed or was skipped, do NOT render the table — report the failure instead and stop. The table's contract is that its presence implies the workflow completed end-to-end on real artifacts.

---

## Constraints (apply to all phases)

These are hard constraints active throughout the entire workflow:

- Never use direct `nx` commands — always `npm run <task>`.
- Never prefix git commands with `cd` — the working directory is already at project root.
- Never open the PR before `npm run ci` passes and the `code-reviewer` agent has run.
- Never open the PR without a `CHANGELOG.md` entry under `## [Unreleased]` for the issue (see Phase 3 step 4 and the Phase 6 CHANGELOG gate), unless the rare fork-invisible exemption was explicitly declared to the user.
- Never open the PR without a GitHub closing keyword (`Closes #<issue>`) linking the originating issue in the PR body (see Phase 6 step 2). The title's `[#<issue>]` prefix does not create the link; the body keyword is mandatory and has no exemption — the workflow always originates from a real issue.
- Never skip the Plan phase — even trivial changes benefit from a brief plan documenting scope and rationale.
- Never use HEREDOC (`$(cat <<'EOF'...)`) substitution in commit messages.
- All `.claude/references/coding-agent-policies.md` rules apply throughout:
  - No solo-maintainer shortcut framings.
  - No "skip the test for this small change" (unless documentation-only).
  - No deferring code review past PR open.
