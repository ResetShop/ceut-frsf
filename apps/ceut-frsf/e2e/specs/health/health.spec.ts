import { expect, test } from '../../fixtures'
import { STORAGE_STATE } from '../../fixtures/storage-state'
import { HealthPage } from '../../page-objects/health.page'

// Read-only page backed by the live GET /api/health/v1 (the seeded test DB is up, so it reports healthy).
test.describe('Health', () => {
	test.use({ storageState: STORAGE_STATE.admin })

	let health: HealthPage
	test.beforeEach(async ({ page }) => {
		health = new HealthPage(page)
		await health.goto()
	})

	test('renders the health status and database check from the API', async () => {
		await expect(health.heading).toBeVisible()
		await expect(health.checksHeading).toBeVisible()
		await expect(health.databaseHeading).toBeVisible()
		// The overall status (first badge) and the database check (second) both report 'healthy' against the
		// live backend. Asserting the two positionally is robust if further checks are added later.
		await expect(health.healthyBadge.nth(0)).toBeVisible()
		await expect(health.healthyBadge.nth(1)).toBeVisible()
	})
})

// /dashboard/health never calls provideToast(), so the root toast bridge is dormant on a cold load.
// A 403 here must still render the forbidden toast — the interceptor activates the bridge on demand.
test.describe('Health — forbidden API response surfaces a toast', () => {
	test.use({ storageState: STORAGE_STATE.admin })

	test('a forbidden API response surfaces a toast even with no prior toast-route navigation', async ({ page }) => {
		await page.route('**/api/health/v1', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 403,
					contentType: 'application/json',
					body: JSON.stringify({ message: 'Forbidden' }),
				})
				return
			}
			await route.continue()
		})

		await page.goto('/dashboard/health')

		// The toast appears as soon as the 403 lands — well within the 5s auto-dismiss window, and Playwright's
		// 15s expect.timeout is the ceiling. `exact` matches the toast-message locator pattern used elsewhere.
		await expect(page.getByText("You don't have permission to perform this action", { exact: true })).toBeVisible()
	})
})
