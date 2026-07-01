import { logger } from '@resetshop/util'
import { randomInt } from 'crypto'
import { z } from 'zod'
import { appEnv } from '../config/app.env'
import enWordlistRaw from './wordlists/en-password-seed.txt?raw'
import esWordlistRaw from './wordlists/es-password-seed.txt?raw'

const wordCountSchema = z.number().int().positive()

/**
 * Parses a diceware wordlist file. The first line is a header count;
 * subsequent lines are one word per line. Returns a frozen array.
 */
function parseWordlist(content: string): readonly string[] {
	return Object.freeze(
		content
			.split('\n')
			.slice(1)
			.map((word) => word.trim())
			.filter(Boolean),
	)
}

const WORDLISTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
	en: parseWordlist(enWordlistRaw),
	es: parseWordlist(esWordlistRaw),
})

/**
 * Returns the (frozen) word list for a language. Exported so specs can assert invariants over the
 * entire source list deterministically instead of sampling generated passwords (which flaked when a
 * single hyphenated entry was drawn).
 * @throws if the language is not allow-listed or its list is empty
 */
export function getWordList(language: string): readonly string[] {
	// Allowlist check via Object.hasOwn — guards against inherited members (e.g. `language`
	// set to '__proto__' or 'constructor') returning truthy non-array values that would
	// pass a plain `if (!words)` check and crash later in randomInt(words.length).
	if (!Object.hasOwn(WORDLISTS, language)) {
		throw new Error(`Word list not found for language: ${language}`)
	}
	const words = WORDLISTS[language]
	if (words.length === 0) {
		throw new Error(`Word list is empty for language: ${language}`)
	}
	return words
}

/**
 * Generate a cryptographically secure passphrase in the format: word.word.word
 *
 * The word list is selected by `language`, defaulting to `appEnv.APP_LANGUAGE` (itself 'en' by
 * default). The optional parameter lets specs choose a language without env mutation, mirroring
 * the `buildWelcomeEmail(params, lang?)` shape.
 * Uses crypto.randomInt for uniform random word selection from a diceware word list.
 * With the default 7,776-word lists, 3 words provide ~38.8 bits of entropy —
 * suitable for temporary passwords that must be changed on first login.
 *
 * @returns Dot-separated passphrase (e.g., "indigo.rabbit.troop")
 */
export async function generatePassword(wordCount = 3, language?: string): Promise<string> {
	const parsed = wordCountSchema.safeParse(wordCount)
	if (!parsed.success) {
		logger.warn('generatePassword', `Invalid wordCount (${wordCount}), using default: ${parsed.error.message}`)
	}
	const effectiveWordCount = parsed.success ? wordCount : 3

	const resolvedLanguage = language ?? appEnv.APP_LANGUAGE
	const words = getWordList(resolvedLanguage)

	return Array.from({ length: effectiveWordCount }, () => words[randomInt(words.length)]).join('.')
}
