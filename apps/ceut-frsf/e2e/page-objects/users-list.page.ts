import type { Locator, Page } from '@playwright/test'

/** Page object for the users list (`/dashboard/users`) and its create drawer + row actions. */
export class UsersListPage {
	constructor(private readonly page: Page) {}

	get heading(): Locator {
		return this.page.getByRole('heading', { name: 'Users' })
	}
	get searchInput(): Locator {
		return this.page.getByRole('searchbox')
	}
	get createButton(): Locator {
		return this.page.getByRole('button', { name: 'Create User' })
	}
	get pagination(): Locator {
		return this.page.getByRole('navigation', { name: 'Pagination' })
	}

	/** A table row whose accessible name contains the given text (e.g. a user's name or email). */
	row(text: string): Locator {
		return this.page.getByRole('row').filter({ hasText: text })
	}
	/** Open the ⋮ row-actions menu for the row matching `text`, then return the menu-item by name. */
	async openRowMenu(text: string): Promise<void> {
		await this.row(text).getByRole('button', { name: 'Actions' }).click()
	}
	menuItem(name: string): Locator {
		return this.page.getByRole('menuitem', { name })
	}

	// --- Create drawer ---
	get drawerFirstName(): Locator {
		return this.page.getByLabel('First Name')
	}
	get drawerLastName(): Locator {
		return this.page.getByLabel('Last Name')
	}
	get drawerEmail(): Locator {
		return this.page.getByLabel('Email')
	}
	get drawerSubmit(): Locator {
		return this.page.getByRole('button', { name: 'Create', exact: true })
	}

	/** A confirm dialog's button (e.g. 'Delete') scoped to the dialog. */
	confirmButton(name: string): Locator {
		return this.page.getByRole('alertdialog').getByRole('button', { name })
	}

	async goto(): Promise<void> {
		await this.page.goto('/dashboard/users')
	}
}
