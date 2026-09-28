import type { ErrorResponse } from '@contracts/common/error.types'
import type { PaginatedResponse } from '@contracts/common/pagination.types'
import { createOpenAPIApp, registerRoute } from '@resetshop/hono-core'
import { container } from '../../../container/container'
import { getCardRoute, listCardsRoute } from './card.routes'

const app = createOpenAPIApp()

/**
 * GET /
 * List all cards with pagination and optional search
 */
registerRoute(app, listCardsRoute, async (c) => {
	const { cardService } = container.cradle
	const { offset, limit, search } = c.req.valid('query')
	const result = await cardService.getAllCards({ offset, limit, search })
	return c.json<PaginatedResponse<unknown>>(result)
})

/**
 * GET /{id}
 * Get a single card by ID
 */
registerRoute(app, getCardRoute, async (c) => {
	const { cardService } = container.cradle
	const id = Number(c.req.param('id'))

	const result = await cardService.getCard(id)

	if (!result) {
		return c.json<ErrorResponse>({ error: 'Card not found' }, 404)
	}

	return c.json(result)
})

export default app
