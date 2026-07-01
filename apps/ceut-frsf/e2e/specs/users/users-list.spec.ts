import { expect, test } from '../../fixtures'
import { STORAGE_STATE } from '../../fixtures/storage-state'
import { UsersListPage } from '../../page-objects/users-list.page'

// Mutating success paths are mocked (page.route, method-guarded) so neither browser project persists to
// the shared DB; reads (render/search/pagination/nav) hit the real backend.
test.describe('Users list (admin)', () => {
	test.use({ storageState: STORAGE_STATE.admin })

	let users: UsersListPage
	test.beforeEach(async ({ page }) => {
		users = new UsersListPage(page)
		await users.goto()
	})

	test('renders the users list with the seeded users', async () => {
		await expect(users.heading).toBeVisible()
		await expect(users.row('Administrador')).toBeVisible()
		await expect(users.row('Vera')).toBeVisible()
	})

	test('searches users by name', async () => {
		await users.searchInput.fill('Vera')
		await expect(users.row('Vera')).toBeVisible()
		await expect(users.row('Administrador')).toHaveCount(0)
	})

	test('shows the pagination control when users span more than one page', async () => {
		await expect(users.pagination).toBeVisible()
	})

	test('creates a user via the drawer and shows a success toast', async ({ page }) => {
		await page.route('**/api/users', async (route) => {
			if (route.request().method() === 'POST') {
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify({
						id: 9999,
						email: 'new@test.com',
						firstName: 'New',
						lastName: 'User',
						status: 'active',
						roles: [],
					}),
				})
				return
			}
			await route.continue()
		})
		await users.createButton.click()
		await users.drawerFirstName.fill('New')
		await users.drawerLastName.fill('User')
		// Value is irrelevant — the POST is mocked and never reaches the DB.
		await users.drawerEmail.fill('e2e-create-test@test.com')
		await users.drawerSubmit.click()
		await expect(page.getByText('User created successfully.')).toBeVisible()
	})

	test('deletes a user from the list with confirmation and a success toast', async ({ page }) => {
		await page.route(/\/api\/users\/\d+$/, async (route) => {
			if (route.request().method() === 'DELETE') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ message: 'User deleted successfully' }),
				})
				return
			}
			await route.continue()
		})
		await users.openRowMenu('Vera')
		await users.menuItem('Delete').click()
		await users.confirmButton('Delete').click()
		await expect(page.getByText('User deleted successfully.')).toBeVisible()
	})

	test('the Edit row action navigates to the user detail page', async ({ page }) => {
		await users.openRowMenu('Vera')
		await users.menuItem('Edit').click()
		await expect(page).toHaveURL(/\/dashboard\/users\/\d+$/)
		await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
	})
})

test.describe('Users list (permission gating)', () => {
	test.use({ storageState: STORAGE_STATE.noPermission })

	test('a no-permission user deep-linking /dashboard/users is redirected with a deny toast', async ({ page }) => {
		await page.goto('/dashboard/users')
		await expect(page).toHaveURL('/dashboard')
		await expect(page.getByText("You don't have permission to access that page.")).toBeVisible()
	})
})
