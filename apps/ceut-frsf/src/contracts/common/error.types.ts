import type { z } from 'zod'
import type { errorResponseSchema, successMessageSchema } from './error.schemas'

export type ErrorResponse = z.infer<typeof errorResponseSchema>
export type SuccessMessage = z.infer<typeof successMessageSchema>
