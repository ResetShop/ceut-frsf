import type { PermissionData } from '@contracts/role/role.types'
import { mapPermission } from '@domain/access/role.mapper'
import { mockTranslation, type TranslationStub } from '@providers/i18n/translation.mock'
import { createMockPermissionData } from '@providers/permissions/permissions.mock'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import { PermissionCard } from './permission-card'

describe('PermissionCard', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	async function renderCard(overrides: Partial<PermissionData> = {}, translation: TranslationStub = mockTranslation) {
		return render(PermissionCard, {
			inputs: { permission: mapPermission(createMockPermissionData(overrides)) },
			providers: [{ provide: Translation, useValue: translation }],
		})
	}

	it('renders the resource, action, and identifier', async () => {
		await renderCard({ resource: 'users', action: 'read' })

		expect(screen.getByText(/users · read/)).toBeInTheDocument()
		expect(screen.getByText('admin:users:read')).toBeInTheDocument()
	})

	it('falls back to the catalogue description when the identifier has no translation', async () => {
		await renderCard({ description: 'Can read user records' })

		expect(screen.getByText('Can read user records')).toBeInTheDocument()
	})

	it('renders the description in the active language', async () => {
		await renderCard(
			{ name: 'admin:users:read', description: 'View user details' },
			{
				instant: (key, fallback) =>
					key === 'PERMISSIONS.DESCRIPTIONS.admin:users:read' ? 'Ver detalles de usuario' : (fallback ?? key),
			},
		)

		expect(screen.getByText('Ver detalles de usuario')).toBeInTheDocument()
		expect(screen.queryByText('View user details')).not.toBeInTheDocument()
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
