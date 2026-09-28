import { cardDataSchema, createCardRequestSchema, updateCardRequestSchema } from '@contracts/card/card.schemas'
import { errorResponseSchema, successMessageSchema } from '@contracts/common/error.schemas'
import { paginatedResponseSchema, searchPaginationSchema } from '@contracts/common/pagination.schemas'
import { permission } from '@contracts/permission/permission.constants'
import { createRoute } from '@hono/zod-openapi'
import { z } from 'zod'
import { requirePermission } from '../../../middlewares/verify-permissions.middleware'
import { commonResponses, idParamSchema } from '../../../openapi-config'

/**
 * List query: search + pagination, plus an optional `enabled=true|false` visibility filter.
 * Query strings are always text, so the boolean is parsed from its literal form.
 */
export const listCardsQuerySchema = searchPaginationSchema.extend({
	enabled: z
		.enum(['true', 'false'])
		.transform((value) => value === 'true')
		.optional(),
})

export const listCardsRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Cards'],
	summary: 'List all cards',
	description:
		'List non-deleted cards ordered by position, with pagination, optional search on internal name or title, and an optional enabled filter.',
	middleware: [requirePermission(permission('content:cards:read'))] as const,
	request: { query: listCardsQuerySchema },
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
	description: 'Get a single non-deleted card by its ID.',
	middleware: [requirePermission(permission('content:cards:read'))] as const,
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

export const createCardRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Cards'],
	summary: 'Create a card',
	description: 'Create a new card. The internal name and legacy ID must be unique, including among deleted cards.',
	middleware: [requirePermission(permission('content:cards:create'))] as const,
	request: {
		body: {
			content: { 'application/json': { schema: createCardRequestSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			description: 'Card created',
			content: { 'application/json': { schema: cardDataSchema } },
		},
		409: {
			description: 'Duplicate internal name or legacy ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const updateCardRoute = createRoute({
	method: 'put',
	path: '/{id}',
	tags: ['Cards'],
	summary: 'Update a card',
	description: 'Partially update a card. Hiding a card is an update of `enabled` to false.',
	middleware: [requirePermission(permission('content:cards:update'))] as const,
	request: {
		params: idParamSchema,
		body: {
			content: { 'application/json': { schema: updateCardRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			description: 'Card updated',
			content: { 'application/json': { schema: cardDataSchema } },
		},
		400: {
			description: 'Invalid card ID or inconsistent pinning state',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'Card not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		409: {
			description: 'Duplicate internal name or legacy ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const deleteCardRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Cards'],
	summary: 'Delete a card',
	description: 'Soft-delete a card. The deletion is recorded in the card history.',
	middleware: [requirePermission(permission('content:cards:delete'))] as const,
	request: { params: idParamSchema },
	responses: {
		200: {
			description: 'Card deleted',
			content: { 'application/json': { schema: successMessageSchema } },
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
