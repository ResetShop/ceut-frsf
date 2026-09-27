import { render, screen } from '@testing-library/angular'
import { Avatar } from './avatar'

describe('Avatar', () => {
	it('renders the initials it is given', async () => {
		await render(Avatar, { inputs: { initials: 'AL' } })

		expect(screen.getByText('AL')).toBeInTheDocument()
	})

	it('updates when the initials change', async () => {
		const { rerender } = await render(Avatar, { inputs: { initials: 'AL' } })

		await rerender({ inputs: { initials: 'GH' } })

		expect(screen.getByText('GH')).toBeInTheDocument()
		expect(screen.queryByText('AL')).not.toBeInTheDocument()
	})

	it('is hidden from assistive technology, since the name it stands for is announced elsewhere', async () => {
		await render(Avatar, { inputs: { initials: 'AL' } })

		expect(screen.getByText('AL')).toHaveAttribute('aria-hidden', 'true')
	})
})
