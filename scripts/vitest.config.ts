import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	root: __dirname,
	plugins: [nxViteTsPaths()],
	test: {
		globals: true,
		environment: 'node',
		reporters: ['verbose'],
		include: ['lib/**/*.{test,spec}.ts'],
		exclude: ['node_modules', 'dist'],
	},
})
