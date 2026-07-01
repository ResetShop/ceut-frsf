import { clearAllMocks, type MockFn, spyOn } from '@resetshop/util/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { generatePassword, getWordList } from './password'

describe('generatePassword', () => {
	let consoleWarnSpy: MockFn

	beforeEach(() => {
		clearAllMocks()
		consoleWarnSpy = spyOn(console, 'warn')
	})

	describe('format', () => {
		it('should return three words separated by dots', async () => {
			const password = await generatePassword()
			const parts = password.split('.')

			expect(parts).toHaveLength(3)
		})

		it('should contain only lowercase letters and dots', async () => {
			const password = await generatePassword()

			expect(password).toMatch(/^[\p{Ll}]+\.[\p{Ll}]+\.[\p{Ll}]+$/u)
		})

		it('should produce non-empty words', async () => {
			const password = await generatePassword()
			const parts = password.split('.')

			for (const word of parts) {
				expect(word.length).toBeGreaterThan(0)
			}
		})
	})

	describe('wordCount validation', () => {
		it('should fall back to default for zero and log error', async () => {
			const password = await generatePassword(0)

			expect(password.split('.')).toHaveLength(3)
			expect(consoleWarnSpy.calls).toHaveLength(1)
			expect(consoleWarnSpy.calls[0][0]).toContain('[generatePassword]')
		})

		it('should fall back to default for negative values and log error', async () => {
			const password = await generatePassword(-1)

			expect(password.split('.')).toHaveLength(3)
			expect(consoleWarnSpy.calls).toHaveLength(1)
		})

		it('should fall back to default for non-integer values and log error', async () => {
			const password = await generatePassword(2.5)

			expect(password.split('.')).toHaveLength(3)
			expect(consoleWarnSpy.calls).toHaveLength(1)
		})

		it('should accept a custom word count', async () => {
			const password = await generatePassword(5)
			const parts = password.split('.')

			expect(parts).toHaveLength(5)
		})
	})

	describe('language selection', () => {
		it('contains only lowercase ASCII words across the entire English list', () => {
			// Validate the whole source list rather than a random sample: the sampling version flaked
			// (~3% per run) whenever it drew one of the former hyphenated entries (e.g. "drop-down").
			const offending = getWordList('en').filter((word) => !/^[a-z]+$/.test(word))

			expect(offending).toEqual([])
		})

		it('selects the Spanish list and produces accented words when language is es', async () => {
			const esWords = new Set(getWordList('es'))

			const password = await generatePassword(3, 'es')

			// Selection path: every generated word comes from the es list (deterministic — no RNG reliance).
			for (const word of password.split('.')) {
				expect(esWords.has(word)).toBe(true)
			}
			// The es list is genuinely Spanish (contains accented / non-ASCII words).
			expect(getWordList('es').some((word) => /[^a-z]/.test(word))).toBe(true)
		})

		it('should throw when word list file does not exist for language', async () => {
			await expect(generatePassword(3, 'xx')).rejects.toThrow()
		})
	})
})
