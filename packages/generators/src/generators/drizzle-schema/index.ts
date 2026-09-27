import type { Tree } from '@nx/devkit'
import { generateFiles, names } from '@nx/devkit'
import { resolveTemplateDir } from '../../utils/resolve-template-dir.ts'

interface DrizzleSchemaGeneratorSchema {
	name: string
	directory: string
}

export default async function drizzleSchemaGenerator(tree: Tree, schema: DrizzleSchemaGeneratorSchema) {
	const n = names(schema.name)
	const targetDir = schema.directory

	generateFiles(tree, resolveTemplateDir(import.meta.url), targetDir, {
		name: n.fileName,
		className: n.className,
		propertyName: n.propertyName,
		fileName: n.fileName,
	})
}
