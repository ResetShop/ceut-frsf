import { httpUrlSchema, linkSchema, LinkType } from './link.schemas'

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

	it.each(['javascript:alert(1)', 'recursos/becas', '//evil.example.com/x', 'https://example.com'])(
		'rejects the internal url %s',
		(url) => {
			const result = linkSchema.safeParse({ type: LinkType.INTERNAL, url })

			expect(result.success).toBe(false)
		},
	)

	it.each(['javascript:alert(1)', 'data:text/html,<script>x</script>', 'ftp://example.com/file'])(
		'rejects the non-http external url %s',
		(url) => {
			const result = linkSchema.safeParse({ type: LinkType.EXTERNAL, url })

			expect(result.success).toBe(false)
		},
	)
})

describe('httpUrlSchema', () => {
	it.each(['https://cdn.example.com/a.png', 'http://example.com'])('accepts %s', (url) => {
		expect(httpUrlSchema.safeParse(url).success).toBe(true)
	})

	it.each(['javascript:alert(1)', 'data:image/png;base64,AAAA', 'not-a-url'])('rejects %s', (url) => {
		expect(httpUrlSchema.safeParse(url).success).toBe(false)
	})
})
