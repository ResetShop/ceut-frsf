import { clearAllMocks } from '@resetshop/util/test-utils'
import { beforeEach } from 'vitest'
import { seedAppEnv } from '../../config/app.env'
import { buildWelcomeEmail } from './welcome-email.builder'

describe('buildWelcomeEmail', () => {
	const mockParams = {
		firstName: 'John',
		email: 'john.doe@example.com',
		password: 'TempPass123_xyz',
		mustChangePassword: true,
	}

	beforeEach(() => {
		clearAllMocks()
		// Seed the app env cache to its defaults (APP_LANGUAGE='en'), bypassing process.env —
		// the dev shell may export APP_LANGUAGE, which would otherwise leak into these tests.
		seedAppEnv()
	})

	describe('Return structure', () => {
		it('should return an object with subject, html, and text properties', () => {
			const result = buildWelcomeEmail(mockParams)

			expect(result).toHaveProperty('subject')
			expect(result).toHaveProperty('html')
			expect(result).toHaveProperty('text')
		})

		it('should return non-empty values for all properties', () => {
			const result = buildWelcomeEmail(mockParams)

			expect(result.subject.length).toBeGreaterThan(0)
			expect(result.html.length).toBeGreaterThan(0)
			expect(result.text.length).toBeGreaterThan(0)
		})
	})

	describe('Subject line', () => {
		it('should have the correct subject', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.subject).toBe('Your new account has been created')
		})

		it('should have consistent subject across different inputs', () => {
			const result1 = buildWelcomeEmail(mockParams)
			const result2 = buildWelcomeEmail({
				firstName: 'Jane',
				email: 'jane.smith@example.com',
				password: 'DifferentPass456',
				mustChangePassword: true,
			})

			expect(result1.subject).toBe(result2.subject)
		})
	})

	describe('Plain text content', () => {
		it('should contain the firstName', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.text).toContain(mockParams.firstName)
		})

		it('should contain the email', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.text).toContain(mockParams.email)
		})

		it('should contain the password', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.text).toContain(mockParams.password)
		})

		it('should contain password change instruction', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.text).toContain('change your password')
		})

		it('should contain security-related instruction', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.text.toLowerCase()).toContain('security')
		})

		it('should contain first login instruction', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.text.toLowerCase()).toContain('first login')
		})
	})

	describe('HTML content', () => {
		it('should contain the firstName', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.html).toContain(mockParams.firstName)
		})

		it('should contain the email', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.html).toContain(mockParams.email)
		})

		it('should contain the password', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.html).toContain(mockParams.password)
		})

		it('should contain password change instruction', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.html).toContain('change your password')
		})

		it('should contain security-related instruction', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.html.toLowerCase()).toContain('security')
		})

		it('should contain first login instruction', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.html.toLowerCase()).toContain('first login')
		})

		it('should be valid HTML with DOCTYPE', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.html).toContain('<!DOCTYPE html>')
		})

		it('should contain proper HTML structure', () => {
			const result = buildWelcomeEmail(mockParams)
			expect(result.html).toContain('<html lang="en">')
			expect(result.html).toContain('</html>')
			expect(result.html).toContain('<body')
			expect(result.html).toContain('</body>')
		})

		it('should set html lang attribute from APP_LANGUAGE', () => {
			seedAppEnv({ APP_LANGUAGE: 'es' })

			const result = buildWelcomeEmail(mockParams)

			expect(result.html).toContain('<html lang="es">')
		})
	})

	describe('Parameterization', () => {
		it('should produce different text content for different firstName', () => {
			const result1 = buildWelcomeEmail(mockParams)
			const result2 = buildWelcomeEmail({
				...mockParams,
				firstName: 'Jane',
			})

			expect(result1.text).not.toBe(result2.text)
			expect(result1.text).toContain('John')
			expect(result2.text).toContain('Jane')
		})

		it('should produce different text content for different email', () => {
			const result1 = buildWelcomeEmail(mockParams)
			const result2 = buildWelcomeEmail({
				...mockParams,
				email: 'different@example.com',
			})

			expect(result1.text).not.toBe(result2.text)
			expect(result1.text).toContain('john.doe@example.com')
			expect(result2.text).toContain('different@example.com')
		})

		it('should produce different text content for different password', () => {
			const result1 = buildWelcomeEmail(mockParams)
			const result2 = buildWelcomeEmail({
				...mockParams,
				password: 'DifferentPassword',
			})

			expect(result1.text).not.toBe(result2.text)
			expect(result1.text).toContain('TempPass123_xyz')
			expect(result2.text).toContain('DifferentPassword')
		})

		it('should produce different HTML content for different firstName', () => {
			const result1 = buildWelcomeEmail(mockParams)
			const result2 = buildWelcomeEmail({
				...mockParams,
				firstName: 'Jane',
			})

			expect(result1.html).not.toBe(result2.html)
			expect(result1.html).toContain('John')
			expect(result2.html).toContain('Jane')
		})

		it('should produce different HTML content for different email', () => {
			const result1 = buildWelcomeEmail(mockParams)
			const result2 = buildWelcomeEmail({
				...mockParams,
				email: 'different@example.com',
			})

			expect(result1.html).not.toBe(result2.html)
			expect(result1.html).toContain('john.doe@example.com')
			expect(result2.html).toContain('different@example.com')
		})

		it('should produce different HTML content for different password', () => {
			const result1 = buildWelcomeEmail(mockParams)
			const result2 = buildWelcomeEmail({
				...mockParams,
				password: 'DifferentPassword',
			})

			expect(result1.html).not.toBe(result2.html)
			expect(result1.html).toContain('TempPass123_xyz')
			expect(result2.html).toContain('DifferentPassword')
		})
	})

	describe('Real-world use cases', () => {
		it('should handle typical user names', () => {
			const result = buildWelcomeEmail({
				firstName: 'Alice',
				email: 'alice.wonder@company.com',
				password: 'SecurePass123',
				mustChangePassword: true,
			})

			expect(result.text).toContain('Alice')
			expect(result.html).toContain('Alice')
		})

		it('should handle names with special characters', () => {
			const result = buildWelcomeEmail({
				firstName: "O'Brien",
				email: 'obrien@example.com',
				password: 'TempPass456',
				mustChangePassword: true,
			})

			expect(result.text).toContain("O'Brien")
			expect(result.html).toContain('O&#39;Brien')
		})

		it('should escape HTML-dangerous characters in HTML but not in plain text', () => {
			const result = buildWelcomeEmail({
				firstName: '<b>Joe&"Ann</b>',
				email: 'joe&ann@example.com',
				password: 'p<a>ss',
				mustChangePassword: true,
			})

			expect(result.text).toContain('<b>Joe&"Ann</b>')
			expect(result.text).toContain('joe&ann@example.com')
			expect(result.text).toContain('p<a>ss')

			expect(result.html).toContain('&lt;b&gt;Joe&amp;&quot;Ann&lt;/b&gt;')
			expect(result.html).toContain('joe&amp;ann@example.com')
			expect(result.html).toContain('p&lt;a&gt;ss')
			expect(result.html).not.toContain('<b>Joe')
		})

		it('should handle generated passwords with various characters', () => {
			const result = buildWelcomeEmail({
				firstName: 'Bob',
				email: 'bob@example.com',
				password: 'aB3-_xYz9QwE',
				mustChangePassword: true,
			})

			expect(result.text).toContain('aB3-_xYz9QwE')
			expect(result.html).toContain('aB3-_xYz9QwE')
		})
	})

	describe('mustChangePassword=false', () => {
		it('should not contain password change instruction in text', () => {
			const result = buildWelcomeEmail({ ...mockParams, mustChangePassword: false })

			expect(result.text).not.toContain('change your password')
			expect(result.text).not.toContain('IMPORTANT')
		})

		it('should not contain password change instruction in HTML', () => {
			const result = buildWelcomeEmail({ ...mockParams, mustChangePassword: false })

			expect(result.html).not.toContain('change your password')
			expect(result.html).not.toContain('#fff3cd')
		})

		it('should label password as "Password" in text when mustChangePassword is false', () => {
			const result = buildWelcomeEmail({ ...mockParams, mustChangePassword: false })

			expect(result.text).toContain('Password: TempPass123_xyz')
			expect(result.text).not.toContain('Temporary Password')
		})

		it('should label password as "Password" in HTML when mustChangePassword is false', () => {
			const result = buildWelcomeEmail({ ...mockParams, mustChangePassword: false })

			expect(result.html).toContain('<strong>Password:</strong>')
			expect(result.html).not.toContain('Temporary Password')
		})
	})

	describe('Content consistency', () => {
		it('should include login credentials label in both text and HTML', () => {
			const result = buildWelcomeEmail(mockParams)

			expect(result.text.toLowerCase()).toContain('login credentials')
			expect(result.html.toLowerCase()).toContain('login credentials')
		})

		it('should include welcome message in both text and HTML', () => {
			const result = buildWelcomeEmail(mockParams)

			expect(result.text.toLowerCase()).toContain('welcome')
			expect(result.html.toLowerCase()).toContain('welcome')
		})

		it('should include automated message disclaimer in both text and HTML', () => {
			const result = buildWelcomeEmail(mockParams)

			expect(result.text.toLowerCase()).toContain('automated')
			expect(result.html.toLowerCase()).toContain('automated')
		})
	})
})
