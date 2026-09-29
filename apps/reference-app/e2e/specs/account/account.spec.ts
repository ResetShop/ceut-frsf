import { expect, test } from '../../fixtures'
import { AccountPage } from '../../page-objects/account.page'
import { DashboardPage } from '../../page-objects/dashboard.page'
import { LoginPage } from '../../page-objects/login.page'
import { accountEditorEmail, adminPassword } from '../../setup/db-seed'

// Renames persist through the real API (no route mocks): reading the new name back after a full reload
// is the point. Each browser project signs in as its own seeded non-admin user so parallel projects
// never rename the same row.
test.describe('Account page — non-admin user', () => {
	const email = () => accountEditorEmail(test.info().project.name)

	let account: AccountPage
	test.beforeEach(async ({ page }) => {
		account = new AccountPage(page)
		const login = new LoginPage(page)
		await login.goto()
		await login.login(email(), adminPassword())
		await expect(page).toHaveURL(/\/dashboard$/)
	})

	test('reaches the account page from the user menu without any admin permission', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.userMenuTrigger.click()
		await dashboard.userMenuItem('Account').click()

		await expect(page).toHaveURL(/\/account$/)
		await expect(account.heading).toBeVisible()
		await expect(dashboard.breadcrumb).toContainText('Account')
	})

	test('shows the email as read-only text next to the editable name fields', async () => {
		await account.goto()

		await expect(account.profile.getByText(email(), { exact: true })).toBeVisible()
		await expect(account.textboxes).toHaveCount(2)
		await expect(account.firstNameInput).toBeEditable()
		await expect(account.lastNameInput).toBeEditable()
	})

	test('a confirmed rename is saved and survives a full page reload', async ({ page }) => {
		const firstName = `Grace${Date.now()}`
		await account.goto()

		await account.renameFirstName(firstName)

		await expect(account.successToast).toBeVisible()
		await expect(account.firstNameInput).toHaveValue(firstName)

		await page.reload()

		await expect(account.firstNameInput).toHaveValue(firstName)
	})

	test('cancelling the confirmation saves nothing', async ({ page }) => {
		const cancelled = `Cancelled${Date.now()}`
		const profileUpdates: string[] = []
		page.on('request', (request) => {
			if (request.method() === 'PATCH' && request.url().endsWith('/api/users/me')) {
				profileUpdates.push(request.url())
			}
		})
		await account.goto()

		await account.firstNameInput.fill(cancelled)
		await account.reviewButton.click()
		await account.cancelButton.click()

		await expect(account.confirmDialog).toBeHidden()
		await expect(account.firstNameInput).toHaveValue(cancelled)
		expect(profileUpdates).toEqual([])

		await page.reload()

		await expect(account.firstNameInput).not.toHaveValue(cancelled)
	})

	test('an empty first name shows a required error and blocks review', async () => {
		await account.goto()

		await account.firstNameInput.fill('')
		await account.firstNameInput.blur()

		await expect(account.fieldError('This field is required')).toBeVisible()
		await expect(account.reviewButton).toBeDisabled()
	})

	test('a whitespace-only last name shows a required error and blocks review', async () => {
		await account.goto()

		await account.lastNameInput.fill('   ')
		await account.lastNameInput.blur()

		await expect(account.fieldError('This field is required')).toBeVisible()
		await expect(account.reviewButton).toBeDisabled()
	})

	test('a name stops accepting input at 100 characters', async () => {
		await account.goto()

		await account.firstNameInput.fill('A'.repeat(101))

		await expect(account.firstNameInput).toHaveValue('A'.repeat(100))
	})
})
