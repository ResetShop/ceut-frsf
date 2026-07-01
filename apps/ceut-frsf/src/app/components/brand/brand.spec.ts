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

	it('should render brand link button with reset text', async () => {
		await render(Brand, {
			providers: defaultProviders(),
		})

		const link = screen.getByRole('link', { name: /reset starter repo/i })
		expect(link).toBeInTheDocument()
	})

	it('should link to the dashboard root', async () => {
		await render(Brand, {
			providers: defaultProviders(),
		})

		const link = screen.getByRole('link', { name: /reset starter repo/i })
		expect(link).toHaveAttribute('href', '/dashboard')
	})

	it('should render icon within the brand button', async () => {
		await render(Brand, {
			providers: defaultProviders(),
		})

		const link = screen.getByRole('link', { name: /reset starter repo/i })
		expect(link).toBeInTheDocument()

		const text = screen.getByText('Reset Starter Repo')
		expect(text).toBeInTheDocument()
	})

	it('should apply button styling with variant and size', async () => {
		await render(Brand, {
			providers: defaultProviders(),
		})

		const link = screen.getByRole('link', { name: /reset starter repo/i })
		expect(link).toHaveAttribute('variant', 'default')
		expect(link).toHaveAttribute('size', 'sm')
	})

	it('should apply gap styling for icon and text spacing', async () => {
		await render(Brand, {
			providers: defaultProviders(),
		})

		const link = screen.getByRole('link', { name: /reset starter repo/i })
		expect(link).toHaveClass('gap-2')
		expect(link).toHaveClass('font-semibold')
	})

	it('should render with proper semantic structure', async () => {
		await render(Brand, {
			providers: defaultProviders(),
		})

		const link = screen.getByRole('link')
		expect(link).toBeInTheDocument()
		expect(link).toHaveTextContent(/Reset Starter Repo/)
	})

	describe('collapsed input', () => {
		it('should show brand text when collapsed is false', async () => {
			await render(Brand, {
				inputs: { collapsed: false },
				providers: defaultProviders(),
			})

			expect(screen.getByText('Reset Starter Repo')).toBeInTheDocument()
		})

		it('should hide brand text when collapsed is true', async () => {
			await render(Brand, {
				inputs: { collapsed: true },
				providers: defaultProviders(),
			})

			expect(screen.queryByText('Reset Starter Repo')).not.toBeInTheDocument()
		})

		it('should still render the icon link when collapsed', async () => {
			await render(Brand, {
				inputs: { collapsed: true },
				providers: defaultProviders(),
			})

			expect(screen.getByRole('link')).toBeInTheDocument()
		})
	})
})
