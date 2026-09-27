import type { Tree } from '@nx/devkit'
import { joinPathFragments, logger, names } from '@nx/devkit'
import apiProviderGenerator from '../api-provider/index.ts'
import backendModuleGenerator from '../backend-module/index.ts'
import drizzleSchemaGenerator from '../drizzle-schema/index.ts'
import pageGenerator from '../page/index.ts'
import storeGenerator from '../store/index.ts'

interface CrudGeneratorSchema {
	name: string
	module: string
	appRoot: string
}

export default async function crudGenerator(tree: Tree, schema: CrudGeneratorSchema) {
	const n = names(schema.name)
	const appRoot = schema.appRoot || 'apps/reference-app'

	logger.info(`[crud] Orchestrating full CRUD slice for "${n.className}" in ${appRoot}...`)

	await drizzleSchemaGenerator(tree, {
		name: schema.name,
		directory: joinPathFragments(appRoot, 'src/db/schema'),
	})

	await backendModuleGenerator(tree, {
		name: schema.name,
		module: schema.module,
		directory: joinPathFragments(appRoot, 'src/api/modules'),
	})

	await apiProviderGenerator(tree, {
		name: schema.name,
		directory: joinPathFragments(appRoot, 'src/app/providers'),
	})

	await storeGenerator(tree, {
		name: schema.name,
		directory: joinPathFragments(appRoot, 'src/app/store'),
	})

	await pageGenerator(tree, {
		name: schema.name,
		withStore: false,
		withApiProvider: false,
		directory: joinPathFragments(appRoot, 'src/app/pages/dashboard'),
	})

	logger.info(`[crud] Done. Remember to:`)
	logger.info(`  1. Add the route to ${appRoot}/src/app/pages/dashboard/dashboard.routes.ts`)
	logger.info(`  2. Add navigation entry to the NavigationConfig`)
	logger.info(`  3. Register the Drizzle schema in the connector`)
}
