import { RenderMode, ServerRoute } from '@angular/ssr'
import { appRoutes } from './app.routes'

// Guarded routes are rendered client-side
const clientRoutes: ServerRoute[] = appRoutes
	.filter((route) => route.path && route.path !== '**' && (route.canActivate?.length ?? 0) > 0)
	.map((route) => ({ path: `${route.path}/**`, renderMode: RenderMode.Client }))

export const serverRoutes: ServerRoute[] = [...clientRoutes, { path: '**', renderMode: RenderMode.Server }]
