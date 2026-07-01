import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [nxViteTsPaths()],
	resolve: {
		alias: {
			'@contracts': 'apps/ceut-frsf/src/contracts',
			'@schema': 'apps/ceut-frsf/src/db/schema',
		},
	},
	test: {
		globals: true,
		environment: 'node',
		reporters: ['verbose'],
		globalSetup: ['apps/ceut-frsf/src/api/integration/setup/global-setup.ts'],
		setupFiles: ['apps/ceut-frsf/src/api/integration/setup/integration-setup.ts'],
		include: ['apps/ceut-frsf/src/api/integration/**/*.integration.spec.ts'],
		exclude: ['node_modules', 'dist', '.nx', 'coverage'],
		testTimeout: 30_000,
		// Give the worker's afterAll (which drains both DB pools) room to finish before
		// Vitest force-exits, so the worker can shut down its sockets cleanly.
		teardownTimeout: 30_000,
		fileParallelism: false,
	},
})
