export interface TokenPayload {
	sub: string // Subject (user ID)
	email: string
	firstName: string
	lastName: string
	iat?: string // Issued at (auto-added)
	exp?: string // Expiration (auto-added)
	iss?: string // Issuer
}

export interface RefreshTokenPayload {
	sub: string // Subject (user ID)
	tokenFamily?: string // For refresh token rotation
	iss?: string // Issuer
}

export interface PasetoService {
	generateAccessToken(payload: TokenPayload): Promise<string>
	generateRefreshToken(userId: string, tokenFamily?: string): Promise<string>
	verifyAccessToken(token: string): Promise<TokenPayload>
	verifyRefreshToken(token: string): Promise<RefreshTokenPayload>
}
