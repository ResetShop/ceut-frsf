import { errorResponseSchema } from '@contracts/common/error.schemas'
import { authUserSchema, updateProfileRequestSchema } from '@contracts/user/user.schemas'
import { createRoute } from '@hono/zod-openapi'
import { commonResponses } from '../../openapi-config'

export const updateProfileRoute = createRoute({
	method: 'patch',
	path: '/me',
	tags: ['Users'],
	summary: 'Update own profile',
	description:
		'Update the authenticated user’s own profile. The target is always the caller; any field the ' +
		'request schema does not allow, including email, is rejected.',
	request: {
		body: {
			content: { 'application/json': { schema: updateProfileRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			description: 'Profile updated',
			content: { 'application/json': { schema: authUserSchema } },
		},
		400: {
			description: 'Invalid or empty body, or a field the request schema does not allow',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})
