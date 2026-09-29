/**
 * Returns the name of the violated constraint when `error` is a Postgres unique violation
 * (SQLSTATE `23505`), or null otherwise. Drizzle wraps driver errors, so the `cause` chain is
 * inspected as well as the error itself; the walk is bounded so a cyclic chain cannot loop.
 */
export function findUniqueViolationConstraint(error: unknown): string | null {
	const maxCauseDepth = 5
	let current: unknown = error
	for (let depth = 0; depth < maxCauseDepth && isRecord(current); depth++) {
		if (current['code'] === '23505') {
			return typeof current['constraint'] === 'string' ? current['constraint'] : ''
		}
		current = current['cause']
	}
	return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}
