import type { Logger } from '@resetshop/util'
import type { DrizzlePgConnector } from '../helpers/drizzle-postgres-connector'
import type { PermissionRepository, PermissionService } from '../modules/access/permission/interfaces'
import type { RoleRepository, RoleService } from '../modules/access/role/interfaces'
import type { AuthConfig } from '../modules/auth/auth.config'
import type {
	AuthPasswordService,
	AuthService,
	AuthenticationRepository,
	PasswordResetService,
	PasswordResetTokenRepository,
	RefreshTokenRepository,
	TokenMaintenanceService,
} from '../modules/auth/interfaces'
import type { HealthService } from '../modules/health/interfaces'
import type {
	UserManagementRepository,
	UserManagementService,
	UserRepository,
	UserRoleRepository,
	UserRoleService,
} from '../modules/user/interfaces'
import type { EmailRepository, EmailService } from '../services/email/interfaces'
import type { PasetoService } from '../services/paseto/interfaces'
import type { PasetoConfig } from '../services/paseto/paseto.config'

/**
 * Cradle interface defines all dependencies available in the container.
 * This provides type safety when resolving dependencies.
 *
 * Dependency Graph:
 *
 * HealthService ──────────────► db
 *
 * AuthConfig (value, no deps)
 *
 * AuthService (satisfies AuthService interface)
 *   ├── UserRepository ──────► db
 *   ├── AuthRepository ──────► db, authConfig
 *   ├── RefreshTokenRepository ► db
 *   ├── PasetoService ──────────► pasetoConfig
 *   ├── UserRoleService
 *   ├── authConfig
 *   └── AuthPasswordService
 *
 * AuthPasswordService
 *   ├── AuthRepository ──────► db, authConfig
 *   └── verifyPassword (value)
 *
 * TokenMaintenanceService
 *   └── RefreshTokenRepository ► db
 *
 * RoleService
 *   ├── RoleRepository ──────► db
 *   └── UserRoleRepository ──► db
 *
 * PermissionService
 *   └── PermissionRepository ► db
 *
 * UserRoleService
 *   ├── UserRoleRepository ──► db
 *   ├── UserRepository ──────► db
 *   └── RoleRepository ──────► db
 *
 * UserManagementService
 *   ├── UserManagementRepository ► db
 *   ├── UserRoleRepository ──────► db
 *   ├── AuthRepository ──────────► db, authConfig
 *   ├── EmailService
 *   ├── generatePassword (value)
 *   └── hashPassword (value)
 *
 * EmailService
 *   └── EmailRepository (selected via EMAIL_PROVIDER env var: 'nodemailer' | 'ethereal')
 * PasetoService ──► pasetoConfig (value)
 *
 * Middleware/Controllers resolve services lazily at runtime.
 * All services are registered as singletons.
 */
export interface Cradle {
	// Values (registerValues)
	db: DrizzlePgConnector
	authConfig: AuthConfig
	pasetoConfig: PasetoConfig
	logger: Logger
	generatePassword: (wordCount?: number, language?: string) => Promise<string>
	hashPassword: (plain: string) => Promise<string>
	verifyPassword: (plain: string, hash: string) => Promise<boolean>

	// Repositories (registerRepositories)
	emailRepository: EmailRepository
	userRepository: UserRepository
	authRepository: AuthenticationRepository
	refreshTokenRepository: RefreshTokenRepository
	passwordResetTokenRepository: PasswordResetTokenRepository
	roleRepository: RoleRepository
	permissionRepository: PermissionRepository
	userRoleRepository: UserRoleRepository
	userManagementRepository: UserManagementRepository

	// Services (registerServices)
	healthService: HealthService
	emailService: EmailService
	pasetoService: PasetoService
	authPasswordService: AuthPasswordService
	authService: AuthService
	tokenMaintenanceService: TokenMaintenanceService
	passwordResetService: PasswordResetService
	roleService: RoleService
	permissionService: PermissionService
	userRoleService: UserRoleService
	userManagementService: UserManagementService
}
