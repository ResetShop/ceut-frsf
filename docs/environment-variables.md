# Environment Variables

This document is the single source of truth for **what environment variables exist**, **what they mean**, and **how to deliver them to `process.env`** without committing a `.env` file.

---

## Contract

| Concern               | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Declaration**       | Every backend env variable is declared in one of the eight domain-scoped Zod sub-schemas under `apps/reference-app/src/api/config/*.env.ts` (`db`, `email`, `http`, `app`, `cron`, `token`, `password`, `security`).                                                                                                                                                                                                                                                                                                                               |
| **Consumption**       | Production code reads values exclusively via `<domain>Env.VAR_NAME` (e.g., `dbEnv.PG_CONNECTION_STRING`, `tokenEnv.PASETO_SECRET_KEY`) imported from `@config/<domain>.env`. **Direct `process.env[...]` access is ESLint-forbidden** (a `no-restricted-syntax` rule in `eslint.config.mjs`); the allowlisted consumers are the env module itself (`apps/**/src/api/config/**` — the sub-schemas, the `createEnvHandler` factory, and their specs), `apps/**/src/test-setup.ts`, and the integration test tree (`apps/**/src/api/integration/**`). |
| **Validation timing** | Each sub-schema's proxy validates `process.env` on **first property access** and `process.exit(1)`s with a formatted FATAL message if validation fails. This lazy-init pattern lets bundlers and prerender workers import sub-schema modules without env vars being set, as long as nothing actually reads a property.                                                                                                                                                                                                                             |
| **Delivery**          | How env vars reach `process.env` is **left to the developer** — four supported mechanisms are listed below. No mechanism is privileged or required.                                                                                                                                                                                                                                                                                                                                                                                                |
| **Working tree**      | **No `.env*` file may exist in the working tree.** `scripts/check-no-env-files.mjs` runs from the pre-commit hook and from the `check` Nx target (part of `npm run ci` / `ci:verify`) to enforce this. There is no `.env.example` — this document replaces it.                                                                                                                                                                                                                                                                                     |

---

## The Eight Sub-Schemas

Each domain owns a `<domain>.env.ts` file that exports four symbols via the `createEnvHandler` factory:

```ts
// apps/reference-app/src/api/config/db.env.ts (example shape)
import { z } from 'zod'
import { createEnvHandler } from './env-utils'

const DbEnvSchema = z.object({
	PG_CONNECTION_STRING: z.string().min(1),
	PG_TEST_CONNECTION_STRING: z.string().min(1).optional(),
})

export type DbEnv = z.infer<typeof DbEnvSchema>

const handler = createEnvHandler('db', DbEnvSchema, {
	PG_CONNECTION_STRING: 'postgresql://test:test@localhost:5432/test',
})

export const parseDbEnv = handler.parse
export const dbEnv = handler.proxy
export const seedDbEnv = handler.seed
export const resetDbEnv = handler.reset
```

| Symbol             | Type                       | Purpose                                                                                                                                                                                                                 |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parse<Domain>Env` | `(raw) => T`               | Parse an arbitrary input. Used by tests and entry-point scripts that want explicit validation control.                                                                                                                  |
| `<domain>Env`      | `Readonly<T>` (lazy Proxy) | The production consumption surface. First property access reads `process.env` and either caches the validated result or `process.exit(1)`s with a FATAL message.                                                        |
| `seed<Domain>Env`  | `(overrides?) => void`     | Test helper. Writes `parse({...testDefaults, ...overrides})` directly into the cache, bypassing `process.env`. Used by integration tests and `*.spec.ts` files that need specific values without mutating global state. |
| `reset<Domain>Env` | `() => void`               | Test helper. Clears the cache so the next `seed()` (or property access) re-runs from scratch. Use between cases in the same file when they need different seeds.                                                        |

### Variable Index

| Variable                                 | Sub-schema | Required    | Default                 | Notes                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ---------- | ----------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PG_CONNECTION_STRING`                   | `db`       | ✓           | —                       | Production Postgres connection string. Validated as non-empty string.                                                                                                                                                                                                                  |
| `PG_TEST_CONNECTION_STRING`              | `db`       | optional    | —                       | Connection string used by integration tests. Required only when running `npm run test:integration`.                                                                                                                                                                                    |
| `PASETO_SECRET_KEY`                      | `token`    | ✓           | —                       | 32-byte hex string (64 chars). Generate with `openssl rand -hex 32`.                                                                                                                                                                                                                   |
| `PASETO_ISSUER`                          | `token`    | ✓           | —                       | Issuer claim embedded in tokens. Free-form string.                                                                                                                                                                                                                                     |
| `PASETO_ACCESS_TOKEN_EXPIRY`             | `token`    | optional    | `'15m'`                 | Duration string. See `src/utils/duration.ts` for the parser.                                                                                                                                                                                                                           |
| `PASETO_REFRESH_TOKEN_EXPIRY`            | `token`    | optional    | `'7d'`                  | Duration string.                                                                                                                                                                                                                                                                       |
| `PASETO_CLOCK_TOLERANCE`                 | `token`    | optional    | `'1m'`                  | Duration string. Tolerance applied to `nbf`/`exp` claim validation.                                                                                                                                                                                                                    |
| `COOKIE_SECURE`                          | `token`    | optional    | `true`                  | Boolean. Defaults to `true` when unset (only the literal string `'false'` disables it). Set `COOKIE_SECURE=false` only for local dev over HTTP.                                                                                                                                        |
| `AUTH_MAX_FAILED_ATTEMPTS`               | `security` | optional    | `5`                     | Integer. Number of failed login attempts before lockout.                                                                                                                                                                                                                               |
| `AUTH_LOCKOUT_DURATION`                  | `security` | optional    | `'15m'`                 | Duration string.                                                                                                                                                                                                                                                                       |
| `AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW` | `security` | optional    | `'15m'`                 | Duration string. Rate-limit window for `POST /api/auth/change-password`. Falls back to default on an invalid duration.                                                                                                                                                                 |
| `AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX`    | `security` | optional    | `5`                     | Integer. Max change-password attempts per window per IP. Falls back to default on a non-positive or non-numeric value.                                                                                                                                                                 |
| `BCRYPT_COST`                            | `password` | optional    | `12`                    | Integer. Bcrypt cost factor for password hashing.                                                                                                                                                                                                                                      |
| `CRON_SECRET`                            | `cron`     | optional    | —                       | Shared secret authorizing the `/api/cron/*` endpoints. Optional in dev; **required** in any deployment that exposes cron routes.                                                                                                                                                       |
| `EMAIL_PROVIDER`                         | `email`    | optional    | `'nodemailer'`          | One of `'nodemailer' \| 'ethereal' \| 'noop'`. Determines which transport the container wires up at boot. `'nodemailer'` sends real email and requires `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`; set `'ethereal'` for a disposable test inbox (dev/test/CI) or `'noop'` to disable sending. |
| `SMTP_HOST`                              | `email`    | conditional | —                       | Required when `EMAIL_PROVIDER=nodemailer`. Cross-field-validated by `superRefine`.                                                                                                                                                                                                     |
| `SMTP_USER`                              | `email`    | conditional | —                       | Required when `EMAIL_PROVIDER=nodemailer`.                                                                                                                                                                                                                                             |
| `SMTP_PASS`                              | `email`    | conditional | —                       | Required when `EMAIL_PROVIDER=nodemailer`.                                                                                                                                                                                                                                             |
| `SMTP_PORT`                              | `email`    | optional    | `587`                   | Integer.                                                                                                                                                                                                                                                                               |
| `SMTP_SECURE`                            | `email`    | optional    | `'false'`               | Set to `'true'` for implicit TLS (port 465).                                                                                                                                                                                                                                           |
| `SMTP_FROM`                              | `email`    | optional    | `'noreply@example.com'` | RFC 5322 address.                                                                                                                                                                                                                                                                      |
| `BASE_HREF`                              | `http`     | optional    | `'/'`                   | Public base path of the deployed app.                                                                                                                                                                                                                                                  |
| `IS_SERVERLESS`                          | `http`     | optional    | `'false'`               | Set to `'true'` only on serverless platforms (e.g., Cloudflare Workers, AWS Lambda). Read via the `isServerless()` helper.                                                                                                                                                             |
| `PORT`                                   | `http`     | optional    | `4000`                  | Integer. Ignored when `IS_SERVERLESS=true`.                                                                                                                                                                                                                                            |
| `CORS_ORIGIN`                            | `http`     | optional    | —                       | Comma-separated list. When unset, the CORS middleware is not registered.                                                                                                                                                                                                               |
| `CORS_MAX_AGE`                           | `http`     | optional    | `86400`                 | Integer (seconds). Default derived from `'24h'` via `parseDurationToSeconds`.                                                                                                                                                                                                          |
| `NODE_ENV`                               | `app`      | optional    | `'development'`         | One of `'development' \| 'test' \| 'production'`.                                                                                                                                                                                                                                      |
| `APP_LANGUAGE`                           | `app`      | optional    | `'en'`                  | Default i18n language for the SSR-rendered shell.                                                                                                                                                                                                                                      |
| `INTEGRATION_TEST_ADMIN_PASSWORD`        | `app`      | conditional | —                       | Plain-text password for the seeded admin user. Required only when running `npm run test:integration`.                                                                                                                                                                                  |
| `SEED_ADMIN_EMAIL`                       | `app`      | conditional | —                       | Email for the admin user created by `npm run drizzle:seed`. Required together with `SEED_ADMIN_PASSWORD` when seeding non-interactively (no TTY); validated as a valid email. Otherwise prompted interactively.                                                                        |
| `SEED_ADMIN_PASSWORD`                    | `app`      | conditional | —                       | Password for the seeded admin. Required together with `SEED_ADMIN_EMAIL`. Must be 12–128 characters.                                                                                                                                                                                   |
| `SEED_ADMIN_FIRST_NAME`                  | `app`      | optional    | `'Admin'`               | First name for the seeded admin user.                                                                                                                                                                                                                                                  |
| `SEED_ADMIN_LAST_NAME`                   | `app`      | optional    | `'User'`                | Last name for the seeded admin user.                                                                                                                                                                                                                                                   |
| `TOKEN_CLEANUP_INTERVAL`                 | `cron`     | optional    | —                       | Duration string. When unset, the cleanup job uses its built-in default.                                                                                                                                                                                                                |
| `TOKEN_CLEANUP_BATCH_SIZE`               | `cron`     | optional    | —                       | Integer.                                                                                                                                                                                                                                                                               |
| `TOKEN_CLEANUP_MAX_BATCH_COUNT`          | `cron`     | optional    | —                       | Integer.                                                                                                                                                                                                                                                                               |

For exhaustive field definitions, defaults, refinements, and `.catch()` tolerance behavior, read the Zod schemas in `apps/reference-app/src/api/config/`. The schemas are the source of truth; this table is a navigational summary.

---

## Delivery Mechanisms

You only need **one** of these. Pick whichever fits your workflow. None is privileged; the contract is "values must be in `process.env` by the time the proxy is touched."

### 1. Out-of-tree env file + Node `--env-file`

Best for: terminal-driven development, scripts.

1. Create a file **outside** the working tree, e.g. `~/.env/angular-nx-starter` or `~/Projects/secrets/reference-app.env`.
2. Populate it with `KEY=value` lines (one per variable).
3. Pass it to Node via `--env-file`:

   ```bash
   node --env-file=$HOME/.env/angular-nx-starter ./dist/reference-app/server/server.mjs
   ```

4. For `npm` scripts that need the file, the repo provides `*:local` variants that take `--env-file=.env`. Since `.env` is forbidden in the working tree, you must point `--env-file` at the out-of-tree path yourself. Example:

   ```bash
   tsx --env-file=$HOME/.env/angular-nx-starter --tsconfig apps/reference-app/tsconfig.json ./apps/reference-app/src/db/seed.ts
   ```

### 2. IDE run configuration

Best for: WebStorm / VS Code / IntelliJ users who launch the app from a Run Configuration.

- **WebStorm:** Edit Configurations → your Node/npm config → Environment variables → paste `KEY=value;KEY=value`.
- **VS Code:** `.vscode/launch.json` → add an `env` object on the launch config.

The IDE injects the variables before `node` starts, so the proxy sees them on first access.

### 3. Shell session export

Best for: ephemeral overrides, one-off `npm run` invocations.

```bash
export PG_CONNECTION_STRING="postgresql://..."
export PASETO_SECRET_KEY="$(openssl rand -hex 32)"
export PASETO_ISSUER="local-dev"
npm run dev
```

The exports last for the shell session only.

### 4. direnv

Best for: per-directory automation. Requires [`direnv`](https://direnv.net/) installed.

1. Create a `.envrc` file at the repo root (this name is NOT matched by the `.env*` guard — `.envrc` is fine).
2. Populate it with `export KEY=value` lines.
3. Run `direnv allow` once per `.envrc` change.

direnv loads/unloads the variables automatically when you `cd` in and out of the directory.

### Script fail-fast behavior

The database entry-point scripts — `drizzle:create-migrations`, `drizzle:push-migrations`, `drizzle:seed`, and `sync:permissions` — and the migration runner's `drizzle.config.ts` all read `PG_CONNECTION_STRING` through the `dbEnv` proxy (`@config/db.env`). The `drizzle-kit` scripts run through `tsx --tsconfig apps/reference-app/tsconfig.json` so the `@config/*` alias resolves. If `PG_CONNECTION_STRING` is missing or empty when you run one of these scripts, the proxy prints a formatted `FATAL: Environment validation failed (db domain)` message and exits with code `1` **at boot** — before any Drizzle or Postgres connection is attempted — instead of failing several lines later with a confusing connection error. This is the most common first-time setup snag for `npm run drizzle:seed`: deliver `PG_CONNECTION_STRING` via one of the four mechanisms above before running it. `npm install` does **not** run any database script (the `postinstall` hook only sets up Claude Code skills), so a bare install never hits this — run `npm run drizzle:push-migrations` then `npm run drizzle:seed` explicitly after configuring your environment.

`npm run drizzle:seed` additionally needs admin credentials: set `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` (see the Variable Index), or run it in an interactive terminal to be prompted (masked password). With neither env values nor a TTY, the seed exits `1` with a clear message rather than creating a default-credential admin.

---

## Test-Time Behavior

Unit tests, component tests, and integration tests **never read `process.env` directly**. They consume the proxy via `seed<Domain>Env(overrides?)`:

```ts
import { seedTokenEnv, resetTokenEnv } from '@config/token.env'

describe('TokenService', () => {
	beforeEach(() => {
		resetTokenEnv()
		seedTokenEnv({ PASETO_SECRET_KEY: '0'.repeat(64), PASETO_ISSUER: 'test' })
	})
	// ...
})
```

Schemas with no required fields seed just as easily — e.g. password-hashing tests lower the bcrypt cost:

```ts
import { seedPasswordEnv, resetPasswordEnv } from '@config/password.env'

describe('createPasswordHasher', () => {
	beforeEach(() => {
		resetPasswordEnv()
		seedPasswordEnv({ BCRYPT_COST: '1' }) // keep hashing cheap in tests
	})
	// ...
})
```

Each sub-schema is instantiated with a `testDefaults` object that minimally satisfies its required fields. Calling `seed()` with no args writes `parse(testDefaults)` into the cache, so tests don't need to repeat the same baseline.

The test-setup files (`apps/**/src/test-setup.ts` and `apps/**/src/api/integration/setup/**`) are the only non-`@config` files allowed to touch `process.env` directly — they bootstrap baseline values for tests that don't seed explicitly.

### Test-runner tuning (not part of the env contract)

A few variables tune the **test runner itself** rather than the application, so they live outside the eight Zod sub-schemas and are read directly in the (un-linted) Vitest/Playwright config files at the project root:

| Variable             | Read in                               | Default | Purpose                                                                                                                |
| -------------------- | ------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `VITEST_MAX_WORKERS` | `apps/reference-app/vitest.config.ts` | `2`     | Caps concurrent unit-test fork workers to bound peak memory. Raise it (e.g. to your core count) for faster local runs. |

These are optional developer conveniences with safe defaults — leaving them unset is fully supported. They are intentionally **not** added to the Variable Index above (that table is exclusively the backend runtime contract).

---

## Adding or Changing a Variable

1. Open the appropriate sub-schema (`apps/reference-app/src/api/config/<domain>.env.ts`).
2. Add the field to the Zod schema with the right validation, default, and `.catch()` tolerance.
3. If the field is required at boot but has a sane test stub, add it to the `testDefaults` argument of `createEnvHandler`.
4. Add a row to the Variable Index table above.
5. Consume the value via `<domain>Env.NEW_VAR` — **never** `process.env['NEW_VAR']`.
6. Add a spec case to `<domain>.env.spec.ts` covering the new field's validation behavior.
7. Do **not** create or commit a `.env*` file. If your local dev needs the new variable, add it to whichever delivery mechanism you use.

---

## Enforcement Summary

| Layer                            | What it checks                                                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zod schemas                      | Field presence, type, range, cross-field refinements (e.g. SMTP_HOST required when EMAIL_PROVIDER=nodemailer). Fail-fast at boot.                                                                                                                                 |
| `scripts/check-no-env-files.mjs` | Runs from pre-commit AND the `check` Nx target (part of `npm run ci` / `ci:verify`). Fails if any `.env*` file exists at repo root or under `apps/*`.                                                                                                             |
| `.gitignore`                     | Ignores `.env` and `.env.*` patterns as a second line of defense against accidental `git add -A`.                                                                                                                                                                 |
| `.claude/settings.json`          | Deny rules block AI coding agents from reading, writing, editing, or shell-creating `.env*` files.                                                                                                                                                                |
| ESLint                           | `no-restricted-syntax` rule in `eslint.config.mjs` blocks `process.env.X` / `process.env['X']` reads outside the allowlist (`apps/**/src/api/config/**`, `apps/**/src/test-setup.ts`, `apps/**/src/api/integration/**`). Fails `npm run lint` (and `npm run ci`). |
