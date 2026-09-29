#!/usr/bin/env node
/**
 * Fails unless every `@resetshop/generators` generator runs under Nx as a native ES module.
 *
 * `packages/generators` is `"type": "module"`, so Nx loads each generator's `index.ts` through
 * Node's native TypeScript stripping as ESM. When that load fails — a type imported as a value, an
 * extensionless relative import, TypeScript syntax that cannot be stripped — Nx silently recompiles
 * the generator to CommonJS with swc/ts-node instead, and only says so under NX_VERBOSE_LOGGING.
 * A generator that only works through that fallback hides ESM bugs until someone hits them.
 *
 * This script dry-runs every generator with verbose logging and requires each run to exit 0,
 * to list at least one generated file, and to print no fallback notice.
 *
 * Exit codes: 0 = every generator loaded and ran as native ESM, 1 = at least one did not.
 */
import { spawnSync } from 'node:child_process'

const GENERATORS = [
	{ name: 'store', args: 'esm-probe' },
	{ name: 'api-provider', args: 'esm-probe' },
	{ name: 'drizzle-schema', args: 'esm-probe' },
	{ name: 'backend-module', args: 'esm-probe' },
	{ name: 'page', args: 'esm-probe' },
	{ name: 'ui-component', args: 'esm-probe' },
	{ name: 'crud', args: 'esm-probe' },
	{ name: 'app', args: '--name=Esm-Probe' },
]

// Nx logs one of these whenever it abandons native loading and registers tsconfig-paths or
// swc/ts-node for a file.
const FALLBACK_MARKERS = ['falling back to swc/ts-node', 'registering tsconfig-paths and retrying']

function checkGenerator({ name, args }) {
	const result = spawnSync(`npx nx g @resetshop/generators:${name} ${args} --dry-run --no-interactive`, {
		shell: true,
		encoding: 'utf8',
		env: { ...process.env, NX_VERBOSE_LOGGING: 'true', NX_NO_CLOUD: 'true' },
		maxBuffer: 64 * 1024 * 1024,
	})
	const output = `${result.stdout ?? ''}${result.stderr ?? ''}`

	if (result.error) {
		return `could not run the generator: ${result.error.message}`
	}
	if (result.status !== 0) {
		console.error(output)
		return `the dry run exited ${result.status}`
	}
	if (!output.includes('CREATE')) {
		console.error(output)
		return 'the dry run listed no generated files'
	}
	const marker = FALLBACK_MARKERS.find((m) => output.includes(m))
	if (marker) {
		console.error(output)
		return `Nx fell back from native ESM loading ("${marker}")`
	}
	return null
}

const failures = []
for (const generator of GENERATORS) {
	const failure = checkGenerator(generator)
	if (failure) {
		failures.push(`${generator.name}: ${failure}`)
	} else {
		console.log(`[generators-esm-guard] OK — ${generator.name} ran as native ESM.`)
	}
}

if (failures.length > 0) {
	console.error('FATAL: generator(s) did not run as native ES modules under Nx:')
	for (const failure of failures) {
		console.error(`  - ${failure}`)
	}
	process.exit(1)
}
