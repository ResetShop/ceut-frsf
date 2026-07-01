import type { Locator, Page } from '@playwright/test'

/** Page object for the health page (`/dashboard/health`), which renders `GET /api/health/v1`. */
export class HealthPage {
	constructor(private readonly page: Page) {}

	get heading(): Locator {
		return this.page.getByRole('heading', { name: 'Application Health Checker' })
	}
	get checksHeading(): Locator {
		return this.page.getByRole('heading', { name: 'Checks' })
	}
	get databaseHeading(): Locator {
		return this.page.getByRole('heading', { name: 'Database' })
	}
	/** A 'healthy' status badge (the overall status and the database check each render one). */
	get healthyBadge(): Locator {
		return this.page.getByText('healthy', { exact: true })
	}

	async goto(): Promise<void> {
		await this.page.goto('/dashboard/health')
	}
}
