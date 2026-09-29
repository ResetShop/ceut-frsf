import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import backendModuleGenerator from './index.ts'

describe('backend-module generator', () => {
	let tree: Tree

	beforeEach(() => {
		tree = createTreeWithEmptyWorkspace()
	})

	it('writes the five module files under <directory>/<module>/<fileName> when module is provided', async () => {
		await backendModuleGenerator(tree, { name: 'product', module: 'catalog', directory: 'src/api/modules' })

		expect(tree.exists('src/api/modules/catalog/product/product.controller.ts')).toBe(true)
		expect(tree.exists('src/api/modules/catalog/product/product.repository.ts')).toBe(true)
		expect(tree.exists('src/api/modules/catalog/product/product.routes.ts')).toBe(true)
		expect(tree.exists('src/api/modules/catalog/product/product.service.ts')).toBe(true)
		expect(tree.exists('src/api/modules/catalog/product/interfaces.ts')).toBe(true)
	})

	it('writes the five module files under <directory>/<fileName> when module is empty', async () => {
		await backendModuleGenerator(tree, { name: 'product', module: '', directory: 'src/api/modules' })

		expect(tree.exists('src/api/modules/product/product.controller.ts')).toBe(true)
		expect(tree.exists('src/api/modules/product/product.repository.ts')).toBe(true)
		expect(tree.exists('src/api/modules/product/product.routes.ts')).toBe(true)
		expect(tree.exists('src/api/modules/product/product.service.ts')).toBe(true)
		expect(tree.exists('src/api/modules/product/interfaces.ts')).toBe(true)
		// Confirm the module-named parent directory is NOT created.
		expect(tree.exists('src/api/modules/catalog/product/product.controller.ts')).toBe(false)
	})

	it('substitutes className and propertyName into the controller content', async () => {
		await backendModuleGenerator(tree, { name: 'product', module: 'catalog', directory: 'src/api/modules' })

		const controllerTs = tree.read('src/api/modules/catalog/product/product.controller.ts')?.toString('utf-8') ?? ''
		expect(controllerTs).toContain(`from './product.routes'`)
		expect(controllerTs).toContain('getProductRoute')
		expect(controllerTs).toContain('listProductsRoute')
		expect(controllerTs).toContain('productService')
		expect(controllerTs).toContain(`'Product not found'`)
		expect(controllerTs).not.toContain('<%=')
	})

	it('substitutes className into the repository class declaration', async () => {
		await backendModuleGenerator(tree, { name: 'product', module: 'catalog', directory: 'src/api/modules' })

		const repoTs = tree.read('src/api/modules/catalog/product/product.repository.ts')?.toString('utf-8') ?? ''
		expect(repoTs).toContain(
			'export class DrizzleProductRepository extends BaseRepository implements ProductRepository',
		)
		expect(repoTs).toContain('ListProductsParams')
		expect(repoTs).not.toContain('<%=')
	})

	it('substitutes className, propertyName, and route metadata into the routes file', async () => {
		await backendModuleGenerator(tree, { name: 'product', module: 'catalog', directory: 'src/api/modules' })

		const routesTs = tree.read('src/api/modules/catalog/product/product.routes.ts')?.toString('utf-8') ?? ''
		expect(routesTs).toContain('export const listProductsRoute = createRoute(')
		expect(routesTs).toContain('export const getProductRoute = createRoute(')
		expect(routesTs).toContain('const productDataSchema = z.object(')
		expect(routesTs).toContain(`tags: ['Products']`)
		expect(routesTs).not.toContain('<%=')
	})

	it('substitutes className and propertyName into the service class', async () => {
		await backendModuleGenerator(tree, { name: 'product', module: 'catalog', directory: 'src/api/modules' })

		const serviceTs = tree.read('src/api/modules/catalog/product/product.service.ts')?.toString('utf-8') ?? ''
		expect(serviceTs).toContain('export class ProductService')
		expect(serviceTs).toContain('productRepository: ProductRepository')
		expect(serviceTs).toContain('public async getAllProducts(')
		expect(serviceTs).toContain('public async getProduct(')
		expect(serviceTs).not.toContain('<%=')
	})

	it('substitutes substitutions into interfaces.ts even though its filename has no __name__ placeholder', async () => {
		// `interfaces.ts.template` is the only template in this generator without
		// a `__name__` filename placeholder. generateFiles still strips `.template`
		// and applies EJS substitutions to its content.
		await backendModuleGenerator(tree, { name: 'product', module: 'catalog', directory: 'src/api/modules' })

		const interfacesTs = tree.read('src/api/modules/catalog/product/interfaces.ts')?.toString('utf-8') ?? ''
		expect(interfacesTs).toContain('export interface ListProductsParams')
		expect(interfacesTs).toContain('export interface ProductRepository')
		expect(interfacesTs).not.toContain('<%=')
	})

	it('kebab-cases compound names for the file path and substitutes the className into content', async () => {
		await backendModuleGenerator(tree, { name: 'orderHistory', module: '', directory: 'src/api/modules' })

		expect(tree.exists('src/api/modules/order-history/order-history.controller.ts')).toBe(true)

		const controllerTs = tree.read('src/api/modules/order-history/order-history.controller.ts')?.toString('utf-8') ?? ''
		expect(controllerTs).toContain('getOrderHistoryRoute')
		expect(controllerTs).toContain(`'OrderHistory not found'`)
	})

	it('honours a non-default directory', async () => {
		await backendModuleGenerator(tree, { name: 'order', module: '', directory: 'libs/api' })

		expect(tree.exists('libs/api/order/order.controller.ts')).toBe(true)
		expect(tree.exists('src/api/modules/order/order.controller.ts')).toBe(false)
	})
})
