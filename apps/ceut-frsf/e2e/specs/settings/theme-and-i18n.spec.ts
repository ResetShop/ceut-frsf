import { expect, test } from '../../fixtures'
import { STORAGE_STATE } from '../../fixtures/storage-state'
import { DashboardPage } from '../../page-objects/dashboard.page'
import { SettingsPage } from '../../page-objects/settings.page'

test.use({ storageState: STORAGE_STATE.admin })

test.describe('Theme toggle', () => {
	let dashboard: DashboardPage
	test.beforeEach(async ({ page }) => {
		dashboard = new DashboardPage(page)
		await dashboard.goto('/dashboard')
	})

	test('toggles light↔dark and persists across a reload', async ({ page }) => {
		const html = page.locator('html')
		// Default (no stored preference, light color-scheme) is light.
		await expect(html).not.toHaveClass(/dark/)
		await expect(dashboard.themeToggle('dark')).toBeVisible()

		await dashboard.themeToggle('dark').click()
		await expect(html).toHaveClass(/dark/)

		// ThemeProvider persists to localStorage['theme-preference']; the fixture only seeds the language
		// key, so a reload keeps the dark theme. Wait for DOMContentLoaded (not the full 'load' event, which
		// can hang on the SSR dev server) — the theme is applied on DOM ready.
		await page.reload({ waitUntil: 'domcontentloaded' })
		await expect(html).toHaveClass(/dark/)
		await expect(dashboard.themeToggle('light')).toBeVisible()
	})
})

test.describe('Language selector', () => {
	let settings: SettingsPage
	test.beforeEach(async ({ page }) => {
		settings = new SettingsPage(page)
		await settings.goto()
	})

	test('switches the UI to Spanish and persists the choice', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

		await settings.languageSelect.click()
		await settings.languageDropdown.getByText('Spanish').click()

		// The UI re-renders in Spanish (TranslatePipe reacts to the language change).
		await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
		// Fixture re-seeds 'app_language'='en' on each page load, so assert the stored value directly.
		const stored = await page.evaluate(() => window.localStorage.getItem('app_language'))
		expect(stored).toBe('es')
	})
})
