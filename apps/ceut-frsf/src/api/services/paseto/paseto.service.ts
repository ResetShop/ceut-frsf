import { V3 } from 'paseto'
import { type RefreshTokenPayload, type TokenPayload } from './interfaces'
import type { PasetoConfig } from './paseto.config'

/**
 * Service to interact with PASETO tokens. It allows for the generation and validation of access and refresh tokens
 * using Paseto v3. This class acts as an abstraction layer above the PASETO library.
 *
 * Configuration is supplied via constructor-injected {@link PasetoConfig} (resolved from the
 * Awilix cradle in production, or constructed directly in specs). The service never reads
 * `process.env` itself.
 *
 * */
export class PasetoService {
	// secretKey is the hex string decoded to a Buffer once at construction (used on every V3 call);
	// all other settings are read from pasetoConfig directly to avoid a second source of truth.
	private readonly secretKey: Buffer
	private readonly pasetoConfig: PasetoConfig

	constructor({ pasetoConfig }: { pasetoConfig: PasetoConfig }) {
		// Defense-in-depth: the env schema already validates these, but keeping the checks here
		// ensures the service fails safely even if constructed with a hand-built config.
		const keyHex = pasetoConfig.secretKey
		if (!keyHex) {
			throw new Error('PASETO_SECRET_KEY not configured')
		}

		// Validate key length: PASETO v3.local requires a 32-byte key (64 hex characters)
		if (keyHex.length < 64) {
			throw new Error(
				'PASETO_SECRET_KEY must be at least 32 bytes (64 hex characters). ' +
					'Generate a secure key with: openssl rand -hex 32',
			)
		}

		if (!pasetoConfig.issuer) {
			throw new Error('PASETO_ISSUER not configured')
		}

		this.secretKey = Buffer.from(keyHex, 'hex')
		this.pasetoConfig = pasetoConfig
	}

	/**
	 * Generates a short-lived access token for API authentication.
	 * Expiry is configurable via PASETO_ACCESS_TOKEN_EXPIRY env variable (default: 15m).
	 *
	 * @param payload - Token payload containing user information (sub, email, firstName, lastName)
	 * @returns Encrypted PASETO v3.local token string
	 */
	public async generateAccessToken(payload: TokenPayload): Promise<string> {
		const expiresIn = this.pasetoConfig.accessTokenExpiry

		return await V3.encrypt(
			{
				sub: payload.sub,
				email: payload.email,
				firstName: payload.firstName,
				lastName: payload.lastName,
				iss: this.pasetoConfig.issuer,
			},
			this.secretKey,
			{
				expiresIn,
				iat: true, // Include issued-at timestamp
			},
		)
	}

	/**
	 * Generates a long-lived refresh token for token rotation.
	 * Expiry is configurable via PASETO_REFRESH_TOKEN_EXPIRY env variable (default: 7d).
	 *
	 * @param userId - The user's ID as a string
	 * @param tokenFamily - Token family UUID for rotation tracking. If not provided, a new UUID is generated.
	 * @returns Encrypted PASETO v3.local token string
	 */
	public async generateRefreshToken(userId: string, tokenFamily?: string): Promise<string> {
		const expiresIn = this.pasetoConfig.refreshTokenExpiry

		return await V3.encrypt(
			{
				sub: userId,
				tokenFamily: tokenFamily || crypto.randomUUID(),
				iss: this.pasetoConfig.issuer,
			},
			this.secretKey,
			{
				expiresIn,
				iat: true,
			},
		)
	}

	/**
	 * Verifies and decodes an access token.
	 * Validates signature, expiration, and issuer claims.
	 *
	 * @param token - The PASETO token string to verify
	 * @returns Decoded token payload with user information
	 * @throws Error if token is invalid, expired, or has wrong issuer
	 */
	public async verifyAccessToken(token: string): Promise<TokenPayload> {
		try {
			const result = await V3.decrypt<TokenPayload>(token, this.secretKey, {
				issuer: this.pasetoConfig.issuer,
				clockTolerance: this.pasetoConfig.clockTolerance, // Allow default 1 minute clock drift
			})

			return result
		} catch (error) {
			throw new Error('Invalid or expired token', { cause: error })
		}
	}

	/**
	 * Verifies and decodes a refresh token.
	 * Validates signature, expiration, and issuer claims.
	 *
	 * @param token - The PASETO refresh token string to verify
	 * @returns Decoded token payload with user ID and token family
	 * @throws Error if token is invalid, expired, or has wrong issuer
	 */
	public async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
		try {
			const result = await V3.decrypt<RefreshTokenPayload>(token, this.secretKey, {
				issuer: this.pasetoConfig.issuer,
				clockTolerance: this.pasetoConfig.clockTolerance, // Allow default 1 minute clock drift
			})

			return result
		} catch (error) {
			throw new Error('Invalid or expired refresh token', { cause: error })
		}
	}
}
