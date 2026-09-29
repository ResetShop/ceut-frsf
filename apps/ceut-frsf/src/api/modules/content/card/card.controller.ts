import type { CardData, CreateCardRequest, UpdateCardRequest } from '@contracts/card/card.types'
import type { ErrorResponse, SuccessMessage } from '@contracts/common/error.types'
import type { PaginatedResponse } from '@contracts/common/pagination.types'
import { createOpenAPIApp, registerRoute } from '@resetshop/hono-core'
import { logger } from '@resetshop/util'
import type { z } from 'zod'
import { container } from '../../../container/container'
import type { AuthenticatedContext } from '../../../middlewares/verify-access-token.middleware'
import { CARD_ERRORS, CardConflictError, CardNotFoundError, CardValidationError } from './card.errors'
import {
	createCardRoute,
	deleteCardRoute,
	getCardRoute,
	listCardsQuerySchema,
	listCardsRoute,
	updateCardRoute,
} from './card.routes'

const app = createOpenAPIApp()

/**
 * Maps a known card service error to its HTTP status and body, or null when the error is unexpected.
 */
function cardErrorResponse(error: unknown): { status: 400 | 404 | 409; body: ErrorResponse } | null {
	if (error instanceof CardValidationError) return { status: 400, body: { error: error.message } }
	if (error instanceof CardNotFoundError) return { status: 404, body: { error: error.message } }
	if (error instanceof CardConflictError) return { status: 409, body: { error: error.message } }
	return null
}

/**
 * GET /api/content/cards
 * List cards with pagination, optional search and enabled filter
 */
registerRoute(app, listCardsRoute, async (c) => {
	const { cardService } = container.cradle
	const { offset, limit, search, enabled }: z.output<typeof listCardsQuerySchema> = c.req.valid('query')
	const cards = await cardService.getAllCards({ offset, limit, search, enabled })
	return c.json<PaginatedResponse<CardData>>(cards)
})

/**
 * GET /api/content/cards/:id
 * Get a card by ID
 */
registerRoute(app, getCardRoute, async (c) => {
	const { cardService } = container.cradle
	const id = Number(c.req.param('id'))

	const card = await cardService.getCard(id)

	if (!card) {
		return c.json<ErrorResponse>({ error: CARD_ERRORS.NOT_FOUND }, 404)
	}

	return c.json<CardData>(card)
})

/**
 * POST /api/content/cards
 * Create a new card
 */
registerRoute(app, createCardRoute, async (c) => {
	const { cardService } = container.cradle
	const actorId = Number((c as AuthenticatedContext).user.sub)
	const body: CreateCardRequest = c.req.valid('json')

	try {
		const card = await cardService.createCard(body, actorId)
		logger.security('card_created', { cardId: card.id, internalName: card.internalName, actorId })
		return c.json<CardData>(card, 201)
	} catch (error) {
		if (error instanceof CardConflictError) {
			return c.json<ErrorResponse>({ error: error.message }, 409)
		}
		throw error
	}
})

/**
 * PUT /api/content/cards/:id
 * Update a card (including hiding it via `enabled: false`)
 */
registerRoute(app, updateCardRoute, async (c) => {
	const { cardService } = container.cradle
	const actorId = Number((c as AuthenticatedContext).user.sub)
	const id = Number(c.req.param('id'))
	const body: UpdateCardRequest = c.req.valid('json')

	try {
		const card = await cardService.updateCard(id, body, actorId)
		logger.security('card_updated', { cardId: id, changedFields: Object.keys(body), actorId })
		return c.json<CardData>(card)
	} catch (error) {
		const mapped = cardErrorResponse(error)
		if (mapped) {
			return c.json<ErrorResponse>(mapped.body, mapped.status)
		}
		throw error
	}
})

/**
 * DELETE /api/content/cards/:id
 * Soft-delete a card
 */
registerRoute(app, deleteCardRoute, async (c) => {
	const { cardService } = container.cradle
	const actorId = Number((c as AuthenticatedContext).user.sub)
	const id = Number(c.req.param('id'))

	try {
		await cardService.deleteCard(id, actorId)
		logger.security('card_deleted', { cardId: id, actorId })
		return c.json<SuccessMessage>({ message: 'Card deleted successfully' })
	} catch (error) {
		if (error instanceof CardNotFoundError) {
			return c.json<ErrorResponse>({ error: error.message }, 404)
		}
		throw error
	}
})

export default app
