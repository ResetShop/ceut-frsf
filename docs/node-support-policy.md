# Node.js Support Policy

> **Audience:** fork maintainers and upstream contributors. This is the authoritative statement of which Node.js line the starter runs on, why, and when that changes. The version numbers themselves live in `package.json` — this document explains them.

## Table of Contents

1. [The policy](#1-the-policy)
2. [Why Active LTS, not Current](#2-why-active-lts-not-current)
3. [Why one supported line, not a range](#3-why-one-supported-line-not-a-range)
4. [Relationship to the Angular support matrix](#4-relationship-to-the-angular-support-matrix)
5. [Worked example: the Node 26 decision](#5-worked-example-the-node-26-decision)
6. [What happens when the LTS line rolls over](#6-what-happens-when-the-lts-line-rolls-over)
7. [Upgrade cadence and the authoritative version](#7-upgrade-cadence-and-the-authoritative-version)
8. [Where the Node version is asserted](#8-where-the-node-version-is-asserted)

---

## 1. The policy

The starter supports **exactly one Node.js major line: the current Active LTS line**, declared in `package.json` → `engines.node` as a caret range on the latest release of that line the repo is built and tested against.

Today that line is **Node 24 ("Krypton")**, declared as `^24.20.0`.

The starter does **not** adopt a _Current_ release (a line that has not yet entered LTS) just because a framework in the stack admits it. A new major line is adopted when it enters Active LTS, on the schedule described in [§6](#6-what-happens-when-the-lts-line-rolls-over).

For the live release schedule — which line is Current, Active LTS, or Maintenance, and the transition dates — the source of truth is [nodejs/Release](https://github.com/nodejs/Release). This document deliberately does not restate that schedule as standing fact; dates quoted below are recorded as of the decision they justify.

## 2. Why Active LTS, not Current

- **Deploy-target availability.** Managed hosts, buildpacks (the reference app deploys to Railway via Nixpacks), and container base images add a new Node major on their own timeline, typically well after its first release and often only once it reaches LTS. A starter pinned to a Current line forces every fork to run a runtime its hosting may not offer yet.
- **Stability guarantees.** A Current line receives semver-minor changes and can still break behavior between minors. Active LTS receives only backported, reviewed fixes — the right contract for a template that many downstream projects inherit.
- **Ecosystem support.** Native dependencies (e.g. the `embedded-postgres` binaries the integration suite downloads) and tooling (Nx, Vitest, Storybook) test against LTS lines first.

A framework supporting a Current line is **necessary but not sufficient** to adopt it.

## 3. Why one supported line, not a range

`engines.node` is a single-major caret range (`^24.20.0`), not a permissive multi-major range such as `>=22 <27`. This is deliberate:

- **`@types/node` can only describe one runtime.** The repo pins `@types/node` to the same major as `engines.node` (`^24.x`). If `engines` admitted Node 22 through 26 while the types sat at the ceiling, `tsc` would accept APIs that only exist on the newest line — and a fork running on the floor of the range would hit runtime errors that the type-checker told everyone were fine.
- **CI can only prove what it runs.** Every CI job runs one Node version. A wide `engines` range claims support for lines nothing in the pipeline exercises.
- **Forks inherit the claim.** A range published by the starter becomes every fork's implicit promise. Keeping it narrow keeps it honest.

**Invariant:** the major of `@types/node` must always equal the major of `engines.node`. A change that bumps one without the other violates this policy.

## 4. Relationship to the Angular support matrix

Angular publishes the Node versions each Angular major supports at [angular.dev/reference/versions](https://angular.dev/reference/versions). The rule is:

- The Node line chosen here **must fall inside** the range Angular publishes for the Angular major in use. Angular's matrix is a **constraint**.
- Angular's matrix is **not a target**. When Angular admits several Node lines, the starter picks the **Active LTS** one among them — not the newest one Angular tolerates.

When an Angular major upgrade narrows its supported Node range, the Angular upgrade and any Node line bump it forces are coordinated in the same release.

## 5. Worked example: the Node 26 decision

_Recorded September 2026, with Angular 22 and Node 24 in use._

- Angular 22 supports Node `^26.0.0` in addition to the Node 24 range the starter uses, so Node 26 was **permitted** by the constraint in [§4](#4-relationship-to-the-angular-support-matrix).
- Node 26 was still a _Current_ line at the time. Its entry into Active LTS was scheduled for 2026-10-28 (verify against [nodejs/Release](https://github.com/nodejs/Release)).
- Node 26 was not yet widely available in the environments the reference app is deployed to.

**Decision:** decline Node 26 for now and refresh within the Active LTS line instead (to `24.20.0`). Node 26 becomes a candidate once it is Active LTS, per [§6](#6-what-happens-when-the-lts-line-rolls-over).

This is the template for every future line evaluation: the framework's range decides what is _allowed_; the LTS status and deploy-target availability decide what is _adopted_.

## 6. What happens when the LTS line rolls over

Each year a new Node line enters Active LTS and the previous one moves to **Maintenance** (security and critical fixes only, until its end-of-life).

- **Planned move:** the starter moves to the new Active LTS line at the **next routine dependency refresh after the rollover** — not on rollover day (deploy targets and native dependencies need time to catch up), and not deferred indefinitely. In practice the starter spends a short period on a Maintenance line, measured in weeks rather than months, and never approaches its end-of-life.
- **Earlier move** — any of these triggers the bump ahead of the routine refresh:
  - a security fix the Node project ships only on the newer line;
  - a required dependency or tooling upgrade (including an Angular major, see [§4](#4-relationship-to-the-angular-support-matrix)) that drops support for the Maintenance line.
- **Blocker:** the move is held if the new line is not yet available on the reference app's deploy targets or breaks a native dependency. The block is recorded on the tracking issue and re-evaluated at each subsequent refresh.

A major-line bump is a fork-visible change and is always announced in [`CHANGELOG.md`](../CHANGELOG.md) with a fork migration note telling forks to update their local Node install, CI, and deploy target.

## 7. Upgrade cadence and the authoritative version

What a fork should expect:

| Change                              | Frequency                                 | Fork action                                                                         |
| ----------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| Patch/minor refresh within the line | As needed, alongside dependency refreshes | Usually none beyond `nvm use`; accept upstream's values on merge                    |
| Major-line bump                     | About once a year, after LTS rollover     | Upgrade local Node, fork CI, and deploy target; follow the CHANGELOG migration note |

**The authoritative value is `package.json` → `engines.node`.** Every other location listed in [§8](#8-where-the-node-version-is-asserted) is derived from it. A fork should pin its own tooling from `engines.node` (or `.nvmrc`, which mirrors it) rather than copying numbers from the README or CI. On an upstream merge, accept upstream's `engines.node` unless the fork has a documented reason to diverge (see [`forking.md` §5](forking.md#packagejson)).

## 8. Where the Node version is asserted

Every place in the repo that names a Node version, and how it relates to `engines.node`:

| Location                                                     | Current value | Relationship to `engines.node`                           |
| ------------------------------------------------------------ | ------------- | -------------------------------------------------------- |
| `package.json` → `engines.node`                              | `^24.20.0`    | **Authoritative**                                        |
| `package-lock.json` → root package `engines.node`            | `^24.20.0`    | Mirror — regenerated by `npm install`                    |
| `package.json` → `devDependencies["@types/node"]`            | `^24.19.0`    | Same **major** (types versions trail runtime minors)     |
| `.nvmrc`                                                     | `24.20.0`     | Exact floor of the range — what local `nvm use` installs |
| `.github/workflows/ci.yml` → `actions/setup-node` (10 steps) | `'24.20'`     | Same major.minor as the floor                            |
| `README.md` → Node badge                                     | `^24.20.0`    | Identical                                                |
| `README.md` → quick-start prerequisites and §1 Prerequisites | `^24.20.0`    | Identical                                                |
| `railway.json` / `railway.storybook.json`                    | _no pin_      | Nixpacks derives the Node version from `engines.node`    |

Any disagreement between a derived row and `engines.node` is a bug. When changing the Node version, update every row in the same PR — there is currently no automated check that enforces this, so the table above is the checklist.
