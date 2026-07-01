import type { EmailRepository, SendEmailParams } from './interfaces'

/**
 * No-op email repository that silently discards all emails.
 * Used in integration tests to avoid SMTP round-trips.
 */
export class NoopEmailRepository implements EmailRepository {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface contract requires the parameter
	public async send(params: SendEmailParams): Promise<void> {
		// Intentionally empty — emails are not sent in this mode
	}
}
