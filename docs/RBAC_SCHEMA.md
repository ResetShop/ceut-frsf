# RBAC Schema Documentation

This document describes the Role-Based Access Control (RBAC) database schema and provides example data flows.

## Schema Overview

The RBAC system consists of 6 core tables and 5 audit history tables:

```
User
  └── UserRole (many-to-many)
        └── Role
              └── RolePermission (many-to-many)
                    └── Permission
                          ├── PermissionRoute (one-to-many)
                          └── RolePermission (many-to-many)

Authentication (one-to-one with User)
  └── User

Audit History Tables:
  ├── UserStatusHistory     (tracks user status transitions)
  ├── UserProfileHistory    (tracks email/name changes)
  ├── UserRoleHistory       (tracks role assignment/removal)
  ├── RoleHistory           (tracks role CRUD operations)
  └── RolePermissionHistory (tracks permission assignment/removal)
```

## Tables

### 1. User

Stores user profile information.

| Column          | Type      | Constraints                                        |
| --------------- | --------- | -------------------------------------------------- |
| id              | serial    | PRIMARY KEY                                        |
| firstName       | text      | NOT NULL                                           |
| lastName        | text      | NOT NULL                                           |
| email           | text      | NOT NULL, UNIQUE                                   |
| status          | enum      | DEFAULT 'active' ('active', 'disabled', 'deleted') |
| statusChangedAt | timestamp | optional                                           |
| statusChangedBy | integer   | FK → User.id (self-ref, SET NULL)                  |
| deletedAt       | timestamp | optional                                           |
| createdAt       | timestamp | DEFAULT NOW()                                      |
| updatedAt       | timestamp | DEFAULT NOW()                                      |

**Relations:**

- `roles`: many(UserRole) - User can have multiple roles
- **Referenced by:** Authentication (one-to-one), UserRole (one-to-many)

### 2. Role

Defines role names and descriptions.

| Column      | Type      | Constraints      |
| ----------- | --------- | ---------------- |
| id          | serial    | PRIMARY KEY      |
| name        | text      | NOT NULL, UNIQUE |
| code        | text      | NOT NULL, UNIQUE |
| description | text      | optional         |
| removable   | boolean   | DEFAULT true     |
| createdAt   | timestamp | DEFAULT NOW()    |
| updatedAt   | timestamp | DEFAULT NOW()    |

**Field Notes:**

- `code`: Programmatic identifier for the role (e.g., 'admin', 'editor'). Used in code to reference roles.
- `removable`: When false, prevents deletion of system-critical roles (e.g., Administrator).

**Relations:**

- `permissions`: many(RolePermission) - Role can have multiple permissions
- `users`: many(UserRole) - Role can be assigned to multiple users
- **Referenced by:** UserRole (one-to-many), RolePermission (one-to-many)

### 3. Permission

Defines granular permissions using module-resource-action model.

| Column      | Type      | Constraints      |
| ----------- | --------- | ---------------- |
| id          | serial    | PRIMARY KEY      |
| name        | text      | NOT NULL, UNIQUE |
| description | text      | optional         |
| resource    | text      | NOT NULL         |
| action      | text      | NOT NULL         |
| createdAt   | timestamp | DEFAULT NOW()    |
| updatedAt   | timestamp | DEFAULT NOW()    |

#### Permission Naming Convention

Permissions follow the `module:resource:action` format:

```
module:resource:action
```

| Segment    | Description                    | Examples                             |
| ---------- | ------------------------------ | ------------------------------------ |
| `module`   | Domain/area of the application | `admin`, `billing`, `reports`        |
| `resource` | The entity being accessed      | `users`, `roles`, `invoices`         |
| `action`   | The operation being performed  | `create`, `read`, `update`, `delete` |

**Examples:**

| Permission Name              | Description             |
| ---------------------------- | ----------------------- |
| `admin:users:create`         | Create new users        |
| `admin:users:read`           | View user details       |
| `admin:users:update`         | Update user information |
| `admin:users:delete`         | Delete users            |
| `admin:users:reset_password` | Reset user passwords    |
| `admin:roles:create`         | Create new roles        |
| `admin:user_roles:assign`    | Assign roles to users   |
| `billing:invoices:read`      | View invoices           |
| `reports:sales:export`       | Export sales reports    |

**Benefits of this format:**

1. **Hierarchical grouping**: Easy to display in UI grouped by module
2. **Wildcard matching**: Support for patterns like `admin:users:*` (future)
3. **Clear API mapping**: Permission names map directly to endpoints
4. **Namespace collision prevention**: Modules prevent name conflicts

**Validation regex:** `^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$`

**Relations:**

- `roles`: many(RolePermission) - Permission can be assigned to multiple roles
- `routes`: many(PermissionRoute) - Permission can protect multiple routes
- **Referenced by:** RolePermission (one-to-many), PermissionRoute (one-to-many)

### 4. UserRole (Junction Table)

Establishes many-to-many relationship between users and roles.

| Column    | Type      | Constraints                             |
| --------- | --------- | --------------------------------------- |
| id        | serial    | PRIMARY KEY                             |
| userId    | integer   | NOT NULL, FK → User.id (cascade delete) |
| roleId    | integer   | NOT NULL, FK → Role.id (cascade delete) |
| createdAt | timestamp | DEFAULT NOW()                           |

**Relations:**

- `user`: one(User)
- `role`: one(Role)

### 5. RolePermission (Junction Table)

Establishes many-to-many relationship between roles and permissions.

| Column       | Type      | Constraints                                    |
| ------------ | --------- | ---------------------------------------------- |
| id           | serial    | PRIMARY KEY                                    |
| roleId       | integer   | NOT NULL, FK → Role.id (restrict delete)       |
| permissionId | integer   | NOT NULL, FK → Permission.id (restrict delete) |
| createdAt    | timestamp | DEFAULT NOW()                                  |

**Relations:**

- `role`: one(Role)
- `permission`: one(Permission)

### 6. PermissionRoute (Junction Table)

Binds permissions to specific routes (frontend or API).

| Column       | Type      | Constraints                                      |
| ------------ | --------- | ------------------------------------------------ |
| id           | serial    | PRIMARY KEY                                      |
| permissionId | integer   | NOT NULL, FK → Permission.id (restrict delete)   |
| route        | text      | NOT NULL                                         |
| routeType    | enum      | NOT NULL, DEFAULT 'frontend' ('api', 'frontend') |
| createdAt    | timestamp | DEFAULT NOW()                                    |

**Relations:**

- `permission`: one(Permission)

### 7. Authentication

Stores password hashes and login security information (one-to-one with User).

| Column                | Type      | Constraints                                     |
| --------------------- | --------- | ----------------------------------------------- |
| id                    | serial    | PRIMARY KEY                                     |
| userId                | integer   | NOT NULL, UNIQUE, FK → User.id (cascade delete) |
| passwordHash          | text      | NOT NULL (bcrypt hash)                          |
| lastPasswordChangedAt | timestamp | DEFAULT NOW()                                   |
| passwordExpiresAt     | timestamp | optional                                        |
| failedLoginAttempts   | integer   | DEFAULT 0                                       |
| lockedUntil           | timestamp | optional                                        |
| createdAt             | timestamp | DEFAULT NOW()                                   |
| updatedAt             | timestamp | DEFAULT NOW()                                   |

**Relations:**

- `user`: one(User)

### 8. Audit History Tables

All history tables follow a **snapshot pattern** — each row captures the entity's state after the change. What changed is derivable by comparing consecutive rows.

#### UserStatusHistory

| Column    | Type      | Constraints                    |
| --------- | --------- | ------------------------------ |
| id        | serial    | PRIMARY KEY                    |
| userId    | integer   | FK → User.id (CASCADE)         |
| status    | text      | NOT NULL — status after change |
| changedBy | integer   | FK → User.id (RESTRICT)        |
| changedAt | timestamp | NOT NULL                       |

#### UserProfileHistory

| Column    | Type      | Constraints                   |
| --------- | --------- | ----------------------------- |
| id        | serial    | PRIMARY KEY                   |
| userId    | integer   | FK → User.id (CASCADE)        |
| email     | text      | NOT NULL — email after change |
| firstName | text      | NOT NULL — name after change  |
| lastName  | text      | NOT NULL — name after change  |
| changedBy | integer   | FK → User.id (RESTRICT)       |
| changedAt | timestamp | NOT NULL                      |

#### UserRoleHistory

| Column    | Type      | Constraints                          |
| --------- | --------- | ------------------------------------ |
| id        | serial    | PRIMARY KEY                          |
| userId    | integer   | FK → User.id (CASCADE)               |
| roleId    | integer   | NOT NULL (no FK — survives deletion) |
| action    | text      | NOT NULL ('assigned' / 'removed')    |
| changedBy | integer   | FK → User.id (RESTRICT)              |
| changedAt | timestamp | NOT NULL                             |

#### RoleHistory

| Column      | Type      | Constraints                                  |
| ----------- | --------- | -------------------------------------------- |
| id          | serial    | PRIMARY KEY                                  |
| roleId      | integer   | NOT NULL (no FK — survives deletion)         |
| action      | text      | NOT NULL ('created' / 'updated' / 'deleted') |
| name        | text      | NOT NULL — name after change                 |
| code        | text      | NOT NULL — code after change                 |
| description | text      | nullable — description after change          |
| changedBy   | integer   | FK → User.id (RESTRICT)                      |
| changedAt   | timestamp | NOT NULL                                     |

#### RolePermissionHistory

| Column       | Type      | Constraints                          |
| ------------ | --------- | ------------------------------------ |
| id           | serial    | PRIMARY KEY                          |
| roleId       | integer   | NOT NULL (no FK — survives deletion) |
| permissionId | integer   | NOT NULL (no FK — survives deletion) |
| action       | text      | NOT NULL ('assigned' / 'removed')    |
| changedBy    | integer   | FK → User.id (RESTRICT)              |
| changedAt    | timestamp | NOT NULL                             |

**Design notes:**

- `changedBy` uses `onDelete: RESTRICT` — prevents hard-deletion of users referenced in audit history
- `roleId` and `permissionId` in history tables are NOT foreign keys — deleted entities retain their audit trail
- Action values are enforced at the application layer via `Object.freeze` constants, not database enums

## Example Data Flow

### Scenario: Admin User with Dashboard Access

#### User Table

```
id: 1
email: "john@example.com"
firstName: "John"
lastName: "Doe"
status: "active"
statusChangedAt: null
statusChangedBy: null
deletedAt: null
```

#### Authentication Table

```
id: 1
userId: 1
passwordHash: "$2b$12$..." (bcrypt hash)
failedLoginAttempts: 0
lockedUntil: null
```

#### Role Table

```
id: 1
name: "Administrator"
code: "admin"
description: "Administrator with full access"
removable: false

id: 2
name: "Editor"
code: "editor"
description: "Content editor"
removable: true
```

#### Permission Table

```
id: 1
name: "content:posts:create"
resource: "posts"
action: "create"

id: 2
name: "content:posts:delete"
resource: "posts"
action: "delete"

id: 3
name: "admin:dashboard:view"
resource: "dashboard"
action: "view"

id: 4
name: "admin:users:manage"
resource: "users"
action: "manage"
```

#### UserRole Table

```
id: 1
userId: 1
roleId: 1  (admin role)

id: 2
userId: 1
roleId: 2  (editor role)
```

#### RolePermission Table

```
id: 1
roleId: 1  (admin)
permissionId: 1  (content:posts:create)

id: 2
roleId: 1  (admin)
permissionId: 2  (content:posts:delete)

id: 3
roleId: 1  (admin)
permissionId: 3  (admin:dashboard:view)

id: 4
roleId: 1  (admin)
permissionId: 4  (admin:users:manage)

id: 5
roleId: 2  (editor)
permissionId: 1  (content:posts:create)

id: 6
roleId: 2  (editor)
permissionId: 3  (admin:dashboard:view)
```

#### PermissionRoute Table

```
id: 1
permissionId: 3  (admin:dashboard:view)
route: "/dashboard"
routeType: "frontend"

id: 2
permissionId: 3  (admin:dashboard:view)
route: "GET /api/dashboard"
routeType: "api"

id: 3
permissionId: 4  (admin:users:manage)
route: "/admin/users"
routeType: "frontend"

id: 4
permissionId: 4  (admin:users:manage)
route: "POST /api/users"
routeType: "api"

id: 5
permissionId: 4  (admin:users:manage)
route: "DELETE /api/users/:id"
routeType: "api"

id: 6
permissionId: 1  (content:posts:create)
route: "POST /api/posts"
routeType: "api"
```

### Access Verification Flow

**Question:** Can John (userId: 1) access "/dashboard"?

**Resolution Path:**

1. Fetch user: `user.id = 1`
2. Get user's roles: `userRole.userId = 1` → roleIds: [1, 2]
3. Get roles' permissions: `rolePermission.roleId IN (1, 2)` → permissionIds: [1, 2, 3, 4]
4. Check if permission exists for route: `permissionRoute.route = "/dashboard"` → permissionId: 3
5. Check if permissionId 3 in user's permissions: **YES** ✓

**Answer:** John can access "/dashboard" because:

- John has admin role (and editor role)
- Admin role has "admin:dashboard:view" permission
- "admin:dashboard:view" permission protects "/dashboard" route

## Key Design Benefits

1. **Flexibility**: One permission can protect multiple routes
2. **Scalability**: Multiple users, roles, and permissions scale independently
3. **Maintainability**: Route changes don't require code modifications
4. **Security**: Brute force protection with lockout mechanism
5. **Auditability**: Timestamps on all creation events
6. **Data Integrity**: Cascade deletes for user/role cleanup, restrict deletes for permission changes

## Management Architecture: Roles vs Permissions

### Roles - User-Managed

Roles are **user-managed entities** that can be created, updated, and deleted via the API/dashboard:

| Operation         | API Endpoint                              | Description                        |
| ----------------- | ----------------------------------------- | ---------------------------------- |
| Create            | `POST /api/roles`                         | Create a new role                  |
| Read              | `GET /api/roles`                          | List all roles (paginated)         |
| Read              | `GET /api/roles/:id`                      | Get role by ID                     |
| Update            | `PUT /api/roles/:id`                      | Update role description            |
| Delete            | `DELETE /api/roles/:id`                   | Delete role (if `removable: true`) |
| Assign to user    | `POST /api/users/:userId/roles`           | Assign role to a user              |
| Remove from user  | `DELETE /api/users/:userId/roles/:roleId` | Remove role from user              |
| Get user's roles  | `GET /api/users/:userId/roles`            | Get roles assigned to user         |
| Assign permission | `POST /api/roles/:id/permissions`         | Assign existing permission to role |
| Get permissions   | `GET /api/roles/:id/permissions`          | Get permissions for a role         |

**Key characteristics:**

- Administrators can create custom roles for their organization
- Roles group permissions for easier user management
- System roles (like "Administrator") have `removable: false` to prevent accidental deletion
- Role names and codes must be unique
- A fork's `src/db/seed.ts` may additionally bootstrap baseline starting roles beyond Administrator — e.g. `ceut-frsf`'s seed script also creates a content-scoped **Editor** role (`removable: true`) alongside the Administrator role. This is a one-time seed-time convenience for a fresh database, not a contradiction of the runtime model above: a bootstrap-seeded role is fully create/update/delete-manageable via the same API afterward, exactly like any role an administrator creates later

### Permissions - System-Defined

Permissions are **system-defined entities** that are created through migrations and seed scripts:

| Aspect       | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| Creation     | Defined in code via seed scripts or migrations              |
| Modification | Requires code changes and redeployment                      |
| Deletion     | Requires migration (must remove all role assignments first) |
| API Access   | **Read-only** - no create/update/delete endpoints           |

**Why permissions are not user-managed:**

1. **Security**: Permissions define the capability boundary of the system. Allowing runtime creation could introduce security vulnerabilities.

2. **Code coupling**: Each permission typically corresponds to middleware checks in code. Creating a permission without the corresponding code implementation provides no value.

3. **Consistency**: Permissions represent system capabilities that should be consistent across environments (dev, staging, production).

4. **Audit trail**: Permission changes should be tracked in version control, not database logs.

**How permissions are added:**

When a new module/feature is developed:

1. Create a Drizzle migration to insert the required permissions:

   ```bash
   npm run drizzle:create-migrations -- --custom
   ```

   Then in the generated migration file:

   ```sql
   INSERT INTO "permission" ("name", "description", "resource", "action")
   VALUES
     ('billing:invoices:create', 'Create invoices', 'invoices', 'create'),
     ('billing:invoices:read', 'View invoices', 'invoices', 'read');
   ```

2. Apply the migration:

   ```bash
   npm run drizzle:push-migrations
   ```

3. Add middleware checks in the controller:

   ```typescript
   app.post('/invoices', requirePermission(permission('billing:invoices:create')), async (c) => { ... });
   ```

4. Assign permissions to appropriate roles via the API

> **Note:** The seed script (`src/db/seed.ts`) is only used for initial database setup and should not be modified for new permissions. All subsequent permissions are added via migrations to ensure proper versioning and rollback capabilities.

### Summary

| Entity     | Created By     | Managed Via   | Lifecycle                          |
| ---------- | -------------- | ------------- | ---------------------------------- |
| Role       | Administrators | API/Dashboard | Runtime - create, assign, delete   |
| Permission | Developers     | Code/Seeds    | Deploy-time - tied to code changes |

This separation ensures that:

- **Administrators** have flexibility to organize users into roles
- **Developers** maintain control over what actions the system supports
- **Security** is enforced at the code level, not just configuration

## Query Examples

### Get all permissions for a user

```sql
SELECT DISTINCT p.* FROM permission p
  JOIN role_permission rp ON p.id = rp.permission_id
  JOIN role r ON rp.role_id = r.id
  JOIN user_role ur ON r.id = ur.role_id
WHERE ur.user_id = 1;
```

### Get all routes protected by a permission

```sql
SELECT * FROM permission_route
WHERE permission_id = 3;
```

### Check if user can access a route

```sql
SELECT COUNT(*) FROM permission_route pr
  JOIN role_permission rp ON pr.permission_id = rp.permission_id
  JOIN role r ON rp.role_id = r.id
  JOIN user_role ur ON r.id = ur.role_id
WHERE ur.user_id = 1
  AND pr.route = '/dashboard'
  AND pr.route_type = 'frontend';
```
