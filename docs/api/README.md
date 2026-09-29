# API Documentation (Bruno Collection)

This folder contains API documentation and tests using [Bruno](https://www.usebruno.com/), an open-source API client.

## Getting Started

### 1. Install Bruno

Download Bruno from [usebruno.com](https://www.usebruno.com/) or install via package managers:

```bash
# macOS
brew install bruno

# Windows (Chocolatey)
choco install bruno

# Linux (Snap)
snap install bruno
```

### 2. Open the Collection

1. Open Bruno
2. Click "Open Collection"
3. Navigate to `docs/api` folder in this project
4. Select the folder

### 3. Select Environment

1. Click the environment dropdown (top-right)
2. Select "local" for local development
3. Update variables as needed

## Collection Structure

```
docs/api/
├── bruno.json           # Collection configuration
├── collection.bru       # Collection-level settings
├── environments/        # Environment configurations
│   ├── local.bru       # Local development
│   └── production.bru  # Production (configure before use)
├── health/             # Health check endpoints
├── auth/               # Authentication endpoints
├── roles/              # Role management endpoints
└── content/
    └── cards/          # Card content management endpoints
```

## Endpoints

### Health

| Method | Endpoint       | Description                                                                  |
| ------ | -------------- | ---------------------------------------------------------------------------- |
| GET    | /api/health/v1 | Health check (database connectivity). See [Health Check](../HEALTH_CHECK.md) |

### Authentication

| Method | Endpoint                 | Description            |
| ------ | ------------------------ | ---------------------- |
| POST   | /api/auth/login          | User login             |
| POST   | /api/auth/refresh        | Refresh access token   |
| GET    | /api/auth/me             | Get current user       |
| POST   | /api/auth/logout         | User logout            |
| GET    | /api/auth/cleanup-tokens | Cleanup expired tokens |

### Roles

| Method | Endpoint                   | Description                |
| ------ | -------------------------- | -------------------------- |
| GET    | /api/roles                 | List all roles (paginated) |
| GET    | /api/roles/:id             | Get role by ID             |
| POST   | /api/roles                 | Create new role            |
| PUT    | /api/roles/:id             | Update role description    |
| DELETE | /api/roles/:id             | Delete role                |
| GET    | /api/roles/:id/permissions | Get role permissions       |
| POST   | /api/roles/:id/permissions | Assign permissions to role |

### Cards

All card endpoints require an authenticated user holding the matching `content:cards:*` permission. Deletion is a soft-delete recorded in the card history; hiding a card is an update of `enabled`.

| Method | Endpoint               | Description                                        |
| ------ | ---------------------- | -------------------------------------------------- |
| GET    | /api/content/cards     | List cards (paginated, `search`, `enabled` filter) |
| GET    | /api/content/cards/:id | Get card by ID                                     |
| POST   | /api/content/cards     | Create card (409 on duplicate `internalName`)      |
| PUT    | /api/content/cards/:id | Update card (including hide via `enabled: false`)  |
| DELETE | /api/content/cards/:id | Soft-delete card                                   |

## Running Tests

### Run All Tests

1. Right-click on the collection in Bruno
2. Select "Run Collection"

### Run Specific Folder

1. Right-click on a folder (e.g., "auth")
2. Select "Run Folder"

### Run Single Request

1. Open a request
2. Click "Send" to execute
3. Click "Tests" tab to see test results

## Environment Variables

| Variable       | Description                | Default                     |
| -------------- | -------------------------- | --------------------------- |
| `baseUrl`      | API base URL               | `http://localhost:3000/api` |
| `testEmail`    | Test user email            | `admin@example.com`         |
| `testPassword` | Test user password         | `admin123`                  |
| `testRoleId`   | Created role ID (auto-set) | -                           |
| `testCardId`   | Created card ID (auto-set) | -                           |

## Workflow Example

1. **Login**: Run "Login" request to authenticate
   - Access token and refresh token are stored as HttpOnly cookies

2. **Test Protected Endpoints**: Other requests use the cookies automatically

3. **Create Test Data**: Run "Create Role" to create test data
   - Role ID is saved to `testRoleId` for subsequent tests

4. **Cleanup**: Run "Delete Role" to clean up test data

## Tips

- Use `Ctrl+Enter` (or `Cmd+Enter` on macOS) to send requests quickly
- Tests are written in JavaScript and use Chai assertions
- Variables are shared across requests in the same environment
- Cookies persist across requests automatically
