import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import appGenerator, { slugifyAppName } from './index.ts'

const REFERENCE_PROJECT_JSON = JSON.stringify(
	{
		name: 'reference-app',
		sourceRoot: 'apps/reference-app/src',
		tags: ['type:app', 'scope:starter'],
		targets: {
			build: { outputs: ['dist/reference-app'] },
			serve: { options: { buildTarget: 'reference-app:build' } },
		},
	},
	null,
	2,
)

const REFERENCE_INDEX_HTML = `<!doctype html>
<html>
	<head>
		<title>app</title>
	</head>
	<body>
		<app-root></app-root>
	</body>
</html>
`

const REFERENCE_MAIN_TS = `import './app'\nconst APP_ID = 'reference-app' // bootstrap identifier\nexport { APP_ID }\n`

const REFERENCE_INTEGRATION_CONFIG = `export default {
	test: {
		globalSetup: ['apps/reference-app/src/api/integration/setup/global-setup.ts'],
		include: ['apps/reference-app/src/api/integration/**/*.integration.spec.ts'],
	},
}
`

const REFERENCE_IMPORT_MIGRATION = `# Migration guide for upstream contributors\nThis document is starter-owned.\n`

function seedReferenceApp(tree: Tree, root = 'apps/reference-app'): void {
	tree.write(`${root}/project.json`, REFERENCE_PROJECT_JSON)
	tree.write(`${root}/src/index.html`, REFERENCE_INDEX_HTML)
	tree.write(`${root}/src/main.ts`, REFERENCE_MAIN_TS)
	tree.write(`${root}/vitest.integration.config.ts`, REFERENCE_INTEGRATION_CONFIG)
	tree.write(`${root}/IMPORT_MIGRATION.md`, REFERENCE_IMPORT_MIGRATION)
	// A binary-shaped file (no recognised text extension) — should be copied as-is.
	tree.write(`${root}/src/assets/logo.bin`, Buffer.from([0x00, 0xff, 0x42]))
}

describe('slugifyAppName', () => {
	it('lowercases and trims whitespace', () => {
		expect(slugifyAppName('  Shine  ')).toBe('shine')
	})

	it('replaces non-alphanumeric runs with single hyphens', () => {
		expect(slugifyAppName('My Cool App')).toBe('my-cool-app')
		expect(slugifyAppName('Foo--Bar__Baz')).toBe('foo-bar-baz')
	})

	it('strips leading and trailing hyphens', () => {
		expect(slugifyAppName('!!!Shine!!!')).toBe('shine')
	})

	it('returns an empty string when no alphanumerics are present', () => {
		expect(slugifyAppName('!!!')).toBe('')
	})
})

describe('app generator', () => {
	let tree: Tree

	beforeEach(() => {
		tree = createTreeWithEmptyWorkspace()
		seedReferenceApp(tree)
	})

	it('clones the reference app into apps/<slug> with the slug substituted into text files', async () => {
		await appGenerator(tree, { name: 'Shine' })

		expect(tree.exists('apps/shine/project.json')).toBe(true)
		expect(tree.exists('apps/shine/src/main.ts')).toBe(true)

		const projectJson = tree.read('apps/shine/project.json')?.toString('utf-8') ?? ''
		expect(projectJson).toContain('"name": "shine"')
		expect(projectJson).toContain('"sourceRoot": "apps/shine/src"')
		expect(projectJson).toContain('dist/shine')
		expect(projectJson).toContain('shine:build')
		expect(projectJson).not.toContain('reference-app')

		const mainTs = tree.read('apps/shine/src/main.ts')?.toString('utf-8') ?? ''
		expect(mainTs).toContain(`const APP_ID = 'shine'`)
	})

	it('rewrites the index.html title to the human-readable display name', async () => {
		await appGenerator(tree, { name: 'Shine' })
		const html = tree.read('apps/shine/src/index.html')?.toString('utf-8') ?? ''
		expect(html).toContain('<title>Shine</title>')
		expect(html).not.toContain('<title>app</title>')
	})

	it('preserves the canonical reference-app untouched', async () => {
		await appGenerator(tree, { name: 'Shine' })
		expect(tree.exists('apps/reference-app/project.json')).toBe(true)
		const refProjectJson = tree.read('apps/reference-app/project.json')?.toString('utf-8') ?? ''
		expect(refProjectJson).toContain('"name": "reference-app"')
	})

	it('copies binary files byte-for-byte without text rewriting', async () => {
		await appGenerator(tree, { name: 'Shine' })
		const copied = tree.read('apps/shine/src/assets/logo.bin')
		expect(copied).toBeDefined()
		expect(Array.from(copied ?? Buffer.alloc(0))).toEqual([0x00, 0xff, 0x42])
	})

	it('slugifies multi-word display names', async () => {
		await appGenerator(tree, { name: 'My Cool App' })
		expect(tree.exists('apps/my-cool-app/project.json')).toBe(true)
	})

	it('throws when the target directory already exists (idempotency guard)', async () => {
		tree.write('apps/shine/.placeholder', '')
		await expect(appGenerator(tree, { name: 'Shine' })).rejects.toThrow(/already exists/i)
	})

	it('throws when the source reference-app does not exist', async () => {
		const emptyTree = createTreeWithEmptyWorkspace()
		await expect(appGenerator(emptyTree, { name: 'Shine' })).rejects.toThrow(/does not exist/i)
	})

	it('rejects an empty name', async () => {
		await expect(appGenerator(tree, { name: '' })).rejects.toThrow(/--name is required/i)
	})

	it('rejects a name that produces no slug', async () => {
		await expect(appGenerator(tree, { name: '!!!' })).rejects.toThrow(/at least one alphanumeric/i)
	})

	it('rejects naming the new app reference-app', async () => {
		await expect(appGenerator(tree, { name: 'reference-app' })).rejects.toThrow(/canonical template/i)
	})

	it('rejects reserved slugs that would collide with tooling', async () => {
		await expect(appGenerator(tree, { name: 'node' })).rejects.toThrow(/reserved slug/i)
		await expect(appGenerator(tree, { name: 'dist' })).rejects.toThrow(/reserved slug/i)
	})

	it('rewrites scope:starter to scope:app in the generated project.json tags', async () => {
		await appGenerator(tree, { name: 'Shine' })
		const projectJson = tree.read('apps/shine/project.json')?.toString('utf-8') ?? ''
		const parsed = JSON.parse(projectJson) as { tags: string[] }
		expect(parsed.tags).toContain('type:app')
		expect(parsed.tags).toContain('scope:app')
		expect(parsed.tags).not.toContain('scope:starter')
	})

	it('does not copy the starter-owned IMPORT_MIGRATION.md into generated apps', async () => {
		await appGenerator(tree, { name: 'Shine' })
		expect(tree.exists('apps/shine/IMPORT_MIGRATION.md')).toBe(false)
	})

	it('rewrites paths inside vitest.integration.config.ts', async () => {
		await appGenerator(tree, { name: 'Shine' })
		const config = tree.read('apps/shine/vitest.integration.config.ts')?.toString('utf-8') ?? ''
		expect(config).toContain('apps/shine/src/api/integration/setup/global-setup.ts')
		expect(config).not.toContain('reference-app')
	})

	it('honours a non-default directory option', async () => {
		const customTree = createTreeWithEmptyWorkspace()
		seedReferenceApp(customTree, 'workspace/reference-app')
		await appGenerator(customTree, { name: 'Shine', directory: 'workspace' })
		expect(customTree.exists('workspace/shine/project.json')).toBe(true)
		expect(customTree.exists('workspace/reference-app/project.json')).toBe(true)
	})

	it('escapes HTML special characters in the index.html title', async () => {
		await appGenerator(tree, { name: 'Foo & <Bar>' })
		const html = tree.read('apps/foo-bar/src/index.html')?.toString('utf-8') ?? ''
		expect(html).toContain('<title>Foo &amp; &lt;Bar&gt;</title>')
	})
})
