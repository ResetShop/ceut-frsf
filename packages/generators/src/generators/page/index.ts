import type { Tree } from '@nx/devkit'
import { generateFiles, joinPathFragments, logger, names } from '@nx/devkit'
import { resolveTemplateDir } from '../../utils/resolve-template-dir.ts'
import apiProviderGenerator from '../api-provider/index.ts'
import storeGenerator from '../store/index.ts'

interface PageGeneratorSchema {
	name: string
	route?: string
	withStore: boolean
	withApiProvider: boolean
	directory: string
}

export default async function pageGenerator(tree: Tree, schema: PageGeneratorSchema) {
	const n = names(schema.name)
	const targetDir = joinPathFragments(schema.directory, n.fileName)

	generateFiles(tree, resolveTemplateDir(import.meta.url), targetDir, {
		name: n.fileName,
		className: n.className,
		fileName: n.fileName,
	})

	if (schema.withApiProvider) {
		await apiProviderGenerator(tree, {
			name: schema.name,
			directory: joinPathFragments(schema.directory, '../../providers'),
		})
	}

	if (schema.withStore) {
		await storeGenerator(tree, {
			name: schema.name,
			directory: joinPathFragments(schema.directory, '../../store'),
		})
	}

	const route = schema.route || n.fileName
	logger.info(`[page] Generated page at ${targetDir}`)
	logger.info(`[page] Add this route to dashboard.routes.ts:`)
	logger.info(
		`  { path: '${route}', loadComponent: () => import('./${n.fileName}/${n.fileName}-list/${n.fileName}-list') }`,
	)
}
