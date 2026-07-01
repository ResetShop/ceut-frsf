import { expect, test } from '../../fixtures'
import { STORAGE_STATE } from '../../fixtures/storage-state'

test.use({ storageState: STORAGE_STATE.admin })

test.describe('Logout', () => {
	test('logout clears the session and returns to login', async ({ page }) => {
		await page.goto('/dashboard')
		await page.getByRole('button', { name: 'Logout' }).click()
		await expect(page).toHaveURL(/\/auth\/login$/)
	})

	test('after logout, navigating to the dashboard redirects to login', async ({ page }) => {
		await page.goto('/dashboard')
		await page.getByRole('button', { name: 'Logout' }).click()
		await expect(page).toHaveURL(/\/auth\/login$/)
		await page.goto('/dashboard')
		await expect(page).toHaveURL(/\/auth\/login$/)
	})
})
