import { provideRouter } from '@angular/router'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import { Brand } from './brand'

describe('Brand', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	const defaultProviders = () => [provideRouter([])]

	it('should create the brand component', async () => {
		const { fixture } = await render(Brand, {
			providers: defaultProviders(),
		})

		expect(fixture.componentInstance).toBeTruthy()
	})

	it('should render the brand link with the CEUT FRSF accessible name', async () => {
		await render(Brand, {
			providers: defaultProviders(),
		})

		expect(screen.getByRole('link', { name: 'CEUT FRSF' })).toBeInTheDocument()
	})

	it('should link to the dashboard root', async () => {
		await render(Brand, {
			providers: defaultProviders(),
		})

		expect(screen.getByRole('link', { name: 'CEUT FRSF' })).toHaveAttribute('href', '/dashboard')
	})

	it('should apply button styling with variant and size', async () => {
		await render(Brand, {
			providers: defaultProviders(),
		})

		const link = screen.getByRole('link', { name: 'CEUT FRSF' })
		expect(link).toHaveAttribute('variant', 'default')
		expect(link).toHaveAttribute('size', 'sm')
	})

	it('should apply gap and weight styling for the logo layout', async () => {
		await render(Brand, {
			providers: defaultProviders(),
		})

		const link = screen.getByRole('link', { name: 'CEUT FRSF' })
		expect(link).toHaveClass('gap-2')
		expect(link).toHaveClass('font-semibold')
	})

	describe('collapsed input', () => {
		it('should render the full logo when expanded', async () => {
			await render(Brand, {
				inputs: { collapsed: false },
				providers: defaultProviders(),
			})

			expect(screen.getByRole('img', { name: 'CEUT FRSF' })).toHaveAttribute('src', 'logo/ceut-logo.svg')
		})

		it('should render the compact icon when collapsed', async () => {
			await render(Brand, {
				inputs: { collapsed: true },
				providers: defaultProviders(),
			})

			expect(screen.getByRole('img', { name: 'CEUT FRSF' })).toHaveAttribute('src', 'logo/ceut-icon.png')
		})

		it('should expose a single accessible name in both states (no duplicate announcement)', async () => {
			const { rerender } = await render(Brand, {
				inputs: { collapsed: false },
				providers: defaultProviders(),
			})

			expect(screen.getByRole('link', { name: 'CEUT FRSF' })).toBeInTheDocument()

			await rerender({ inputs: { collapsed: true } })

			expect(screen.getByRole('link', { name: 'CEUT FRSF' })).toBeInTheDocument()
		})
	})
})
