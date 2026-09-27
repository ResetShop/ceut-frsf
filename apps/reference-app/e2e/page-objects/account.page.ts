import type { Locator, Page } from '@playwright/test'

/** Page object for `/account` (the signed-in user's own profile). */
export class AccountPage {
	constructor(private readonly page: Page) {}

	get heading(): Locator {
		return this.page.getByRole('heading', { level: 1, name: 'Account' })
	}
	get profile(): Locator {
		return this.page.getByRole('region', { name: 'Profile' })
	}
	get firstNameInput(): Locator {
		return this.profile.getByRole('textbox', { name: 'First Name' })
	}
	get lastNameInput(): Locator {
		return this.profile.getByRole('textbox', { name: 'Last Name' })
	}
	get textboxes(): Locator {
		return this.profile.getByRole('textbox')
	}
	get reviewButton(): Locator {
		return this.page.getByRole('button', { name: 'Review changes' })
	}
	get confirmDialog(): Locator {
		return this.page.getByRole('alertdialog', { name: 'Confirm changes' })
	}
	get saveChangesButton(): Locator {
		return this.confirmDialog.getByRole('button', { name: 'Save changes' })
	}
	get cancelButton(): Locator {
		return this.confirmDialog.getByRole('button', { name: 'Cancel' })
	}
	/** A validation message rendered under a profile field. */
	fieldError(message: string): Locator {
		return this.profile.getByText(message, { exact: true })
	}
	get successToast(): Locator {
		return this.page.getByText('Profile updated successfully.', { exact: true })
	}

	async goto(): Promise<void> {
		await this.page.goto('/account')
	}

	/** Changes the first name and confirms it through the review dialog. */
	async renameFirstName(firstName: string): Promise<void> {
		await this.firstNameInput.fill(firstName)
		await this.reviewButton.click()
		await this.saveChangesButton.click()
	}
}
