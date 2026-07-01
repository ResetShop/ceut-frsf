import { clearAllMocks, fn, type MockFn, spyOn } from '@resetshop/util/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { EmailService } from './email.service'
import type { EmailRepository, SendEmailParams } from './interfaces'

describe('EmailService', () => {
	const mockSend = fn<[SendEmailParams], Promise<void>>()
	let consoleLogSpy: MockFn

	const mockEmailRepository: EmailRepository = {
		send: mockSend,
	}

	let emailService: EmailService

	const emailParams: SendEmailParams = {
		to: 'recipient@test.com',
		subject: 'Test Subject',
		html: '<p>Test HTML content</p>',
		text: 'Test text content',
	}

	beforeEach(() => {
		clearAllMocks()
		consoleLogSpy = spyOn(console, 'log')

		emailService = new EmailService({
			emailRepository: mockEmailRepository,
		})
	})

	describe('validation', () => {
		it('should throw when recipient email is invalid', async () => {
			await expect(emailService.send({ ...emailParams, to: 'not-an-email' })).rejects.toThrow(
				'Invalid recipient email address',
			)

			expect(mockSend.calls).toHaveLength(0)
		})

		it('should throw when recipient email is empty', async () => {
			await expect(emailService.send({ ...emailParams, to: '' })).rejects.toThrow()

			expect(mockSend.calls).toHaveLength(0)
		})

		it('should throw when subject is empty', async () => {
			await expect(emailService.send({ ...emailParams, subject: '' })).rejects.toThrow('Subject is required')

			expect(mockSend.calls).toHaveLength(0)
		})

		it('should throw when html content is empty', async () => {
			await expect(emailService.send({ ...emailParams, html: '' })).rejects.toThrow('HTML content is required')

			expect(mockSend.calls).toHaveLength(0)
		})

		it('should throw when text content is empty', async () => {
			await expect(emailService.send({ ...emailParams, text: '' })).rejects.toThrow('Text content is required')

			expect(mockSend.calls).toHaveLength(0)
		})
	})

	describe('send', () => {
		it('should delegate to emailRepository.send', async () => {
			mockSend.mockResolvedValue(undefined)

			await emailService.send(emailParams)

			expect(mockSend.calls).toEqual([[emailParams]])
		})

		it('should resolve when email is sent successfully', async () => {
			mockSend.mockResolvedValue(undefined)

			await expect(emailService.send(emailParams)).resolves.toBeUndefined()
		})

		it('should re-throw the original error from repository', async () => {
			const error = new Error('SMTP error')
			mockSend.mockRejectedValue(error)

			await expect(emailService.send(emailParams)).rejects.toThrow(error)
		})

		it('should log structured security event before re-throwing', async () => {
			mockSend.mockRejectedValue(new Error('SMTP connection failed'))

			await expect(emailService.send(emailParams)).rejects.toThrow('SMTP connection failed')

			expect(consoleLogSpy.calls).toHaveLength(1)

			const loggedData = JSON.parse(consoleLogSpy.calls[0][0] as string)

			expect(loggedData).toMatchObject({
				_type: 'security_event',
				event: 'email_send_failed',
				recipient: 'recipient@test.com',
				subject: 'Test Subject',
				error: 'SMTP connection failed',
			})

			expect(loggedData.timestamp).toBeDefined()
			expect(new Date(loggedData.timestamp).toString()).not.toBe('Invalid Date')
		})

		it('should handle non-Error objects in catch block', async () => {
			mockSend.mockRejectedValue('String error')

			await expect(emailService.send(emailParams)).rejects.toBe('String error')

			const loggedData = JSON.parse(consoleLogSpy.calls[0][0] as string)
			expect(loggedData.error).toBe('String error')
		})
	})
})
