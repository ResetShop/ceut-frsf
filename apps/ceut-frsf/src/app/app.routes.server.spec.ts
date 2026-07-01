import { RenderMode } from '@angular/ssr'
import { appRoutes } from './app.routes'
import { serverRoutes } from './app.routes.server'

describe('serverRoutes', () => {
	const guardedRoutes = appRoutes.filter(
		(route) => route.path && route.path !== '**' && (route.canActivate?.length ?? 0) > 0,
	)

	it('should derive client routes from guarded app routes', () => {
		for (const route of guardedRoutes) {
			const match = serverRoutes.find((sr) => sr.path === `${route.path}/**`)
			expect(match).toBeDefined()
			expect(match.renderMode).toBe(RenderMode.Client)
		}
	})

	it('should have a catch-all server route as the last entry', () => {
		const lastRoute = serverRoutes[serverRoutes.length - 1]
		expect(lastRoute).toEqual({ path: '**', renderMode: RenderMode.Server })
	})

	it('should have guarded routes plus the catch-all', () => {
		expect(serverRoutes).toHaveLength(guardedRoutes.length + 1)
	})
})
