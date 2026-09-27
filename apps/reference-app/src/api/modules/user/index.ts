import { createOpenAPIApp } from '@resetshop/hono-core'
import userManagementController from './user-management.controller'
import userProfileController from './user-profile.controller'
import userRoleController from './user-role.controller'

const app = createOpenAPIApp()

app.route('/', userProfileController)

// User CRUD management endpoints: /, /:id
app.route('/', userManagementController)

// User role assignment endpoints: /:userId/roles, /:userId/permissions
app.route('/', userRoleController)

export default app
