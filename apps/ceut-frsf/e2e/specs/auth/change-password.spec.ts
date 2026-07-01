import { expect, test } from '../../fixtures'
import { STORAGE_STATE } from '../../fixtures/storage-state'
import { ChangePasswordPage } from '../../page-objects/change-password.page'

test.use({ storageState: STORAGE_STATE.admin })

test.describe('Change password', () => {
	test('renders both password fields', async ({ page }) => {
		const cp = new ChangePasswordPage(page)
		await cp.goto()
		await expect(cp.oldPasswordInput).toBeVisible()
		await expect(cp.newPasswordInput).toBeVisible()
	})

	test('submit is disabled until the new password meets the minimum length', async ({ page }) => {
		const cp = new ChangePasswordPage(page)
		await cp.goto()
		await expect(cp.submitButton).toBeDisabled()
		await cp.oldPasswordInput.fill('some-current-password')
		await cp.newPasswordInput.fill('short')
		await expect(cp.submitButton).toBeDisabled()
		await cp.newPasswordInput.fill('ValidPassword123!')
		await expect(cp.submitButton).toBeEnabled()
	})

	test('a wrong current password shows an error', async ({ page }) => {
		// Real backend call (non-mutating — the change is rejected). Returns OLD_PASSWORD_MISMATCH.
		const cp = new ChangePasswordPage(page)
		await cp.goto()
		await cp.oldPasswordInput.fill('definitely-not-the-password')
		await cp.newPasswordInput.fill('ValidPassword123!')
		await cp.submitButton.click()
		await expect(cp.errorAlert).toContainText('Your current password is incorrect')
	})

	test('a successful change navigates to the dashboard', async ({ page }) => {
		// Mock success so the shared admin password is not actually rotated (which would break other specs).
		await page.route('**/api/auth/change-password', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ message: 'Password changed' }),
			})
		})
		const cp = new ChangePasswordPage(page)
		await cp.goto()
		await cp.oldPasswordInput.fill('some-current-password')
		await cp.newPasswordInput.fill('ValidPassword123!')
		await cp.submitButton.click()
		await expect(page).toHaveURL(/\/dashboard$/)
		await page.unroute('**/api/auth/change-password')
	})
})
