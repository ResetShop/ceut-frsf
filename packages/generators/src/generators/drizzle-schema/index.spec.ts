import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import drizzleSchemaGenerator from './index.ts'

describe('drizzle-schema generator', () => {
	let tree: Tree

	beforeEach(() => {
		tree = createTreeWithEmptyWorkspace()
	})

	it('writes a single schema file directly under <directory>', async () => {
		await drizzleSchemaGenerator(tree, { name: 'product', directory: 'src/db/schema' })

		// drizzle-schema does NOT nest the file under a per-table directory —
		// the file lands directly under `directory`.
		expect(tree.exists('src/db/schema/product.ts')).toBe(true)
		expect(tree.exists('src/db/schema/product/product.ts')).toBe(false)
	})

	it('substitutes the propertyName form into pgTable identifier and exported names', async () => {
		await drizzleSchemaGenerator(tree, { name: 'product', directory: 'src/db/schema' })

		const schemaTs = tree.read('src/db/schema/product.ts')?.toString('utf-8') ?? ''
		expect(schemaTs).toContain(`export const product = pgTable('product', {`)
		expect(schemaTs).toContain('export const productRelations = relations(product, ({ many }) => ({')
		expect(schemaTs).toContain('export type Product = typeof product.$inferSelect')
		expect(schemaTs).toContain('export type NewProduct = typeof product.$inferInsert')
		expect(schemaTs).not.toContain('<%=')
	})

	it('uses kebab-case for the filename and camelCase for the pgTable identifier and exports', async () => {
		// Compound names must yield kebab-case file paths to match the rest of the
		// repository's file naming conventions (see other generators and the
		// existing schemas in `apps/reference-app/src/db/schema/`). Inside the
		// generated file, JS identifiers and the table-name string stay camelCase
		// because Drizzle ORM's standard convention is camelCase JS variables.
		await drizzleSchemaGenerator(tree, { name: 'orderLineItem', directory: 'src/db/schema' })

		expect(tree.exists('src/db/schema/order-line-item.ts')).toBe(true)
		expect(tree.exists('src/db/schema/orderLineItem.ts')).toBe(false)

		const schemaTs = tree.read('src/db/schema/order-line-item.ts')?.toString('utf-8') ?? ''
		expect(schemaTs).toContain(`export const orderLineItem = pgTable('orderLineItem', {`)
		expect(schemaTs).toContain('export const orderLineItemRelations = relations(orderLineItem')
		expect(schemaTs).toContain('export type OrderLineItem = typeof orderLineItem.$inferSelect')
		expect(schemaTs).not.toContain('<%=')
	})

	it('honours a non-default directory', async () => {
		await drizzleSchemaGenerator(tree, { name: 'product', directory: 'apps/foo/src/db/schema' })

		expect(tree.exists('apps/foo/src/db/schema/product.ts')).toBe(true)
		expect(tree.exists('src/db/schema/product.ts')).toBe(false)
	})
})
