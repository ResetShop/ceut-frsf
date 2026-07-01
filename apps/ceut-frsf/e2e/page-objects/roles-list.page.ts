import type { Locator, Page } from '@playwright/test'

/** Page object for the roles list (`/dashboard/authorization/roles`) and its create drawer + row actions. */
export class RolesListPage {
	constructor(private readonly page: Page) {}

	get heading(): Locator {
		return this.page.getByRole('heading', { name: 'Roles' })
	}
	get searchInput(): Locator {
		return this.page.getByRole('searchbox')
	}
	get createButton(): Locator {
		return this.page.getByRole('button', { name: 'Create Role' })
	}

	/** A table row whose accessible name contains the given text (e.g. a role name). */
	row(text: string): Locator {
		return this.page.getByRole('row').filter({ hasText: text })
	}
	async openRowMenu(text: string): Promise<void> {
		await this.row(text).getByRole('button', { name: 'Actions' }).click()
	}
	menuItem(name: string): Locator {
		return this.page.getByRole('menuitem', { name })
	}

	// --- Create / edit drawer (same field labels) ---
	get drawerName(): Locator {
		return this.page.getByLabel('Name')
	}
	get drawerCode(): Locator {
		return this.page.getByLabel('Code')
	}
	get drawerDescription(): Locator {
		return this.page.getByLabel('Description')
	}
	get drawerSubmit(): Locator {
		return this.page.getByRole('button', { name: 'Create', exact: true })
	}

	/** A confirm dialog's button (e.g. 'Delete') scoped to the dialog. */
	confirmButton(name: string): Locator {
		return this.page.getByRole('alertdialog').getByRole('button', { name })
	}

	async goto(): Promise<void> {
		await this.page.goto('/dashboard/authorization/roles')
	}
}
