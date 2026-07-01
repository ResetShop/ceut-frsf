import type { Locator, Page } from '@playwright/test'

/** Page object for the user detail page (`/dashboard/users/:id`) and its sections. */
export class UserDetailPage {
	constructor(private readonly page: Page) {}

	get backLink(): Locator {
		return this.page.getByRole('link', { name: 'Back to Users' })
	}

	// --- Profile section ---
	get profileHeading(): Locator {
		return this.page.getByRole('heading', { name: 'Profile' })
	}
	get firstNameInput(): Locator {
		return this.page.getByLabel('First Name')
	}
	get lastNameInput(): Locator {
		return this.page.getByLabel('Last Name')
	}
	get emailInput(): Locator {
		return this.page.getByLabel('Email')
	}
	get saveButton(): Locator {
		return this.page.getByRole('button', { name: 'Save changes' })
	}

	// --- Roles section ---
	get rolesHeading(): Locator {
		return this.page.getByRole('heading', { name: 'Roles' })
	}
	get editRolesButton(): Locator {
		return this.page.getByRole('button', { name: 'Edit roles' })
	}

	// --- Account actions section (hidden for self-view / when no action is permitted) ---
	get accountActionsHeading(): Locator {
		return this.page.getByRole('heading', { name: 'Account Actions' })
	}
	get disableButton(): Locator {
		return this.page.getByRole('button', { name: 'Disable user' })
	}
	get resetPasswordButton(): Locator {
		return this.page.getByRole('button', { name: 'Send password reset link' })
	}

	// --- Danger zone ---
	get deleteButton(): Locator {
		return this.page.getByRole('button', { name: 'Delete user' })
	}

	/** A confirm dialog's button (e.g. 'Delete', 'Disable user') scoped to the dialog. */
	confirmButton(name: string): Locator {
		return this.page.getByRole('alertdialog').getByRole('button', { name })
	}

	async goto(id: number | string): Promise<void> {
		await this.page.goto(`/dashboard/users/${id}`)
	}
}
