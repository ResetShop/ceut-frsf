import { LinkType, linkSchema } from './link.schemas'

describe('LinkType', () => {
	it('is frozen (immutable)', () => {
		expect(Object.isFrozen(LinkType)).toBe(true)
	})
})

describe('linkSchema', () => {
	it('accepts an internal link with a relative path', () => {
		const result = linkSchema.safeParse({ type: LinkType.INTERNAL, url: '/recursos/becas' })

		expect(result.success).toBe(true)
	})

	it('rejects an internal link with an empty url', () => {
		const result = linkSchema.safeParse({ type: LinkType.INTERNAL, url: '' })

		expect(result.success).toBe(false)
	})

	it('accepts an external link with a valid absolute URL', () => {
		const result = linkSchema.safeParse({ type: LinkType.EXTERNAL, url: 'https://example.com/becas' })

		expect(result.success).toBe(true)
	})

	it('rejects an external link with a non-URL string', () => {
		const result = linkSchema.safeParse({ type: LinkType.EXTERNAL, url: 'not-a-url' })

		expect(result.success).toBe(false)
	})

	it('rejects a link with an invalid type discriminant', () => {
		const result = linkSchema.safeParse({ type: 'anchor', url: '#section' })

		expect(result.success).toBe(false)
	})
})
