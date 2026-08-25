import { z } from 'zod'

/**
 * Link target kind — single source of truth shared by DB schema (Drizzle `jsonb` column type)
 * and API contracts (Zod discriminated union).
 */
export const LinkType = Object.freeze({
	INTERNAL: 'internal',
	EXTERNAL: 'external',
} as const)

export type LinkType = (typeof LinkType)[keyof typeof LinkType]

/**
 * Reusable link value object: an in-app relative path (`internal`) or an absolute URL
 * (`external`). Internal links are not valid absolute URLs, so each variant validates `url`
 * differently.
 */
export const linkSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal(LinkType.INTERNAL),
		url: z.string().min(1),
	}),
	z.object({
		type: z.literal(LinkType.EXTERNAL),
		url: z.url(),
	}),
])

export type Link = z.infer<typeof linkSchema>
