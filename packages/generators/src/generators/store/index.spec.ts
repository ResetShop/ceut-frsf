import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import storeGenerator from './index.ts'

describe('store generator', () => {
	let tree: Tree

	beforeEach(() => {
		tree = createTreeWithEmptyWorkspace()
	})

	it('writes the three store files at <directory>/<fileName>', async () => {
		await storeGenerator(tree, { name: 'product', directory: 'src/app/store' })

		expect(tree.exists('src/app/store/product/product.store.ts')).toBe(true)
		expect(tree.exists('src/app/store/product/product.store.spec.ts')).toBe(true)
		expect(tree.exists('src/app/store/product/product.types.ts')).toBe(true)
	})

	it('substitutes className into the store file content', async () => {
		await storeGenerator(tree, { name: 'product', directory: 'src/app/store' })

		const storeTs = tree.read('src/app/store/product/product.store.ts')?.toString('utf-8') ?? ''
		expect(storeTs).toContain('export const ProductStore = signalStore(')
		expect(storeTs).toContain('initialProductState')
		expect(storeTs).toContain('ProductReadError')
		expect(storeTs).toContain('ProductMutationError')
		// EJS placeholders must be fully replaced — none should leak into the output.
		expect(storeTs).not.toContain('<%=')
	})

	it('substitutes className and import path into the generated spec file', async () => {
		await storeGenerator(tree, { name: 'product', directory: 'src/app/store' })

		const specTs = tree.read('src/app/store/product/product.store.spec.ts')?.toString('utf-8') ?? ''
		expect(specTs).toContain(`import { ProductStore } from './product.store'`)
		expect(specTs).toContain(`describe('ProductStore'`)
		expect(specTs).toContain('let store: InstanceType<typeof ProductStore>')
		expect(specTs).not.toContain('<%=')
	})

	it('substitutes className and structures into the types file content', async () => {
		await storeGenerator(tree, { name: 'product', directory: 'src/app/store' })

		const typesTs = tree.read('src/app/store/product/product.types.ts')?.toString('utf-8') ?? ''
		expect(typesTs).toContain('export interface ProductReadError')
		expect(typesTs).toContain('export interface ProductMutationError')
		expect(typesTs).toContain('export interface ProductState')
		expect(typesTs).toContain('export const initialProductState: ProductState')
		expect(typesTs).not.toContain('<%=')
	})

	it('kebab-cases compound names for the file path and substitutes the camelCase form into content', async () => {
		await storeGenerator(tree, { name: 'productCatalog', directory: 'src/app/store' })

		expect(tree.exists('src/app/store/product-catalog/product-catalog.store.ts')).toBe(true)
		expect(tree.exists('src/app/store/product-catalog/product-catalog.types.ts')).toBe(true)

		const storeTs = tree.read('src/app/store/product-catalog/product-catalog.store.ts')?.toString('utf-8') ?? ''
		expect(storeTs).toContain('ProductCatalogStore')
		expect(storeTs).toContain('initialProductCatalogState')
		// The import of the types module uses the kebab-case file name, not the camelCase identifier.
		expect(storeTs).toContain(`from './product-catalog.types'`)
	})

	it('honours a non-default directory', async () => {
		await storeGenerator(tree, { name: 'product', directory: 'libs/state' })

		expect(tree.exists('libs/state/product/product.store.ts')).toBe(true)
		expect(tree.exists('src/app/store/product/product.store.ts')).toBe(false)
	})

	it('accepts the optional project field without affecting file paths', async () => {
		await storeGenerator(tree, { name: 'product', directory: 'src/app/store', project: 'reference-app' })

		// `project` is declared in schema.json but currently unused by index.ts —
		// passing it must not crash and must not change where files land.
		expect(tree.exists('src/app/store/product/product.store.ts')).toBe(true)
	})
})
