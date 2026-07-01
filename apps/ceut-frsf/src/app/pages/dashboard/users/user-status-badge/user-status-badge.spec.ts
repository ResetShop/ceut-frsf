import { UserStatus } from '@contracts/user/user.constants'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import { UserStatusBadge } from './user-status-badge'

describe('UserStatusBadge', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	async function renderBadge(status: UserStatus) {
		return render(UserStatusBadge, {
			inputs: { status },
			providers: [{ provide: Translation, useValue: mockTranslation }],
		})
	}

	it('renders the localized label for an active user', async () => {
		await renderBadge(UserStatus.ACTIVE)
		expect(screen.getByText('Active')).toBeInTheDocument()
	})

	it('renders the localized label for a disabled user', async () => {
		await renderBadge(UserStatus.DISABLED)
		expect(screen.getByText('Disabled')).toBeInTheDocument()
	})

	it('renders the localized label for a deleted user', async () => {
		await renderBadge(UserStatus.DELETED)
		expect(screen.getByText('Deleted')).toBeInTheDocument()
	})
})
