import { fileURLToPath } from 'node:url'

/**
 * Returns the absolute path of the `files` template directory that sits next to a generator.
 *
 * Generators run as native ES modules, where `__dirname` does not exist, so each generator passes
 * its own `import.meta.url` — a shared helper cannot read the URL of the module that calls it.
 */
export function resolveTemplateDir(importMetaUrl: string): string {
	return fileURLToPath(new URL('./files', importMetaUrl))
}
