import type { Locator, Page } from '@playwright/test'

/** Page object for `/auth/login`. */
export class LoginPage {
	constructor(private readonly page: Page) {}

	get emailInput(): Locator {
		return this.page.getByLabel('Email address')
	}
	get passwordInput(): Locator {
		return this.page.getByLabel('Password')
	}
	get submitButton(): Locator {
		return this.page.getByRole('button', { name: 'Sign in' })
	}
	get forgotPasswordLink(): Locator {
		return this.page.getByRole('link', { name: 'Forgot your password?' })
	}
	get errorAlert(): Locator {
		return this.page.getByRole('alert')
	}

	async goto(): Promise<void> {
		await this.page.goto('/auth/login')
	}

	async login(email: string, password: string): Promise<void> {
		await this.emailInput.fill(email)
		await this.passwordInput.fill(password)
		await this.submitButton.click()
	}
}
