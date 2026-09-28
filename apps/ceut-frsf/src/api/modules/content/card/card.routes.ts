import { errorResponseSchema } from '@contracts/common/error.schemas'
import { paginatedResponseSchema, searchPaginationSchema } from '@contracts/common/pagination.schemas'
import { createRoute } from '@hono/zod-openapi'
import { commonResponses, idParamSchema } from '../../../openapi-config'

// TODO: Replace with actual response schema
import { z } from 'zod'

const cardDataSchema = z.object({
	id: z.number(),
})

export const listCardsRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Cards'],
	summary: 'List all cards',
	description: 'List all cards with pagination and optional search.',
	request: {
		query: searchPaginationSchema,
	},
	responses: {
		200: {
			description: 'Paginated list of cards',
			content: { 'application/json': { schema: paginatedResponseSchema(cardDataSchema) } },
		},
		...commonResponses,
	},
})

export const getCardRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Cards'],
	summary: 'Get card by ID',
	description: 'Get a single card by its ID.',
	request: { params: idParamSchema },
	responses: {
		200: {
			description: 'Card details',
			content: { 'application/json': { schema: cardDataSchema } },
		},
		400: {
			description: 'Invalid card ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'Card not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})
