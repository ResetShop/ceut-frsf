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
		await expect(dashboard.navLink('Settings')).toBeVisible()
		await expect(dashboard.navLink('Health')).toBeVisible()
		await expect(dashboard.sectionLabel('Administration')).toBeVisible()
		await expect(dashboard.breadcrumb).toBeVisible()
	})

	test('collapses and expands the sidebar', async () => {
		await expect(dashboard.collapseButton).toBeVisible()
		await dashboard.collapseButton.click()
		await expect(dashboard.expandButton).toBeVisible()
		await dashboard.expandButton.click()
		await expect(dashboard.collapseButton).toBeVisible()
	})

	test('opens the mobile navigation drawer', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await dashboard.goto()
		// Collapse/expand controls are desktop-only; on mobile the nav is behind a hamburger.
		await expect(dashboard.openMenuButton).toBeVisible()
		await dashboard.openMenuButton.click()
		await expect(dashboard.navLink('Settings')).toBeVisible()
	})

	test('the authorization landing page shows the Roles and Permissions cards', async ({ page }) => {
		await dashboard.goto('/dashboard/authorization')
		await expect(page.getByRole('heading', { name: 'Authorization' })).toBeVisible()
		// Match on the (unique) card descriptions to avoid colliding with sidebar sub-nav link text.
		await expect(page.getByText('Define roles and assign permissions', { exact: false })).toBeVisible()
		await expect(page.getByText('View and manage the granular permission definitions', { exact: false })).toBeVisible()
	})
})
