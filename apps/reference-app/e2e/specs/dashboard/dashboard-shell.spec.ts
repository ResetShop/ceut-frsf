import { expect, test } from '../../fixtures'
import { STORAGE_STATE } from '../../fixtures/storage-state'
import { DashboardPage } from '../../page-objects/dashboard.page'

test.describe('Dashboard shell (admin)', () => {
	test.use({ storageState: STORAGE_STATE.admin })

	let dashboard: DashboardPage
	test.beforeEach(async ({ page }) => {
		dashboard = new DashboardPage(page)
		await dashboard.goto()
	})

	test('renders the sidebar nav with the admin modules and a breadcrumb', async () => {
		await expect(dashboard.sidebar).toBeVisible()
		await expect(dashboard.navLink('Users')).toBeVisible()
		await expect(dashboard.authorizationNav).toBeVisible()
		await expect(dashboard.navLink('Health')).toBeVisible()
		await expect(dashboard.sectionLabel('Administration')).toBeVisible()
		await expect(dashboard.sectionLabel('Maintenance')).toBeVisible()
		// Account and Settings are reached from the user menu, not the nav.
		await expect(dashboard.navLink('Account')).toHaveCount(0)
		await expect(dashboard.navLink('Settings')).toHaveCount(0)
		await expect(dashboard.breadcrumb).toBeVisible()
	})

	test('the user menu shows who is signed in and leads to the settings page', async ({ page }) => {
		await expect(dashboard.userMenuTrigger).toHaveAccessibleName('Administrador Sistema')
		await dashboard.userMenuTrigger.click()
		await dashboard.userMenuItem('Settings').click()

		await expect(page).toHaveURL(/\/dashboard\/settings$/)
	})

	test('keeps the sidebar expanded on desktop, with no control or shortcut to collapse it', async ({ page }) => {
		await expect(page.getByRole('button', { name: /collapse sidebar|expand sidebar/i })).toHaveCount(0)

		await page.keyboard.press('ControlOrMeta+b')

		await expect(dashboard.navLink('Health')).toBeVisible()
		await expect(dashboard.sectionLabel('Maintenance')).toBeVisible()
		await expect(dashboard.userMenuTrigger).toContainText('Administrador Sistema')
	})

	test('opens the mobile navigation drawer', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await dashboard.goto()
		// On mobile the nav is behind a hamburger.
		await expect(dashboard.openMenuButton).toBeVisible()
		await dashboard.openMenuButton.click()
		await expect(dashboard.navLink('Health')).toBeVisible()
	})

	test('the authorization landing page shows the Roles and Permissions cards', async ({ page }) => {
		await dashboard.goto('/dashboard/authorization')
		await expect(page.getByRole('heading', { name: 'Authorization' })).toBeVisible()
		// Match on the (unique) card descriptions to avoid colliding with sidebar sub-nav link text.
		await expect(page.getByText('Define roles and assign permissions', { exact: false })).toBeVisible()
		await expect(page.getByText('View and manage the granular permission definitions', { exact: false })).toBeVisible()
	})
})
