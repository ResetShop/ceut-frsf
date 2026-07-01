/**
 * @vitest-environment node
 */
import { clearAllMocks, fn, spyOn } from '@resetshop/util/test-utils'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ACCESS_TOKEN_COOKIE_NAME } from '../constants/auth.constants'
import { container } from '../container/container'
import { InMemoryContainer } from '../container/container.mock'
import type { TokenPayload } from '../services/paseto/interfaces'
import verifyAccessToken, { type AuthenticatedContext } from './verify-access-token.middleware'

describe('verifyAccessToken middleware', () => {
	let app: Hono
	// Shared across tests — registered once in InMemoryContainer per beforeEach, call history cleared by clearAllMocks()
	const mockVerifyAccessToken = fn<[string], Promise<TokenPayload>>()

	const testPayload: TokenPayload = {
		sub: '1',
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
	}

	beforeEach(() => {
		clearAllMocks()
		spyOn(console, 'error')

		app = new Hono()
		app.use('/protected/*', verifyAccessToken)
		app.get('/protected/resource', (c) => {
			const user = (c as AuthenticatedContext).user
			return c.json({ user })
		})

		container.use(
			new InMemoryContainer({
				pasetoService: {
					verifyAccessToken: mockVerifyAccessToken,
				},
			}),
		)
	})

	afterEach(() => {
		container.restore()
	})

	function requestWithCookie(token: string): Request {
		return new Request('http://localhost/protected/resource', {
			headers: { cookie: `${ACCESS_TOKEN_COOKIE_NAME}=${token}` },
		})
	}

	it('should return 401 when no access token cookie is present', async () => {
		const res = await app.fetch(new Request('http://localhost/protected/resource'))

		expect(res.status).toBe(401)
		const data = await res.json()
		expect(data.error).toBe('Missing access token cookie')
	})

	it('should attach user to context and call next when token is valid', async () => {
		mockVerifyAccessToken.mockResolvedValueOnce(testPayload)

		const res = await app.fetch(requestWithCookie('valid-token'))

		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data.user).toEqual({
			sub: '1',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		})
	})

	it('should pass the cookie value to pasetoService.verifyAccessToken', async () => {
		mockVerifyAccessToken.mockResolvedValueOnce(testPayload)

		await app.fetch(requestWithCookie('my-specific-token'))

		expect(mockVerifyAccessToken.calls).toHaveLength(1)
		expect(mockVerifyAccessToken.calls[0]).toEqual(['my-specific-token'])
	})

	it('should return 401 when token verification fails', async () => {
		mockVerifyAccessToken.mockRejectedValueOnce(new Error('Invalid or expired token'))

		const res = await app.fetch(requestWithCookie('expired-token'))

		expect(res.status).toBe(401)
		const data = await res.json()
		expect(data.error).toBe('Invalid or expired token')
	})

	it('should return 401 when verification throws a non-Error', async () => {
		mockVerifyAccessToken.mockRejectedValueOnce('unexpected')

		const res = await app.fetch(requestWithCookie('bad-token'))

		expect(res.status).toBe(401)
		const data = await res.json()
		expect(data.error).toBe('Invalid or expired token')
	})

	it('should only attach sub, email, firstName, lastName to context', async () => {
		mockVerifyAccessToken.mockResolvedValueOnce({
			...testPayload,
			iss: 'Reset Shop',
			iat: '2026-01-01T00:00:00.000Z',
			exp: '2026-01-01T00:15:00.000Z',
		})

		const res = await app.fetch(requestWithCookie('valid-token'))

		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data.user).toEqual({
			sub: '1',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		})
		expect(data.user).not.toHaveProperty('iss')
		expect(data.user).not.toHaveProperty('iat')
		expect(data.user).not.toHaveProperty('exp')
	})
})
