import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import uiComponentGenerator from './index.ts'

const DEFAULT_DIR = 'packages/ui/src/lib'
const INDEX_PATH = 'packages/ui/src/index.ts'

describe('ui-component generator', () => {
	let tree: Tree

	beforeEach(() => {
		tree = createTreeWithEmptyWorkspace()
		// Seed with an existing export so the duplicate-export guard has something to compare
		// against, and so we can verify the generator preserves pre-existing content on append.
		tree.write(INDEX_PATH, "export { Button } from './lib/button/button'\n")
	})

	it('writes the three component files at <directory>/<fileName>/', async () => {
		await uiComponentGenerator(tree, { name: 'tooltip', directory: DEFAULT_DIR, exportFromIndex: true })

		expect(tree.exists(`${DEFAULT_DIR}/tooltip/tooltip.ts`)).toBe(true)
		expect(tree.exists(`${DEFAULT_DIR}/tooltip/tooltip.spec.ts`)).toBe(true)
		expect(tree.exists(`${DEFAULT_DIR}/tooltip/tooltip.stories.ts`)).toBe(true)
	})

	it('substitutes className and fileName into the component file', async () => {
		await uiComponentGenerator(tree, { name: 'tooltip', directory: DEFAULT_DIR, exportFromIndex: true })

		const componentTs = tree.read(`${DEFAULT_DIR}/tooltip/tooltip.ts`)?.toString('utf-8') ?? ''
		expect(componentTs).toContain(`selector: 'app-tooltip'`)
		expect(componentTs).toContain('export class Tooltip {}')
		// Angular 22 uses OnPush by default, so the generated component omits the explicit strategy.
		expect(componentTs).not.toContain('ChangeDetectionStrategy')
		expect(componentTs).toContain('/* TODO: Add component styles */')
		expect(componentTs).toContain('standalone: true')
		expect(componentTs).not.toContain('<%=')
	})

	it('substitutes className and fileName into the spec file', async () => {
		await uiComponentGenerator(tree, { name: 'tooltip', directory: DEFAULT_DIR, exportFromIndex: true })

		const specTs = tree.read(`${DEFAULT_DIR}/tooltip/tooltip.spec.ts`)?.toString('utf-8') ?? ''
		expect(specTs).toContain(`import { Tooltip } from './tooltip'`)
		expect(specTs).toContain(`describe('Tooltip'`)
		expect(specTs).toContain('clearAllMocks()')
		expect(specTs).toContain('<app-tooltip>')
		expect(specTs).not.toContain('<%=')
	})

	it('substitutes className and fileName into the stories file and includes sourceState: shown', async () => {
		await uiComponentGenerator(tree, { name: 'tooltip', directory: DEFAULT_DIR, exportFromIndex: true })

		const storiesTs = tree.read(`${DEFAULT_DIR}/tooltip/tooltip.stories.ts`)?.toString('utf-8') ?? ''
		expect(storiesTs).toContain(`import type { Meta, StoryObj } from '@storybook/angular'`)
		expect(storiesTs).toContain(`import { Tooltip } from './tooltip'`)
		expect(storiesTs).toContain('component: Tooltip')
		expect(storiesTs).toContain(`title: 'Components/Tooltip'`)
		expect(storiesTs).toContain(`tags: ['autodocs']`)
		expect(storiesTs).toContain(`sourceState: 'shown'`)
		expect(storiesTs).not.toContain('<%=')
	})

	it('appends a named export to packages/ui/src/index.ts when exportFromIndex is true', async () => {
		await uiComponentGenerator(tree, { name: 'tooltip', directory: DEFAULT_DIR, exportFromIndex: true })

		const indexTs = tree.read(INDEX_PATH)?.toString('utf-8') ?? ''
		expect(indexTs).toContain(`export { Tooltip } from './lib/tooltip/tooltip'`)
		// Existing exports must be preserved.
		expect(indexTs).toContain(`export { Button } from './lib/button/button'`)
	})

	it('does not modify packages/ui/src/index.ts when exportFromIndex is false', async () => {
		const before = tree.read(INDEX_PATH)?.toString('utf-8') ?? ''

		await uiComponentGenerator(tree, { name: 'tooltip', directory: DEFAULT_DIR, exportFromIndex: false })

		const after = tree.read(INDEX_PATH)?.toString('utf-8') ?? ''
		expect(after).toBe(before)
	})

	it('does not append a duplicate export when the export line already exists', async () => {
		tree.write(
			INDEX_PATH,
			`export { Button } from './lib/button/button'\nexport { Tooltip } from './lib/tooltip/tooltip'\n`,
		)

		await uiComponentGenerator(tree, { name: 'tooltip', directory: DEFAULT_DIR, exportFromIndex: true })

		const indexTs = tree.read(INDEX_PATH)?.toString('utf-8') ?? ''
		// Count the number of times the Tooltip export line appears — must remain exactly one.
		const occurrences = indexTs.split(`export { Tooltip } from './lib/tooltip/tooltip'`).length - 1
		expect(occurrences).toBe(1)
	})

	it('kebab-cases compound names for both the path and the selector', async () => {
		await uiComponentGenerator(tree, { name: 'iconButton', directory: DEFAULT_DIR, exportFromIndex: true })

		expect(tree.exists(`${DEFAULT_DIR}/icon-button/icon-button.ts`)).toBe(true)

		const componentTs = tree.read(`${DEFAULT_DIR}/icon-button/icon-button.ts`)?.toString('utf-8') ?? ''
		expect(componentTs).toContain(`selector: 'app-icon-button'`)
		expect(componentTs).toContain('export class IconButton {}')

		const indexTs = tree.read(INDEX_PATH)?.toString('utf-8') ?? ''
		expect(indexTs).toContain(`export { IconButton } from './lib/icon-button/icon-button'`)
	})

	it('honours a non-default directory', async () => {
		await uiComponentGenerator(tree, { name: 'tooltip', directory: 'libs/widgets', exportFromIndex: false })

		expect(tree.exists('libs/widgets/tooltip/tooltip.ts')).toBe(true)
		expect(tree.exists(`${DEFAULT_DIR}/tooltip/tooltip.ts`)).toBe(false)
	})

	describe('inline vs external template/style flags', () => {
		it('defaults to inline template and inline styles when flags are omitted', async () => {
			await uiComponentGenerator(tree, { name: 'tooltip', directory: DEFAULT_DIR, exportFromIndex: false })

			const componentTs = tree.read(`${DEFAULT_DIR}/tooltip/tooltip.ts`)?.toString('utf-8') ?? ''
			expect(componentTs).toContain('template: `')
			expect(componentTs).toContain('styles: `')
			expect(componentTs).not.toContain('templateUrl:')
			expect(componentTs).not.toContain('styleUrl:')
			expect(tree.exists(`${DEFAULT_DIR}/tooltip/tooltip.html`)).toBe(false)
			expect(tree.exists(`${DEFAULT_DIR}/tooltip/tooltip.css`)).toBe(false)
		})

		it('emits a sibling .html file and uses templateUrl when inlineTemplate is false', async () => {
			await uiComponentGenerator(tree, {
				name: 'tooltip',
				directory: DEFAULT_DIR,
				exportFromIndex: false,
				inlineTemplate: false,
				inlineStyle: true,
			})

			const componentTs = tree.read(`${DEFAULT_DIR}/tooltip/tooltip.ts`)?.toString('utf-8') ?? ''
			expect(componentTs).toContain(`templateUrl: './tooltip.html'`)
			expect(componentTs).not.toContain('template: `')
			expect(componentTs).toContain('styles: `')

			expect(tree.exists(`${DEFAULT_DIR}/tooltip/tooltip.html`)).toBe(true)
			expect(tree.exists(`${DEFAULT_DIR}/tooltip/tooltip.css`)).toBe(false)
		})

		it('emits a sibling .css file and uses styleUrl when inlineStyle is false', async () => {
			await uiComponentGenerator(tree, {
				name: 'tooltip',
				directory: DEFAULT_DIR,
				exportFromIndex: false,
				inlineTemplate: true,
				inlineStyle: false,
			})

			const componentTs = tree.read(`${DEFAULT_DIR}/tooltip/tooltip.ts`)?.toString('utf-8') ?? ''
			expect(componentTs).toContain('template: `')
			expect(componentTs).toContain(`styleUrl: './tooltip.css'`)
			expect(componentTs).not.toContain('styles: `')

			expect(tree.exists(`${DEFAULT_DIR}/tooltip/tooltip.css`)).toBe(true)
			const cssBody = tree.read(`${DEFAULT_DIR}/tooltip/tooltip.css`)?.toString('utf-8') ?? ''
			expect(cssBody).toContain('/* TODO: Add component styles */')
		})

		it('emits both sidecar files when both flags are false', async () => {
			await uiComponentGenerator(tree, {
				name: 'tooltip',
				directory: DEFAULT_DIR,
				exportFromIndex: false,
				inlineTemplate: false,
				inlineStyle: false,
			})

			const componentTs = tree.read(`${DEFAULT_DIR}/tooltip/tooltip.ts`)?.toString('utf-8') ?? ''
			expect(componentTs).toContain(`templateUrl: './tooltip.html'`)
			expect(componentTs).toContain(`styleUrl: './tooltip.css'`)
			expect(componentTs).not.toContain('template: `')
			expect(componentTs).not.toContain('styles: `')

			expect(tree.exists(`${DEFAULT_DIR}/tooltip/tooltip.html`)).toBe(true)
			expect(tree.exists(`${DEFAULT_DIR}/tooltip/tooltip.css`)).toBe(true)
		})

		it('kebab-cases sidecar filenames for compound names', async () => {
			await uiComponentGenerator(tree, {
				name: 'iconButton',
				directory: DEFAULT_DIR,
				exportFromIndex: false,
				inlineTemplate: false,
				inlineStyle: false,
			})

			expect(tree.exists(`${DEFAULT_DIR}/icon-button/icon-button.html`)).toBe(true)
			expect(tree.exists(`${DEFAULT_DIR}/icon-button/icon-button.css`)).toBe(true)

			const componentTs = tree.read(`${DEFAULT_DIR}/icon-button/icon-button.ts`)?.toString('utf-8') ?? ''
			expect(componentTs).toContain(`templateUrl: './icon-button.html'`)
			expect(componentTs).toContain(`styleUrl: './icon-button.css'`)
		})

		it('produces an identical spec and stories file regardless of the inlineTemplate/inlineStyle flags', async () => {
			// The spec and stories templates depend only on className/fileName. Lock that in:
			// any future template edit that introduces flag dependence (e.g. an extra import
			// in the spec when external files are used) will break this test on purpose so
			// the change is intentional, not accidental.
			const combinations = [
				{ inlineTemplate: true, inlineStyle: true },
				{ inlineTemplate: true, inlineStyle: false },
				{ inlineTemplate: false, inlineStyle: true },
				{ inlineTemplate: false, inlineStyle: false },
			]

			const outputs = await Promise.all(
				combinations.map(async (flags) => {
					const localTree = createTreeWithEmptyWorkspace()
					await uiComponentGenerator(localTree, {
						name: 'tooltip',
						directory: DEFAULT_DIR,
						exportFromIndex: false,
						...flags,
					})
					return {
						spec: localTree.read(`${DEFAULT_DIR}/tooltip/tooltip.spec.ts`)?.toString('utf-8') ?? '',
						stories: localTree.read(`${DEFAULT_DIR}/tooltip/tooltip.stories.ts`)?.toString('utf-8') ?? '',
					}
				}),
			)

			const [first, ...rest] = outputs
			// Guard the reference value — if `first` is empty, the equality assertions below
			// would trivially pass on the other empty strings. Empty strings in `rest` are
			// caught by `expect(other.spec).toBe(first.spec)` when `first` is non-empty.
			expect(first.spec).not.toBe('')
			expect(first.stories).not.toBe('')
			for (const other of rest) {
				expect(other.spec).toBe(first.spec)
				expect(other.stories).toBe(first.stories)
			}
		})
	})
})
