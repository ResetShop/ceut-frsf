import type { DurationString } from '@contracts/common/duration.schemas'

/**
 * Debounce window for paginated-list search inputs across stores
 * (users, roles, etc.). Resolved at the rxMethod call site via
 * `parseDurationToMs(SEARCH_DEBOUNCE_DELAY)`.
 */
export const SEARCH_DEBOUNCE_DELAY: DurationString = '300ms'
