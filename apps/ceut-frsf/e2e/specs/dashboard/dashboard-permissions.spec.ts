import { expect, test } from '../../fixtures'
import { STORAGE_STATE } from '../../fixtures/storage-state'
import { DashboardPage } from '../../page-objects/dashboard.page'

const ACCESS_DENIED = "You don't have permission to access that page."

test.describe('Dashboard shell — no-permission user', () => {
	test.use({ storageState: STORAGE_STATE.noPermission })

	let dashboard: DashboardPage
	test.beforeEach(async ({ page }) => {
		dashboard = new DashboardPage(page)
		await dashboard.goto()
	})

	test('filters the sidebar to only the accessible modules', async () => {
		await expect(dashboard.navLink('Settings')).toBeVisible()
		await expect(dashboard.navLink('Health')).toBeVisible()
		await expect(dashboard.navLink('Users')).toHaveCount(0)
		await expect(dashboard.authorizationNav).toHaveCount(0)
		await expect(dashboard.sectionLabel('Administration')).toHaveCount(0)
	})

	test('shows the no-module-access empty state with unguarded nav still present', async () => {
		await expect(dashboard.noAccessTitle).toBeVisible()
		await expect(dashboard.navLink('Settings')).toBeVisible()
	})

	test('deep-linking a forbidden route redirects to /dashboard with a one-time access-denied toast', async ({
		page,
	}) => {
		await page.goto('/dashboard/users')
		await expect(page).toHaveURL('/dashboard')
		// Shown exactly once: permissionGuard fires a single toast per denied navigation and the /dashboard
		// redirect target is gated only by authGuard, so the redirected navigation can't re-fire it.
		await expect(dashboard.toast(ACCESS_DENIED)).toBeVisible()
	})
})

test.describe('Dashboard shell — admin (inverse)', () => {
	test.use({ storageState: STORAGE_STATE.admin })

	test('an admin sees the Administration section and no empty-state alert', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()
		await expect(dashboard.sectionLabel('Administration')).toBeVisible()
		await expect(dashboard.navLink('Users')).toBeVisible()
		await expect(dashboard.noAccessTitle).toHaveCount(0)
	})
})
