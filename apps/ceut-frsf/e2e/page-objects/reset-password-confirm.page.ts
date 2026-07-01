import type { Locator, Page } from '@playwright/test'

/** Page object for `/auth/reset-password/confirm?token=…`. */
export class ResetPasswordConfirmPage {
	constructor(private readonly page: Page) {}

	get newPasswordInput(): Locator {
		// Exact match: the page heading "Set a new password" otherwise also matches as a label (substring).
		return this.page.getByLabel('New password', { exact: true })
	}
	get submitButton(): Locator {
		return this.page.getByRole('button', { name: 'Reset password' })
	}
	get missingTokenAlert(): Locator {
		return this.page.getByText('This reset link is invalid or incomplete')
	}

	async goto(token?: string): Promise<void> {
		const query = token ? `?token=${encodeURIComponent(token)}` : ''
		await this.page.goto(`/auth/reset-password/confirm${query}`)
	}
}
