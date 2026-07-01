import { clearAllMocks } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type EmailEnv, emailEnv, parseEmailEnv, resetEmailEnv, seedEmailEnv } from './email.env'

function minimalEtherealEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
	return { EMAIL_PROVIDER: 'ethereal', ...overrides }
}

describe('parseEmailEnv', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	describe('EMAIL_PROVIDER', () => {
		it('defaults to "nodemailer" (requires SMTP_* when default kicks in)', () => {
			expect(() => parseEmailEnv({})).toThrow(/SMTP_HOST is required/)
		})

		it('accepts "ethereal"', () => {
			expect(parseEmailEnv(minimalEtherealEnv()).EMAIL_PROVIDER).toBe('ethereal')
		})

		it('accepts "noop"', () => {
			expect(parseEmailEnv({ EMAIL_PROVIDER: 'noop' }).EMAIL_PROVIDER).toBe('noop')
		})

		it('rejects unknown providers', () => {
			expect(() => parseEmailEnv({ EMAIL_PROVIDER: 'sendgrid' })).toThrow()
		})
	})

	describe('SMTP cross-field refinement', () => {
		it('requires SMTP_HOST/USER/PASS when EMAIL_PROVIDER=nodemailer', () => {
			expect(() => parseEmailEnv({ EMAIL_PROVIDER: 'nodemailer' })).toThrow(/SMTP_HOST is required/)
		})

		it('guides the user toward EMAIL_PROVIDER=ethereal when SMTP credentials are missing', () => {
			expect(() => parseEmailEnv({ EMAIL_PROVIDER: 'nodemailer' })).toThrow(/set EMAIL_PROVIDER=ethereal/)
		})

		it('lists the missing SMTP variables in the guidance message', () => {
			expect(() => parseEmailEnv({ EMAIL_PROVIDER: 'nodemailer', SMTP_HOST: 'smtp.example.com' })).toThrow(
				/requires SMTP_USER, SMTP_PASS/,
			)
		})

		it('succeeds when all SMTP credentials are present with nodemailer', () => {
			const env = parseEmailEnv({
				EMAIL_PROVIDER: 'nodemailer',
				SMTP_HOST: 'smtp.example.com',
				SMTP_USER: 'user@example.com',
				SMTP_PASS: 'secret',
			})
			expect(env.EMAIL_PROVIDER).toBe('nodemailer')
			expect(env.SMTP_HOST).toBe('smtp.example.com')
		})

		it('skips the refinement for ethereal', () => {
			expect(() => parseEmailEnv({ EMAIL_PROVIDER: 'ethereal' })).not.toThrow()
		})

		it('skips the refinement for noop', () => {
			expect(() => parseEmailEnv({ EMAIL_PROVIDER: 'noop' })).not.toThrow()
		})
	})

	describe('SMTP_PORT', () => {
		it('defaults to 587', () => {
			expect(parseEmailEnv(minimalEtherealEnv()).SMTP_PORT).toBe(587)
		})

		it('coerces a valid string to a number', () => {
			expect(parseEmailEnv(minimalEtherealEnv({ SMTP_PORT: '465' })).SMTP_PORT).toBe(465)
		})

		it('throws on out-of-range values', () => {
			expect(() => parseEmailEnv(minimalEtherealEnv({ SMTP_PORT: '99999' }))).toThrow()
		})

		it('throws on non-numeric values', () => {
			expect(() => parseEmailEnv(minimalEtherealEnv({ SMTP_PORT: 'abc' }))).toThrow()
		})
	})

	describe('SMTP_SECURE', () => {
		it('defaults to false', () => {
			expect(parseEmailEnv(minimalEtherealEnv()).SMTP_SECURE).toBe(false)
		})

		it('returns true only for "true"', () => {
			expect(parseEmailEnv(minimalEtherealEnv({ SMTP_SECURE: 'true' })).SMTP_SECURE).toBe(true)
			expect(parseEmailEnv(minimalEtherealEnv({ SMTP_SECURE: '1' })).SMTP_SECURE).toBe(false)
		})
	})

	describe('SMTP_FROM', () => {
		it('defaults to noreply@example.com', () => {
			expect(parseEmailEnv(minimalEtherealEnv()).SMTP_FROM).toBe('noreply@example.com')
		})

		it('uses the env value when set', () => {
			expect(parseEmailEnv(minimalEtherealEnv({ SMTP_FROM: 'custom@example.com' })).SMTP_FROM).toBe(
				'custom@example.com',
			)
		})
	})

	describe('EmailEnv type', () => {
		it('is assignable from a parseEmailEnv result', () => {
			const result: EmailEnv = parseEmailEnv(minimalEtherealEnv())
			expect(result.EMAIL_PROVIDER).toBeDefined()
		})
	})
})

describe('seedEmailEnv / resetEmailEnv / emailEnv proxy', () => {
	beforeEach(() => {
		resetEmailEnv()
	})

	afterEach(() => {
		resetEmailEnv()
		seedEmailEnv()
	})

	it('seedEmailEnv with no args uses the module-local test defaults (ethereal)', () => {
		seedEmailEnv()
		expect(emailEnv.EMAIL_PROVIDER).toBe('ethereal')
	})

	it('seedEmailEnv applies overrides on top of defaults', () => {
		seedEmailEnv({ EMAIL_PROVIDER: 'noop' })
		expect(emailEnv.EMAIL_PROVIDER).toBe('noop')
	})

	it('resetEmailEnv clears the cache so the next seed takes effect', () => {
		seedEmailEnv({ EMAIL_PROVIDER: 'ethereal' })
		expect(emailEnv.EMAIL_PROVIDER).toBe('ethereal')

		resetEmailEnv()
		seedEmailEnv({ EMAIL_PROVIDER: 'noop' })
		expect(emailEnv.EMAIL_PROVIDER).toBe('noop')
	})
})
