import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import pageGenerator from './index.ts'

const DEFAULT_DIR = 'src/app/pages/dashboard'

describe('page generator', () => {
	let tree: Tree

	beforeEach(() => {
		tree = createTreeWithEmptyWorkspace()
	})

	it('writes the list page files at <directory>/<fileName>/<fileName>-list/ when both flags are off', async () => {
		await pageGenerator(tree, {
			name: 'product',
			directory: DEFAULT_DIR,
			withApiProvider: false,
			withStore: false,
		})

		expect(tree.exists(`${DEFAULT_DIR}/product/product-list/product-list.ts`)).toBe(true)
		expect(tree.exists(`${DEFAULT_DIR}/product/product-list/product-list.spec.ts`)).toBe(true)
	})

	it('does NOT generate provider or store files when both flags are off', async () => {
		await pageGenerator(tree, {
			name: 'product',
			directory: DEFAULT_DIR,
			withApiProvider: false,
			withStore: false,
		})

		// Sub-generators must not run when their flag is false.
		expect(tree.exists('src/app/providers/product/product.ts')).toBe(false)
		expect(tree.exists('src/app/store/product/product.store.ts')).toBe(false)
	})

	it('substitutes className and fileName into the page component content', async () => {
		await pageGenerator(tree, {
			name: 'product',
			directory: DEFAULT_DIR,
			withApiProvider: false,
			withStore: false,
		})

		const pageTs = tree.read(`${DEFAULT_DIR}/product/product-list/product-list.ts`)?.toString('utf-8') ?? ''
		expect(pageTs).toContain(`selector: 'app-product-list'`)
		expect(pageTs).toContain(`[title]="'Product'"`)
		expect(pageTs).toContain('export default class ProductList')
		expect(pageTs).not.toContain('<%=')
	})

	it('substitutes className into the page spec content', async () => {
		await pageGenerator(tree, {
			name: 'product',
			directory: DEFAULT_DIR,
			withApiProvider: false,
			withStore: false,
		})

		const pageSpec = tree.read(`${DEFAULT_DIR}/product/product-list/product-list.spec.ts`)?.toString('utf-8') ?? ''
		expect(pageSpec).toContain(`import ProductList from './product-list'`)
		expect(pageSpec).toContain(`describe('ProductList'`)
		expect(pageSpec).not.toContain('<%=')
	})

	it('also generates the api-provider files at <directory>/../../providers/<fileName>/ when withApiProvider is true', async () => {
		await pageGenerator(tree, {
			name: 'product',
			directory: DEFAULT_DIR,
			withApiProvider: true,
			withStore: false,
		})

		// `joinPathFragments(directory, '../../providers')` resolves the `../../`
		// segments away — the provider files land at `src/app/providers/product/`.
		expect(tree.exists('src/app/providers/product/product.ts')).toBe(true)
		expect(tree.exists('src/app/providers/product/product.interface.ts')).toBe(true)
		expect(tree.exists('src/app/providers/product/product.mock.ts')).toBe(true)
		expect(tree.exists('src/app/providers/product/product.provider.ts')).toBe(true)
	})

	it('also generates the store files at <directory>/../../store/<fileName>/ when withStore is true', async () => {
		await pageGenerator(tree, {
			name: 'product',
			directory: DEFAULT_DIR,
			withApiProvider: false,
			withStore: true,
		})

		expect(tree.exists('src/app/store/product/product.store.ts')).toBe(true)
		expect(tree.exists('src/app/store/product/product.types.ts')).toBe(true)
	})

	it('generates page, provider, and store when both flags are true', async () => {
		await pageGenerator(tree, {
			name: 'product',
			directory: DEFAULT_DIR,
			withApiProvider: true,
			withStore: true,
		})

		expect(tree.exists(`${DEFAULT_DIR}/product/product-list/product-list.ts`)).toBe(true)
		expect(tree.exists('src/app/providers/product/product.ts')).toBe(true)
		expect(tree.exists('src/app/store/product/product.store.ts')).toBe(true)
	})

	it('uses kebab-case for both the outer page directory and the inner __name__-list/ template dir', async () => {
		// Compound names yield kebab-case for the entire generated path, matching
		// the rest of the workspace's file naming conventions:
		// - Outer dir: `joinPathFragments(directory, n.fileName)` → kebab-case.
		// - Inner `__name__-list/` template-dir placeholder: also kebab-case via
		//   `name: n.fileName` in `page/index.ts` (the `name` key drives the
		//   template-dir placeholder, so it must be the kebab-case `fileName`).
		// Inside the template, `<%= className %>` and `<%= fileName %>` continue
		// to resolve correctly because they're independent of the `name` key.
		await pageGenerator(tree, {
			name: 'orderHistory',
			directory: DEFAULT_DIR,
			withApiProvider: false,
			withStore: false,
		})

		expect(tree.exists(`${DEFAULT_DIR}/order-history/order-history-list/order-history-list.ts`)).toBe(true)
		expect(tree.exists(`${DEFAULT_DIR}/order-history/order-history-list/order-history-list.spec.ts`)).toBe(true)
		expect(tree.exists(`${DEFAULT_DIR}/order-history/orderHistory-list/orderHistory-list.ts`)).toBe(false)

		const pageTs =
			tree.read(`${DEFAULT_DIR}/order-history/order-history-list/order-history-list.ts`)?.toString('utf-8') ?? ''
		expect(pageTs).toContain(`selector: 'app-order-history-list'`)
		expect(pageTs).toContain(`[title]="'OrderHistory'"`)
		expect(pageTs).toContain('export default class OrderHistoryList')
		expect(pageTs).not.toContain('<%=')
	})

	it('honours a non-default directory and resolves the provider/store siblings via fixed `../../` segments', async () => {
		// Surfaced behaviour: the page generator computes provider/store paths as
		// `joinPathFragments(directory, '../../providers')` and `'../../store'`
		// — a literal two-level walk-up from the page directory. That works for
		// the default `src/app/pages/dashboard` (whose `../../` is `src/app/`),
		// but for a shallower `src/app/admin` the two levels resolve to `src/`.
		// This is a real generator coupling to the default directory depth. The
		// test asserts actual emitted output to lock in the current behaviour and
		// surface the regression risk if anyone changes the path math.
		await pageGenerator(tree, {
			name: 'product',
			directory: 'src/app/admin',
			withApiProvider: true,
			withStore: true,
		})

		expect(tree.exists('src/app/admin/product/product-list/product-list.ts')).toBe(true)
		expect(tree.exists('src/providers/product/product.ts')).toBe(true)
		expect(tree.exists('src/store/product/product.store.ts')).toBe(true)
	})
})
