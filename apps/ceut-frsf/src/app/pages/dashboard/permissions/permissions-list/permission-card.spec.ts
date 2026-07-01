import type { PermissionData } from '@contracts/role/role.types'
import { mapPermission } from '@domain/access/role.mapper'
import { createMockPermissionData } from '@providers/permissions/permissions.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import { PermissionCard } from './permission-card'

describe('PermissionCard', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	async function renderCard(overrides: Partial<PermissionData> = {}) {
		return render(PermissionCard, {
			inputs: { permission: mapPermission(createMockPermissionData(overrides)) },
		})
	}

	it('renders the resource, action, and identifier', async () => {
		await renderCard({ resource: 'users', action: 'read' })

		expect(screen.getByText(/users · read/)).toBeInTheDocument()
		expect(screen.getByText('admin:users:read')).toBeInTheDocument()
	})

	it('renders the description when present', async () => {
		await renderCard({ description: 'Can read user records' })

		expect(screen.getByText('Can read user records')).toBeInTheDocument()
	})

	it('does not render a description paragraph when description is null', async () => {
		await renderCard({ description: null })

		// The card still renders the identifier and resource/action header
		expect(screen.getByText(/·/)).toBeInTheDocument()
	})

	it('does not render any action buttons', async () => {
		await renderCard()

		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})
})
