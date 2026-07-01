import type { Locator, Page } from '@playwright/test'

/** Page object for `/dashboard/settings` (the language selector lives here). */
export class SettingsPage {
	constructor(private readonly page: Page) {}

	/** The language `<app-select>` (ng-primitives sets role="combobox"). The FormField label isn't wired as
	 * the control's accessible name, so it can't be name-scoped; it's the only combobox on the settings page. */
	get languageSelect(): Locator {
		return this.page.getByRole('combobox')
	}
	/** The open select dropdown (ngpSelectDropdown carries no ARIA role; testid is its stable handle). */
	get languageDropdown(): Locator {
		return this.page.getByTestId('select-dropdown')
	}

	async goto(): Promise<void> {
		await this.page.goto('/dashboard/settings')
	}
}
