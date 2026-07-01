/**
 * Email env sub-schema.
 *
 * Covers email provider selection and SMTP credentials. The cross-field
 * refinement that requires `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` when
 * `EMAIL_PROVIDER=nodemailer` is enforced inside the schema itself.
 *
 * Consumers must import `emailEnv` (or `parseEmailEnv` / `seedEmailEnv` for
 * tests). Direct `process.env[...]` access is ESLint-forbidden everywhere
 * except files matching `*.env.ts`.
 */
import { z } from 'zod'
import { createEnvHandler } from './env-utils'

const DEFAULT_SMTP_PORT = 587
const DEFAULT_SMTP_FROM = 'noreply@example.com'

const EmailEnvSchema = z
	.object({
		EMAIL_PROVIDER: z.enum(['nodemailer', 'ethereal', 'noop']).default('nodemailer'),
		SMTP_HOST: z.string().optional(),
		SMTP_USER: z.string().optional(),
		SMTP_PASS: z.string().optional(),
		SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_SMTP_PORT),
		SMTP_SECURE: z
			.string()
			.optional()
			.transform((v) => v === 'true'),
		SMTP_FROM: z.string().default(DEFAULT_SMTP_FROM),
	})
	.superRefine((data, ctx) => {
		if (data.EMAIL_PROVIDER !== 'nodemailer') return
		const missing: Array<'SMTP_HOST' | 'SMTP_USER' | 'SMTP_PASS'> = []
		if (!data.SMTP_HOST) missing.push('SMTP_HOST')
		if (!data.SMTP_USER) missing.push('SMTP_USER')
		if (!data.SMTP_PASS) missing.push('SMTP_PASS')
		if (missing.length === 0) return
		for (const field of missing) {
			ctx.addIssue({
				code: 'custom',
				path: [field],
				message: `${field} is required when EMAIL_PROVIDER=nodemailer (the default provider, which sends real email over SMTP)`,
			})
		}
		ctx.addIssue({
			code: 'custom',
			path: ['EMAIL_PROVIDER'],
			message:
				`EMAIL_PROVIDER defaults to "nodemailer", which sends real email and therefore requires ${missing.join(', ')}. ` +
				'If you do NOT intend to use a real email provider (e.g. local development, testing, or CI), ' +
				'set EMAIL_PROVIDER=ethereal to route mail to a disposable Ethereal test inbox instead — no SMTP credentials needed. ' +
				'(Use EMAIL_PROVIDER=noop to disable email sending entirely.)',
		})
	})

export type EmailEnv = z.infer<typeof EmailEnvSchema>

const handler = createEnvHandler('email', EmailEnvSchema, {
	EMAIL_PROVIDER: 'ethereal',
})

export const parseEmailEnv = handler.parse
export const emailEnv = handler.proxy
export const seedEmailEnv = handler.seed
export const resetEmailEnv = handler.reset
