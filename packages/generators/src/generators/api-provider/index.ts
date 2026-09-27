import type { Tree } from '@nx/devkit'
import { generateFiles, joinPathFragments, names } from '@nx/devkit'
import { resolveTemplateDir } from '../../utils/resolve-template-dir.ts'

interface ApiProviderGeneratorSchema {
	name: string
	directory: string
}

export default async function apiProviderGenerator(tree: Tree, schema: ApiProviderGeneratorSchema) {
	const n = names(schema.name)
	const targetDir = joinPathFragments(schema.directory, n.fileName)

	const templateVars = {
		name: n.fileName,
		className: n.className,
		propertyName: n.propertyName,
		fileName: n.fileName,
	}

	generateFiles(tree, resolveTemplateDir(import.meta.url), targetDir, templateVars)
}
