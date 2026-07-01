import { type PasetoService, type RefreshTokenPayload, type TokenPayload } from './interfaces'

export class InMemoryPasetoService implements PasetoService {
	private accessTokenCounter = 1
	private refreshTokenCounter = 1

	// Store generated tokens for verification
	public generatedAccessTokens: Array<{ token: string; payload: TokenPayload }> = []
	public generatedRefreshTokens: Array<{ token: string; userId: string; tokenFamily?: string }> = []

	// Configure verification behavior
	private refreshTokenPayloads: Map<string, RefreshTokenPayload> = new Map()
	private accessTokenPayloads: Map<string, TokenPayload> = new Map()

	/**
	 * Set the payload that will be returned when verifying a refresh token.
	 * @param token The token string
	 * @param payload The payload to return on verification
	 */
	public setRefreshTokenPayload(token: string, payload: RefreshTokenPayload): void {
		this.refreshTokenPayloads.set(token, payload)
	}

	/**
	 * Set the payload that will be returned when verifying an access token.
	 * @param token The token string
	 * @param payload The payload to return on verification
	 */
	public setAccessTokenPayload(token: string, payload: TokenPayload): void {
		this.accessTokenPayloads.set(token, payload)
	}

	/**
	 * Clear all state from the mock.
	 */
	public clear(): void {
		this.generatedAccessTokens = []
		this.generatedRefreshTokens = []
		this.refreshTokenPayloads.clear()
		this.accessTokenPayloads.clear()
		this.accessTokenCounter = 1
		this.refreshTokenCounter = 1
	}

	public async generateAccessToken(payload: TokenPayload): Promise<string> {
		const token = `mock-access-token-${this.accessTokenCounter++}`
		this.generatedAccessTokens.push({ token, payload })
		// Auto-register the token for verification
		this.accessTokenPayloads.set(token, payload)
		return token
	}

	public async generateRefreshToken(userId: string, tokenFamily?: string): Promise<string> {
		const token = `mock-refresh-token-${this.refreshTokenCounter++}`
		this.generatedRefreshTokens.push({ token, userId, tokenFamily })
		// Auto-register the token for verification
		this.refreshTokenPayloads.set(token, { sub: userId, tokenFamily })
		return token
	}

	public async verifyAccessToken(token: string): Promise<TokenPayload> {
		const payload = this.accessTokenPayloads.get(token)
		if (!payload) {
			throw new Error('Invalid or expired token')
		}
		return payload
	}

	public async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
		const payload = this.refreshTokenPayloads.get(token)
		if (!payload) {
			throw new Error('Invalid or expired refresh token')
		}
		return payload
	}
}
