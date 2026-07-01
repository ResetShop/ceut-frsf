import type { Locator, Page } from '@playwright/test'

/** Page object for `/auth/change-password`. */
export class ChangePasswordPage {
	constructor(private readonly page: Page) {}

	get oldPasswordInput(): Locator {
		return this.page.getByLabel('Current password')
	}
	get newPasswordInput(): Locator {
		return this.page.getByLabel('New password')
	}
	get submitButton(): Locator {
		return this.page.getByRole('button', { name: 'Change password' })
	}
	get errorAlert(): Locator {
		return this.page.getByRole('alert')
	}

	async goto(): Promise<void> {
		await this.page.goto('/auth/change-password')
	}
}
