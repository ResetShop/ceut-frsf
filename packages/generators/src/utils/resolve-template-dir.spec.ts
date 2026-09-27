import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { resolveTemplateDir } from './resolve-template-dir.ts'

describe('resolveTemplateDir', () => {
	const storeIndexUrl = new URL('../generators/store/index.ts', import.meta.url).href

	it('resolves the files directory next to the calling module as a native path', () => {
		const storeDir = fileURLToPath(new URL('../generators/store/', import.meta.url))

		expect(resolveTemplateDir(storeIndexUrl)).toBe(join(storeDir, 'files'))
	})

	it('points at the real template directory of a generator', () => {
		expect(existsSync(resolveTemplateDir(storeIndexUrl))).toBe(true)
	})
})
