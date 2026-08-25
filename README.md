# Reset Dev: Repo Starter

[![CI](https://github.com/ResetShop/angular-nx-standalone-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/ResetShop/angular-nx-standalone-starter/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE.md)
[![Node](https://img.shields.io/badge/node-%5E24.18.0-brightgreen.svg)](#1-prerequisites-required)

A fork-ready **Nx monorepo starter**: an SSR-ready Angular 17+ frontend and a Hono backend API, wired with NgRx Signal Store, a Drizzle/Postgres data layer, and PASETO-based auth + RBAC. The intentional `TODO` markers throughout are for forkers to fill in — search for them.

> [!NOTE]
> This repository is public for transparency and reuse under Apache-2.0.
> **Issues are welcome from anyone; pull requests are accepted from [ResetShop](https://github.com/ResetShop) org members only.**
> See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## Getting started

**Prerequisites:** Node.js `^24.18.0` (`.nvmrc` pins it) and `git`; for a private mirror, also the [GitHub CLI](https://cli.github.com), authenticated (`gh auth login`). Full list in [§1 Prerequisites](#1-prerequisites-required).

**1. Create your project** — pick the path that fits:

- **Public fork** (open source) — fork on GitHub, then:

  ```bash
  git clone https://github.com/<your-org>/<your-fork>.git && cd <your-fork>
  git remote add upstream https://github.com/ResetShop/angular-nx-standalone-starter.git
  ```

- **Private mirror** (client work — GitHub cannot make a fork of a public repo private) — one command, no checkout needed:

  ```bash
  npx github:ResetShop/fork-init --repo=<org>/<name> && cd <name>
  ```

  It creates the private repo, mirror-pushes the full history, and wires the `upstream` remote ([what it does](docs/forking.md#private-mirror-setup)).

**2. Install, run, and verify:**

```bash
npm install
npm run dev     # SSR dev server
npm run ci      # lint, typecheck, tests, build
```

**3. Create your first app** from the canonical template (never hand-copy `apps/reference-app`):

```bash
npm run generate:app -- --name="My App"
```

**4. Stay current** with upstream improvements: `npm run upstream:pull` (private mirror) or `git fetch upstream && git merge upstream/main` (fork).

Full details — ownership boundaries, conflict resolution, env vars, database — are in [`docs/forking.md`](docs/forking.md) and the [Project Setup Guide](#project-setup-guide) below.

## How to use this repo

This repository is a starter project for an SSR-ready Angular application, which uses Hono for its backend web API.

Search for the TODOs! They indicate places where you'll need to update fields to suit your project architecture and folder structure.

### Forking workflow

This repo is designed to be **forked** (or [privately mirrored](#getting-started)), not consumed as a published package set. Starter code lives in `packages/*`, `apps/reference-app`, and root config; your apps live in `apps/<name>` and are created via the schematic — never by hand-copying `apps/reference-app`. The quickstart commands are under [Getting started](#getting-started) above.

`apps/reference-app` is **upstream-owned** and must never be modified in a fork. See [`docs/forking.md`](docs/forking.md) for the full workflow, ownership boundaries, conflict resolution, and the changelog contract.

## Live demo

- App: https://angular-nx-standalone-starter-production.up.railway.app/
- Storybook: https://angular-nx-standalone-starter-storybook.up.railway.app/

## Project Setup Guide

This guide covers all the setup steps needed to configure this starter repository for your project. The repository includes optional integrations for databases, CMS, and analytics services.

### Quick Start Checklist

- [x] Clone repository and install dependencies
- [x] Configure environment variables **[Required]**
- [x] Generate and configure PASETO secret key **[Required]**
- [x] Choose and setup database **[Optional]**
- [ ] Configure CMS integration **[Optional]**
- [ ] Setup analytics **[Optional]**
- [ ] Configure development tools **[Optional]**
- [x] Post-setup cleanup **[Required]**

---

### Required Setup

#### 1. Prerequisites **[Required]**

This project requires:

- **Node.js**: `^24.18.0` (matches the `engines` field in `package.json`; `.nvmrc` pins `24.18.0`)
- **npm**: Package manager

**Installation Steps:**

```bash
# Clone the repository
git clone <repository-url>
cd angular-nx-standalone-starter

# Install dependencies and set up Claude Code skills
npm install
```

Note: `npm install` installs packages and sets up Claude Code skills only — it does **not** touch the database. After configuring your environment variables (see [`docs/environment-variables.md`](./docs/environment-variables.md)), run `npm run drizzle:push-migrations` then `npm run drizzle:seed` to apply the schema and seed the initial admin account.

#### 2. Environment Variables Configuration **[Required]**

The project uses build-time environment configuration via Angular's `define` option in `apps/reference-app/project.json`. Each build configuration (`development`, `staging`, `production`) has its own `define` block that injects values into `apps/reference-app/src/app/environments/environment.ts` at build time.

**Frontend Environment Variables** (configured in `project.json` → `build.configurations.<env>.define`):

- **`__ENV_ENVIRONMENT__`**: Build environment identifier (`'development'`, `'staging'`, `'production'`)
- **`__ENV_API_URL__`**: API base URL (default: `'/'` — same-origin, SSR proxies API calls)
- **`__ENV_CLARITY_PROJECT_ID__`**: Microsoft Clarity analytics project ID (default: `''` — disabled)
- **`__ENV_DEFAULT_LANGUAGE__`**: Default UI language (default: `'en'`)

**Backend Environment Variables** (validated at runtime by the server via the typed `@config/*` env contract):

Every backend variable is declared in one of eight domain-scoped Zod sub-schemas under `apps/reference-app/src/api/config/*.env.ts` (`db`, `email`, `http`, `app`, `cron`, `token`, `password`, `security`) and consumed as `<domain>Env.VAR_NAME` (e.g. `dbEnv.PG_CONNECTION_STRING`, `tokenEnv.PASETO_SECRET_KEY`). Direct `process.env[...]` access is forbidden in production code. **No `.env*` file may exist in the working tree** — a pre-commit guard and `npm run ci` fail if one appears; deliver values via one of four mechanisms: an out-of-tree env file + Node `--env-file`, an IDE run configuration, a shell-session `export`, or [`direnv`](https://direnv.net/). **[`docs/environment-variables.md`](./docs/environment-variables.md) is the single source of truth** for the full variable index and the delivery options. Backend connector templates (Drizzle MySQL/PostgreSQL, Sanity, Microsoft Clarity) live in `packages/hono-core/src/lib/` and are consumed via the `@resetshop/hono-core` package alias. Note: all `apps/...` paths in the rest of this guide are relative to the canonical example app at `apps/reference-app/`.

#### 3. Authentication Configuration **[Required]**

The authentication system uses PASETO (Platform-Agnostic Security Tokens) for secure token-based authentication. You must configure the required environment variables before the application will work.

**Required Environment Variable:**

- **`PASETO_SECRET_KEY`**: A 32-byte (256-bit) secret key in hexadecimal format
  - **Generate the key:**

    ```bash
    # Using OpenSSL (recommended)
    openssl rand -hex 32

    # Using Node.js
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```

  - **Set in development:** deliver it via one of the four mechanisms in [`docs/environment-variables.md`](./docs/environment-variables.md) (out-of-tree env file + Node `--env-file`, IDE run config, shell `export`, or direnv) — **not** a `.env` file in the working tree (forbidden by the pre-commit guard). Lowest-friction option:
    ```bash
    export PASETO_SECRET_KEY=your_generated_key_here
    ```
  - **Set in production:** Configure in your deployment platform's environment variables

**Required Environment Variables:**

- **`PASETO_ISSUER`**: Token issuer claim (e.g., "my-app")

**Optional Environment Variables:**

- **`PASETO_ACCESS_TOKEN_EXPIRY`**: Access token lifetime (default: "15m")
- **`PASETO_REFRESH_TOKEN_EXPIRY`**: Refresh token lifetime (default: "7d")
  - Supported formats: "15m" (minutes), "24h" (hours), "7d" (days), "30s" (seconds)
- **`PASETO_CLOCK_TOLERANCE`**: Clock drift tolerance for token validation (default: "1m")
  - Useful for handling slight time differences between client and server
- **`COOKIE_SECURE`**: Controls the `secure` flag on authentication cookies (default: "true")
  - Set to "false" for local development without HTTPS
  - **Always keep as "true" in production**
- **`CORS_ORIGIN`**: Allowed origin for CORS requests (default: "http://localhost:4200")
  - Set to your frontend domain in production (e.g., `"https://app.example.com"`)
  - Required for cookie-based authentication when frontend and backend are on different origins
- **`CORS_MAX_AGE`**: Preflight request cache duration in seconds (default: 86400 = 24 hours)
  - Controls how long browsers cache OPTIONS preflight responses
- **`TOKEN_CLEANUP_INTERVAL`**: Expired token cleanup interval as a duration string (default: `24h`)
  - Background job that removes expired refresh tokens from the database
  - Valid range: `1m` to `7d` (inclusive)
  - Skipped on serverless platforms (use an external scheduler to call the cleanup endpoint instead)
- **`TOKEN_CLEANUP_BATCH_SIZE`**: Number of tokens to delete per batch (default: 1000)
  - Valid range: 100 to 10000
  - Higher values = faster cleanup but longer transactions
- **`TOKEN_CLEANUP_MAX_BATCH_COUNT`**: Maximum number of batches per cleanup run (default: 100)
  - Valid range: 10 to 1000
  - Limits cleanup to batch_size × max_batches tokens per run (default: 100k)
  - Prevents indefinite execution on large backlogs
- **`CRON_SECRET`**: Secret for an external cron/scheduler to authenticate cleanup requests (minimum 32 characters)
  - Generate with: `openssl rand -hex 32`
  - Required when triggering cleanup via an external scheduler

**Documentation:**

- For detailed information about the authentication system, see [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md)
- For the dependency injection guide, see [docs/DEPENDENCY_INJECTION.md](./docs/DEPENDENCY_INJECTION.md)

⚠️ **Security Note**: Never commit your `PASETO_SECRET_KEY` to version control. The repo forbids `.env*` files in the working tree (enforced by a pre-commit guard and `npm run ci`), so deliver secrets via an out-of-tree mechanism. Keep the key secret and rotate it periodically in production.

---

### Optional Integrations

These integrations can be enabled based on your project needs. Each section includes installation commands and configuration steps.

#### 1. Database Configuration **[Optional]**

The starter supports both MySQL and PostgreSQL via Drizzle ORM. Choose one based on your requirements.

**Setup Steps:**

1. **Install Database Packages:**

   For MySQL:

   ```bash
   npm install drizzle-orm drizzle-kit mysql2
   ```

   For PostgreSQL:

   ```bash
   npm install drizzle-orm drizzle-kit postgres
   ```

2. **Configure Drizzle (PostgreSQL is the default — no change needed):**
   - PostgreSQL is already wired up: `drizzle.config.ts` (repo root) uses `dialect: 'postgresql'` and reads the connection string from `dbEnv.PG_CONNECTION_STRING` — env-driven, nothing hardcoded.
   - **For MySQL instead:** in `drizzle.config.ts`, uncomment the `dialect: 'mysql'` line and the `url: dbEnv.MYSQL_CONNECTION_STRING` line, commenting out their PostgreSQL counterparts (`dialect: 'postgresql'` / `url: dbEnv.PG_CONNECTION_STRING`).

3. **Uncomment the database connector (MySQL only):**
   - PostgreSQL needs no action — `drizzle-postgres-connector.ts` is already active.
   - **For MySQL:** uncomment the connector in `packages/hono-core/src/lib/drizzle-mysql-connector.ts` (look for the `TODO` comment at the top).

4. **Declare the connection string in the env contract:**
   - Add the connection-string field (e.g. `MYSQL_CONNECTION_STRING`) to the `db` env sub-schema (`apps/reference-app/src/api/config/db.env.ts`) and consume it as `dbEnv.<VAR>`

5. **Set Connection String:**
   - Provide the value via one of the delivery mechanisms in [`docs/environment-variables.md`](./docs/environment-variables.md) (no `.env` file in the working tree)
   - Configure separately for development and production environments

#### 2. Sanity.io CMS Integration **[Optional]**

Integrate Sanity.io headless CMS for content management.

**Setup Steps:**

1. **Install Sanity Client:**

   ```bash
   npm install @sanity/client
   ```

2. **Uncomment Sanity Connector:**
   - File: `packages/hono-core/src/lib/sanity-connector.ts` (look for the `TODO` comment at the top)
   - Uncomment the connector implementation

3. **Enable Sanity in the connector template:**
   - Uncomment the example in `packages/hono-core/src/lib/sanity-connector.ts` and add the `SANITY_*` fields to the `app` env sub-schema (`apps/reference-app/src/api/config/app.env.ts`), consuming them as `appEnv.SANITY_*`

4. **Set Environment Variables:**
   - Provide the Sanity project ID, dataset, and token via one of the delivery mechanisms in [`docs/environment-variables.md`](./docs/environment-variables.md) (no `.env` file in the working tree)

#### 3. Analytics Integration **[Optional]**

Enable analytics tracking with Microsoft Clarity.

##### Microsoft Clarity

1. **Install Clarity Package:**

   ```bash
   npm install @microsoft/clarity
   ```

2. **Uncomment Clarity Connector:**
   - File: `packages/hono-core/src/lib/clarity-connector.ts` (look for the `TODO` comment at the top)

3. **Enable in Analytics Provider:**
   - Uncomment the Clarity setup in `apps/reference-app/src/app/providers/analytics/analytics.ts` (look for the `// TODO: Uncomment if you're using Clarity analytics` comment inside `Analytics.init()`)

4. **Enable the backend Clarity connector (optional):**
   - Uncomment `packages/hono-core/src/lib/clarity-connector.ts` and add `CLARITY_TOKEN` (and any other `CLARITY_*` fields) to the `app` env sub-schema (`apps/reference-app/src/api/config/app.env.ts`), consuming them as `appEnv.CLARITY_*`

5. **Set Build-Time Variable:**
   - Set `__ENV_CLARITY_PROJECT_ID__` in the `production` define block of `project.json` with your Microsoft Clarity project ID

#### 4. Development Tools **[Optional]**

##### Storybook Assets Configuration

If you need to add static assets for Storybook:

- **File**: `.storybook/main.ts`
- **Action**: Add a `staticDirs` entry to the exported `config` object (at the same level as the `stories` array), e.g. `staticDirs: ['../apps/reference-app/src/assets']`
- **Example**: Add paths to image folders, fonts, or other static resources needed in Storybook stories

##### Custom Angular Providers

For adding custom dependency injection providers:

- **File**: `apps/reference-app/src/app/app.config.ts`
- **Action**: Add your provider to `appConfig.providers` — look for the `// Custom providers` comment block
- **Use Case**: Custom services, HTTP interceptors, or third-party library providers

---

### Running Integration Tests

`npm run test:integration` works **out of the box with no setup** — no Docker daemon, no managed Postgres, no env config. When `PG_TEST_CONNECTION_STRING` is unset, the suite spawns a real Postgres 17 cluster locally via [`embedded-postgres`](https://www.npmjs.com/package/embedded-postgres) (official EnterpriseDB binaries downloaded once at `npm install` time, ~70 MB cached in `node_modules`) on a free localhost port, runs the schema push and seed, and tears the cluster down at suite end.

To use your own long-lived Postgres instead (persistent local container, shared dev DB, etc.), set `PG_TEST_CONNECTION_STRING` via your env delivery mechanism (see [`docs/environment-variables.md`](./docs/environment-variables.md) — not a `.env` file in the working tree). CI uses the same env-set path against its `postgres:17` service container.

---

### Generators

The starter ships eight Nx generators under `@resetshop/generators` for the common file-creation tasks. Use these instead of hand-rolling boilerplate so generated files follow the project conventions automatically (file naming, store builder block ordering, repository projection types, OpenAPI registration, and so on).

| Generator        | Use when                                                            | Invoke                                                                                           |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `app`            | Creating a new app from the canonical template                      | `npm run generate:app -- --name="My App"`                                                        |
| `crud`           | Adding a full vertical slice (DB + API + frontend)                  | `nx g @resetshop/generators:crud product --module=catalog`                                       |
| `drizzle-schema` | Just a Drizzle table schema                                         | `nx g @resetshop/generators:drizzle-schema product`                                              |
| `backend-module` | Just the backend layer (routes / controller / service / repository) | `nx g @resetshop/generators:backend-module product --module=catalog`                             |
| `api-provider`   | Frontend API token + http impl + mock + provider function           | `nx g @resetshop/generators:api-provider product`                                                |
| `store`          | NgRx Signal Store following project conventions                     | `nx g @resetshop/generators:store product`                                                       |
| `page`           | Route page component (+ optional store and provider)                | `nx g @resetshop/generators:page product --withStore --withApiProvider`                          |
| `ui-component`   | Shared UI library component (component + spec + Storybook story)    | `nx g @resetshop/generators:ui-component tooltip [--inlineTemplate=false] [--inlineStyle=false]` |

**Choosing between `crud` and `backend-module`/`page`:** if the task is a brand-new entity that needs a DB table, an HTTP endpoint, a frontend service, and a list page, use `crud` — it stitches all five layers in one invocation. If you're adding to an existing layer (e.g. a new endpoint group on an existing module, or a page that wraps an API you've already built), pick the narrower generator. The `page` generator's `--withStore` and `--withApiProvider` flags also let you compose two-layer slices without going through `crud`.

`names()` from `@nx/devkit` normalises the entity name. Pass `productCatalog` or `product_catalog` interchangeably — both produce the same kebab-case file paths (`product-catalog/...`) and camelCase JS identifiers (`productCatalog`).

For deeper guidance — exact files produced by each generator, known limitations, when NOT to use a generator — see [`.claude/references/generators.md`](./.claude/references/generators.md).

---

### Post-Setup Steps **[Required]**

After completing your setup:

1. **Resolve setup TODOs:**
   - Search the codebase for the remaining setup `TODO` comments (see "Search for the TODOs!" at the top of this guide) and resolve any that apply to your project.

2. **Verify Application:**
   - Run `npm run dev` to start the development server
   - Ensure all configured features work correctly

---

### Third-Party Acknowledgments

This project includes third-party data assets. See each linked file for full
license details.

| Asset                      | Source                                                                                       | License      |
| -------------------------- | -------------------------------------------------------------------------------------------- | ------------ |
| English password word list | [EFF Large Wordlist](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases) | CC BY 3.0 US |
| Spanish password word list | [Dadoware Bonito ES](https://github.com/mir123/dadoware-bonito-es)                           | MIT          |

Full details: [`apps/reference-app/src/api/utils/wordlists/README.md`](./apps/reference-app/src/api/utils/wordlists/README.md)

---

## License

Licensed under the **Apache License, Version 2.0** — see [`LICENSE.md`](./LICENSE.md) and [`NOTICE.md`](./NOTICE.md). The third-party data assets listed above retain their own licenses (CC BY 3.0 US, MIT), which are compatible with Apache-2.0.
