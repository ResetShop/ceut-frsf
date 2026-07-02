import type { Locator, Page } from '@playwright/test'

/** Page object for the public CEUT portal landing page (`/`). */
export class LandingPage {
	constructor(private readonly page: Page) {}

	get skipLink(): Locator {
		return this.page.getByRole('link', { name: 'Skip to main content' })
	}
	get heroHeading(): Locator {
		return this.page.getByRole('heading', { name: 'Your faculty, all in one place', level: 1 })
	}
	get eyebrow(): Locator {
		return this.page.getByText('Student Center · UTN FRSF')
	}
	get searchBox(): Locator {
		return this.page.getByRole('searchbox')
	}
	get brandLogoLink(): Locator {
		return this.page.getByRole('link', { name: 'CEUT FRSF' })
	}
	get headerInstagramLink(): Locator {
		return this.page.getByRole('link', { name: 'Contact us on Instagram' })
	}
	get libraryCard(): Locator {
		return this.page.getByRole('heading', { name: 'CEUT Library' })
	}
	get campusCard(): Locator {
		return this.page.getByRole('heading', { name: 'Virtual Campus' })
	}
	get emptyState(): Locator {
		return this.page.getByText(/no results found for/i)
	}
	get themeToggle(): Locator {
		return this.page.getByRole('button', { name: /switch to (light|dark) mode/i })
	}
	get signInLink(): Locator {
		return this.page.getByRole('link', { name: 'Sign in' })
	}
	get footer(): Locator {
		return this.page.getByRole('contentinfo')
	}
	get footerInstagramLink(): Locator {
		return this.page.getByRole('link', { name: 'Follow us on Instagram' })
	}
	get footerDiscordLink(): Locator {
		return this.page.getByRole('link', { name: 'Join our Discord' })
	}
	get dashboardLink(): Locator {
		return this.page.getByRole('link', { name: 'Go to dashboard' })
	}

	async goto(): Promise<void> {
		await this.page.goto('/')
	}

	async search(query: string): Promise<void> {
		await this.searchBox.fill(query)
	}
}
