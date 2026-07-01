import { expect, test } from '../../fixtures'
import { STORAGE_STATE } from '../../fixtures/storage-state'

test.use({ storageState: STORAGE_STATE.admin })

test.describe('Token refresh', () => {
	test('a transient 401 on /api/auth/me is recovered by the refresh interceptor', async ({ page }) => {
		// Force the first session-resolution call to 401 (as an expired access token would). The Angular
		// tokenRefreshInterceptor should refresh and retry transparently, keeping the user on the dashboard.
		let firstMeCall = true
		await page.route('**/api/auth/me', async (route) => {
			if (firstMeCall) {
				firstMeCall = false
				await route.fulfill({
					status: 401,
					contentType: 'application/json',
					body: JSON.stringify({ code: 'TOKEN_EXPIRED', message: 'Token expired' }),
				})
				return
			}
			await route.continue()
		})

		await page.goto('/dashboard')
		await expect(page).toHaveURL(/\/dashboard$/)
		await page.unroute('**/api/auth/me')
	})
})
