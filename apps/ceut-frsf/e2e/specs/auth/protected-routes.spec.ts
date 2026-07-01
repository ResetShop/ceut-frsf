import { expect, test } from '../../fixtures'

test.describe('Protected-route redirects (unauthenticated)', () => {
	test('visiting /dashboard redirects to login', async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page).toHaveURL(/\/auth\/login$/)
	})

	test('visiting /dashboard/users redirects to login', async ({ page }) => {
		await page.goto('/dashboard/users')
		await expect(page).toHaveURL(/\/auth\/login$/)
	})

	test('an unknown route redirects to login', async ({ page }) => {
		await page.goto('/this-route-does-not-exist')
		await expect(page).toHaveURL(/\/auth\/login$/)
	})
})
