import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import apiProviderGenerator from './index.ts'

describe('api-provider generator', () => {
	let tree: Tree

	beforeEach(() => {
		tree = createTreeWithEmptyWorkspace()
	})

	it('writes the four api-provider files at <directory>/<fileName>', async () => {
		await apiProviderGenerator(tree, { name: 'product', directory: 'src/app/providers' })

		expect(tree.exists('src/app/providers/product/product.ts')).toBe(true)
		expect(tree.exists('src/app/providers/product/product.interface.ts')).toBe(true)
		expect(tree.exists('src/app/providers/product/product.mock.ts')).toBe(true)
		expect(tree.exists('src/app/providers/product/product.provider.ts')).toBe(true)
	})

	it('substitutes className into the interface file content', async () => {
		await apiProviderGenerator(tree, { name: 'product', directory: 'src/app/providers' })

		const interfaceTs = tree.read('src/app/providers/product/product.interface.ts')?.toString('utf-8') ?? ''
		expect(interfaceTs).toContain('export interface ProductApi')
		expect(interfaceTs).toContain(`export const ProductApi = new InjectionToken<ProductApi>('ProductApi')`)
		expect(interfaceTs).not.toContain('<%=')
	})

	it('substitutes className into the http-api implementation and provider files', async () => {
		await apiProviderGenerator(tree, { name: 'product', directory: 'src/app/providers' })

		const implTs = tree.read('src/app/providers/product/product.ts')?.toString('utf-8') ?? ''
		expect(implTs).toContain('export class HttpProductApi implements ProductApi')
		expect(implTs).toContain(`from './product.interface'`)
		expect(implTs).not.toContain('<%=')

		const providerTs = tree.read('src/app/providers/product/product.provider.ts')?.toString('utf-8') ?? ''
		expect(providerTs).toContain('export function provideProduct()')
		expect(providerTs).toContain('useExisting: HttpProductApi')
		expect(providerTs).not.toContain('<%=')
	})

	it('kebab-cases compound names for the file path and uses the resulting fileName in imports', async () => {
		await apiProviderGenerator(tree, { name: 'orderHistory', directory: 'src/app/providers' })

		expect(tree.exists('src/app/providers/order-history/order-history.ts')).toBe(true)
		expect(tree.exists('src/app/providers/order-history/order-history.interface.ts')).toBe(true)
		expect(tree.exists('src/app/providers/order-history/order-history.mock.ts')).toBe(true)
		expect(tree.exists('src/app/providers/order-history/order-history.provider.ts')).toBe(true)

		const mockTs = tree.read('src/app/providers/order-history/order-history.mock.ts')?.toString('utf-8') ?? ''
		expect(mockTs).toContain('export class InMemoryOrderHistoryApi implements OrderHistoryApi')
		expect(mockTs).toContain(`from './order-history.interface'`)
		expect(mockTs).not.toContain('<%=')
	})

	it('honours a non-default directory', async () => {
		await apiProviderGenerator(tree, { name: 'product', directory: 'libs/api' })

		expect(tree.exists('libs/api/product/product.ts')).toBe(true)
		expect(tree.exists('src/app/providers/product/product.ts')).toBe(false)
	})
})
