import { workspaceRoot } from '@nx/devkit'
import { nxE2EPreset } from '@nx/playwright/preset'
import { defineConfig, devices } from '@playwright/test'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { e2eConnectionString } from './e2e/setup/test-db'

const __filename = fileURLToPath(import.meta.url)
dirname(__filename)
// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:3000'

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * `globalSetup` spins up the test database (embedded Postgres locally, or the CI postgres service
 * via `PG_TEST_CONNECTION_STRING`), pushes the schema, and seeds the fixture users. The `setup`
 * project then logs each fixture user in and captures their authenticated `storageState` before the
 * browser projects run (`dependencies: ['setup']`).
 */
export default defineConfig({
	...nxE2EPreset(__filename, { testDir: './e2e' }),
	globalSetup: './e2e/setup/global-setup.ts',
	globalTeardown: './e2e/setup/global-teardown.ts',
	// Navigation/redirect assertions after a login round-trip can exceed the 5s default on the slower
	// (firefox) project under a cold SSR dev server.
	expect: { timeout: 15_000 },
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		baseURL,
		// Pin the locale so text-based selectors resolve against the English translations.
		locale: 'en-US',
		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',
	},
	/* Run your local dev server before starting the tests */
	webServer: {
		command: 'nx run ceut-frsf:serve --port=3000',
		url: 'http://localhost:3000',
		// Never reuse an existing server: it could be pointed at the wrong (ambient) database. Always
		// start fresh with the test-DB env below.
		reuseExistingServer: false,
		cwd: workspaceRoot,
		// SSR dev-server cold start can take a while, especially in CI.
		timeout: 180_000,
		// Env for the dev-server CHILD process (distinct from configureE2eEnvVars(), which sets env on the
		// globalSetup/seed process). Forces the server onto the seeded test database (overriding any ambient
		// PG_CONNECTION_STRING) and onto test-friendly auth/email settings, kept in sync with env-helpers.ts.
		env: {
			PG_CONNECTION_STRING: e2eConnectionString(),
			PASETO_SECRET_KEY: process.env['PASETO_SECRET_KEY'] || 'a'.repeat(64),
			PASETO_ISSUER: process.env['PASETO_ISSUER'] || 'e2e-test',
			COOKIE_SECURE: 'false',
			EMAIL_PROVIDER: 'noop',
			BCRYPT_COST: '1',
		},
	},
	projects: [
		// Logs each fixture user in and writes their storageState JSON. Runs before the browser projects.
		{ name: 'setup', testMatch: /setup[\\/]auth-setup\.ts$/ },
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'] },
	],
})
