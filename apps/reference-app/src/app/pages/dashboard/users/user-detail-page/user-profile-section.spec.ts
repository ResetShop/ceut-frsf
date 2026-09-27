import type { ManagedUser } from '@contracts/user/user.types'
import { mapManagedUserResponse } from '@domain/user-management/managed-user.mapper'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { createMockManagedUser } from '@providers/users/users.mock'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import { UserProfileSection } from './user-profile-section'

function buildUser(overrides: Partial<ManagedUser> = {}) {
	return mapManagedUserResponse(createMockManagedUser(overrides))
}

describe('UserProfileSection', () => {
	beforeEach(() => clearAllMocks())

	async function renderSection(overrides: Partial<ManagedUser> = {}) {
		return render(UserProfileSection, {
			inputs: { user: buildUser(overrides) },
			providers: [{ provide: Translation, useValue: mockTranslation }],
		})
	}

	it('renders the profile heading', async () => {
		await renderSection()

		expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
	})

	it('renders each profile field as a labelled read-only value', async () => {
		await renderSection({ firstName: 'Jane', lastName: 'Roe', email: 'jane@example.com' })

		const terms = screen.getAllByRole('term').map((term) => term.textContent?.trim())
		const values = screen.getAllByRole('definition').map((value) => value.textContent?.trim())
		expect(terms).toEqual(['First Name', 'Last Name', 'Email'])
		expect(values).toEqual(['Jane', 'Roe', 'jane@example.com'])
	})

	it('does not render editable inputs or a save button', async () => {
		await renderSection()

		expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})
})
