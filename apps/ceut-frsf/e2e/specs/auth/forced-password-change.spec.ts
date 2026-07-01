import { expect, test } from '../../fixtures'
import { LoginPage } from '../../page-objects/login.page'
import { adminPassword, E2E_USERS } from '../../setup/db-seed'

// Exercised via the real login flow (client-side navigation), which is how a user actually reaches the
// forced-change guard: logging in navigates to /dashboard, where forcedPasswordChangeGuard redirects.
test.describe('Forced password change', () => {
	test('a must-change user is sent to the change-password page after logging in', async ({ page }) => {
		const login = new LoginPage(page)
		await login.goto()
		await login.login(E2E_USERS.mustChange, adminPassword())
		await expect(page).toHaveURL(/\/auth\/change-password$/)
	})

	test('the change-password form is shown and not redirected away (no loop)', async ({ page }) => {
		const login = new LoginPage(page)
		await login.goto()
		await login.login(E2E_USERS.mustChange, adminPassword())
		await expect(page).toHaveURL(/\/auth\/change-password$/)
		await expect(page.getByLabel('Current password')).toBeVisible()
		await expect(page.getByLabel('New password', { exact: true })).toBeVisible()
	})
})
