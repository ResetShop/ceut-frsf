/**
 * Resolves the text tone (`'light'` = white, `'dark'` = near-black) that yields
 * the higher WCAG 2.1 contrast ratio against a given accent fill color.
 *
 * The design guidance ("white text on every accent except sistemas") does not
 * survive a contrast check for most of the palette, so the card computes the
 * tone per accent instead of hardcoding it. This is self-correcting for any new
 * accent the DB-backed cards feed introduces.
 */

/** Dark text token value (`--gray-900`) used for the light-accent case. */
const DARK_TEXT_HEX = '#111827'

function hexToRgb(hex: string): [number, number, number] {
	const normalized = hex.replace('#', '')
	const full =
		normalized.length === 3
			? normalized
					.split('')
					.map((c) => c + c)
					.join('')
			: normalized
	const int = Number.parseInt(full, 16)
	return [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff]
}

function relativeLuminance(hex: string): number {
	const channels = hexToRgb(hex).map((value) => {
		const channel = value / 255
		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
	})
	return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(hexA: string, hexB: string): number {
	const lumA = relativeLuminance(hexA)
	const lumB = relativeLuminance(hexB)
	const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA]
	return (lighter + 0.05) / (darker + 0.05)
}

export function resolveAccentTextColor(accentHex: string): 'light' | 'dark' {
	const whiteContrast = contrastRatio('#ffffff', accentHex)
	const darkContrast = contrastRatio(DARK_TEXT_HEX, accentHex)
	return whiteContrast >= darkContrast ? 'light' : 'dark'
}
