import { clearAllMocks } from '@resetshop/util/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedAppEnv } from '../../config/app.env'
import { buildForgotPasswordEmail } from './forgot-password-email.builder'

describe('buildForgotPasswordEmail', () => {
	const params = {
		firstName: 'Ada',
		resetUrl: 'https://app.test/auth/reset-password/confirm?token=raw-token-abc',
	}

	beforeEach(() => {
		clearAllMocks()
		// Seed the app env cache to its defaults (APP_LANGUAGE='en'), bypassing process.env —
		// the dev shell may export APP_LANGUAGE, which would otherwise leak into the no-lang test below.
		seedAppEnv()
	})

	it('defaults to English when no lang is passed (reads appEnv.APP_LANGUAGE)', () => {
		const email = buildForgotPasswordEmail(params)

		expect(email.subject).toBe('Reset your password')
	})

	it('renders the reset URL in both text and HTML (English)', () => {
		const email = buildForgotPasswordEmail(params, 'en')

		expect(email.subject).toBe('Reset your password')
		expect(email.text).toContain(params.resetUrl)
		expect(email.html).toContain(params.resetUrl)
		expect(email.text).toContain('Ada')
	})

	it('renders Spanish content when lang is es', () => {
		const email = buildForgotPasswordEmail(params, 'es')

		expect(email.subject).toBe('Restablece tu contraseña')
		expect(email.html).toContain(params.resetUrl)
	})

	it('resolves the {duration} placeholder from PASSWORD_RESET_TOKEN_EXPIRY (1h)', () => {
		const en = buildForgotPasswordEmail(params, 'en')
		const es = buildForgotPasswordEmail(params, 'es')

		expect(en.text).toContain('1 hour')
		expect(en.html).toContain('1 hour')
		expect(es.text).toContain('1 hora')
		expect(en.text).not.toContain('{duration}')
		expect(es.html).not.toContain('{duration}')
	})

	it('escapes HTML-significant characters in the first name', () => {
		const email = buildForgotPasswordEmail({ ...params, firstName: '<script>' }, 'en')

		expect(email.html).not.toContain('<script>')
		expect(email.html).toContain('&lt;script&gt;')
	})
})
