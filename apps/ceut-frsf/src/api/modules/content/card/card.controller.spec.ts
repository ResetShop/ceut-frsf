import { CardType } from '@contracts/card/card.constants'
import type { CardData } from '@contracts/card/card.types'
import { CARD_PERMISSIONS, PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import { logger } from '@resetshop/util'
import { clearAllMocks, fn, spyOn, type MockFn } from '@resetshop/util/test-utils'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { container } from '../../../container/container'
import { InMemoryContainer } from '../../../container/container.mock'
import type { PaginatedResponse } from '../../../interfaces'
import type { AuthenticatedContext } from '../../../middlewares/verify-access-token.middleware'
import type { PermissionData } from '../../access/role/interfaces'
import cardController from './card.controller'
import { CARD_ERRORS, CardConflictError, CardNotFoundError, CardValidationError } from './card.service'
import type { CreateCardParams, ListCardsParams, UpdateCardParams } from './interfaces'

describe('Card Controller', () => {
	const mockGetAllCards = fn<[ListCardsParams], Promise<PaginatedResponse<CardData>>>()
	const mockGetCard = fn<[number], Promise<CardData | null>>()
	const mockCreateCard = fn<[CreateCardParams, number], Promise<CardData>>()
	const mockUpdateCard = fn<[number, UpdateCardParams, number], Promise<CardData>>()
	const mockDeleteCard = fn<[number, number], Promise<void>>()
	const mockGetUserPermissions = fn<[number], Promise<PermissionData[]>>()

	const actorId = 1
	let app: Hono
	let loggerSecuritySpy: MockFn

	const testCard: CardData = {
		id: 5,
		legacyId: null,
		internalName: 'welcome-card',
		title: 'Welcome',
		type: CardType.ICON_CORNER,
		imageUrl: null,
		content: null,
		link: null,
		footerContent: null,
		footerSeparator: false,
		enabled: true,
		isPinned: false,
		pinnedPosition: null,
		position: 0,
		deletedAt: null,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
	}

	function grantPermissions(identifiers: readonly string[]): void {
		mockGetUserPermissions.mockResolvedValue(
			identifiers.map((name, index) => {
				const [module, resource, action] = name.split(':')
				return { id: index + 1, name, description: null, module, resource, action }
			}),
		)
	}

	async function jsonRequest(path: string, method: string, body: unknown): Promise<Response> {
		return app.request(path, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
	}

	beforeEach(() => {
		clearAllMocks()
		loggerSecuritySpy = spyOn(logger, 'security')
		grantPermissions(CARD_PERMISSIONS)

		container.use(
			new InMemoryContainer({
				cardService: {
					getAllCards: mockGetAllCards,
					getCard: mockGetCard,
					createCard: mockCreateCard,
					updateCard: mockUpdateCard,
					deleteCard: mockDeleteCard,
				},
				userRoleService: { getUserPermissions: mockGetUserPermissions },
			}),
		)

		app = new Hono()
		app.use('*', async (c, next) => {
			;(c as AuthenticatedContext).user = {
				sub: String(actorId),
				email: 'admin@example.com',
				firstName: 'Admin',
				lastName: 'User',
			}
			await next()
		})
		app.route('/content/cards', cardController)
	})

	afterEach(() => {
		container.restore()
	})

	describe('GET /content/cards', () => {
		it('returns the paginated list and forwards query parameters', async () => {
			mockGetAllCards.mockResolvedValue({ data: [testCard], total: 1, offset: 2, limit: 3 })

			const res = await app.request('/content/cards?offset=2&limit=3&search=welcome&enabled=false')

			expect(res.status).toBe(200)
			expect((await res.json()).total).toBe(1)
			expect(mockGetAllCards.calls).toEqual([[{ offset: 2, limit: 3, search: 'welcome', enabled: false }]])
		})

		it('leaves the enabled filter unset when omitted', async () => {
			mockGetAllCards.mockResolvedValue({ data: [], total: 0, offset: 0, limit: 10 })

			await app.request('/content/cards')

			expect(mockGetAllCards.calls).toEqual([
				[{ offset: undefined, limit: undefined, search: undefined, enabled: undefined }],
			])
		})

		it('rejects a non-boolean enabled filter', async () => {
			const res = await app.request('/content/cards?enabled=yes')

			expect(res.status).toBe(400)
		})
	})

	describe('GET /content/cards/:id', () => {
		it('returns the card when found', async () => {
			mockGetCard.mockResolvedValue(testCard)

			const res = await app.request('/content/cards/5')

			expect(res.status).toBe(200)
			expect((await res.json()).internalName).toBe('welcome-card')
			expect(mockGetCard.calls).toEqual([[5]])
		})

		it('returns 404 when the card is not found', async () => {
			mockGetCard.mockResolvedValue(null)

			const res = await app.request('/content/cards/999')

			expect(res.status).toBe(404)
			expect((await res.json()).error).toBe(CARD_ERRORS.NOT_FOUND)
		})

		it('returns 400 for a non-numeric id', async () => {
			const res = await app.request('/content/cards/abc')

			expect(res.status).toBe(400)
		})
	})

	describe('POST /content/cards', () => {
		it('creates the card with contract defaults and logs the audit event', async () => {
			mockCreateCard.mockResolvedValue(testCard)

			const res = await jsonRequest('/content/cards', 'POST', { internalName: 'welcome-card' })

			expect(res.status).toBe(201)
			expect(mockCreateCard.calls[0][0]).toMatchObject({
				internalName: 'welcome-card',
				type: CardType.ICON_CORNER,
				enabled: true,
				isPinned: false,
			})
			expect(mockCreateCard.calls[0][1]).toBe(actorId)
			expect(loggerSecuritySpy.calls).toContainEqual([
				'card_created',
				{
					cardId: testCard.id,
					internalName: testCard.internalName,
					actorId,
				},
			])
		})

		it('returns 409 on a duplicate internalName', async () => {
			mockCreateCard.mockRejectedValue(CardConflictError.internalName('welcome-card'))

			const res = await jsonRequest('/content/cards', 'POST', { internalName: 'welcome-card' })

			expect(res.status).toBe(409)
			expect((await res.json()).error).toContain(CARD_ERRORS.INTERNAL_NAME_EXISTS)
		})

		it('returns 409 on a duplicate legacyId', async () => {
			mockCreateCard.mockRejectedValue(CardConflictError.legacyId(42))

			const res = await jsonRequest('/content/cards', 'POST', { internalName: 'other', legacyId: 42 })

			expect(res.status).toBe(409)
		})

		it('returns 400 for an inconsistent pinning payload', async () => {
			const res = await jsonRequest('/content/cards', 'POST', { internalName: 'x', isPinned: true })

			expect(res.status).toBe(400)
			expect(mockCreateCard.calls).toHaveLength(0)
		})
	})

	describe('PUT /content/cards/:id', () => {
		it('updates the card and passes the actor id', async () => {
			mockUpdateCard.mockResolvedValue({ ...testCard, enabled: false })

			const res = await jsonRequest('/content/cards/5', 'PUT', { enabled: false })

			expect(res.status).toBe(200)
			expect((await res.json()).enabled).toBe(false)
			expect(mockUpdateCard.calls).toEqual([[5, { enabled: false }, actorId]])
			expect(loggerSecuritySpy.calls).toContainEqual([
				'card_updated',
				{
					cardId: 5,
					changedFields: ['enabled'],
					actorId,
				},
			])
		})

		it.each([
			['not found', new CardNotFoundError(5), 404],
			['duplicate internalName', CardConflictError.internalName('taken'), 409],
			['invalid pinning', new CardValidationError(CARD_ERRORS.INVALID_PINNING), 400],
		])('maps a %s error to %i', async (_label, error, status) => {
			mockUpdateCard.mockRejectedValue(error)

			const res = await jsonRequest('/content/cards/5', 'PUT', { title: 'x' })

			expect(res.status).toBe(status)
			expect((await res.json()).error).toBe(error.message)
		})
	})

	describe('DELETE /content/cards/:id', () => {
		it('soft-deletes the card and logs the audit event', async () => {
			mockDeleteCard.mockResolvedValue(undefined)

			const res = await app.request('/content/cards/5', { method: 'DELETE' })

			expect(res.status).toBe(200)
			expect((await res.json()).message).toBe('Card deleted successfully')
			expect(mockDeleteCard.calls).toEqual([[5, actorId]])
			expect(loggerSecuritySpy.calls).toContainEqual(['card_deleted', { cardId: 5, actorId }])
		})

		it('returns 404 when the card is not found', async () => {
			mockDeleteCard.mockRejectedValue(new CardNotFoundError(5))

			const res = await app.request('/content/cards/5', { method: 'DELETE' })

			expect(res.status).toBe(404)
		})
	})

	describe('permission enforcement', () => {
		const definedIdentifiers = new Set<string>(PERMISSION_DEFINITIONS.map((p) => p.identifier))

		// Each route must require exactly its catalogue permission: revoking only that one yields 403.
		it.each([
			['GET', '/content/cards', 'content:cards:read'],
			['GET', '/content/cards/5', 'content:cards:read'],
			['POST', '/content/cards', 'content:cards:create'],
			['PUT', '/content/cards/5', 'content:cards:update'],
			['DELETE', '/content/cards/5', 'content:cards:delete'],
		])('%s %s requires %s', async (method, path, required) => {
			expect(definedIdentifiers.has(required)).toBe(true)
			grantPermissions(CARD_PERMISSIONS.filter((identifier) => identifier !== required))

			const res = await jsonRequest(path, method, method === 'GET' || method === 'DELETE' ? undefined : {})

			expect(res.status).toBe(403)
		})
	})
})
