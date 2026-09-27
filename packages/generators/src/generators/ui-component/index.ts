import type { Tree } from '@nx/devkit'
import { generateFiles, joinPathFragments, logger, names } from '@nx/devkit'
import { resolveTemplateDir } from '../../utils/resolve-template-dir.ts'

interface UiComponentGeneratorSchema {
	name: string
	directory: string
	exportFromIndex: boolean
	inlineTemplate?: boolean
	inlineStyle?: boolean
}

const UI_INDEX_PATH = 'packages/ui/src/index.ts'

export default async function uiComponentGenerator(tree: Tree, schema: UiComponentGeneratorSchema) {
	const n = names(schema.name)
	const targetDir = joinPathFragments(schema.directory, n.fileName)
	// Default to inline for both — matches schema.json defaults and protects programmatic callers
	// (e.g. unit tests, future orchestrator generators) that omit the flags.
	const inlineTemplate = schema.inlineTemplate ?? true
	const inlineStyle = schema.inlineStyle ?? true

	generateFiles(tree, resolveTemplateDir(import.meta.url), targetDir, {
		name: n.fileName,
		className: n.className,
		fileName: n.fileName,
		inlineTemplate,
		inlineStyle,
	})

	if (!inlineTemplate) {
		tree.write(
			joinPathFragments(targetDir, `${n.fileName}.html`),
			'<!-- TODO: Replace with the component template -->\n',
		)
	}
	if (!inlineStyle) {
		tree.write(joinPathFragments(targetDir, `${n.fileName}.css`), '/* TODO: Add component styles */\n')
	}

	if (schema.exportFromIndex) {
		appendExportToIndex(tree, n.className, n.fileName)
	}

	logger.info(`[ui-component] Generated component at ${targetDir}`)
	if (schema.exportFromIndex) {
		logger.info(`[ui-component] Appended export to ${UI_INDEX_PATH}`)
	}
}

function appendExportToIndex(tree: Tree, className: string, fileName: string) {
	const exportLine = `export { ${className} } from './lib/${fileName}/${fileName}'`
	const existing = tree.read(UI_INDEX_PATH)?.toString('utf-8') ?? ''
	if (existing.includes(exportLine)) return

	const separator = existing.length === 0 || existing.endsWith('\n') ? '' : '\n'
	tree.write(UI_INDEX_PATH, `${existing}${separator}${exportLine}\n`)
}
