import { expect, test } from '../../fixtures'
import { LoginPage } from '../../page-objects/login.page'
import { adminPassword, E2E_USERS } from '../../setup/db-seed'

test.describe('Login', () => {
	test('valid credentials redirect to the dashboard', async ({ page }) => {
		const login = new LoginPage(page)
		await login.goto()
		await login.login(E2E_USERS.admin, adminPassword())
		await expect(page).toHaveURL(/\/dashboard$/)
	})

	test('invalid credentials show an error alert', async ({ page }) => {
		const login = new LoginPage(page)
		await login.goto()
		// A non-existent account avoids incrementing a real user's failed-attempt/lockout counter.
		await login.login('nobody@example.com', 'wrong-password-1234')
		await expect(login.errorAlert).toContainText('Email or password is incorrect')
	})

	test('submit is disabled until both fields are valid', async ({ page }) => {
		const login = new LoginPage(page)
		await login.goto()
		await expect(login.submitButton).toBeDisabled()
		await login.emailInput.fill(E2E_USERS.admin)
		await login.passwordInput.fill(adminPassword())
		await expect(login.submitButton).toBeEnabled()
	})

	test('forgot-password link navigates to the reset-password page', async ({ page }) => {
		const login = new LoginPage(page)
		await login.goto()
		await login.forgotPasswordLink.click()
		await expect(page).toHaveURL(/\/auth\/reset-password$/)
	})
})
