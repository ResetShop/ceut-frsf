import type { z } from 'zod'
import type { cardDataSchema, createCardRequestSchema, updateCardRequestSchema } from './card.schemas'

// ============================================================================
// Card Types
// ============================================================================

export type CardData = z.infer<typeof cardDataSchema>

// ============================================================================
// Request Types
// ============================================================================

export type CreateCardRequest = z.infer<typeof createCardRequestSchema>
export type UpdateCardRequest = z.infer<typeof updateCardRequestSchema>
