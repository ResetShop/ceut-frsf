import type { OpenAPIHono } from '@hono/zod-openapi'
import { appEnv } from '../../config/app.env'
import { getRestrictedUserCredentials } from './db-helpers'

interface ParsedCookies {
	accessToken: string
	refreshToken: string
	raw: string
}

/**
 * Parses Set-Cookie headers from a response to extract access and refresh tokens.
 * The `raw` field is a combined `Cookie:` request header value built from all
 * `Set-Cookie` response headers, suitable for passing in subsequent requests.
 */
export function parseCookies(response: Response): ParsedCookies {
	const setCookieHeaders = response.headers.getSetCookie()
	let accessToken = ''
	let refreshToken = ''

	for (const header of setCookieHeaders) {
		if (header.startsWith('access_token=')) {
			accessToken = header.split('=')[1].split(';')[0]
		}
		if (header.startsWith('refresh_token=')) {
			refreshToken = header.split('=')[1].split(';')[0]
		}
	}

	// Build combined cookie string for requests
	const raw = setCookieHeaders.map((h) => h.split(';')[0]).join('; ')

	return { accessToken, refreshToken, raw }
}

/**
 * Logs in with the given credentials and returns parsed cookies.
 */
// Counter for generating unique IPs to avoid rate limiter collisions between tests
let loginCounter = 0

export async function loginAs(
	app: OpenAPIHono,
	email: string,
	password: string,
): Promise<{ response: Response; cookies: ParsedCookies }> {
	// Each login call uses a unique IP to avoid triggering the rate limiter across tests
	const uniqueIp = `10.0.0.${++loginCounter}`

	const response = await app.request('/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': uniqueIp },
		body: JSON.stringify({ email, password }),
	})

	const cookies = parseCookies(response)
	return { response, cookies }
}

/**
 * Logs in as the admin user (admin@sistema.com).
 * Password is read from INTEGRATION_TEST_ADMIN_PASSWORD env var (default: admin123).
 */
export async function loginAsAdmin(app: OpenAPIHono): Promise<ParsedCookies> {
	const adminPassword = appEnv.INTEGRATION_TEST_ADMIN_PASSWORD
	if (!adminPassword) {
		throw new Error('INTEGRATION_TEST_ADMIN_PASSWORD environment variable is required.')
	}
	const { response, cookies } = await loginAs(app, 'admin@sistema.com', adminPassword)
	if (response.status !== 200) {
		const body = await response.json()
		throw new Error(`Admin login failed (${response.status}): ${JSON.stringify(body)}`)
	}
	return cookies
}

/**
 * Logs in as the pre-seeded restricted user (no permissions) for 403 tests.
 * This user is created once in global setup — no per-test seeding needed.
 */
export async function loginAsRestricted(app: OpenAPIHono): Promise<ParsedCookies> {
	const { email, password } = getRestrictedUserCredentials()
	const { response, cookies } = await loginAs(app, email, password)
	if (response.status !== 200) {
		const body = await response.json()
		throw new Error(`Restricted user login failed (${response.status}): ${JSON.stringify(body)}`)
	}
	return cookies
}

/**
 * Makes an authenticated request using the provided cookies.
 */
export async function authenticatedRequest(
	app: OpenAPIHono,
	path: string,
	options: {
		method?: string
		body?: unknown
		cookies: ParsedCookies
	},
): Promise<Response> {
	const headers: Record<string, string> = {
		Cookie: options.cookies.raw,
	}

	if (options.body !== undefined) {
		headers['Content-Type'] = 'application/json'
	}

	return app.request(path, {
		method: options.method ?? 'GET',
		headers,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	})
}
