import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import crudGenerator from './index.ts'

describe('crud generator', () => {
	let tree: Tree

	beforeEach(() => {
		tree = createTreeWithEmptyWorkspace()
	})

	it('writes drizzle schema files under appRoot/src/db/schema', async () => {
		await crudGenerator(tree, { name: 'product', module: 'catalog', appRoot: 'apps/reference-app' })
		expect(tree.exists('apps/reference-app/src/db/schema/product.ts')).toBe(true)
	})

	it('writes backend module files under appRoot/src/api/modules/<module>/<name>', async () => {
		await crudGenerator(tree, { name: 'product', module: 'catalog', appRoot: 'apps/reference-app' })
		expect(tree.exists('apps/reference-app/src/api/modules/catalog/product/product.controller.ts')).toBe(true)
		expect(tree.exists('apps/reference-app/src/api/modules/catalog/product/product.repository.ts')).toBe(true)
		expect(tree.exists('apps/reference-app/src/api/modules/catalog/product/product.routes.ts')).toBe(true)
		expect(tree.exists('apps/reference-app/src/api/modules/catalog/product/product.service.ts')).toBe(true)
		expect(tree.exists('apps/reference-app/src/api/modules/catalog/product/interfaces.ts')).toBe(true)
	})

	it('writes api-provider files under appRoot/src/app/providers/<name>', async () => {
		await crudGenerator(tree, { name: 'product', module: 'catalog', appRoot: 'apps/reference-app' })
		expect(tree.exists('apps/reference-app/src/app/providers/product/product.ts')).toBe(true)
		expect(tree.exists('apps/reference-app/src/app/providers/product/product.interface.ts')).toBe(true)
		expect(tree.exists('apps/reference-app/src/app/providers/product/product.mock.ts')).toBe(true)
		expect(tree.exists('apps/reference-app/src/app/providers/product/product.provider.ts')).toBe(true)
	})

	it('writes store files under appRoot/src/app/store/<name>', async () => {
		await crudGenerator(tree, { name: 'product', module: 'catalog', appRoot: 'apps/reference-app' })
		expect(tree.exists('apps/reference-app/src/app/store/product/product.store.ts')).toBe(true)
		expect(tree.exists('apps/reference-app/src/app/store/product/product.store.spec.ts')).toBe(true)
		expect(tree.exists('apps/reference-app/src/app/store/product/product.types.ts')).toBe(true)
	})

	it('writes page files under appRoot/src/app/pages/dashboard/<name>', async () => {
		await crudGenerator(tree, { name: 'product', module: 'catalog', appRoot: 'apps/reference-app' })
		expect(tree.exists('apps/reference-app/src/app/pages/dashboard/product/product-list/product-list.ts')).toBe(true)
	})

	it('honours a non-default appRoot', async () => {
		await crudGenerator(tree, { name: 'order', module: 'commerce', appRoot: 'apps/shine' })
		expect(tree.exists('apps/shine/src/db/schema/order.ts')).toBe(true)
		expect(tree.exists('apps/shine/src/api/modules/commerce/order/order.controller.ts')).toBe(true)
		expect(tree.exists('apps/shine/src/app/providers/order/order.ts')).toBe(true)
	})

	it('falls back to apps/reference-app when appRoot is empty', async () => {
		await crudGenerator(tree, { name: 'tag', module: 'taxonomy', appRoot: '' })
		expect(tree.exists('apps/reference-app/src/db/schema/tag.ts')).toBe(true)
	})
})
