import angular from '@analogjs/vite-plugin-angular'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import { searchForWorkspaceRoot } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [angular(), nxViteTsPaths()],
	test: {
		globals: true,
		environment: 'happy-dom',
		reporters: ['verbose'],
		setupFiles: ['src/test-setup.ts'],
		include: ['src/**/*.{test,spec}.ts', 'tools/**/*.spec.js'],
		exclude: ['node_modules', 'dist', '.nx', 'coverage', '**/node_modules/**', '**/dist/**', 'src/api/integration/**'],
		// Cap concurrent workers to bound peak memory of the unit-test run (CI runners
		// otherwise spin up CPUs-1 workers). `forks` is already Vitest's default pool;
		// `maxWorkers` is the Vitest 4 replacement for the removed `poolOptions.forks.maxForks`.
		// Override with VITEST_MAX_WORKERS (e.g. = core count) to trade memory for speed on a
		// workstation; see docs/environment-variables.md → Test-Time Behavior.
		pool: 'forks',
		maxWorkers: Number(process.env['VITEST_MAX_WORKERS']) || 2,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			reportsDirectory: './coverage/app',
			exclude: [
				'node_modules/',
				'src/test-setup.ts',
				'**/*.spec.ts',
				'**/*.test.ts',
				'**/*.stories.ts',
				'**/mocks/**',
				'**/*.config.ts',
				'**/main.ts',
				'**/main.server.ts',
				'**/server.ts',
			],
		},
	},
	server: {
		fs: {
			// Allow the monorepo root so cross-project `?raw` template imports
			// from packages/ui resolve. Angular 21.2's Vite pipeline scopes the
			// project root to apps/ceut-frsf, so a bare '.' no longer reaches
			// the sibling packages/* — searchForWorkspaceRoot finds the repo root.
			allow: [searchForWorkspaceRoot(process.cwd())],
		},
	},
	optimizeDeps: {
		exclude: ['dist'],
	},
	resolve: {
		alias: {
			'@contracts': '/src/contracts',
			'@components': '/src/app/components',
			'@config': '/src/api/config',
			'@configs': '/src/app/configs',
			'@directives': '/src/app/directives',
			'@domain': '/src/app/domain',
			'@guards': '/src/app/guards',
			'@interfaces': '/src/app/interfaces',
			'@mocks': '/src/app/mocks',
			'@models': '/src/app/models',
			'@pages': '/src/app/pages',
			'@providers': '/src/app/providers',
			'@store': '/src/app/store',
			'@utils': '/src/utils',
			'@schema': '/src/db/schema',
			'@test-utils': '/src/test-utils',
		},
	},
})
