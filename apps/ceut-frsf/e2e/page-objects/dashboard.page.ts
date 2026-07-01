import type { Locator, Page } from '@playwright/test'

/** Page object for the dashboard shell (sidebar nav, breadcrumb, collapse/mobile-drawer, empty state). */
export class DashboardPage {
	constructor(private readonly page: Page) {}

	get sidebar(): Locator {
		return this.page.getByRole('complementary')
	}
	get breadcrumb(): Locator {
		return this.page.getByRole('navigation', { name: 'Breadcrumb' })
	}
	get collapseButton(): Locator {
		return this.page.getByRole('button', { name: 'Collapse sidebar' })
	}
	get expandButton(): Locator {
		return this.page.getByRole('button', { name: 'Expand sidebar' })
	}
	get openMenuButton(): Locator {
		return this.page.getByRole('button', { name: 'Open navigation menu' })
	}
	/** The header theme toggle, named for the mode it switches TO ('dark' when light, 'light' when dark). */
	themeToggle(switchesTo: 'dark' | 'light'): Locator {
		return this.page.getByRole('button', { name: `Switch to ${switchesTo} mode` })
	}
	get noAccessTitle(): Locator {
		// The no-module-access empty state renders <div appAlert> (role="status") with this title;
		// scoping to role="status" also asserts the ARIA contract and avoids any future text collision.
		return this.page.getByRole('status').getByText('No module access')
	}

	/** A sidebar nav link (exact name), e.g. 'Users', 'Settings', 'Health'. */
	navLink(name: string): Locator {
		return this.page.getByRole('link', { name, exact: true })
	}
	/** The expandable 'Authorization' nav group is a button, not a link. */
	get authorizationNav(): Locator {
		return this.page.getByRole('button', { name: 'Authorization', exact: true })
	}
	/** A sidebar section label (plain text), e.g. 'Administration', 'Settings & Maintenance'. Scoped to the
	 * sidebar so it doesn't collide with the dashboard-home page, which repeats group names as <h2> headings. */
	sectionLabel(name: string): Locator {
		return this.sidebar.getByText(name, { exact: true })
	}
	/** A toast notification matched by its message text. */
	toast(message: string): Locator {
		return this.page.getByText(message, { exact: true })
	}

	async goto(path = '/dashboard'): Promise<void> {
		await this.page.goto(path)
	}
}
