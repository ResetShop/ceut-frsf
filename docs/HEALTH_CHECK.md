# Health Check System

This document describes the health check infrastructure for monitoring application and database availability.

## Overview

The health check system provides a public endpoint for verifying application and database connectivity. It serves monitoring tools, load balancers, and uptime checks, enabling automated health verification without authentication. The system includes both runtime health checks (via API endpoint) and startup verification (fail-fast on boot).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Angular)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   Health Component (/dashboard/health)               │    │
│  │                                                                       │    │
│  │  - Uses rxResource for data fetching                                 │    │
│  │  - Displays overall status badge (green/red)                         │    │
│  │  - Shows timestamp, database status, response time                   │    │
│  │  - Renders error messages when unhealthy                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                   │                                          │
│                                   │ GET /api/health/v1                       │
│                                   │                                          │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                              BACKEND (Hono)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  Health Controller (GET /v1)                         │    │
│  │                                                                       │    │
│  │  - Resolves HealthService from DI container                          │    │
│  │  - Returns 200 when healthy, 503 when unhealthy                      │    │
│  └─────────────────────────────────┬───────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         HealthService                                │    │
│  │                                                                       │    │
│  │  - checkHealth() → HealthCheckResponse                               │    │
│  │  - checkDatabase() → DatabaseCheck                                   │    │
│  │    * Runs SELECT 1 query                                             │    │
│  │    * 5-second timeout via Promise.race                               │    │
│  │    * Measures response time                                          │    │
│  │    * Never throws - returns structured result                        │    │
│  └─────────────────────────────────┬───────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Database (PostgreSQL)                            │    │
│  │                                                                       │    │
│  │  SELECT 1 (lightweight connectivity probe)                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          STARTUP VERIFICATION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  server.ts startup sequence:                                                 │
│                                                                              │
│  1. verifyHealth()                                                           │
│     ├── Check 1: DI Container Verification                                   │
│     │   └── verifyContainer() → resolves all registered dependencies         │
│     │                                                                         │
│     └── Check 2: PostgreSQL Connectivity                                     │
│         └── HealthService.checkHealth() → SELECT 1 with 5s timeout           │
│                                                                              │
│  2. If any check fails:                                                      │
│     ├── Log error                                                            │
│     └── process.exit(1) ──► Server does NOT start                            │
│                                                                              │
│  3. If all checks pass:                                                      │
│     └── serve() ──► Server starts accepting traffic                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API Endpoint

### GET /api/health/v1

Returns application health status including database connectivity checks.

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| Authentication | None (public endpoint)                   |
| Success Status | 200 OK (when healthy)                    |
| Failure Status | 503 Service Unavailable (when unhealthy) |
| Content-Type   | application/json                         |
| Timeout        | 5 seconds (database check)               |

**Example Request:**

```bash
curl http://localhost:4000/api/health/v1
```

## Response Shape

### Healthy Response

```json
{
	"status": "healthy",
	"timestamp": "2026-02-11T12:00:00.000Z",
	"checks": {
		"database": {
			"status": "healthy",
			"responseTimeMs": 3
		}
	}
}
```

### Unhealthy Response

```json
{
	"status": "unhealthy",
	"timestamp": "2026-02-11T12:00:00.000Z",
	"checks": {
		"database": {
			"status": "unhealthy",
			"responseTimeMs": null,
			"error": "Database health check timed out"
		}
	}
}
```

### Response Fields

| Field                            | Type           | Description                                                    |
| -------------------------------- | -------------- | -------------------------------------------------------------- |
| `status`                         | string         | Overall health status (`"healthy"` or `"unhealthy"`)           |
| `timestamp`                      | string         | ISO 8601 timestamp when health check was performed             |
| `checks`                         | object         | Container for individual component checks                      |
| `checks.database`                | object         | Database health check result                                   |
| `checks.database.status`         | string         | Database status (`"healthy"` or `"unhealthy"`)                 |
| `checks.database.responseTimeMs` | number \| null | Database query response time in milliseconds (null on timeout) |
| `checks.database.error`          | string         | Error message (only present when status is `"unhealthy"`)      |

## Database Check

The database health check performs a lightweight connectivity probe using a simple `SELECT 1` query. This approach minimizes database load while reliably verifying connectivity.

### Implementation Details

| Aspect            | Value                                                           |
| ----------------- | --------------------------------------------------------------- |
| Query             | `SELECT 1` (minimal overhead)                                   |
| Timeout           | 5 seconds (configurable via `HEALTH_CHECK_TIMEOUT_MS`)          |
| Timeout Mechanism | `Promise.race()` between query and timeout promise              |
| Error Handling    | Never throws - always returns structured result                 |
| Response Time     | Measured from query start to completion                         |
| Failure Behavior  | Returns `unhealthy` status with error message and response time |

### How It Works

```typescript
// 1. Start timer
const start = Date.now()

// 2. Race query against timeout
await Promise.race([
	this.db.execute(sql`SELECT 1`),
	new Promise((_, reject) => setTimeout(() => reject(new Error('Database health check timed out')), 5000)),
])

// 3. Calculate response time
const responseTimeMs = Date.now() - start

// 4. Return structured result (never throws)
return {
	status: 'healthy',
	responseTimeMs,
}
```

### Common Error Messages

| Error Message                     | Cause                                |
| --------------------------------- | ------------------------------------ |
| `Database health check timed out` | Query took longer than 5 seconds     |
| `Connection refused`              | Database server is not running       |
| `ENOTFOUND`                       | Database hostname cannot be resolved |
| `authentication failed`           | Invalid database credentials         |
| `database "..." does not exist`   | Target database does not exist       |

## Startup Verification

Before the server accepts traffic, `verifyHealth()` runs a two-phase health check sequence. If any check fails, the server exits immediately with `process.exit(1)`.

### Verification Phases

| Phase | Check                     | Purpose                                  | Failure Behavior    |
| ----- | ------------------------- | ---------------------------------------- | ------------------- |
| 1     | DI Container Verification | Ensures all dependencies can be resolved | Throws error, exits |
| 2     | PostgreSQL Connectivity   | Verifies database is reachable           | Throws error, exits |

### Console Output

When all checks pass:

```
✓ DI Container: All dependencies resolved (5ms)
✓ PostgreSQL: Connected (12ms)
Hono server listening on http://localhost:4000
```

When a check fails:

```
Startup health check failed: Error: PostgreSQL: Connection refused
```

### Implementation Flow

```typescript
// server.ts startup sequence
if (isMainModule(import.meta.url)) {
	;(async () => {
		try {
			await verifyHealth()
		} catch (error) {
			console.error('Startup health check failed:', error)
			process.exit(1) // Fail-fast - do NOT start server
		}

		// Only reached if all health checks pass
		const server = serve({ fetch: app.fetch, port })
	})()
}
```

### Why Fail-Fast?

Starting a server with unhealthy dependencies leads to:

1. **Cascading failures** - Incoming requests fail unpredictably
2. **Partial service** - Some endpoints work, others fail
3. **Resource waste** - Server consumes resources without providing value
4. **Misleading metrics** - Load balancers see "running" server that can't serve requests

The fail-fast approach ensures the server is **fully operational** before accepting traffic.

## Frontend Component

The health check component is available at `/dashboard/health` and provides a visual representation of application health status.

### Features

| Feature               | Implementation                                                   |
| --------------------- | ---------------------------------------------------------------- |
| Data Fetching         | `rxResource` from `@angular/core/rxjs-interop`                   |
| Loading State         | "Loading..." message while fetching                              |
| Error State           | Red error message if request fails                               |
| Status Badge          | Green ("default") for healthy, red ("destructive") for unhealthy |
| Timestamp Formatting  | `DatePipe` with format `yyyy/MM/dd HH:mm (z)`                    |
| Response Time Display | Shows milliseconds when available                                |
| Error Message Display | Shows database error message when unhealthy                      |

### UI States

**Loading:**

```
Application Health checker:
Loading...
```

**Healthy:**

```
Application Health checker:

Status: [healthy]
Date & Time: 2026/02/11 12:00 (UTC)

Checks
Database
Status: [healthy]
Response Time: 3ms
```

**Unhealthy:**

```
Application Health checker:

Status: [unhealthy]
Date & Time: 2026/02/11 12:00 (UTC)

Checks
Database
Status: [unhealthy]
Error: Database health check timed out
```

### Component Implementation

```typescript
@Component({
	selector: 'app-health',
	imports: [DatePipe, Badge],
})
export default class Health {
	private http = inject(HttpClient)

	healthResource = rxResource({
		stream: () => this.http.get<HealthApiResponse>('/api/health/v1'),
	})
}
```

## Key Files

| File Path                                        | Description                                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `src/api/modules/health/health.constants.ts`     | Defines `HealthStatus` frozen object (`HEALTHY`, `UNHEALTHY`) and `HEALTH_CHECK_TIMEOUT_MS = 5000` |
| `src/api/modules/health/interfaces.ts`           | TypeScript interfaces: `DatabaseCheck` (discriminated union), `HealthCheckResponse`                |
| `src/api/modules/health/health.service.ts`       | `HealthService` class with `checkHealth()` and private `checkDatabase()` methods                   |
| `src/api/modules/health/health.controller.ts`    | Hono route handler for `GET /v1`, resolves service from DI container                               |
| `src/api/modules/health/verify-health.ts`        | Startup verification: `verifyHealth()` runs DI container and database checks                       |
| `src/server.ts`                                  | Calls `verifyHealth()` before `serve()`, exits on failure                                          |
| `src/api/routes.ts`                              | Mounts health controller at `/health`, adds `/api/health` to `PUBLIC_AUTH_ROUTES`                  |
| `src/app/pages/dashboard/pages/health/health.ts` | Angular component at `/dashboard/health`, uses `rxResource` for data fetching                      |
| `src/app/pages/dashboard/dashboard.routes.ts`    | Lazy-loads health component at `health` path                                                       |
| `docs/api/health/Get Health.bru`                 | Bruno API client definition with assertions and tests                                              |

## Integration with Load Balancers

The health check endpoint is designed for integration with load balancers, container orchestration platforms, and monitoring tools.

### Configuration Examples

**AWS Application Load Balancer:**

```yaml
HealthCheckPath: /api/health/v1
HealthCheckIntervalSeconds: 30
HealthCheckTimeoutSeconds: 5
HealthyThresholdCount: 2
UnhealthyThresholdCount: 3
Matcher:
  HttpCode: 200
```

**Kubernetes Liveness Probe:**

```yaml
livenessProbe:
  httpGet:
    path: /api/health/v1
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3
```

**Docker Compose:**

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:4000/api/health/v1']
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

### Monitoring Recommendations

1. **Alert on 503 responses** - Indicates database connectivity issues
2. **Monitor response time trend** - Increasing times may indicate database performance degradation
3. **Set up uptime checks** - Use external monitoring services (UptimeRobot, Pingdom, etc.)
4. **Log health check failures** - Aggregate logs for pattern analysis

## Troubleshooting

### Endpoint Returns 503

**Symptoms:** `/api/health/v1` returns HTTP 503 with `status: "unhealthy"`

**Possible Causes:**

1. **Database connection refused**
   - Verify database server is running
   - Check `DATABASE_URL` environment variable
   - Verify network connectivity

2. **Timeout exceeded (5 seconds)**
   - Database server is overloaded
   - Network latency is too high
   - Consider increasing `HEALTH_CHECK_TIMEOUT_MS`

3. **Authentication failure**
   - Verify database credentials in `DATABASE_URL`
   - Check user permissions

**Resolution:**

```bash
# Check database connectivity manually
psql "$DATABASE_URL" -c "SELECT 1"

# Verify environment variables
echo $DATABASE_URL

# Check server logs
tail -f logs/app.log
```

### Server Won't Start

**Symptoms:** Server exits immediately after startup with error message

**Possible Causes:**

1. **DI Container verification failed**
   - Missing or misconfigured environment variables
   - Check `PASETO_SECRET_KEY` and other required config

2. **PostgreSQL connectivity failed at startup**
   - Database not running before server start
   - Network issues
   - Invalid credentials

**Resolution:**

```bash
# Run health verification manually
node --eval "import('./dist/api/modules/health/verify-health.js').then(m => m.verifyHealth())"

# Check environment variables
printenv | grep -E "(DATABASE_URL|PASETO_SECRET_KEY)"

# Start database first, then server
docker-compose up -d db
npm run dev
```

### Health Check Times Out in Development

**Symptoms:** Local development health checks consistently timeout

**Possible Causes:**

1. **Database container starting slowly**
   - Increase startup delay
   - Use Docker healthcheck to wait for database readiness

2. **Docker network issues**
   - Verify container networking
   - Check `host.docker.internal` resolution

**Resolution:**

```yaml
# docker-compose.yml - add healthcheck to database service
services:
  db:
    image: postgres:15
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5
```

## Bruno API Client

The health check endpoint is documented in the Bruno API client workspace at `docs/api/health/Get Health.bru`.

### Test Assertions

The Bruno request includes automated assertions:

```javascript
// Status code
expect(res.status).to.equal(200)

// Overall health
expect(res.body.status).to.equal('healthy')

// Database check
expect(res.body.checks.database.status).to.equal('healthy')
expect(res.body.checks.database.responseTimeMs).to.be.a('number')

// Timestamp validation
const date = new Date(res.body.timestamp)
expect(date.toString()).to.not.equal('Invalid Date')
```

### Running Tests

```bash
# Using Bruno CLI (if installed)
bruno run docs/api/health

# Or use the Bruno GUI
# File > Open Collection > Select docs/api
# Navigate to health > Get Health > Send
```

## Related Documentation

- [Authentication System](./AUTHENTICATION.md) - Token-based authentication
- [Dependency Injection Guide](./DEPENDENCY_INJECTION.md) - DI container configuration
- [API Documentation](./api/) - Complete API reference
