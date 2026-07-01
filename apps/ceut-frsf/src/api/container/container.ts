import { logger } from '@resetshop/util'
import { asClass, asFunction, asValue, type AwilixContainer, createContainer, InjectionMode } from 'awilix'
import { emailEnv } from '../config/email.env'
import { createDrizzlePgConnector } from '../helpers/drizzle-postgres-connector'
import { DrizzlePermissionRepository } from '../modules/access/permission/permission.repository'
import { PermissionService } from '../modules/access/permission/permission.service'
import { DrizzleRoleRepository } from '../modules/access/role/role.repository'
import { RoleService } from '../modules/access/role/role.service'
import { AuthPasswordService } from '../modules/auth/auth-password.service'
import { createAuthConfig } from '../modules/auth/auth.config'
import { AuthService } from '../modules/auth/auth.service'
import { DrizzleAuthenticationRepository } from '../modules/auth/authentication.repository'
import { DrizzlePasswordResetTokenRepository } from '../modules/auth/password-reset-token.repository'
import { PasswordResetService } from '../modules/auth/password-reset.service'
import { DrizzleRefreshTokenRepository } from '../modules/auth/refresh-token.repository'
import { TokenMaintenanceService } from '../modules/auth/token-maintenance.service'
import { HealthService } from '../modules/health/health.service'
import { DrizzleUserManagementRepository } from '../modules/user/user-management.repository'
import { UserManagementService } from '../modules/user/user-management.service'
import { DrizzleUserRoleRepository } from '../modules/user/user-role.repository'
import { UserRoleService } from '../modules/user/user-role.service'
import { DrizzleUserRepository } from '../modules/user/user.repository'
import { EmailService } from '../services/email/email.service'
import { EtherealEmailRepository } from '../services/email/ethereal-email.repository'
import { EMAIL_PROVIDERS } from '../services/email/interfaces'
import { NodemailerRepository } from '../services/email/nodemailer.repository'
import { NoopEmailRepository } from '../services/email/noop-email.repository'
import { createPasetoConfig } from '../services/paseto/paseto.config'
import { PasetoService } from '../services/paseto/paseto.service'
import { createPasswordHasher, createPasswordVerifier } from '../services/password/password-hasher'
import { generatePassword } from '../utils/password'
import type { Container } from './container.interface'
import type { Cradle } from './container.types'

function registerValues(c: AwilixContainer<Cradle>): void {
	c.register({
		// Wrapped in arrows so Awilix does not pass the cradle proxy as the factory's first
		// argument — createAuthConfig takes optional token/security/cron env sources and
		// createPasetoConfig an optional token source, all of which must default to their
		// respective env proxies, not the cradle. createDrizzlePgConnector takes no args; it
		// is wrapped too for uniformity.
		db: asFunction(() => createDrizzlePgConnector()).singleton(),
		authConfig: asFunction(() => createAuthConfig()).singleton(),
		pasetoConfig: asFunction(() => createPasetoConfig()).singleton(),
		logger: asValue(logger),
		generatePassword: asValue(generatePassword),
		hashPassword: asValue(createPasswordHasher()),
		verifyPassword: asValue(createPasswordVerifier()),
	})
}

function resolveEmailRepository() {
	const provider = emailEnv.EMAIL_PROVIDER
	if (provider === EMAIL_PROVIDERS.NOOP) return asClass(NoopEmailRepository).singleton()
	if (provider === EMAIL_PROVIDERS.ETHEREAL) return asClass(EtherealEmailRepository).singleton()
	return asClass(NodemailerRepository).singleton()
}

function registerRepositories(c: AwilixContainer<Cradle>): void {
	c.register({
		emailRepository: resolveEmailRepository(),
		userRepository: asClass(DrizzleUserRepository).singleton(),
		authRepository: asClass(DrizzleAuthenticationRepository).singleton(),
		refreshTokenRepository: asClass(DrizzleRefreshTokenRepository).singleton(),
		passwordResetTokenRepository: asClass(DrizzlePasswordResetTokenRepository).singleton(),
		roleRepository: asClass(DrizzleRoleRepository).singleton(),
		permissionRepository: asClass(DrizzlePermissionRepository).singleton(),
		userRoleRepository: asClass(DrizzleUserRoleRepository).singleton(),
		userManagementRepository: asClass(DrizzleUserManagementRepository).singleton(),
	})
}

function registerServices(c: AwilixContainer<Cradle>): void {
	c.register({
		emailService: asClass(EmailService).singleton(),
		healthService: asClass(HealthService).singleton(),
		pasetoService: asClass(PasetoService).singleton(),
		authPasswordService: asClass(AuthPasswordService).singleton(),
		authService: asClass(AuthService).singleton(),
		tokenMaintenanceService: asClass(TokenMaintenanceService).singleton(),
		passwordResetService: asClass(PasswordResetService).singleton(),
		roleService: asClass(RoleService).singleton(),
		permissionService: asClass(PermissionService).singleton(),
		userRoleService: asClass(UserRoleService).singleton(),
		userManagementService: asClass(UserManagementService).singleton(),
	})
}

/**
 * Creates and wires the Awilix DI container.
 * Container wiring happens on first access, not at module import time, keeping the
 * module pure and avoiding throws in test files that only use the mock container.
 *
 * Environment validation is no longer performed eagerly here: each `<domain>Env` proxy
 * (`@config/*.env`) validates on first property access and `process.exit(1)`s with a
 * formatted FATAL message on failure. `container.verify()` (called at server startup)
 * resolves every registration, which triggers those proxy reads — so missing or invalid
 * config still fails fast at boot.
 *
 * Using PROXY injection mode for:
 * - Works with minified code (production builds)
 * - Dependencies resolved via property access on proxy object
 * - Destructured constructor parameters work correctly
 */
function createAwilixContainer(): Readonly<AwilixContainer<Cradle>> {
	const c = createContainer<Cradle>({
		injectionMode: InjectionMode.PROXY,
		strict: true,
	})

	registerValues(c)
	registerRepositories(c)
	registerServices(c)

	return c
}

/**
 * Singleton DI container that supports delegate-based test isolation.
 * In production, cradle/resolve access the real Awilix container (lazy-initialized).
 * In tests, call use(mockContainer) to redirect all resolution to a InMemoryContainer,
 * then restore() in afterEach to revert to the real container.
 */
class DependencyContainer implements Container {
	private awilix: Readonly<AwilixContainer<Cradle>> | null = null
	private delegate: Container | null = null

	private initAwilix(): Readonly<AwilixContainer<Cradle>> {
		this.awilix ??= createAwilixContainer()
		return this.awilix
	}

	public get cradle(): Cradle {
		if (this.delegate) return this.delegate.cradle
		return this.initAwilix().cradle
	}

	public resolve<K extends keyof Cradle>(key: K): Cradle[K] {
		if (this.delegate) return this.delegate.resolve(key)
		return this.initAwilix().resolve(key)
	}

	/**
	 * Verifies that all registered dependencies can be resolved.
	 * Always operates on the real Awilix container, not the delegate.
	 * Call at server startup to fail fast if configuration is invalid.
	 * @throws Error if any dependency fails to resolve
	 */
	public verify(): void {
		const awilix = this.initAwilix()
		for (const dep of Object.keys(awilix.registrations)) {
			// Use string overload intentionally — verifying all registered keys at startup
			awilix.resolve(dep)
		}
	}

	/**
	 * Closes the database connection pool if it was ever resolved.
	 * Called from integration-test teardown (after the last test file completes) so the
	 * Vitest worker can exit cleanly instead of lingering on the pool's open idle TCP
	 * sockets — the source of the orphaned, memory-retaining node process.
	 *
	 * No-op when the Awilix container was never initialized (e.g. unit-test files that
	 * only use the mock container). Always operates on the real container, never the
	 * delegate: a delegate (InMemoryContainer) holds mocks, not a real pool, so there is
	 * nothing to close there. If the container was initialized but `db` was never resolved
	 * (e.g. a suite whose setup threw before any handler ran), reading `cradle.db` here
	 * lazily builds the pool; calling `end()` on a never-connected pool is a harmless no-op.
	 * Swallows errors so a double teardown (the pool already ended) stays idempotent.
	 */
	public async teardownDb(): Promise<void> {
		if (!this.awilix) return
		try {
			await this.awilix.cradle.db.$client.end()
		} catch {
			// Pool may already be ended — idempotent teardown, safe to ignore.
		}
	}

	/**
	 * Replaces the active container with a delegate (e.g. InMemoryContainer for tests).
	 * While a delegate is active, cradle and resolve() forward to it.
	 */
	public use(delegate: Container): void {
		this.delegate = delegate
	}

	/**
	 * Removes the delegate, restoring the real Awilix container.
	 * Call in afterEach to ensure clean state between tests.
	 */
	public restore(): void {
		this.delegate = null
	}
}

export const container = new DependencyContainer()
