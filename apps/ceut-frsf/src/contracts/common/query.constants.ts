/**
 * Default query parameter settings used across controllers, repositories, and contract schemas.
 */
export const QUERY_DEFAULTS = Object.freeze({
	/** Pagination */
	MIN_LIMIT: 1,
	LIMIT: 10,
	MAX_LIMIT: 500,
	OFFSET: 0,
	/** Array limits */
	MAX_ROLE_IDS_PER_REQUEST: 100,
	/** Search */
	SEARCH_MIN_LENGTH: 1,
	SEARCH_MAX_LENGTH: 100,
	/** Field lengths */
	FIELD_MIN_LENGTH: 1,
	NAME_MAX_LENGTH: 100,
	CODE_MAX_LENGTH: 50,
	DESCRIPTION_MAX_LENGTH: 500,
} as const)
