import { expect, test } from '../../fixtures'
import { STORAGE_STATE } from '../../fixtures/storage-state'
import { DashboardPage } from '../../page-objects/dashboard.page'

test.use({ storageState: STORAGE_STATE.admin })

test.describe('Logout', () => {
	async function logOutFromTheUserMenu(dashboard: DashboardPage): Promise<void> {
		await dashboard.userMenuTrigger.click()
		await dashboard.userMenuItem('Logout').click()
	}

	test('logout clears the session and returns to login', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()
		await logOutFromTheUserMenu(dashboard)
		await expect(page).toHaveURL(/\/auth\/login$/)
	})

	test('after logout, navigating to the dashboard redirects to login', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()
		await logOutFromTheUserMenu(dashboard)
		await expect(page).toHaveURL(/\/auth\/login$/)
		await page.goto('/dashboard')
		await expect(page).toHaveURL(/\/auth\/login$/)
	})
})
