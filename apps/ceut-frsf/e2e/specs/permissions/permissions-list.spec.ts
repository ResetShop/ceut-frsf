import { expect, test } from '../../fixtures'
import { STORAGE_STATE } from '../../fixtures/storage-state'
import { PermissionsListPage } from '../../page-objects/permissions-list.page'

// Permissions are read-only (no create/edit/delete), so every test reads the real backend.
test.describe('Permissions list (admin)', () => {
	test.use({ storageState: STORAGE_STATE.admin })

	let permissions: PermissionsListPage
	test.beforeEach(async ({ page }) => {
		permissions = new PermissionsListPage(page)
		await permissions.goto()
	})

	test('renders the read-only permissions list', async ({ page }) => {
		await expect(permissions.heading).toBeVisible()
		await expect(permissions.description).toBeVisible()
		await expect(permissions.table).toBeVisible()
	})

	test('shows seeded permission identifiers', async () => {
		// A permission that must exist (it gates the users route).
		await expect(permissions.identifier('admin:users:read')).toBeVisible()
	})
})

test.describe('Permissions list (permission gating)', () => {
	test.use({ storageState: STORAGE_STATE.noPermission })

	test('a no-permission user deep-linking the permissions page is redirected', async ({ page }) => {
		await page.goto('/dashboard/authorization/permissions')
		// Redirect is the deterministic, security-critical assertion. The transient access-denied toast was
		// observed to flake here (it auto-dismissed before the assertion polled on a slower run); a longer
		// timeout can't help once it's gone. The toast is covered canonically by the dashboard-shell deny spec.
		await expect(page).toHaveURL('/dashboard')
	})
})
