import { z } from 'zod'

/** Validates duration strings matching the format: number followed by ms/d/h/m/s (e.g., '500ms', '5s', '1m', '24h', '7d'). */
export const durationStringSchema = z.string().regex(/^\d+(ms|[dhms])$/, {
	message:
		"Invalid duration format. Expected format: number followed by ms/d/h/m/s (e.g., '500ms', '5s', '1m', '24h', '7d')",
})

export type DurationString = z.infer<typeof durationStringSchema>
