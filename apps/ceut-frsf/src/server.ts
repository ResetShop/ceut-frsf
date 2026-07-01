import { extendZodWithOpenApi } from '@hono/zod-openapi'
import { z } from 'zod'

// Must run before any schema or controller import
extendZodWithOpenApi(z)

import { AngularAppEngine, createRequestHandler } from '@angular/ssr'
import { isMainModule } from '@angular/ssr/node'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { OpenAPIHono } from '@hono/zod-openapi'
import { parseDurationToMs, parseDurationToSeconds } from '@resetshop/util'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { join } from 'node:path'

// Health verification - runs all startup checks (DI container, database, etc.)
import { httpEnv } from './api/config/http.env'
import { ACCESS_TOKEN_COOKIE_NAME } from './api/constants/auth.constants'
import { verifyHealth } from './api/modules/health/verify-health'
import { CRON_SECRET_SCHEME, OPENAPI_INFO, PASETO_COOKIE_SCHEME } from './api/openapi-config'
import { buildSwaggerHtml } from './api/swagger-ui'

// Token middlewares
import verifyAccessToken from './api/middlewares/verify-access-token.middleware'
import routes, { PUBLIC_AUTH_ROUTES } from './api/routes'

// Cron jobs
import { startCronJobs, stopCronJobs } from './api/cron-jobs'

/**
 * Initialize OpenAPIHono and export the app instance
 */
export const app = new OpenAPIHono({ strict: false })

app.use(requestId())

// Module-level: intentionally shared across every request in this server process.
// The cors() middleware is built on the first request rather than at module-eval so that
// importing this bundle (e.g. the Angular SSR prerender worker, which runs without env vars)
// never triggers a read of httpEnv. CORS_ORIGIN may be a single origin or a comma-separated list.
let corsMiddleware: ReturnType<typeof cors> | null = null
app.use('*', async (c, next) => {
	if (corsMiddleware === null) {
		corsMiddleware = cors({
			origin: httpEnv.CORS_ORIGIN.split(','),
			credentials: true,
			allowHeaders: ['Content-Type', 'Authorization'],
			allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			maxAge: httpEnv.CORS_MAX_AGE, // Cache preflight requests
		})
	}
	return corsMiddleware(c, next)
})

app.use(secureHeaders())

/**
 * Apply authentication middleware to all API routes except public endpoints
 * Public endpoints: /api/auth/login, /api/auth/refresh, /api/auth/logout
 * Logout uses refresh token from cookie (no access token needed)
 * All other /api/* routes require valid (non-expired) authentication
 * IMPORTANT: This must be registered BEFORE routes for middleware to apply
 */
app.use('/api/*', async (c, next) => {
	const path = c.req.path

	// Skip authentication for public paths
	if (PUBLIC_AUTH_ROUTES.some((p) => path.startsWith(p))) {
		return next()
	}

	// Apply authentication middleware for all other API routes
	return verifyAccessToken(c, next)
})

/**
 * Register routes used by the APIs
 */

for (const route of routes) {
	app.route(`/api${route.path}`, route.controller)
}

/**
 * Register the PASETO cookie security scheme in the OpenAPI registry.
 * This must happen before app.doc() so the scheme appears in the spec.
 */
app.openAPIRegistry.registerComponent('securitySchemes', PASETO_COOKIE_SCHEME, {
	type: 'apiKey',
	in: 'cookie',
	name: ACCESS_TOKEN_COOKIE_NAME,
	description: 'PASETO access token stored as an HttpOnly cookie',
})

app.openAPIRegistry.registerComponent('securitySchemes', CRON_SECRET_SCHEME, {
	type: 'http',
	scheme: 'bearer',
	description: 'CRON_SECRET passed as a Bearer token for scheduled job invocations',
})

/**
 * OpenAPI JSON spec endpoint
 */
app.doc('/api/openapi.json', {
	openapi: '3.0.0',
	info: OPENAPI_INFO,
	tags: [
		{ name: 'Health', description: 'Health check endpoints' },
		{ name: 'Auth', description: 'Authentication endpoints' },
		{ name: 'Permissions', description: 'Permission management endpoints' },
		{ name: 'Roles', description: 'Role management endpoints' },
		{ name: 'Users', description: 'User management endpoints' },
		{ name: 'User Roles', description: 'User-role assignment endpoints' },
	],
	security: [{ [PASETO_COOKIE_SCHEME]: [] }],
})

/**
 * Swagger UI endpoint (CDN-hosted)
 */
app.get('/api/docs', (c) => {
	return c.html(buildSwaggerHtml())
})

/**
 * Serve static files from /browser
 */
app.use(
	'*',
	serveStatic({
		root: join(import.meta.dirname, '../browser'),
		onFound: (path, c) => {
			c.header('Cache-Control', `public, immutable, max-age=${parseDurationToSeconds('365d')}`)
		},
		onNotFound: () => {
			// Optionally log or handle the case where a static file is not found
		},
	}),
)

/**
 * Handle SSR for rest of the routes using Angular App Engine
 */
app.use('*', async (c, next) => {
	const angularApp = new AngularAppEngine()
	const response = await angularApp.handle(c.req.raw)
	if (response) {
		return response
	}

	return next()
})

/**
 * Not found
 */
app.notFound((c) => {
	return c.text('404 - Not found', 404)
})

/**
 * Error handling
 */
app.onError((error, c) => {
	console.error(`${error}`)
	return c.text('Internal Server Error', 500)
})

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment
 * variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
	;(async () => {
		// Run all startup health checks before accepting traffic
		try {
			await verifyHealth()
		} catch (error) {
			console.error('Startup health check failed:', error)
			process.exit(1)
		}

		const port = httpEnv.PORT
		const server = serve(
			{
				fetch: app.fetch,
				port,
			},
			(info) => {
				console.log(`Hono server listening on http://localhost:${info.port}`)

				// Start cron jobs
				startCronJobs()
			},
		)

		// Graceful shutdown handler with timeout
		const gracefulShutdown = (signal: string) => {
			console.log(`\n${signal} received. Starting graceful shutdown...`)
			stopCronJobs()

			// Force exit if graceful shutdown takes too long
			const forceExitTimeout = setTimeout(() => {
				console.error('Graceful shutdown timed out. Forcing exit...')
				process.exit(1)
			}, parseDurationToMs('10s'))

			server.close(() => {
				clearTimeout(forceExitTimeout)
				console.log('Server closed')
				process.exit(0)
			})
		}

		process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
		process.on('SIGINT', () => gracefulShutdown('SIGINT'))
	})()
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build)
 * or Firebase Cloud Functions.
 */
export const reqHandler = createRequestHandler(app.fetch)
