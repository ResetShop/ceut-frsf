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
 * Absolute URL restricted to `http` / `https`. Other schemes (`javascript:`, `data:`, …) are
 * rejected because these values are rendered as `href` / `src` attributes.
 */
export const httpUrlSchema = z.url({ protocol: /^https?$/ })

/**
 * Reusable link value object: an in-app path (`internal`) or an absolute `http(s)` URL
 * (`external`). An internal path must start with a single `/`, which rules out schemes and
 * protocol-relative (`//host`) URLs that would leave the app.
 */
export const linkSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal(LinkType.INTERNAL),
		url: z.string().regex(/^\/(?!\/)/, 'Internal links must be a path starting with a single "/"'),
	}),
	z.object({
		type: z.literal(LinkType.EXTERNAL),
		url: httpUrlSchema,
	}),
])

export type Link = z.infer<typeof linkSchema>
