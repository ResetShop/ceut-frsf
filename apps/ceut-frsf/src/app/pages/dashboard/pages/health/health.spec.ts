import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { render, screen, waitFor } from '@testing-library/angular'
import Health from './health'

describe('Health Component', () => {
	it('should display loading state initially', async () => {
		await render(Health, {
			providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslationMock()],
		})

		expect(screen.getByText('Loading...')).toBeInTheDocument()
	})

	it('should display health status data when API responds successfully', async () => {
		await render(Health, {
			providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslationMock()],
		})

		const httpTesting = TestBed.inject(HttpTestingController)

		const mockResponse = {
			status: 'healthy',
			timestamp: '2026-02-11T12:37:33.993Z',
			checks: {
				database: {
					status: 'healthy',
					responseTimeMs: 298,
				},
			},
		}

		const req = httpTesting.expectOne('/api/health/v1')
		expect(req.request.method).toBe('GET')
		req.flush(mockResponse)

		await waitFor(() => {
			const badges = screen.getAllByText(/healthy/i)
			expect(badges).toHaveLength(2)
			expect(screen.getByText(/298ms/i)).toBeInTheDocument()
		})

		httpTesting.verify()
	})

	it('should display error message when API fails', async () => {
		await render(Health, {
			providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslationMock()],
		})

		const httpTesting = TestBed.inject(HttpTestingController)

		const req = httpTesting.expectOne('/api/health/v1')
		req.error(new ProgressEvent('Network error'))

		await waitFor(() => {
			expect(screen.getByText(/Error:/i)).toBeInTheDocument()
		})

		httpTesting.verify()
	})

	it('should render the component with correct structure', async () => {
		await render(Health, {
			providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslationMock()],
		})

		expect(screen.getByRole('heading', { name: /Application Health Checker/i })).toBeInTheDocument()
	})

	it('should display all health data fields', async () => {
		await render(Health, {
			providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslationMock()],
		})

		const httpTesting = TestBed.inject(HttpTestingController)

		const mockResponse = {
			status: 'healthy',
			timestamp: '2026-02-11T12:37:33.993Z',
			checks: {
				database: {
					status: 'healthy',
					responseTimeMs: 150,
				},
			},
		}

		httpTesting.expectOne('/api/health/v1').flush(mockResponse)

		await waitFor(() => {
			expect(screen.getAllByText(/Status:/i).length).toBeGreaterThanOrEqual(1)
			expect(screen.getByText(/Date & Time:/i)).toBeInTheDocument()
			expect(screen.getByRole('heading', { name: /Checks/i })).toBeInTheDocument()
			expect(screen.getByRole('heading', { name: /Database/i })).toBeInTheDocument()
			expect(screen.getByText(/Response Time:/i)).toBeInTheDocument()
		})

		httpTesting.verify()
	})

	it('should display unhealthy database status with error message', async () => {
		await render(Health, {
			providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslationMock()],
		})

		const httpTesting = TestBed.inject(HttpTestingController)

		const mockResponse = {
			status: 'unhealthy',
			timestamp: '2026-02-11T12:37:33.993Z',
			checks: {
				database: {
					status: 'unhealthy',
					responseTimeMs: null,
					error: 'Connection refused',
				},
			},
		}

		httpTesting.expectOne('/api/health/v1').flush(mockResponse)

		await waitFor(() => {
			const badges = screen.getAllByText(/unhealthy/i)
			expect(badges).toHaveLength(2)
			expect(screen.getByText(/Connection refused/i)).toBeInTheDocument()
		})

		httpTesting.verify()
	})
})
