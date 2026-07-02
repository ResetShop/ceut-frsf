import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { fireEvent, render, screen } from '@testing-library/angular'
import { PortalSearchBar } from './portal-search-bar'

describe('PortalSearchBar', () => {
	beforeEach(() => clearAllMocks())

	const setup = (value = '') => render(PortalSearchBar, { inputs: { value }, providers: [provideTranslationMock()] })

	it('renders a search box with the translated placeholder', async () => {
		await setup()

		expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Search resources, scholarships, tools...')
	})

	it('reflects the bound value', async () => {
		await setup('becas')

		expect(screen.getByRole('searchbox')).toHaveValue('becas')
	})

	it('updates the value model as the user types', async () => {
		const { fixture } = await setup()

		fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'campus' } })

		expect(fixture.componentInstance.value()).toBe('campus')
	})
})
