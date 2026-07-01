import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
// Repo-root plugin; `../../..` is intentional — tools/ sits three levels below the repo root.
import plugin from '../../../postcss-inject-tailwind-reference.js'

function run(css, from) {
	return postcss([plugin()]).process(css, { from }).css
}

describe('postcss-inject-tailwind-reference', () => {
	it('injects @reference "#tailwind-theme" into a stylesheet that uses @apply', () => {
		const out = run('.x { @apply flex; }', 'button.ts')
		expect(out).toContain('@reference "#tailwind-theme"')
	})

	it('does not inject into a stylesheet that has no @apply', () => {
		expect(run('#body { overflow: hidden; }', 'foo.css')).not.toContain('@reference')
	})

	it('does not inject into a global @import entry (no @apply) — must not suppress emitted @theme tokens', () => {
		const out = run('@import "./fonts.css";\n@import "../../../tailwind.config.css";\n#body {}', 'styles.css')
		expect(out).not.toContain('@reference')
	})

	it('injects when the source path is undefined', () => {
		expect(run('.x { @apply flex; }', undefined)).toContain('@reference "#tailwind-theme"')
	})

	it('places the injected @reference as the first node', () => {
		const root = postcss.parse(run('.x { @apply flex; }', 'button.ts'))
		expect(root.first.type).toBe('atrule')
		expect(root.first.name).toBe('reference')
	})

	it('is idempotent — does not double-inject when @reference already exists', () => {
		const out = run('@reference "#tailwind-theme";\n.x { @apply flex; }', 'bar.ts')
		expect(out.match(/@reference/g)).toHaveLength(1)
	})

	it('skips tailwind.config.css (theme-entry file)', () => {
		expect(run('@source "apps";', '/repo/tailwind.config.css')).not.toContain('#tailwind-theme')
	})

	it('skips accessibility.css (theme-entry file)', () => {
		const out = run('.sr-only { position: absolute; }', '/repo/packages/ui/src/theme/accessibility.css')
		expect(out).not.toContain('#tailwind-theme')
	})
})
