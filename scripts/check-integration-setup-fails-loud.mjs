#!/usr/bin/env node
/**
 * Fails unless a broken integration-suite global setup makes the
 * `reference-app:test-integration` target exit non-zero.
 *
 * The integration gate is only meaningful if its exit code reflects the run:
 * a dependency that forces `process.exit(0)` (as `embedded-postgres`'s exit
 * hook does when left in place) turns every red run green without any test
 * or log line looking different. This script runs the real target twice with
 * a deliberately broken setup — once per database path — and requires both
 * runs to exit non-zero *and* to print the expected setup error, so a failure
 * for an unrelated reason (e.g. the Nx CLI itself erroring) is not mistaken
 * for a correctly propagated one.
 *
 * Scenarios:
 *   1. External-database path — `PG_TEST_CONNECTION_STRING` points at a port
 *      nothing listens on, so the schema push fails immediately.
 *   2. Embedded-Postgres path — no connection string and no
 *      `INTEGRATION_TEST_ADMIN_PASSWORD`, so a local cluster starts and base
 *      seeding fails.
 *
 * Run from the `test-integration-setup-guard` Nx target. It must not run
 * concurrently with `test-integration`: both embedded-Postgres runs sweep
 * each other's not-yet-started cluster directories.
 *
 * Exit codes: 0 = every broken run failed loudly, 1 = a broken run was masked.
 */
import { spawnSync } from 'node:child_process'

const TARGET_COMMAND = 'npx nx run reference-app:test-integration --skip-nx-cache'

const SCENARIOS = [
	{
		name: 'external database unreachable',
		env: {
			PG_TEST_CONNECTION_STRING: 'postgres://postgres:postgres@127.0.0.1:1/test_db',
			INTEGRATION_TEST_ADMIN_PASSWORD: 'unused-guard-password',
		},
		expectedOutput: 'ECONNREFUSED',
	},
	{
		name: 'embedded Postgres without INTEGRATION_TEST_ADMIN_PASSWORD',
		env: { PG_TEST_CONNECTION_STRING: undefined, INTEGRATION_TEST_ADMIN_PASSWORD: undefined },
		expectedOutput: 'INTEGRATION_TEST_ADMIN_PASSWORD environment variable is required',
	},
]

function buildEnv(overrides) {
	const env = { ...process.env }
	for (const [key, value] of Object.entries(overrides)) {
		if (value === undefined) {
			delete env[key]
		} else {
			env[key] = value
		}
	}
	return env
}

function runScenario({ name, env, expectedOutput }) {
	console.log(`[integration-setup-guard] Running scenario: ${name}`)
	const result = spawnSync(TARGET_COMMAND, {
		shell: true,
		encoding: 'utf8',
		env: buildEnv(env),
		maxBuffer: 64 * 1024 * 1024,
	})
	const output = `${result.stdout ?? ''}${result.stderr ?? ''}`

	if (result.error) {
		return `could not run the target: ${result.error.message}`
	}
	if (result.status === 0) {
		return 'the target exited 0 although the global setup failed — the failure was masked'
	}
	if (!output.includes(expectedOutput)) {
		console.error(output)
		return `the target exited ${result.status} but its output lacks "${expectedOutput}", so it failed for another reason`
	}
	console.log(`[integration-setup-guard] OK — exited ${result.status} with the expected setup error.`)
	return null
}

const failures = []
for (const scenario of SCENARIOS) {
	const failure = runScenario(scenario)
	if (failure) {
		failures.push(`${scenario.name}: ${failure}`)
	}
}

if (failures.length > 0) {
	console.error('FATAL: a broken integration setup did not fail the test-integration target:')
	for (const failure of failures) {
		console.error(`  - ${failure}`)
	}
	process.exit(1)
}
