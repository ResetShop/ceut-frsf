<!-- Source: CLAUDE.md | Last updated: 2026-03-02 -->

# Authentication Architecture

## Overview

Authentication uses **HttpOnly cookies** for both access and refresh tokens. JavaScript never reads or stores tokens — the server sets and deletes them via `Set-Cookie` headers. User state lives in memory (NgRx Signal Store) and is restored on each app bootstrap via `GET /api/auth/me`.

## Naming: "login" vs "auth"

| Term      | Meaning                                         | Examples                                                                                      |
| --------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **login** | The user-facing action (frontend + endpoint)    | `loginRoute` (the endpoint), login page components, login form                                |
| **auth**  | The interaction between the user and the system | `AuthErrorResponse`, `authErrorResponseSchema`, `AuthError`, `authGuard`, `authRequestSchema` |

**Rule:** Use `login*` only for the user-facing login endpoint and frontend login artifacts. Use `auth*` for request/response schemas, error types, guards, interceptors, middleware, and anything that represents the authentication domain.

## Cookie Strategy

| Cookie          | Type     | Purpose                    | Set by         | Deleted by |
| --------------- | -------- | -------------------------- | -------------- | ---------- |
| `access_token`  | HttpOnly | Authenticates API requests | Login, Refresh | Logout     |
| `refresh_token` | HttpOnly | Obtains new access token   | Login          | Logout     |

**Why HttpOnly cookies over localStorage:**

- XSS cannot read HttpOnly cookies — tokens are invisible to JavaScript
- Cookies are sent automatically on every same-origin request (`withCredentials: true`)
- Works during SSR — cookies from the browser request can be forwarded server-side

## Session Validation Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│  Router evaluates guards on every navigation                 │
│                                                              │
│  authGuard / noAuthGuard call AuthStore.validateSession()    │
│                                                              │
│  1. validateSession() calls GET /api/auth/me                 │
│  2. Browser: cookies sent automatically (withCredentials)    │
│     Server: ssrCookieInterceptor forwards cookies            │
│  3. On success → currentUser patched, guard allows/redirects │
│     On error  → guard redirects to login / allows through    │
└──────────────────────────────────────────────────────────────┘
```

**Identity source:** `GET /api/auth/me` reads `email`, `firstName` and `lastName` from the database by the access token's `sub`. Token claims are frozen at issue time, so they authenticate the request but are never returned as identity. `/me` returns 401 for an account that is disabled or soft-deleted, matching what `POST /api/auth/refresh` already enforces.

**Key invariant:** Every protected-route navigation validates the session against the backend. The `tokenRefreshInterceptor` transparently handles 401 → refresh → retry inside `validateSession()`, so an expired access token is refreshed before the error reaches the guard. No APP_INITIALIZER is used for auth — the guards own the full validation lifecycle.

## Interceptor Chain

Interceptors are registered in two configs and merged via `mergeApplicationConfig`:

**`app.config.ts` (both platforms):**

| Order | Interceptor               | Purpose                                                     |
| ----- | ------------------------- | ----------------------------------------------------------- |
| 1     | `authInterceptor`         | Adds `withCredentials: true` for `/api/` requests           |
| 2     | `tokenRefreshInterceptor` | Catches 401s, refreshes token, retries the request          |
| 3     | `forbiddenInterceptor`    | Catches 403s, shows translated toast via UIStore, re-throws |

**`app.config.server.ts` (server only):**

| Order | Interceptor            | Purpose                                                      |
| ----- | ---------------------- | ------------------------------------------------------------ |
| 3     | `ssrCookieInterceptor` | Forwards browser cookies to outgoing API requests during SSR |

### URL matching

All interceptors use `new URL().pathname.startsWith('/api/')` for safe pathname matching
that ignores query parameters:

- **`authInterceptor`** — `new URL(req.url, location.origin)` (browser only, `isPlatformBrowser` guard)
- **`tokenRefreshInterceptor`** — `new URL(req.url, location.origin)` (browser only, `isPlatformBrowser` guard)
- **`ssrCookieInterceptor`** — `new URL(req.url, request.url)` (server only, `isPlatformBrowser` guard)

### Token refresh flow (browser only)

The `tokenRefreshInterceptor` is disabled during SSR because `Set-Cookie` headers on the API response never reach the browser when the request originates from the SSR HTTP client.

```
Request fails with 401
    │
    ├── Is /api/auth/refresh? → logout, propagate error (guard redirects)
    ├── Is /api/auth/login?   → pass through (invalid credentials)
    │
    ├── Is refresh in progress? → wait for it, then retry original request
    │
    └── Start new refresh:
        ├── POST /api/auth/refresh (cookie sent automatically)
        ├── Success → completeTokenRefresh(), retry original request
        └── Failure → failTokenRefresh(), logout, propagate error (guard redirects)
```

## Design Rules

### Interceptors must never navigate

HTTP interceptors handle cross-cutting HTTP concerns (credentials, token refresh, cookie forwarding). They must **never** call `router.navigate()` or return `UrlTree` — navigation is a routing concern owned exclusively by route guards.

**Why:** When a guard triggers an HTTP call that fails, both the interceptor's error handler and the guard's `catchError` run. If both attempt to navigate, two competing redirects race against each other, producing unpredictable behavior.

**Boundary of responsibility:**

| Concern                       | Owner       | Example                                   |
| ----------------------------- | ----------- | ----------------------------------------- |
| State cleanup on auth failure | Interceptor | `authStore.logout()`                      |
| Redirect to login             | Guard       | `catchError(() => of(loginUrl))`          |
| Token refresh + retry         | Interceptor | 401 → refresh → retry pipeline            |
| Allow/deny navigation         | Guard       | `validateSession().pipe(map(() => true))` |

**Rule:** Interceptors propagate errors via `throwError()`. Guards catch those errors and decide where to navigate. This keeps navigation decisions in a single layer.

## Server-Side Rendering

### Route rendering modes

Guarded routes use `RenderMode.Client` to avoid SSR latency for authenticated content. All other routes use `RenderMode.Server`. This is configured in `app.routes.server.ts` by filtering `appRoutes` for routes with `canActivate` guards.

### Cookie forwarding

During SSR, `HttpClient` does not automatically include browser cookies. The `ssrCookieInterceptor` reads cookies from Angular's `REQUEST` injection token (the original Express/Node request) and clones outgoing `/api/` requests with a `Cookie` header.

## Backend Middleware

The `verifyAccessToken` middleware runs on all `/api/*` routes except public endpoints (configured via `PUBLIC_AUTH_ROUTES` in `routes.ts`). It reads the `access_token` HttpOnly cookie via `getCookie(c, 'access_token')` and verifies it as a PASETO token. On success, it attaches the decoded user payload to the Hono context as `AuthenticatedContext`. On failure, it returns 401. Handlers read that payload through the exported `getAuthenticatedUser(c)` accessor, which narrows away the optional `user` field and throws a 401 `HTTPException` on the otherwise-unreachable absent-user path — reaching into the context with a bare `(c as AuthenticatedContext).user` cast is not the sanctioned pattern.

The OpenAPIHono security scheme (`pasetoCookie`) is registered in `server.ts` via `app.openAPIRegistry.registerComponent()` and applied as a global default in `app.doc()`. Public routes opt out with `security: []` in their `createRoute()` definition. See `.claude/references/backend-api.md` for the full security convention.

## Key Files

| File                                                    | Role                                    |
| ------------------------------------------------------- | --------------------------------------- |
| `src/app/store/auth/auth.store.ts`                      | Auth state (Signal Store)               |
| `src/app/store/auth/auth.types.ts`                      | State shape and initial values          |
| `src/app/interceptors/auth.interceptor.ts`              | Adds `withCredentials` for API requests |
| `src/app/interceptors/token-refresh.interceptor.ts`     | 401 → refresh → retry                   |
| `src/app/interceptors/ssr-cookie.interceptor.ts`        | Forwards cookies during SSR             |
| `src/app/guards/auth.guard.ts`                          | Protects authenticated routes           |
| `src/app/guards/no-auth.guard.ts`                       | Redirects authenticated users away      |
| `src/app/domain/auth/auth.mapper.ts`                    | Maps API responses to domain models     |
| `src/app/providers/auth/auth.ts`                        | AuthApiService — HTTP calls             |
| `src/api/middlewares/verify-access-token.middleware.ts` | Backend cookie validation               |
| `src/api/modules/auth/auth.controller.ts`               | Login/logout/refresh endpoints          |
| `src/api/modules/auth/auth.routes.ts`                   | Auth route definitions (OpenAPI)        |
| `src/api/constants/auth.constants.ts`                   | Cookie names, token expiry defaults     |
| `src/api/openapi-config.ts`                             | Security schemes, shared API config     |
