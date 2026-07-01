import { expect, test } from '../../fixtures'
import { ResetPasswordConfirmPage } from '../../page-objects/reset-password-confirm.page'

test.describe('Reset password confirm', () => {
	test('a missing token shows the invalid-link alert and disables submit', async ({ page }) => {
		const confirm = new ResetPasswordConfirmPage(page)
		await confirm.goto()
		await expect(confirm.missingTokenAlert).toBeVisible()
		await expect(confirm.submitButton).toBeDisabled()
	})

	test('with a token in the URL the new-password form is shown', async ({ page }) => {
		const confirm = new ResetPasswordConfirmPage(page)
		await confirm.goto('e2e-test-token')
		await expect(confirm.newPasswordInput).toBeVisible()
	})

	test('a successful reset navigates to login', async ({ page }) => {
		// Mock the backend so this exercises the form → store → navigation chain without a real token row.
		await page.route('**/api/auth/reset-password', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ message: 'Password reset successfully' }),
			})
		})
		const confirm = new ResetPasswordConfirmPage(page)
		await confirm.goto('e2e-test-token')
		await confirm.newPasswordInput.fill('ValidPassword123!')
		await confirm.submitButton.click()
		await expect(page).toHaveURL(/\/auth\/login$/)
		await page.unroute('**/api/auth/reset-password')
	})
})
