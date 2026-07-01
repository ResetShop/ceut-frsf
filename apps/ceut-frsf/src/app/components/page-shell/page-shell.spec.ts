import { Component, input } from '@angular/core'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { parseDurationToMs } from '@resetshop/util'
import { advanceTimersByTimeAsync, clearAllMocks, useFakeTimers, useRealTimers } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import { PageShell } from './page-shell'

const PAGE_SHELL_MIN_DISPLAY = '1s'

@Component({
	selector: 'app-test-host',
	standalone: true,
	imports: [PageShell],
	template: `
		<app-page-shell [title]="title()" [loading]="loading()" [error]="error()">
			<p pageDescription>{{ description() }}</p>
			<div data-testid="page-content">Content here</div>
		</app-page-shell>
	`,
})
class TestHost {
	public readonly title = input('Test Page')
	public readonly description = input('A test description')
	public readonly loading = input(false)
	public readonly error = input<string | null>(null)
}

@Component({
	selector: 'app-test-host-no-description',
	standalone: true,
	imports: [PageShell],
	template: `
		<app-page-shell [loading]="false" title="No Desc">
			<div data-testid="page-content">Content here</div>
		</app-page-shell>
	`,
})
class TestHostNoDescription {}

@Component({
	selector: 'app-test-host-with-actions',
	standalone: true,
	imports: [PageShell],
	template: `
		<app-page-shell [loading]="loading()" title="With Actions">
			<div pageActionsSkeleton data-testid="page-actions-skeleton">Skeleton placeholders</div>
			<div pageActions data-testid="page-actions">Search and buttons here</div>
			<div data-testid="page-content">Content here</div>
		</app-page-shell>
	`,
})
class TestHostWithActions {
	public readonly loading = input(false)
}

describe('PageShell', () => {
	beforeEach(() => {
		clearAllMocks()
		useFakeTimers()
	})

	afterEach(() => {
		useRealTimers()
	})

	it('should render the title', async () => {
		await render(TestHost, { providers: [provideTranslationMock()] })
		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))

		expect(screen.getByRole('heading', { level: 1, name: 'Test Page' })).toBeInTheDocument()
	})

	it('should apply responsive text-xl sm:text-2xl classes to the title heading', async () => {
		// jsdom cannot evaluate media queries; assert class-presence as a regression guard for the
		// mobile-first sizing rule. Visual breakpoint behaviour is covered by the
		// `MobileLayout` Storybook story.
		await render(TestHost, { providers: [provideTranslationMock()] })
		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))

		const heading = screen.getByRole('heading', { level: 1, name: 'Test Page' })
		expect(heading).toHaveClass('text-xl')
		expect(heading).toHaveClass('sm:text-2xl')
	})

	it('should apply responsive space-y-4 sm:space-y-6 classes to the outer wrapper', async () => {
		// Regression guard for the mobile-first section spacing rule on the outer page-shell
		// wrapper. Visual breakpoint behaviour is covered by the `MobileLayout` Storybook story.
		await render(TestHost, { providers: [provideTranslationMock()] })
		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))

		const wrapper = screen.getByTestId('page-shell-wrapper')
		expect(wrapper).toHaveClass('space-y-4')
		expect(wrapper).toHaveClass('sm:space-y-6')
	})

	it('should project description content', async () => {
		await render(TestHost, { providers: [provideTranslationMock()] })
		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))

		expect(screen.getByText('A test description')).toBeInTheDocument()
	})

	it('should hide the description paragraph when no content is projected', async () => {
		const { fixture } = await render(TestHostNoDescription, { providers: [provideTranslationMock()] })
		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))
		fixture.detectChanges()

		expect(screen.getByRole('heading', { level: 1, name: 'No Desc' })).toBeInTheDocument()
		expect(screen.getByTestId('page-content')).toBeInTheDocument()
	})

	it('should project actions content above the main content area', async () => {
		const { fixture } = await render(TestHostWithActions, { providers: [provideTranslationMock()] })
		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))
		fixture.detectChanges()

		expect(screen.getByTestId('page-actions')).toBeInTheDocument()
		expect(screen.getByText('Search and buttons here')).toBeInTheDocument()
		expect(screen.getByTestId('page-content')).toBeInTheDocument()
	})

	it('should show loading state with spinner and text by default', async () => {
		await render(TestHost, { providers: [provideTranslationMock()] })

		expect(screen.getByRole('status')).toBeInTheDocument()
		expect(screen.getByText('Loading...')).toBeInTheDocument()
		expect(screen.queryByTestId('page-content')).not.toBeInTheDocument()
	})

	it('should show loading for at least 500ms even when loading input is false', async () => {
		const { fixture } = await render(TestHost, {
			providers: [provideTranslationMock()],
			componentInputs: { loading: false },
		})

		expect(screen.getByRole('status')).toBeInTheDocument()
		expect(screen.queryByTestId('page-content')).not.toBeInTheDocument()

		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))
		fixture.detectChanges()

		expect(screen.queryByRole('status')).not.toBeInTheDocument()
		expect(screen.getByTestId('page-content')).toBeInTheDocument()
	})

	it('should keep loading visible when minimum elapsed but loading input is still true', async () => {
		await render(TestHost, { providers: [provideTranslationMock()], componentInputs: { loading: true } })

		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))

		expect(screen.getByRole('status')).toBeInTheDocument()
		expect(screen.queryByTestId('page-content')).not.toBeInTheDocument()
	})

	it('should project content after minimum elapsed and loading is false', async () => {
		const { fixture } = await render(TestHost, { providers: [provideTranslationMock()] })

		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))

		fixture.componentRef.setInput('loading', false)
		fixture.detectChanges()

		expect(screen.queryByRole('status')).not.toBeInTheDocument()
		expect(screen.getByTestId('page-content')).toBeInTheDocument()
	})

	it('should show spinner when loading is explicitly true', async () => {
		await render(TestHost, { providers: [provideTranslationMock()], componentInputs: { loading: true } })
		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))

		expect(screen.getByRole('status')).toBeInTheDocument()
		expect(screen.queryByTestId('page-content')).not.toBeInTheDocument()
	})

	it('should show action skeletons during loading and hide real actions', async () => {
		await render(TestHostWithActions, {
			providers: [provideTranslationMock()],
			componentInputs: { loading: true },
		})

		expect(screen.getByTestId('page-actions-skeleton')).toBeInTheDocument()
		expect(screen.queryByTestId('page-actions')).not.toBeInTheDocument()
	})

	it('should show real actions and hide skeletons after loading completes', async () => {
		const { fixture } = await render(TestHostWithActions, {
			providers: [provideTranslationMock()],
			componentInputs: { loading: true },
		})

		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))
		fixture.componentRef.setInput('loading', false)
		fixture.detectChanges()

		expect(screen.getByTestId('page-actions')).toBeInTheDocument()
		expect(screen.queryByTestId('page-actions-skeleton')).not.toBeInTheDocument()
	})

	it('should show error alert when error is set', async () => {
		const { fixture } = await render(TestHost, {
			providers: [provideTranslationMock()],
			componentInputs: { error: 'Something went wrong', loading: false },
		})
		await advanceTimersByTimeAsync(parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))
		fixture.detectChanges()

		expect(screen.getByRole('alert')).toBeInTheDocument()
		expect(screen.getByText('Something went wrong')).toBeInTheDocument()
		expect(screen.queryByTestId('page-content')).not.toBeInTheDocument()
	})
})
