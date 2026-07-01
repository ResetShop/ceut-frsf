/**
 * Environment helpers for the Playwright e2e setup. Runs in Playwright's globalSetup context, which
 * does NOT resolve the project's TS path aliases (`@config/*`, `@schema/*`, …) — so everything here
 * uses relative imports / direct `process.env` access only.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Parses a .env file at the workspace root and sets any missing keys on process.env.
 * Silently skips if the file is not found (CI provides the vars directly).
 */
export function loadEnvFile(): void {
	try {
		const envContent = readFileSync(resolve(process.cwd(), '.env'), 'utf-8')
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

/**
 * Points the app server at the test database and sets test-friendly auth/email defaults.
 * Deliberately leaves PASETO_ACCESS_TOKEN_EXPIRY at the server default so sessions stay valid
 * for the whole run; the token-refresh spec simulates expiry via route interception instead.
 */
export function configureE2eEnvVars(connectionString: string): void {
	process.env['PG_CONNECTION_STRING'] = connectionString
	if (!process.env['PASETO_SECRET_KEY']) {
		process.env['PASETO_SECRET_KEY'] = 'a'.repeat(64)
	}
	if (!process.env['PASETO_ISSUER']) {
		process.env['PASETO_ISSUER'] = 'e2e-test'
	}
	process.env['COOKIE_SECURE'] = 'false'
	process.env['EMAIL_PROVIDER'] = 'noop'
	process.env['BCRYPT_COST'] = '1'
}
