/**
 * Factory and shared helpers for the domain-scoped env sub-schemas.
 *
 * Every sub-schema module under this directory (`db.env.ts`, `email.env.ts`,
 * `http.env.ts`, `app.env.ts`, `cron.env.ts`, `token.env.ts`, `password.env.ts`,
 * `security.env.ts`) calls
 * `createEnvHandler()` with its Zod schema, a domain name, and an optional
 * test-defaults object. The factory returns the four symbols each module
 * re-exports under domain-specific names:
 *
 *   parse  → `parse<Domain>Env(rawEnv)`  — validate an arbitrary input
 *   proxy  → `<domain>Env`               — lazy-init, frozen Proxy backed by `process.env`
 *   seed   → `seed<Domain>Env(overrides?)` — typed test helper that writes the cache directly
 *   reset  → `reset<Domain>Env()`         — clear the cache so the next seed/access re-runs
 *
 * The proxy parses `process.env` on first property access and `process.exit(1)`s
 * with a formatted FATAL message if validation fails. This deferred-init pattern
 * lets bundlers and build tools (e.g. the Angular SSR prerender worker) import
 * sub-schema modules without env vars being set, as long as nothing actually
 * reads a property.
 *
 * `seed<Domain>Env` writes directly to the module-level cache rather than
 * mutating `process.env`, so unit tests can drive specific values without
 * polluting global state. `reset<Domain>Env()` is exported for intra-file test
 * isolation (call between cases that need different seed values).
 */
import { z } from 'zod'

export interface EnvHandler<T> {
	/** Validates the given object against the schema; throws `z.ZodError` on failure. */
	parse: (rawEnv: NodeJS.ProcessEnv) => T
	/** Frozen, lazy-init proxy backed by `process.env` on first property access. */
	proxy: Readonly<T>
	/** Test helper: writes `parse({...testDefaults, ...overrides})` into the cache, bypassing `process.env`. */
	seed: (overrides?: Partial<Record<keyof T, string>>) => void
	/** Test helper: clears the cache so the next `seed()` (or property access) re-runs from scratch. */
	reset: () => void
}

/**
 * Creates the four-symbol bundle for a domain sub-schema. See module-level
 * comment for the full contract.
 *
 * @param domainName Short identifier used in the FATAL error message (e.g. `'db'`, `'auth'`).
 * @param schema The Zod schema defining the domain's fields, defaults, and refinements.
 * @param testDefaults Minimal set of env values required for `seed()` with no args to
 *   produce a valid parse. Sub-schemas with no required fields can pass `{}`.
 */
export function createEnvHandler<TSchema extends z.ZodTypeAny>(
	domainName: string,
	schema: TSchema,
	testDefaults: NodeJS.ProcessEnv = {},
): EnvHandler<z.infer<TSchema>> {
	type T = z.infer<TSchema>
	let cached: Readonly<T> | null = null

	function parse(rawEnv: NodeJS.ProcessEnv): T {
		return schema.parse(rawEnv) as T
	}

	function initialize(): Readonly<T> {
		if (cached !== null) return cached
		try {
			cached = Object.freeze(parse(process.env))
			return cached
		} catch (error) {
			if (error instanceof z.ZodError) {
				console.error(`FATAL: Environment validation failed (${domainName} domain):`)
				console.error(formatZodError(error))
				console.error('\nSee docs/environment-variables.md for the required variables and delivery options.')
				process.exit(1)
			}
			throw error
		}
	}

	// REASON: Proxy traps intercept all property access; the target is never read directly.
	// Only `get` and `has` traps are defined — adding `ownKeys` / `getOwnPropertyDescriptor`
	// would violate the Proxy invariant when reflecting the frozen cache's non-configurable
	// properties through an empty target (Node throws on `Object.keys(proxy)` etc.).
	// REASON: Proxy<T> requires `T extends object`, but Zod's `z.infer<TSchema>` is wider
	// than `object` (it includes `unknown`). We use `Proxy<object>` and cast the result.
	const proxy = new Proxy(
		{},
		{
			get: (_target, prop) => initialize()[prop as keyof T],
			has: (_target, prop) => prop in initialize(),
		},
	) as Readonly<T>

	function seed(overrides: Partial<Record<keyof T, string>> = {}): void {
		cached = Object.freeze(parse({ ...testDefaults, ...overrides }))
	}

	function reset(): void {
		cached = null
	}

	return { parse, proxy, seed, reset }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function formatZodError(error: z.ZodError): string {
	return error.issues.map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`).join('\n')
}
