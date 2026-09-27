<!-- Source: CLAUDE.md | Last updated: 2026-03-02 -->

# Backend API Architecture

## Overview

The backend uses **OpenAPIHono** (`@hono/zod-openapi`) for all HTTP routing. Every endpoint is declared as a typed `createRoute()` definition with Zod request/response schemas, then handled via `registerRoute()`. The OpenAPI spec is auto-generated from route definitions and served at `/api/openapi.json`.

---

## File Structure

Each API module follows a strict file layout:

| File              | Purpose                                                |
| ----------------- | ------------------------------------------------------ |
| `*.routes.ts`     | Route definitions (`createRoute()`)                    |
| `*.controller.ts` | Handler implementations (`registerRoute()`)            |
| `*.schemas.ts`    | Module-local Zod schemas (when not in `contracts`)     |
| `index.ts`        | Module router — composes controllers via `app.route()` |

**Canonical folder structure:**

```
src/api/
  openapi-app.ts          # createOpenAPIApp() + registerRoute() factory
  openapi-config.ts       # Security scheme names, shared response schemas, idParamSchema
  routes.ts               # Route registry — maps paths to controllers/routers
  swagger-ui.ts           # Swagger UI HTML builder
  constants/              # auth.constants.ts, etc.
  middlewares/             # verify-access-token, verify-permissions
  modules/
    auth/
      auth.routes.ts      # Route definitions
      auth.controller.ts  # Handler implementations
    health/
      health.routes.ts
      health.controller.ts
      health.schemas.ts   # Module-local schemas
    access/
      index.ts            # Module router (composes role + permission)
      role/
        role.routes.ts
        role.controller.ts
      permission/
        permission.routes.ts
        permission.controller.ts
    user/
      index.ts            # Module router (composes user-management + user-role)
      user-management.routes.ts
      user-management.controller.ts
      user-role.routes.ts
      user-role.controller.ts
src/contracts/            # Shared Zod schemas + TypeScript types
  common/
    error.schemas.ts      # errorResponseSchema, successMessageSchema
    pagination.schemas.ts # paginatedResponseSchema(), searchPaginationSchema
    query.constants.ts    # QUERY_DEFAULTS
  auth/
    auth.schemas.ts       # loginRequestSchema, meResponseSchema, etc.
    auth.errors.ts        # AuthError class, error codes
    auth.types.ts         # LoginRequest, MeResponse, etc.
  role/
    role.schemas.ts       # roleDataSchema, createRoleRequestSchema, etc.
  user/
    user.schemas.ts       # userDataSchema, createUserRequestSchema, etc.
```

---

## App Factory

All OpenAPIHono instances are created via the centralized factory in `src/api/openapi-app.ts`:

```typescript
import { createOpenAPIApp, registerRoute } from '../../openapi-app'

const app = createOpenAPIApp()
```

**Rules:**

- **Always** use `createOpenAPIApp()` — never `new OpenAPIHono()` directly (except `server.ts` root app)
- **Always** use `registerRoute(app, route, handler)` — never `app.openapi()` directly
- `registerRoute()` relaxes Hono's strict type inference (see `AnyValidationInput` in `openapi-app.ts`)

---

## Route Definitions

Routes live in `*.routes.ts` files and use `createRoute()` from `@hono/zod-openapi`:

```typescript
import { createRoute } from '@hono/zod-openapi'

export const healthCheckRoute = createRoute({
	method: 'get',
	path: '/v1',
	tags: ['Health'],
	summary: 'Health check',
	description: 'Returns application health status including database connectivity.',
	security: [], // Public endpoint — opts out of global PASETO
	responses: {
		200: {
			description: 'Application is healthy',
			content: { 'application/json': { schema: healthCheckResponseSchema } },
		},
		503: {
			description: 'Application is unhealthy',
			content: { 'application/json': { schema: healthCheckResponseSchema } },
		},
	},
})
```

**Anatomy of a route definition:**

| Field         | Required | Description                                                    |
| ------------- | -------- | -------------------------------------------------------------- |
| `method`      | Yes      | HTTP verb: `get`, `post`, `put`, `delete`                      |
| `path`        | Yes      | Relative path (uses `{id}` for path params, not `:id`)         |
| `tags`        | Yes      | OpenAPI tag array — groups endpoints in Swagger UI             |
| `summary`     | Yes      | Short one-line description                                     |
| `description` | Yes      | Detailed endpoint description                                  |
| `security`    | No       | Override global security (see Security Convention below)       |
| `middleware`  | No       | Route-level middleware array (e.g., `requirePermission()`)     |
| `request`     | No       | Object with `params`, `query`, and/or `body` Zod schemas       |
| `responses`   | Yes      | Map of status codes to `{ description, content }` with schemas |

**Path parameter syntax:** Use `{id}` (OpenAPI style), not `:id` (Express style).

---

## Security Convention

Security is configured at the `app.doc()` level in `server.ts` with a **global PASETO default**:

```typescript
app.doc('/api/openapi.json', {
	openapi: '3.0.0',
	info: OPENAPI_INFO,
	security: [{ [PASETO_COOKIE_SCHEME]: [] }], // Global default
})
```

**Three security patterns:**

| Pattern   | Route definition                                       | Use case                              |
| --------- | ------------------------------------------------------ | ------------------------------------- |
| Protected | _(omit `security`)_                                    | Default — inherits global PASETO auth |
| Public    | `security: []`                                         | Login, refresh, health check          |
| Dual-auth | `security: [{ pasetoCookie: [] }, { cronSecret: [] }]` | OR semantics — either auth suffices   |

**Rules:**

1. Protected routes inherit the global `security` — do not repeat `security: [{ pasetoCookie: [] }]`
2. Public routes must explicitly set `security: []` to opt out
3. Dual-auth uses array of objects (OR semantics, per OpenAPI 3.0 spec)

**Security scheme names** are defined in `openapi-config.ts`:

- `PASETO_COOKIE_SCHEME` = `'pasetoCookie'` — PASETO access token via HttpOnly cookie
- `CRON_SECRET_SCHEME` = `'cronSecret'` — Bearer token for scheduled cron jobs

---

## Shared Utilities

Reusable schemas and constants from `src/api/openapi-config.ts`:

| Export            | Type         | Purpose                                                        |
| ----------------- | ------------ | -------------------------------------------------------------- |
| `idParamSchema`   | `z.object`   | `{ id: z.coerce.number().int().positive() }` for `{id}` params |
| `commonResponses` | Response map | 401 + 403 + 500 — standard error responses for endpoints       |

**Usage in route definitions:**

```typescript
import { commonResponses, idParamSchema } from '../../../openapi-config';

export const getRoleRoute = createRoute({
  // ...
  request: { params: idParamSchema },
  responses: {
    200: { description: 'Role details', content: { ... } },
    404: { description: 'Role not found', content: { ... } },
    ...commonResponses,
  },
});
```

**Pagination utilities** from `src/contracts/common/pagination.schemas.ts`:

| Export                                | Purpose                                                             |
| ------------------------------------- | ------------------------------------------------------------------- |
| `paginationParamsSchema`              | `{ offset?, limit? }` query params                                  |
| `searchPaginationSchema`              | Extends pagination with `{ search? }` text filter                   |
| `paginatedResponseSchema(itemSchema)` | Factory — wraps any item schema in `{ data, total, offset, limit }` |

---

## Controller Handlers

Controllers live in `*.controller.ts` files. Each creates an `OpenAPIApp` and registers handlers:

```typescript
import { container } from '../../container/container'
import { createOpenAPIApp, registerRoute } from '../../openapi-app'
import { healthCheckRoute } from './health.routes'
import type { HealthCheckResponse } from './interfaces'

const app = createOpenAPIApp()

registerRoute(app, healthCheckRoute, async (c) => {
	const { healthService } = container.cradle
	const health = await healthService.checkHealth()
	const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503
	return c.json<HealthCheckResponse>(health, statusCode)
})

export default app
```

**Handler patterns:**

| Pattern                                     | Purpose                                   |
| ------------------------------------------- | ----------------------------------------- |
| `container.cradle`                          | Access DI container (Awilix)              |
| `c.req.valid('json')` with type annotation  | Parse validated request body              |
| `c.req.valid('query')` with type annotation | Parse validated query parameters          |
| `c.req.valid('param')` with type annotation | Parse validated path parameters           |
| `getAuthenticatedUser(c)`                   | Access authenticated user from middleware |
| `c.json<ResponseType>(data, statusCode)`    | Type-safe JSON response                   |

**Type annotations on `c.req.valid()`:**

Because contract schemas use plain `zod` (not the re-exported `z` from `@hono/zod-openapi`), `c.req.valid()` returns relaxed types. Always add an explicit type annotation:

```typescript
const { email, password }: LoginRequest = c.req.valid('json')
const { id }: { id: number } = c.req.valid('param')
const { offset, limit, search }: SearchPaginationParams = c.req.valid('query')
```

---

## Module Composition

Module routers (in `index.ts`) compose multiple controllers into a single sub-app:

```typescript
// src/api/modules/access/index.ts
import { createOpenAPIApp } from '../../openapi-app'
import permissionController from './permission/permission.controller'
import roleController from './role/role.controller'

const app = createOpenAPIApp()

app.route('/permissions', permissionController)
app.route('/roles', roleController)

export default app
```

**Server-level composition** in `src/server.ts` mounts module routers under `/api`:

```typescript
// src/api/routes.ts
export default [
	{ path: '/health', controller: healthController },
	{ path: '/auth', controller: authController },
	{ path: '/access', controller: accessRoutes },
	{ path: '/users', controller: userRoutes },
]

// src/server.ts
for (const route of routes) {
	app.route(`/api${route.path}`, route.controller)
}
```

**Resulting URL structure:**

| Module | Mounted at    | Final paths                                                    |
| ------ | ------------- | -------------------------------------------------------------- |
| Health | `/api/health` | `GET /api/health/v1`                                           |
| Auth   | `/api/auth`   | `POST /api/auth/login`, `/refresh`, `/logout`, etc.            |
| Access | `/api/access` | `/api/access/roles/*`, `/api/access/permissions/*`             |
| User   | `/api/users`  | `/api/users/me`, `/api/users/*`, `/api/users/{userId}/roles/*` |

**Route order:** Hono matches routes in **registration order**, not static-before-dynamic. A module that has both a static segment and a dynamic one on the same method (e.g. `PATCH /me` and `PATCH /{id}`) must mount the static route's controller first, or the dynamic route captures it. Pin the order with a module-level routing spec (see `modules/user/index.spec.ts`) rather than a comment.

---

## Contract Schemas

Shared schemas live in `src/contracts/` organized by domain:

**Naming conventions:**

| Suffix            | Purpose                                  | Example                   |
| ----------------- | ---------------------------------------- | ------------------------- |
| `*DataSchema`     | Entity shape returned in responses       | `roleDataSchema`          |
| `*RequestSchema`  | Request body shape for create/update     | `createRoleRequestSchema` |
| `*ResponseSchema` | Full response shape (when not just data) | `loginResponseSchema`     |
| `*ErrorSchema`    | Error-specific response shape            | `authErrorResponseSchema` |

**Common schemas** in `src/contracts/common/`:

- `errorResponseSchema` — `{ error: string, details?: Record<string, unknown> }`
- `successMessageSchema` — `{ message: string }`
- `paginatedResponseSchema(itemSchema)` — wraps items in `{ data, total, offset, limit }`
- `QUERY_DEFAULTS` — centralized pagination/search/field-length limits

**Types** live alongside schemas in `*.types.ts` files and are derived from or parallel to the Zod schemas.

---

## Error Handling in Handlers

Handlers use try/catch with typed error classes:

```typescript
registerRoute(app, loginRoute, async (c) => {
	try {
		const { email, password }: LoginRequest = c.req.valid('json')
		const response = await authService.authenticate({ email, password })
		return c.json<LoginResponse>({ user: response.user }, 200)
	} catch (error) {
		if (isAuthError(error)) {
			return c.json<LoginErrorResponse>(toLoginErrorResponse(error), 401)
		}
		return c.json<LoginErrorResponse>({ code: LoginErrorCode.GENERIC, message: 'Authentication failed' }, 401)
	}
})
```

**Patterns:**

- Domain errors (e.g., `AuthError`, `NotFoundError`) are caught and mapped to typed responses
- Unknown errors return generic messages — never leak internal details
- Type-safe error responses use `c.json<ErrorType>(data, statusCode)`
- Standard shapes: `ErrorResponse` (`{ error }`) and `SuccessMessage` (`{ message }`)

---

## Permission Middleware

Protected endpoints use `requirePermission()` in the route's `middleware` array:

```typescript
import { requirePermission } from '../../../middlewares/verify-permissions.middleware'

export const listRolesRoute = createRoute({
	middleware: [requirePermission(ADMIN_ROLE_PERMISSIONS.READ)] as const,
	// ...
})
```

The `as const` assertion is required for TypeScript to correctly infer the middleware tuple.

---

## OpenAPI Spec & Swagger UI

- **Spec endpoint:** `GET /api/openapi.json` — auto-generated from `app.doc()`
- **Swagger UI:** `GET /api/docs` — CDN-hosted Swagger UI with SRI hashes
- **Security schemes** are registered via `app.openAPIRegistry.registerComponent()` in `server.ts`
- **Tags** are declared in `app.doc()` to control Swagger UI grouping

---

## Integration Testing

Every API endpoint **must** have integration tests that verify behavior against a real PostgreSQL database. Integration tests live in `src/api/integration/` mirroring the module structure.

### Test Infrastructure

| File                                             | Purpose                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `vitest.integration.config.ts`                   | Vitest config (`environment: 'node'`, `fileParallelism: false`, `testTimeout: 30_000`) |
| `src/api/integration/setup/global-setup.ts`      | Schema push + base data seeding (runs once before all tests)                           |
| `src/api/integration/setup/integration-setup.ts` | Env vars + Zod OpenAPI extension (runs per test file)                                  |
| `src/api/integration/setup/test-app.ts`          | `createTestApp()` — OpenAPIHono instance with all middleware and routes                |
| `src/api/integration/setup/db-helpers.ts`        | `getTestDb()`, `truncateAllTables()`, `seedBaseData()`, `getSeededAdminIds()`          |
| `src/api/integration/setup/auth-helpers.ts`      | `loginAsAdmin()`, `loginAsRestricted()`, `authenticatedRequest()`                      |

### Required Coverage per Endpoint

| Status Code | Scenario           | Required                                |
| ----------- | ------------------ | --------------------------------------- |
| 200/201     | Happy path         | Always                                  |
| 400         | Validation errors  | When endpoint accepts body/query params |
| 401         | Unauthenticated    | All protected endpoints                 |
| 403         | Missing permission | All permission-guarded endpoints        |
| 404         | Resource not found | All endpoints with path params          |
| 409         | Duplicate/conflict | When uniqueness constraints exist       |

### Key Conventions

- Use `loginAsAdmin()` / `loginAsRestricted()` for auth — never seed per-test users for authentication
- Use `getSeededAdminIds()` for admin user/role IDs — never resolve via HTTP list calls
- Use `authenticatedRequest()` to attach cookies
- Run via `npm run test:integration` (separate from `npm run test`)
- Tests run sequentially (`fileParallelism: false`) to avoid DB race conditions
- The noop email provider and bcrypt cost 1 are configured automatically in the test environment

### Adding Tests for a New Module

1. Create `src/api/integration/<module>/` directory
2. Create `<module>.integration.spec.ts` following existing patterns
3. Use `createTestApp()`, `loginAsAdmin()`, `authenticatedRequest()` from setup helpers
4. Cover all status codes listed above for each endpoint
5. Verify with `npm run test:integration`

---

## Key Rules Summary

1. **Always** use `createOpenAPIApp()` — never `new OpenAPIHono()` (except root apps: `server.ts` and `test-app.ts`)
2. **Always** use `registerRoute(app, route, handler)` — never `app.openapi()` directly
3. **Separate** route definitions (`*.routes.ts`) from handlers (`*.controller.ts`)
4. Protected routes **inherit** global security — don't repeat the security scheme
5. Public routes **must** set `security: []` explicitly
6. Response schemas **must** use `commonResponses` for standard error responses (401, 403, 500)
7. Request body/param/query schemas come from `src/contracts/` (shared) or module-local `*.schemas.ts`
8. Path parameters use `{id}` syntax (OpenAPI), not `:id` (Express)
9. **Always** add type annotations to `c.req.valid()` calls
10. Controller files export `default app` — module routers compose them via `app.route()`
11. **Every** new or modified endpoint **must** have integration tests in `src/api/integration/`
