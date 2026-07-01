import type { Locator, Page } from '@playwright/test'

/** Page object for `/auth/reset-password` (the forgot-password request form). */
export class ResetPasswordPage {
	constructor(private readonly page: Page) {}

	get emailInput(): Locator {
		return this.page.getByLabel('Email address')
	}
	get submitButton(): Locator {
		return this.page.getByRole('button', { name: 'Send reset link' })
	}
	get backToLoginLink(): Locator {
		return this.page.getByRole('link', { name: 'Back to sign in' })
	}
	get confirmation(): Locator {
		return this.page.getByText('If an account exists for that email')
	}
	get throttleMessage(): Locator {
		return this.page.getByText('Too many requests')
	}

	async goto(): Promise<void> {
		await this.page.goto('/auth/reset-password')
	}
}
