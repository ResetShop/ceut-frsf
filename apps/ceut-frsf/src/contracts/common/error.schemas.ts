import { z } from 'zod'

/**
 * Standard error response schema for API errors.
 * Used for 400, 401, 403, 404, 409, 500 responses.
 */
export const errorResponseSchema = z.object({
	error: z.string(),
	details: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Standard success message response schema.
 * Used for operations that return a confirmation message.
 */
export const successMessageSchema = z.object({
	message: z.string(),
})
