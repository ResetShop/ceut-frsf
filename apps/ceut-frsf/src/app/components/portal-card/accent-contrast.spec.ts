import { resolveAccentTextColor } from './accent-contrast'

/**
 * The expected tone for every brand accent, computed against WCAG 2.1 relative
 * luminance. This table is the contract: the design's "white on everything but
 * sistemas" guidance only holds for civil, electrica and hands-purple.
 */
const ACCENT_TONES: ReadonlyArray<{ name: string; hex: string; tone: 'light' | 'dark' }> = [
	{ name: 'career-basicas', hex: '#0099cc', tone: 'dark' },
	{ name: 'career-civil', hex: '#6e227d', tone: 'light' },
	{ name: 'career-electrica', hex: '#e61c32', tone: 'light' },
	{ name: 'career-industrial', hex: '#ee7114', tone: 'dark' },
	{ name: 'career-mecanica', hex: '#22a438', tone: 'dark' },
	{ name: 'career-sistemas', hex: '#fab000', tone: 'dark' },
	{ name: 'hands-red', hex: '#e23849', tone: 'light' },
	{ name: 'hands-orange', hex: '#f57c00', tone: 'dark' },
	{ name: 'hands-yellow', hex: '#f6c700', tone: 'dark' },
	{ name: 'hands-green', hex: '#2bbbad', tone: 'dark' },
	{ name: 'hands-blue', hex: '#1f9bd1', tone: 'dark' },
	{ name: 'hands-purple', hex: '#814cce', tone: 'light' },
	{ name: 'hands-pink', hex: '#e2399b', tone: 'dark' },
]

describe('resolveAccentTextColor', () => {
	it.each(ACCENT_TONES)('picks $tone text for $name ($hex)', ({ hex, tone }) => {
		expect(resolveAccentTextColor(hex)).toBe(tone)
	})

	it('accepts shorthand three-digit hex', () => {
		expect(resolveAccentTextColor('#09c')).toBe(resolveAccentTextColor('#0099cc'))
	})
})
