import { logger } from '@resetshop/util'
import type { Transporter } from 'nodemailer'
import * as nodemailer from 'nodemailer'
import type { EmailRepository, SendEmailParams } from './interfaces'

/**
 * Ethereal email repository using Nodemailer's test service.
 * Activated when EMAIL_PROVIDER is 'ethereal'.
 *
 * No environment variables required — Ethereal generates test credentials
 * automatically. The transporter is created lazily on the first send()
 * call and cached on success. If initialization fails, the next send()
 * call retries automatically.
 *
 * After each email is sent, the Ethereal preview URL is logged so the
 * developer can inspect the email in a browser.
 *
 * Intended for local development and testing only.
 */
export class EtherealEmailRepository implements EmailRepository {
	private transporterPromise: Promise<Transporter> | null = null

	public async send(params: SendEmailParams): Promise<void> {
		const transporter = await this.getTransporter()

		const info = await transporter.sendMail({
			from: 'noreply@ethereal.email',
			to: params.to,
			subject: params.subject,
			html: params.html,
			text: params.text,
		})

		const previewUrl = nodemailer.getTestMessageUrl(info)
		if (previewUrl) {
			logger.security('ethereal_email_preview', { previewUrl, recipient: params.to, subject: params.subject })
		}
	}

	private async getTransporter(): Promise<Transporter> {
		if (!this.transporterPromise) {
			this.transporterPromise = this.createTransporter()
		}

		try {
			return await this.transporterPromise
		} catch {
			this.transporterPromise = this.createTransporter()
			return this.transporterPromise
		}
	}

	private createTransporter(): Promise<Transporter> {
		return nodemailer
			.createTestAccount()
			.then((testAccount) =>
				nodemailer.createTransport({
					host: testAccount.smtp.host,
					port: testAccount.smtp.port,
					secure: testAccount.smtp.secure,
					auth: {
						user: testAccount.user,
						pass: testAccount.pass,
					},
				}),
			)
			.catch((error) => {
				logger.error('EtherealEmailRepository', 'Failed to create Ethereal test account', error)
				throw error
			})
	}
}
