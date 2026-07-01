import { clearAllMocks } from '@resetshop/util/test-utils'
import { beforeEach } from 'vitest'
import { seedAppEnv } from '../../config/app.env'
import { buildResetPasswordEmail } from './reset-password-email.builder'

describe('buildResetPasswordEmail', () => {
	const mockParams = {
		firstName: 'John',
		email: 'john.doe@example.com',
		password: 'TempPass123_xyz',
	}

	beforeEach(() => {
		clearAllMocks()
		// Seed the app env cache to its defaults (APP_LANGUAGE='en'), bypassing process.env —
		// the dev shell may export APP_LANGUAGE, which would otherwise leak into these tests.
		seedAppEnv()
	})

	describe('Return structure', () => {
		it('should return an object with subject, html, and text properties', () => {
			const result = buildResetPasswordEmail(mockParams)

			expect(result).toHaveProperty('subject')
			expect(result).toHaveProperty('html')
			expect(result).toHaveProperty('text')
		})

		it('should return non-empty values for all properties', () => {
			const result = buildResetPasswordEmail(mockParams)

			expect(result.subject.length).toBeGreaterThan(0)
			expect(result.html.length).toBeGreaterThan(0)
			expect(result.text.length).toBeGreaterThan(0)
		})
	})

	describe('Subject line', () => {
		it('should have the correct English subject', () => {
			const result = buildResetPasswordEmail(mockParams)
			expect(result.subject).toBe('Your password has been reset')
		})

		it('should have the correct Spanish subject when APP_LANGUAGE is es', () => {
			seedAppEnv({ APP_LANGUAGE: 'es' })
			const result = buildResetPasswordEmail(mockParams)
			expect(result.subject).toBe('Tu contraseña ha sido restablecida')
		})
	})

	describe('Text content', () => {
		it('should include the recipient first name', () => {
			const result = buildResetPasswordEmail(mockParams)
			expect(result.text).toContain('John')
		})

		it('should include the recipient email', () => {
			const result = buildResetPasswordEmail(mockParams)
			expect(result.text).toContain('john.doe@example.com')
		})

		it('should include the temporary password', () => {
			const result = buildResetPasswordEmail(mockParams)
			expect(result.text).toContain('TempPass123_xyz')
		})

		it('should state the password was reset by an administrator', () => {
			const result = buildResetPasswordEmail(mockParams)
			expect(result.text.toLowerCase()).toContain('administrator')
		})

		it('should always include the change-password warning', () => {
			const result = buildResetPasswordEmail(mockParams)
			expect(result.text.toLowerCase()).toContain('change this temporary password')
		})
	})

	describe('HTML content', () => {
		it('should include the recipient first name, email, and password', () => {
			const result = buildResetPasswordEmail(mockParams)
			expect(result.html).toContain('John')
			expect(result.html).toContain('john.doe@example.com')
			expect(result.html).toContain('TempPass123_xyz')
		})

		it('should be valid HTML with DOCTYPE and structure', () => {
			const result = buildResetPasswordEmail(mockParams)
			expect(result.html).toContain('<!DOCTYPE html>')
			expect(result.html).toContain('<html lang="en">')
			expect(result.html).toContain('</html>')
			expect(result.html).toContain('<body')
			expect(result.html).toContain('</body>')
		})

		it('should set html lang attribute from APP_LANGUAGE', () => {
			seedAppEnv({ APP_LANGUAGE: 'es' })
			const result = buildResetPasswordEmail(mockParams)
			expect(result.html).toContain('<html lang="es">')
		})
	})

	describe('HTML escaping', () => {
		it('should escape HTML-significant characters in user-provided values', () => {
			const result = buildResetPasswordEmail({
				firstName: '<b>Joe&"Ann</b>',
				email: 'joe&ann@example.com',
				password: 'p<a>ss',
			})

			expect(result.html).toContain('&lt;b&gt;Joe&amp;&quot;Ann&lt;/b&gt;')
			expect(result.html).toContain('joe&amp;ann@example.com')
			expect(result.html).toContain('p&lt;a&gt;ss')
			expect(result.html).not.toContain('<b>Joe')
		})

		it('should not escape the plain-text version', () => {
			const result = buildResetPasswordEmail({
				firstName: '<b>Joe&"Ann</b>',
				email: 'joe&ann@example.com',
				password: 'p<a>ss',
			})

			expect(result.text).toContain('<b>Joe&"Ann</b>')
			expect(result.text).toContain('joe&ann@example.com')
			expect(result.text).toContain('p<a>ss')
		})
	})

	describe('Parameterization', () => {
		it('should produce different content for different inputs', () => {
			const result1 = buildResetPasswordEmail(mockParams)
			const result2 = buildResetPasswordEmail({
				firstName: 'Jane',
				email: 'jane.smith@example.com',
				password: 'DifferentPass456',
			})

			expect(result1.text).not.toBe(result2.text)
			expect(result1.text).toContain('John')
			expect(result2.text).toContain('Jane')
			expect(result2.text).toContain('jane.smith@example.com')
			expect(result2.text).toContain('DifferentPass456')
		})
	})
})
