import { provideMockTheme } from '@resetshop/angular-core/theme/theme.mock'
import { render, screen } from '@testing-library/angular'
import { userEvent } from '@testing-library/user-event'
import { ThemeToggle } from './theme-toggle'

describe('ThemeToggle', () => {
	it('should render the theme toggle button', async () => {
		await render(ThemeToggle, {
			providers: [provideMockTheme(false)],
		})

		const button = screen.getByRole('button')
		expect(button).toBeInTheDocument()
	})

	it('should display sun icon when in light mode', async () => {
		await render(ThemeToggle, {
			providers: [provideMockTheme(false)],
		})

		const button = screen.getByRole('button')
		expect(button).toBeInTheDocument()
		expect(button).toHaveAttribute('aria-label', 'Switch to dark mode')
	})

	it('should display moon icon when in dark mode', async () => {
		await render(ThemeToggle, {
			providers: [provideMockTheme(true)],
		})

		const button = screen.getByRole('button')
		expect(button).toBeInTheDocument()
		expect(button).toHaveAttribute('aria-label', 'Switch to light mode')
	})

	it('should call toggleTheme when button is clicked', async () => {
		const user = userEvent.setup()
		await render(ThemeToggle, {
			providers: [provideMockTheme(false)],
		})

		const button = screen.getByRole('button')
		await user.click(button)

		expect(button).toHaveAttribute('aria-label', 'Switch to light mode')
	})

	it('should have ghost variant styling', async () => {
		await render(ThemeToggle, {
			providers: [provideMockTheme(false)],
		})

		const button = screen.getByRole('button')
		expect(button).toHaveAttribute('variant', 'ghost')
		expect(button).toHaveAttribute('size', 'sm')
	})

	it('should have accessible aria labels', async () => {
		await render(ThemeToggle, {
			providers: [provideMockTheme(false)],
		})

		const button = screen.getByRole('button', { name: /switch to dark mode/i })
		expect(button).toBeInTheDocument()
	})
})
