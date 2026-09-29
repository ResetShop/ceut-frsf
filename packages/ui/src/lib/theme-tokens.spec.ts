import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Resolved from the working directory, which differs between a project-scoped and a workspace run. */
function resolveLibDir(): string {
	const candidates = [join(process.cwd(), 'src', 'lib'), join(process.cwd(), 'packages', 'ui', 'src', 'lib')]
	const libDir = candidates.find((candidate) => existsSync(candidate))
	if (!libDir) {
		throw new Error(`Could not locate the ui lib directory from ${process.cwd()}`)
	}
	return libDir
}

function stylesheets(): { path: string; contents: string }[] {
	const libDir = resolveLibDir()
	return readdirSync(libDir, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
		.map((entry) => {
			const path = join(entry.parentPath, entry.name)
			return { path, contents: readFileSync(path, 'utf-8') }
		})
}

describe('component stylesheets', () => {
	it('should reference no --color-* token', () => {
		const offenders = stylesheets()
			.filter(({ contents }) => contents.includes('var(--color-'))
			.map(({ path }) => path)

		// The workspace theme is declared `@theme inline`, so Tailwind inlines these tokens into the
		// utilities it generates and emits none of them as custom properties. A `var(--color-*)` in a
		// plain stylesheet resolves to nothing, which invalidates the whole declaration — a transparent
		// `dialog::backdrop` is how this last surfaced. Use the unprefixed tokens (`--foreground`, …).
		expect(offenders).toEqual([])
	})

	it('should find the stylesheets it is guarding', () => {
		expect(stylesheets().length).toBeGreaterThan(0)
	})
})
