import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	root: import.meta.dirname,
	plugins: [nxViteTsPaths()],
	test: {
		globals: true,
		environment: 'node',
		reporters: ['verbose'],
		include: ['src/**/*.{test,spec}.ts'],
		exclude: ['node_modules', 'dist'],
	},
})
