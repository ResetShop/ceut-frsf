import { parseDurationToMs } from '@resetshop/util'
import { cronEnv } from './config/cron.env'
import { isServerless } from './config/http.env'
import { MIN_CRON_SECRET_LENGTH } from './constants/auth.constants'
import { container } from './container/container'

let cleanupInterval: NodeJS.Timeout | null = null

/**
 * Parses the TOKEN_CLEANUP_INTERVAL env value to milliseconds, returning
 * `null` when the env is unset, malformed, or out of the [minInterval,
 * maxInterval] range. Exported only for unit testing.
 */
export function tryParseEnvIntervalMs(
	envValue: string | undefined,
	minInterval: string,
	maxInterval: string,
): number | null {
	if (!envValue) return null
	let parsedMs: number
	try {
		parsedMs = parseDurationToMs(envValue)
	} catch {
		return null
	}
	if (parsedMs < parseDurationToMs(minInterval)) return null
	if (parsedMs > parseDurationToMs(maxInterval)) return null
	return parsedMs
}

/**
 * Validate CRON_SECRET at startup and log warning if too short.
 * Only logs once to avoid spam.
 */
function validateCronSecret(): void {
	const cronSecret = cronEnv.CRON_SECRET
	if (cronSecret && cronSecret.length < MIN_CRON_SECRET_LENGTH) {
		console.warn(
			`[CronJobs] WARNING: CRON_SECRET is too short (${cronSecret.length} chars). Minimum ${MIN_CRON_SECRET_LENGTH} characters required for secure authentication.`,
		)
	}
}

/**
 * Token cleanup cron job - removes expired refresh tokens
 */
function startTokenCleanupJob(): void {
	try {
		const minInterval = '1m'
		const maxInterval = '7d'
		const defaultInterval = '24h'

		const envValue = cronEnv.TOKEN_CLEANUP_INTERVAL
		const parsedEnvIntervalMs = tryParseEnvIntervalMs(envValue, minInterval, maxInterval)

		const { tokenMaintenanceService } = container.cradle
		const isValidInterval = parsedEnvIntervalMs !== null

		if (envValue && !isValidInterval) {
			console.warn(
				`[CronJobs] WARNING: TOKEN_CLEANUP_INTERVAL="${envValue}" is invalid. ` +
					`Expected a duration string between ${minInterval} and ${maxInterval} (inclusive), e.g. "${defaultInterval}". ` +
					`Using default: ${defaultInterval}.`,
			)
		}

		const intervalSource = isValidInterval ? (envValue ?? defaultInterval) : defaultInterval
		const intervalMs = isValidInterval ? parsedEnvIntervalMs : parseDurationToMs(defaultInterval)
		console.log(`[CronJobs] Token cleanup scheduled every ${intervalSource}`)

		// Run immediately, then at interval
		tokenMaintenanceService.cleanupExpiredTokens().catch(console.error)
		cleanupInterval = setInterval(() => tokenMaintenanceService.cleanupExpiredTokens().catch(console.error), intervalMs)
	} catch (error) {
		console.error('[CronJobs] Failed to start token cleanup job:', error)
		// Don't crash the server - cron jobs are not critical for basic operation
		// The cleanup endpoint remains available as a fallback
	}
}

/**
 * Start all scheduled cron jobs.
 * Note: Skipped in serverless environments - use the API endpoint with scheduled triggers instead.
 */
export function startCronJobs(): void {
	// Validate CRON_SECRET once at startup
	validateCronSecret()

	// Skip cron jobs in serverless environments
	if (isServerless()) {
		console.log('[CronJobs] Skipped - serverless environment. Use scheduled triggers with GET /api/auth/cleanup-tokens')
		return
	}

	startTokenCleanupJob()
}

/**
 * Stop all scheduled cron jobs.
 * Call this during graceful shutdown to prevent resource leaks.
 */
export function stopCronJobs(): void {
	if (cleanupInterval) {
		clearInterval(cleanupInterval)
		cleanupInterval = null
		console.log('[CronJobs] Stopped token cleanup job')
	}
}
