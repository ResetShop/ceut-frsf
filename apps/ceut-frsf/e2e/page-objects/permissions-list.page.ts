import type { Locator, Page } from '@playwright/test'

/** Page object for the read-only permissions list (`/dashboard/authorization/permissions`). */
export class PermissionsListPage {
	constructor(private readonly page: Page) {}

	get heading(): Locator {
		return this.page.getByRole('heading', { name: 'Permissions' })
	}
	get description(): Locator {
		return this.page.getByText('module:resource:action')
	}
	get table(): Locator {
		return this.page.getByRole('table')
	}
	/** A permission identifier badge (e.g. 'admin:users:read'), rendered in the table. */
	identifier(value: string): Locator {
		return this.page.getByText(value, { exact: true })
	}

	async goto(): Promise<void> {
		await this.page.goto('/dashboard/authorization/permissions')
	}
}
