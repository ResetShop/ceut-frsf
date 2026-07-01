import { expect, test } from '../../fixtures'
import { ResetPasswordPage } from '../../page-objects/reset-password.page'

test.describe('Forgot password', () => {
	test('renders the request form', async ({ page }) => {
		const reset = new ResetPasswordPage(page)
		await reset.goto()
		await expect(reset.emailInput).toBeVisible()
		await expect(reset.submitButton).toBeVisible()
	})

	test('submitting a valid email shows the neutral confirmation', async ({ page }) => {
		const reset = new ResetPasswordPage(page)
		await reset.goto()
		await reset.emailInput.fill('someone@example.com')
		await reset.submitButton.click()
		await expect(reset.confirmation).toBeVisible()
	})

	test('back-to-login link returns to /auth/login', async ({ page }) => {
		const reset = new ResetPasswordPage(page)
		await reset.goto()
		await reset.backToLoginLink.click()
		await expect(page).toHaveURL(/\/auth\/login$/)
	})

	test('a rate-limited (429) response surfaces the countdown message', async ({ page }) => {
		// Synthetic 429 with Retry-After rather than exhausting the real per-IP limiter (which would
		// contaminate other specs sharing the loopback IP).
		await page.route('**/api/auth/forgot-password', async (route) => {
			await route.fulfill({
				status: 429,
				headers: { 'retry-after': '30' },
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Too many requests' }),
			})
		})
		const reset = new ResetPasswordPage(page)
		await reset.goto()
		await reset.emailInput.fill('someone@example.com')
		await reset.submitButton.click()
		await expect(reset.throttleMessage).toBeVisible()
		await page.unroute('**/api/auth/forgot-password')
	})
})
