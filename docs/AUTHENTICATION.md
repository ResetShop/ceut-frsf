# Authentication System

This document describes the authentication system implemented in this Angular + Hono starter repository using PASETO (Platform-Agnostic Security Tokens) for secure, stateless authentication.

## Overview

The authentication system uses a dual-token approach with **HttpOnly cookies** — JavaScript never reads or stores tokens:

- **Access Token**: Short-lived PASETO token (default: 15 minutes) for API authentication, set as an HttpOnly cookie
- **Refresh Token**: Long-lived PASETO token (default: 7 days) for obtaining new access tokens, set as an HttpOnly cookie

## Why PASETO over JWT?

PASETO was chosen over JWT for the following reasons:

1. **No Algorithm Confusion**: PASETO doesn't allow algorithm selection in the token header, preventing algorithm confusion attacks
2. **Versioned Protocols**: Uses versioned protocols (v3, v4) with modern, secure cryptography
3. **Simpler API**: Fewer configuration options means fewer ways to misconfigure
4. **Strong Defaults**: v3.local uses AES-256-CTR for encryption with HMAC-SHA384 for authentication in an Encrypt-then-MAC construction

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Angular)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌────────────────────┐    ┌──────────────────────┐  │
│  │  Auth Store     │    │  Auth Interceptor  │    │ Token Refresh        │  │
│  │  (Signal Store) │    │                    │    │ Interceptor          │  │
│  │ - login()       │    │ - Sets             │    │                      │  │
│  │ - logout()      │    │   withCredentials  │    │ - Handles 401 errors │  │
│  │ - refreshToken()│    │   for cookie-based │    │ - Mutex pattern for  │  │
│  │ - currentUser   │    │   auth             │    │   concurrent refresh │  │
│  └─────────────────┘    └────────────────────┘    └──────────────────────┘  │
│                                                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    │ HTTP Requests
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                              BACKEND (Hono)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    Authentication Middleware                          │   │
│  │                                                                       │   │
│  │  - Reads access token from HttpOnly cookie on protected routes       │   │
│  │  - Extracts user info and attaches to request context                │   │
│  │  - Public paths: /api/auth/login                                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────┐    ┌────────────────────┐    ┌──────────────────────┐  │
│  │ Auth Controller │    │   Auth Service     │    │   PASETO Service     │  │
│  │                 │    │                    │    │                      │  │
│  │ POST /login     │───►│ - authenticate()   │───►│ - generateAccessToken│  │
│  │ POST /refresh   │    │ - refreshToken()   │    │ - generateRefreshTok │  │
│  │ POST /logout    │    │ - logout()         │    │ - verifyAccessToken  │  │
│  │                 │    │                    │    │ - verifyRefreshToken │  │
│  └─────────────────┘    └────────────────────┘    └──────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Database (Postgres)                              │   │
│  │                                                                       │   │
│  │  ┌────────────┐    ┌──────────────────┐    ┌─────────────────────┐   │   │
│  │  │   users    │    │  authentication  │    │   refresh_tokens    │   │   │
│  │  │            │    │                  │    │                     │   │   │
│  │  │ - id       │    │ - user_id (FK)   │    │ - user_id (FK)      │   │   │
│  │  │ - email    │    │ - password_hash  │    │ - token_hash        │   │   │
│  │  │ - status   │    │                  │    │ - token_family      │   │   │
│  │  │ - deleted_at│   │                  │    │ - expires_at        │   │   │
│  │  │            │    │                  │    │ - is_revoked        │   │   │
│  │  └────────────┘    └──────────────────┘    └─────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### Login Flow

```
1. User submits email/password
2. Backend validates credentials
3. Backend checks user status is active (rejects disabled or deleted)
4. Backend generates access token (15min) and refresh token (7 days)
5. Refresh token is stored in database (hashed)
6. Both tokens are set as HttpOnly cookies via Set-Cookie headers
7. Response body contains only user object (never tokens)
8. Frontend stores user object in NgRx Signal Store (never tokens)
```

### API Request Flow

```
1. Frontend makes API request
2. Auth interceptor sets withCredentials: true (cookies sent automatically)
3. Backend middleware reads access token from HttpOnly cookie
4. If valid, request proceeds to handler
5. If 401, token refresh interceptor kicks in
```

### Token Refresh Flow

```
1. API returns 401 Unauthorized
2. Token refresh interceptor catches error
3. If refresh already in progress, wait for it (mutex pattern)
4. Otherwise, call /api/auth/refresh
5. Backend reads refresh token from HttpOnly cookie
6. Backend validates refresh token
7. Backend generates new access + refresh tokens
8. Old refresh token is revoked
9. New tokens are set as HttpOnly cookies via Set-Cookie headers
10. Original request is retried (cookies sent automatically)
```

### Logout Flow

```
1. Frontend calls logout()
2. User state is cleared immediately (for responsive UI)
3. Backend request is sent (no access token needed)
4. Backend reads refresh token from HttpOnly cookie
5. Backend revokes all refresh tokens for user
6. Backend deletes both token cookies
7. Logout always succeeds (fail-safe design)
```

## Security Features

### Token Security

- **PASETO v3.local**: Uses AES-256-CTR for encryption with HMAC-SHA384 for authentication (Encrypt-then-MAC)
- **Token Hashing**: Refresh tokens are hashed (SHA-256) before database storage
- **Token Families**: Enables detection of token reuse attacks
- **Key Validation**: Enforces minimum 32-byte (256-bit) secret key

### Cookie Security

| Attribute  | Value           | Purpose                                     |
| ---------- | --------------- | ------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `httpOnly` | `true`          | Prevents JavaScript access (XSS protection) |
| `secure`   | `COOKIE_SECURE` | No                                          | "true" | Controls the `secure` flag on cookies. **MUST be "true" in production** (requires HTTPS). Only set to "false" for local HTTP development. |
| `sameSite` | `Strict`        | CSRF protection                             |
| `path`     | `/`             | Available site-wide                         |
| `maxAge`   | 7 days          | Matches refresh token expiry                |

### Account Protection

- **Deleted accounts**: Return generic "Invalid credentials" (prevents enumeration)
- **Disabled accounts**: Return specific "Account is disabled" message
- **Failed login tracking**: Tracks consecutive failures per user, locks account after threshold

### Rate Limiting

HTTP-level rate limiting is applied per-route to auth endpoints using `hono-rate-limiter`:

| Endpoint                 | Limit       | Window     | Purpose                               |
| ------------------------ | ----------- | ---------- | ------------------------------------- |
| `POST /api/auth/login`   | 5 requests  | 15 minutes | Prevents brute force password attacks |
| `POST /api/auth/refresh` | 10 requests | 1 minute   | Prevents token refresh abuse          |

Rate limiting is keyed by client IP (`X-Forwarded-For` → `X-Real-IP` → `'unknown'`). When a limit is exceeded, a `429 Too Many Requests` response is returned with `RateLimit-*` headers (draft-7 standard).

Rate limiting and account lockout are complementary layers:

- **Rate limiting** operates at the transport level — limits request volume before the application is reached
- **Account lockout** operates at the application level — tracks per-user failures across all IPs

### Race Condition Protection

The token refresh interceptor implements a mutex pattern to prevent multiple concurrent refresh attempts. The state is managed in the `AuthStore` (NgRx Signal Store) to ensure proper cleanup when the Angular app is destroyed and recreated:

```typescript
// AuthStore manages refresh state via signals
authStore.isTokenRefreshing() // signal<boolean>
authStore.startTokenRefresh() // sets isTokenRefreshing to true
authStore.completeTokenRefresh() // sets isTokenRefreshing to false

// Interceptor checks store state
if (authStore.isTokenRefreshing()) {
	return toObservable(authStore.isTokenRefreshing).pipe(
		filter((refreshing) => !refreshing),
		take(1),
		switchMap(() => next(req)),
	)
}
```

## Environment Variables

> **Source of truth:** [`docs/environment-variables.md`](environment-variables.md) documents every backend variable, the sub-schema that owns it, and the four supported delivery mechanisms (out-of-tree env file + Node `--env-file`, IDE run config, shell export, direnv). The auth-relevant subset below is consumed **exclusively through the typed `@config/*` proxies** — `tokenEnv` (`PASETO_*`, `COOKIE_SECURE`), `securityEnv` (`AUTH_*`), `httpEnv` (`CORS_*`, `IS_SERVERLESS`), and `cronEnv` (`CRON_SECRET`, `TOKEN_CLEANUP_*`). Direct `process.env[...]` access is forbidden outside the sub-schema files; never read these via `process.env`. There is no `.env*` file in the working tree.

| Variable                      | Required | Default                 | Description                                              |
| ----------------------------- | -------- | ----------------------- | -------------------------------------------------------- |
| `PASETO_SECRET_KEY`           | Yes      | -                       | 32-byte hex-encoded secret key                           |
| `PASETO_ISSUER`               | Yes      | -                       | Token issuer claim                                       |
| `PASETO_ACCESS_TOKEN_EXPIRY`  | No       | "15m"                   | Access token lifetime                                    |
| `PASETO_REFRESH_TOKEN_EXPIRY` | No       | "7d"                    | Refresh token lifetime                                   |
| `PASETO_CLOCK_TOLERANCE`      | No       | "1m"                    | Clock drift tolerance for token validation               |
| `COOKIE_SECURE`               | No       | "true"                  | Set to "false" to disable secure cookies (dev only)      |
| `AUTH_MAX_FAILED_ATTEMPTS`    | No       | "5"                     | Max consecutive failed login attempts before lockout     |
| `AUTH_LOCKOUT_DURATION`       | No       | "15m"                   | Account lockout duration (e.g. '15m', '1h', '30s')       |
| `CORS_ORIGIN`                 | No       | "http://localhost:4200" | Allowed origin for CORS requests                         |
| `CORS_MAX_AGE`                | No       | 86400                   | Preflight cache duration in seconds (default: 24h)       |
| `TOKEN_CLEANUP_INTERVAL`      | No       | "24h"                   | Cleanup interval as a duration string (min: 1m, max: 7d) |
| `IS_SERVERLESS`               | No       | "false"                 | Adapts for serverless (see Connection Pooling below)     |
| `CRON_SECRET`                 | No       | -                       | Secret for scheduled jobs to call cleanup endpoint       |

### Generating a Secret Key

```bash
# Using OpenSSL (recommended)
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Endpoints

### POST /api/auth/login

Authenticate user with email and password.

**Request:**

```json
{
	"email": "user@example.com",
	"password": "password123"
}
```

**Response (200):**

Both access and refresh tokens are set as HttpOnly cookies via `Set-Cookie` headers. The response body contains only the user object:

```json
{
	"user": {
		"id": 1,
		"email": "user@example.com",
		"firstName": "John",
		"lastName": "Doe"
	},
	"mustChangePassword": false
}
```

**Response (401):**

```json
{
	"error": "Invalid credentials"
}
```

### POST /api/auth/refresh

Exchange refresh token for new access + refresh tokens. Refresh token is read from HttpOnly cookie. New tokens are set as HttpOnly cookies via `Set-Cookie` headers.

**Response (200):**

```json
{}
```

### GET /api/auth/me

Token introspection endpoint. Returns the current authenticated user's information from the token. Useful for verifying token validity and session management.

**Response (200):**

```json
{
	"id": "1",
	"email": "user@example.com",
	"firstName": "John",
	"lastName": "Doe"
}
```

**Response (401):**

```json
{
	"error": "Unauthorized"
}
```

### POST /api/auth/logout

Revoke all refresh tokens for the user. Uses refresh token from HttpOnly cookie (no access token required). Always succeeds for fail-safe logout.

**Response (200):**

```json
{
	"message": "Logged out successfully"
}
```

### GET /api/auth/cleanup-tokens

Manually trigger expired token cleanup. Requires either `CRON_SECRET` authorization or an authenticated user session. Useful for an external scheduler or manual maintenance.

**Authorization:** Either `Authorization: Bearer <CRON_SECRET>` header or authenticated user session.

**Response (200) - Cleanup completed:**

```json
{
	"message": "Cleanup completed",
	"deletedCount": 5,
	"incomplete": false
}
```

**Response (200) - Cleanup incomplete (hit batch limit):**

```json
{
	"message": "Cleanup incomplete - max batch limit reached",
	"deletedCount": 100000,
	"incomplete": true
}
```

**Response (200) - Cleanup already in progress:**

```json
{
	"message": "Cleanup already in progress",
	"deletedCount": 0,
	"incomplete": false
}
```

**Response (401):**

```json
{
	"error": "Unauthorized"
}
```

## Token Cleanup

Expired refresh tokens are automatically cleaned up to prevent database bloat.

### Automatic Cleanup (Traditional Servers)

When running on a traditional server (not serverless), a background job automatically cleans up expired tokens at a configurable interval (default: 24 hours).

Configure the interval with the `TOKEN_CLEANUP_INTERVAL` environment variable (duration string, e.g. `1h`, `24h`, `7d`).

### Manual Cleanup (Serverless Environments)

In serverless environments where background jobs are not supported, use your platform's cron/scheduler feature to call the cleanup endpoint periodically.

**1. Generate a cron secret:**

```bash
openssl rand -hex 32
```

**2. Add `CRON_SECRET` to your environment variables.**

**3. Configure your platform's cron scheduler to call the endpoint:**

```
GET /api/auth/cleanup-tokens
Authorization: Bearer <your-cron-secret>
Schedule: Every hour (e.g., "0 * * * *")
```

The endpoint verifies the `CRON_SECRET` before executing. Authenticated users can also trigger cleanup manually.

### Monitoring Token Cleanup

The cleanup process outputs structured JSON logs for monitoring:

```json
{
	"event": "token_cleanup",
	"deletedCount": 5,
	"durationMs": 123,
	"incomplete": false,
	"timestamp": "2026-01-13T12:00:00.000Z"
}
```

**Key Metrics to Monitor:**

| Metric         | Description            | Action Threshold                  |
| -------------- | ---------------------- | --------------------------------- |
| `deletedCount` | Tokens deleted per run | Sudden spikes may indicate issues |
| `durationMs`   | Cleanup duration       | >30s may need smaller batches     |
| `incomplete`   | Hit batch limit        | `true` requires attention         |

**Configuration Tuning:**

- If `incomplete: true` appears regularly, increase `TOKEN_CLEANUP_MAX_BATCH_COUNT` or run cleanup more frequently
- If `durationMs` is consistently high (>10s), consider reducing `TOKEN_CLEANUP_BATCH_SIZE` to minimize lock time
- If `deletedCount` is consistently 0, cleanup frequency can be reduced to save resources

**Alerting Recommendations:**

1. **Alert on `incomplete: true`** - Indicates token backlog building up
2. **Alert if cleanup fails** - Check logs for database connectivity issues
3. **Monitor `durationMs` trend** - Increasing times may indicate database performance issues

### Connection Pooling Considerations

The token cleanup process uses PostgreSQL advisory locks to prevent concurrent cleanup runs across multiple server instances. The lock behavior adapts based on the `IS_SERVERLESS` environment variable:

| Environment                         | Lock Type                                        | Behavior                                                |
| ----------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Traditional (`IS_SERVERLESS=false`) | Session-level (`pg_try_advisory_lock`)           | Lock persists until explicitly released or session ends |
| Serverless (`IS_SERVERLESS=true`)   | Transaction-scoped (`pg_try_advisory_xact_lock`) | Lock auto-releases when request completes               |

**Why This Matters:**

In serverless environments with connection pooling (e.g., PgBouncer in transaction mode, Neon, Supabase pooler):

- Database connections are shared across requests
- Session-level locks can "leak" to subsequent requests using the same connection
- Transaction-scoped locks prevent this by automatically releasing when the transaction ends

**Configuration:**

Set `IS_SERVERLESS=true` when deploying to:

- AWS Lambda
- Any environment using PgBouncer in transaction mode
- Any managed database with connection pooling

## Database Schema

### refresh_tokens Table

```sql
CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  token_family TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Frontend Integration

### Auth Store (Signal Store)

The `AuthStore` (`src/app/store/auth/auth.store.ts`) manages authentication state using NgRx Signal Store:

```typescript
// Login
authStore.login({ email, password })

// Check authentication
if (authStore.isAuthenticated()) {
	// User is logged in
}

// Get current user
const user = authStore.currentUser()

// Logout
authStore.logout()
```

### Interceptors

Two HTTP interceptors handle authentication:

1. **Auth Interceptor** (`auth.interceptor.ts`): Sets `withCredentials: true` so cookies are sent automatically with API requests
2. **Token Refresh Interceptor** (`token-refresh.interceptor.ts`): Handles 401 errors and token refresh

### Route Guards

- **authGuard**: Protects routes requiring authentication
- **noAuthGuard**: Prevents authenticated users from accessing login/register pages

## Security Recommendations

### For Production

1. **Enable HTTPS**: Ensure `secure: true` for cookies in production
2. **Add Rate Limiting**: Implement rate limiting on auth endpoints
3. **Monitor Failed Logins**: Track and alert on suspicious login patterns
4. **Rotate Secret Keys**: Have a key rotation strategy
5. **Set Appropriate Token Lifetimes**: Balance security vs. UX

## CORS Configuration

The authentication system uses HttpOnly cookies for refresh tokens, which requires proper CORS configuration when the frontend and backend are on different origins.

### How It Works

CORS middleware is configured in `server.ts`. It is built lazily on the first request (so importing
the server bundle — e.g. by the SSR prerender worker — never reads env) from the validated `httpEnv`
proxy rather than `process.env`:

```typescript
let corsMiddleware: ReturnType<typeof cors> | null = null
app.use('*', async (c, next) => {
	if (corsMiddleware === null) {
		corsMiddleware = cors({
			origin: httpEnv.CORS_ORIGIN.split(','),
			credentials: true,
			allowHeaders: ['Content-Type', 'Authorization'],
			allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			maxAge: httpEnv.CORS_MAX_AGE, // httpEnv default: 24h in seconds
		})
	}
	return corsMiddleware(c, next)
})
```

### Key Points

1. **Credentials Support**: `credentials: true` allows cookies to be sent/received cross-origin
2. **Specific Origin Required**: When using credentials, the origin **cannot** be `*` (wildcard) - it must be a specific domain
3. **Preflight Caching**: `maxAge` is read from `httpEnv.CORS_MAX_AGE` (configurable via the `CORS_MAX_AGE` env var; default 86400 s / 24 h) to reduce OPTIONS requests

### Production Deployment

When deploying to production, set the `CORS_ORIGIN` environment variable to your frontend domain:

```bash
# Single origin
export CORS_ORIGIN=https://app.example.com
```

### Common Issues

#### Cookies Not Being Sent

If cookies aren't being sent with requests:

1. Verify `CORS_ORIGIN` matches your frontend's exact origin (including protocol and port)
2. Ensure the frontend is using `withCredentials: true` in HTTP requests
3. Check that `COOKIE_SECURE` is set appropriately (must be `true` for HTTPS)

#### Preflight Failures

If OPTIONS requests are failing:

1. Verify the CORS middleware is positioned early in the middleware chain
2. Check that your reverse proxy (if any) is forwarding OPTIONS requests

## Troubleshooting

### `FATAL: Environment validation failed (token domain)` / "PASETO_SECRET_KEY not configured"

A missing or malformed `PASETO_SECRET_KEY` (or `PASETO_ISSUER`) makes the `tokenEnv` proxy print a
formatted `FATAL: Environment validation failed (token domain)` message and `process.exit(1)` on first
access (e.g. at server startup via `container.verify()`). Deliver a valid 32-byte hex key via one of
the mechanisms in [`docs/environment-variables.md`](environment-variables.md) — do **not** create a
`.env` file in the working tree. For a quick shell session:

```bash
export PASETO_SECRET_KEY=$(openssl rand -hex 32)
```

### "Invalid or expired token"

- Check token hasn't expired
- Verify PASETO_SECRET_KEY is the same for generation and verification
- Ensure clock synchronization between client and server

### Token Refresh Loops

If you see repeated refresh attempts:

1. Check refresh token cookie is being set properly
2. Verify `sameSite` and `secure` cookie settings
3. Check for clock drift issues

## Related Files

- `src/api/services/paseto.service.ts` - PASETO token generation/verification
- `src/api/modules/auth/auth.service.ts` - Authentication business logic
- `src/api/modules/auth/auth.controller.ts` - Auth API endpoints
- `src/api/middlewares/verify-access-token.middleware.ts` - Access token middleware
- `src/app/store/auth/auth.store.ts` - Frontend auth state (NgRx Signal Store)
- `src/app/interceptors/auth.interceptor.ts` - Sets withCredentials for cookie-based auth
- `src/app/interceptors/token-refresh.interceptor.ts` - Handles 401 errors and token refresh
- `src/app/interceptors/ssr-cookie.interceptor.ts` - Forwards cookies during SSR
