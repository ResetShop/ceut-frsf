/**
 * Shared environment helpers for integration test setup files.
 * Used by both global-setup.ts (separate process) and integration-setup.ts (test process).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { seedCronEnv } from '../../config/cron.env'
import { seedDbEnv } from '../../config/db.env'
import { seedEmailEnv } from '../../config/email.env'
import { seedPasswordEnv } from '../../config/password.env'
import { seedTokenEnv } from '../../config/token.env'

/**
 * Parses a .env file and sets any missing keys on process.env.
 * Silently skips if the file is not found.
 *
 * This is the integration suite's single sanctioned .env delivery boundary: it writes arbitrary
 * keys into process.env so the domain proxies can read them. Per-domain consumption still happens
 * through those proxies, not here.
 */
export function loadEnvFile(): void {
	try {
		const envPath = resolve(process.cwd(), '.env')
		const envContent = readFileSync(envPath, 'utf-8')
		for (const line of envContent.split('\n')) {
			const trimmed = line.trim()
			if (!trimmed || trimmed.startsWith('#')) continue
			const eqIndex = trimmed.indexOf('=')
			if (eqIndex === -1) continue
			const key = trimmed.slice(0, eqIndex).trim()
			const value = trimmed.slice(eqIndex + 1).trim()
			if (!process.env[key]) {
				process.env[key] = value.replace(/^(['"])(.*)\1$/, '$2')
			}
		}
	} catch {
		// .env not found — rely on existing env vars
	}
}

export function getTestConnectionString(): string {
	// Read raw from process.env — not via dbEnv — because this runs before configureEnvVars seeds the
	// caches, and the dbEnv proxy parses its whole schema on first access (which requires
	// PG_CONNECTION_STRING, not yet seeded). This file is the env-delivery boundary, so a raw read is
	// appropriate here.
	const testConnectionString = process.env['PG_TEST_CONNECTION_STRING']
	if (!testConnectionString) {
		throw new Error(
			'PG_TEST_CONNECTION_STRING environment variable is required for integration tests. ' +
				'Set it in .env or export it before running tests.',
		)
	}
	return testConnectionString
}

/**
 * Seeds the domain env caches with integration-test fixtures (cheap bcrypt, no-op email, a
 * predictable PASETO key, short token expiries, an insecure cookie flag, a fixed cron secret) via
 * each schema's `seed*Env` API — the same Zod parse the proxies run, so types/defaults are identical.
 *
 * An operator-supplied PASETO key/issuer (from process.env, delivered via loadEnvFile or the shell)
 * is preferred over the test fallback. Seeding happens before any test request, so every proxy cache
 * is primed before its first handler access in a test.
 */
export function configureEnvVars(testConnectionString: string): void {
	seedDbEnv({
		PG_CONNECTION_STRING: testConnectionString,
		PG_TEST_CONNECTION_STRING: testConnectionString,
	})

	seedTokenEnv({
		// Prefer an operator-supplied PASETO key/issuer (delivered via loadEnvFile or the shell) over
		// the predictable test fallback — read raw here because this seeds the cache rather than reading it.
		PASETO_SECRET_KEY: process.env['PASETO_SECRET_KEY'] ?? 'a'.repeat(64),
		PASETO_ISSUER: process.env['PASETO_ISSUER'] ?? 'integration-test',
		PASETO_ACCESS_TOKEN_EXPIRY: '5m',
		PASETO_REFRESH_TOKEN_EXPIRY: '10m',
		COOKIE_SECURE: 'false',
	})

	seedEmailEnv({ EMAIL_PROVIDER: 'noop' })
	seedPasswordEnv({ BCRYPT_COST: '1' })
	// Keep in sync with TEST_CRON_SECRET in cleanup-tokens.integration.spec.ts.
	seedCronEnv({ CRON_SECRET: 'integration-cron-secret-0123456789abcdef' })
}
