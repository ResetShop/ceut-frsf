import type { DurationString } from '@contracts/common/duration.schemas'

/**
 * Delay between a successful mutation toast appearing and the dashboard
 * drawer closing. Long enough for the toast to register visually before the
 * drawer animation starts. Resolved at the setTimeout call site via
 * `parseDurationToMs(DRAWER_CLOSE_AFTER_SUCCESS_DELAY)`.
 */
export const DRAWER_CLOSE_AFTER_SUCCESS_DELAY: DurationString = '1s'
