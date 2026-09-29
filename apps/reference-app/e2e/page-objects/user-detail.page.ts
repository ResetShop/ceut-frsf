import type { Locator, Page } from '@playwright/test'

/** Page object for the user detail page (`/dashboard/users/:id`) and its sections. */
export class UserDetailPage {
	constructor(private readonly page: Page) {}

	get backLink(): Locator {
		return this.page.getByRole('link', { name: 'Back to Users' })
	}

	// --- Profile section (read-only; edits go through the Edit User drawer) ---
	get profileHeading(): Locator {
		return this.page.getByRole('heading', { name: 'Profile' })
	}

	// --- Roles section (read-only) ---
	get rolesHeading(): Locator {
		return this.page.getByRole('heading', { name: 'Roles' })
	}

	// --- Edit User drawer ---
	get editUserButton(): Locator {
		return this.page.getByRole('button', { name: 'Edit user' })
	}
	get drawer(): Locator {
		return this.page.getByRole('dialog', { name: 'Edit User' })
	}
	get drawerFirstName(): Locator {
		return this.drawer.getByLabel('First Name')
	}
	get drawerStatus(): Locator {
		return this.drawer.getByRole('combobox')
	}
	get roleCheckbox(): Locator {
		return this.drawer.getByRole('checkbox', { name: 'Administrator' })
	}
	get reviewButton(): Locator {
		return this.drawer.getByRole('button', { name: 'Review changes' })
	}

	// --- Confirm-changes dialog ---
	get confirmChangesDialog(): Locator {
		return this.page.getByRole('alertdialog', { name: 'Confirm changes' })
	}
	get saveChangesButton(): Locator {
		return this.confirmChangesDialog.getByRole('button', { name: 'Save changes' })
	}

	/** Opens the Edit User drawer and waits for its form to be ready. */
	async openEditDrawer(): Promise<void> {
		await this.editUserButton.click()
		await this.drawerFirstName.waitFor()
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
