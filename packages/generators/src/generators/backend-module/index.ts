import type { Tree } from '@nx/devkit'
import { generateFiles, joinPathFragments, names } from '@nx/devkit'
import { resolveTemplateDir } from '../../utils/resolve-template-dir.ts'

interface BackendModuleGeneratorSchema {
	name: string
	module: string
	directory: string
}

export default async function backendModuleGenerator(tree: Tree, schema: BackendModuleGeneratorSchema) {
	const n = names(schema.name)
	const targetDir = schema.module
		? joinPathFragments(schema.directory, schema.module, n.fileName)
		: joinPathFragments(schema.directory, n.fileName)

	const templateVars = {
		name: n.fileName,
		className: n.className,
		propertyName: n.propertyName,
		fileName: n.fileName,
	}

	generateFiles(tree, resolveTemplateDir(import.meta.url), targetDir, templateVars)
}
