import { expect, test } from '../../fixtures'
import { STORAGE_STATE } from '../../fixtures/storage-state'
import { RolesListPage } from '../../page-objects/roles-list.page'

// Mutating success paths are mocked (page.route, method-guarded) so the shared DB is never written.
test.describe('Roles list (admin)', () => {
	test.use({ storageState: STORAGE_STATE.admin })

	let roles: RolesListPage
	test.beforeEach(async ({ page }) => {
		roles = new RolesListPage(page)
		await roles.goto()
	})

	test('renders the roles list with the seeded roles', async () => {
		await expect(roles.heading).toBeVisible()
		await expect(roles.row('Administrator')).toBeVisible()
		await expect(roles.row('Restricted')).toBeVisible()
	})

	test('searches roles by name', async () => {
		await roles.searchInput.fill('Restricted')
		await expect(roles.row('Restricted')).toBeVisible()
		await expect(roles.row('Administrator')).toHaveCount(0)
	})

	test('creates a role with a success toast', async ({ page }) => {
		await page.route('**/api/access/roles', async (route) => {
			if (route.request().method() === 'POST') {
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify({
						id: 999,
						name: 'E2E Role',
						code: 'e2e-role',
						description: 'desc',
						removable: true,
						createdAt: null,
						updatedAt: null,
					}),
				})
				return
			}
			await route.continue()
		})
		await roles.createButton.click()
		await roles.drawerName.fill('E2E Role')
		await roles.drawerDescription.fill('Created in e2e')
		await roles.drawerSubmit.click()
		await expect(page.getByText('Role created successfully.')).toBeVisible()
	})

	test('opens the edit drawer with the role pre-filled', async ({ page }) => {
		await roles.openRowMenu('Restricted')
		await roles.menuItem('Edit').click()
		await expect(page.getByText('Edit Role', { exact: true })).toBeVisible()
		await expect(roles.drawerName).toHaveValue('Restricted')
		await expect(roles.drawerCode).toHaveValue('restricted')
	})

	test('deletes a removable role with confirmation and a success toast', async ({ page }) => {
		await page.route(/\/api\/access\/roles\/\d+$/, async (route) => {
			if (route.request().method() === 'DELETE') {
				await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
				return
			}
			await route.continue()
		})
		await roles.openRowMenu('Restricted')
		await roles.menuItem('Delete').click()
		await roles.confirmButton('Delete').click()
		await expect(page.getByText('Role deleted successfully.')).toBeVisible()
	})

	test('a non-removable role exposes Edit but not Delete', async () => {
		await roles.openRowMenu('Administrator')
		await expect(roles.menuItem('Edit')).toBeVisible()
		await expect(roles.menuItem('Delete')).toHaveCount(0)
	})
})

test.describe('Roles (permission gating)', () => {
	test.use({ storageState: STORAGE_STATE.noPermission })

	test('a no-permission user deep-linking the roles page is redirected with a deny toast', async ({ page }) => {
		await page.goto('/dashboard/authorization/roles')
		await expect(page).toHaveURL('/dashboard')
		await expect(page.getByText("You don't have permission to access that page.")).toBeVisible()
	})
})
