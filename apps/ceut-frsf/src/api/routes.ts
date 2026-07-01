import accessRoutes from './modules/access'
import authController from './modules/auth/auth.controller'
import healthController from './modules/health/health.controller'
import userRoutes from './modules/user'

// Define public paths that don't require authentication
// Logout is public because it uses the refresh token from cookie to identify user
// Cleanup-tokens is public but protected by CRON_SECRET for Vercel Cron Jobs
export const PUBLIC_AUTH_ROUTES = [
	'/api/auth/login',
	'/api/auth/refresh',
	'/api/auth/logout',
	'/api/auth/forgot-password',
	'/api/auth/reset-password',
	'/api/auth/cleanup-tokens',
	'/api/health', // Health checks must be public for load balancers/monitoring
	'/api/docs', // Swagger UI
	'/api/openapi.json', // OpenAPI spec
] as const

export default [
	{
		path: '/health',
		controller: healthController,
	},
	{
		path: '/auth',
		controller: authController,
	},
	{
		path: '/access',
		controller: accessRoutes,
	},
	{
		path: '/users',
		controller: userRoutes,
	},
]
