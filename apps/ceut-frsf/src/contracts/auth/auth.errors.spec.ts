import { UserStatus } from '@contracts/user/user.constants'
import {
	AuthError,
	getInternalErrorMessage,
	InternalAuthErrorCode,
	InternalAuthErrorMessage,
	InternalToPublicErrorMap,
	isAuthError,
	isLoginErrorCode,
	LoginErrorCode,
	PublicAuthErrorCode,
	toLoginErrorResponse,
} from './auth.errors'

describe('Auth Errors', () => {
	describe('InternalAuthErrorCode', () => {
		it('should be frozen (immutable)', () => {
			expect(Object.isFrozen(InternalAuthErrorCode)).toBe(true)
		})

		it('should contain all expected error codes', () => {
			expect(InternalAuthErrorCode.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS')
			expect(InternalAuthErrorCode.OLD_PASSWORD_MISMATCH).toBe('OLD_PASSWORD_MISMATCH')
			expect(InternalAuthErrorCode.RESET_TOKEN_INVALID).toBe('RESET_TOKEN_INVALID')
			expect(InternalAuthErrorCode.USER_NOT_FOUND).toBe('USER_NOT_FOUND')
			expect(InternalAuthErrorCode.AUTH_RECORD_NOT_FOUND).toBe('AUTH_RECORD_NOT_FOUND')
			expect(InternalAuthErrorCode.ACCOUNT_LOCKED).toBe('ACCOUNT_LOCKED')
			expect(InternalAuthErrorCode.ACCOUNT_DISABLED).toBe('ACCOUNT_DISABLED')
			expect(InternalAuthErrorCode.ACCOUNT_DELETED).toBe('ACCOUNT_DELETED')
			expect(InternalAuthErrorCode.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED')
			expect(InternalAuthErrorCode.TOKEN_INVALID).toBe('TOKEN_INVALID')
			expect(InternalAuthErrorCode.TOKEN_MISSING_FAMILY).toBe('TOKEN_MISSING_FAMILY')
			expect(InternalAuthErrorCode.TOKEN_REVOKED).toBe('TOKEN_REVOKED')
			expect(InternalAuthErrorCode.TOKEN_REUSE_DETECTED).toBe('TOKEN_REUSE_DETECTED')
			expect(InternalAuthErrorCode.REFRESH_TOKEN_EXPIRED).toBe('REFRESH_TOKEN_EXPIRED')
		})

		it('should have 14 error codes', () => {
			expect(Object.keys(InternalAuthErrorCode)).toHaveLength(14)
		})
	})

	describe('PublicAuthErrorCode', () => {
		it('should be frozen (immutable)', () => {
			expect(Object.isFrozen(PublicAuthErrorCode)).toBe(true)
		})

		it('should contain all expected public error codes', () => {
			expect(PublicAuthErrorCode.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS')
			expect(PublicAuthErrorCode.OLD_PASSWORD_MISMATCH).toBe('OLD_PASSWORD_MISMATCH')
			expect(PublicAuthErrorCode.RESET_TOKEN_INVALID).toBe('RESET_TOKEN_INVALID')
			expect(PublicAuthErrorCode.ACCOUNT_LOCKED).toBe('ACCOUNT_LOCKED')
			expect(PublicAuthErrorCode.ACCOUNT_DISABLED).toBe('ACCOUNT_DISABLED')
			expect(PublicAuthErrorCode.ACCOUNT_DELETED).toBe('ACCOUNT_DELETED')
			expect(PublicAuthErrorCode.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED')
			expect(PublicAuthErrorCode.TOKEN_INVALID).toBe('TOKEN_INVALID')
			expect(PublicAuthErrorCode.GENERIC).toBe('GENERIC')
		})

		it('should have 9 error codes (subset of internal plus GENERIC)', () => {
			expect(Object.keys(PublicAuthErrorCode)).toHaveLength(9)
		})

		it('should NOT contain security-sensitive codes', () => {
			const publicCodes = Object.values(PublicAuthErrorCode)
			expect(publicCodes).not.toContain('USER_NOT_FOUND')
			expect(publicCodes).not.toContain('AUTH_RECORD_NOT_FOUND')
			expect(publicCodes).not.toContain('TOKEN_MISSING_FAMILY')
			expect(publicCodes).not.toContain('TOKEN_REVOKED')
			expect(publicCodes).not.toContain('TOKEN_REUSE_DETECTED')
			expect(publicCodes).not.toContain('REFRESH_TOKEN_EXPIRED')
		})
	})

	describe('InternalAuthErrorMessage', () => {
		it('should be frozen (immutable)', () => {
			expect(Object.isFrozen(InternalAuthErrorMessage)).toBe(true)
		})

		it('should have a message for every internal error code', () => {
			const internalCodes = Object.values(InternalAuthErrorCode)

			for (const code of internalCodes) {
				expect(InternalAuthErrorMessage[code]).toBeDefined()
				expect(typeof InternalAuthErrorMessage[code]).toBe('string')
				expect(InternalAuthErrorMessage[code].length).toBeGreaterThan(0)
			}
		})
	})

	describe('InternalToPublicErrorMap', () => {
		it('should be frozen (immutable)', () => {
			expect(Object.isFrozen(InternalToPublicErrorMap)).toBe(true)
		})

		it('should map every internal code to a public code', () => {
			const internalCodes = Object.values(InternalAuthErrorCode)
			const publicCodes = Object.values(PublicAuthErrorCode)

			for (const code of internalCodes) {
				expect(InternalToPublicErrorMap[code]).toBeDefined()
				expect(publicCodes).toContain(InternalToPublicErrorMap[code])
			}
		})

		it('should map OLD_PASSWORD_MISMATCH to itself (exposed — caller is authenticated)', () => {
			expect(InternalToPublicErrorMap[InternalAuthErrorCode.OLD_PASSWORD_MISMATCH]).toBe(
				PublicAuthErrorCode.OLD_PASSWORD_MISMATCH,
			)
		})

		it('should map RESET_TOKEN_INVALID to itself (exposed — non-specific by design)', () => {
			expect(InternalToPublicErrorMap[InternalAuthErrorCode.RESET_TOKEN_INVALID]).toBe(
				PublicAuthErrorCode.RESET_TOKEN_INVALID,
			)
		})
	})

	describe('Security Mappings (User Enumeration Prevention)', () => {
		it('should map USER_NOT_FOUND to INVALID_CREDENTIALS', () => {
			expect(InternalToPublicErrorMap[InternalAuthErrorCode.USER_NOT_FOUND]).toBe(
				PublicAuthErrorCode.INVALID_CREDENTIALS,
			)
		})

		it('should map AUTH_RECORD_NOT_FOUND to INVALID_CREDENTIALS', () => {
			expect(InternalToPublicErrorMap[InternalAuthErrorCode.AUTH_RECORD_NOT_FOUND]).toBe(
				PublicAuthErrorCode.INVALID_CREDENTIALS,
			)
		})

		it('should map TOKEN_MISSING_FAMILY to TOKEN_INVALID', () => {
			expect(InternalToPublicErrorMap[InternalAuthErrorCode.TOKEN_MISSING_FAMILY]).toBe(
				PublicAuthErrorCode.TOKEN_INVALID,
			)
		})

		it('should map TOKEN_REVOKED to TOKEN_INVALID', () => {
			expect(InternalToPublicErrorMap[InternalAuthErrorCode.TOKEN_REVOKED]).toBe(PublicAuthErrorCode.TOKEN_INVALID)
		})

		it('should map TOKEN_REUSE_DETECTED to TOKEN_INVALID', () => {
			expect(InternalToPublicErrorMap[InternalAuthErrorCode.TOKEN_REUSE_DETECTED]).toBe(
				PublicAuthErrorCode.TOKEN_INVALID,
			)
		})

		it('should map REFRESH_TOKEN_EXPIRED to TOKEN_EXPIRED', () => {
			expect(InternalToPublicErrorMap[InternalAuthErrorCode.REFRESH_TOKEN_EXPIRED]).toBe(
				PublicAuthErrorCode.TOKEN_EXPIRED,
			)
		})
	})

	describe('getInternalErrorMessage()', () => {
		it('should return the internal message for a code', () => {
			expect(getInternalErrorMessage(InternalAuthErrorCode.USER_NOT_FOUND)).toBe('User not found')
			expect(getInternalErrorMessage(InternalAuthErrorCode.ACCOUNT_LOCKED)).toBe(
				'Account temporarily locked due to too many failed attempts',
			)
		})

		it('should return detailed messages for internal-only codes', () => {
			expect(getInternalErrorMessage(InternalAuthErrorCode.TOKEN_MISSING_FAMILY)).toBe(
				'Invalid refresh token: missing token family',
			)
			expect(getInternalErrorMessage(InternalAuthErrorCode.TOKEN_REVOKED)).toBe('Refresh token has been revoked')
		})
	})

	describe('AuthError Class', () => {
		it('should create an error with internal and public codes', () => {
			const error = new AuthError(InternalAuthErrorCode.INVALID_CREDENTIALS)

			expect(error.internalCode).toBe(InternalAuthErrorCode.INVALID_CREDENTIALS)
			expect(error.publicCode).toBe(PublicAuthErrorCode.INVALID_CREDENTIALS)
		})

		it('should set the error message from internal message', () => {
			const error = new AuthError(InternalAuthErrorCode.ACCOUNT_LOCKED)

			expect(error.message).toBe('Account temporarily locked due to too many failed attempts')
		})

		it('should set error name to AuthError', () => {
			const error = new AuthError(InternalAuthErrorCode.TOKEN_EXPIRED)

			expect(error.name).toBe('AuthError')
		})

		it('should extend Error', () => {
			const error = new AuthError(InternalAuthErrorCode.INVALID_CREDENTIALS)

			expect(error instanceof Error).toBe(true)
		})

		it('should apply security mappings for public code', () => {
			const error = new AuthError(InternalAuthErrorCode.USER_NOT_FOUND)

			expect(error.internalCode).toBe(InternalAuthErrorCode.USER_NOT_FOUND)
			expect(error.publicCode).toBe(PublicAuthErrorCode.INVALID_CREDENTIALS)
			expect(error.message).toBe('User not found') // Internal message preserved for logging
		})
	})

	describe('isAuthError() Type Guard', () => {
		it('should return true for AuthError instances', () => {
			const error = new AuthError(InternalAuthErrorCode.INVALID_CREDENTIALS)

			expect(isAuthError(error)).toBe(true)
		})

		it('should return false for regular Error instances', () => {
			const error = new Error('Some error')

			expect(isAuthError(error)).toBe(false)
		})

		it('should return false for null', () => {
			expect(isAuthError(null)).toBe(false)
		})

		it('should return false for undefined', () => {
			expect(isAuthError(undefined)).toBe(false)
		})

		it('should return false for plain objects', () => {
			const obj = { internalCode: 'INVALID_CREDENTIALS', publicCode: 'INVALID_CREDENTIALS' }

			expect(isAuthError(obj)).toBe(false)
		})

		it('should return false for strings', () => {
			expect(isAuthError('INVALID_CREDENTIALS')).toBe(false)
		})
	})

	describe('LoginErrorCode', () => {
		it('should be frozen (immutable)', () => {
			expect(Object.isFrozen(LoginErrorCode)).toBe(true)
		})

		it('should only contain INVALID_CREDENTIALS, ACCOUNT_LOCKED, and GENERIC', () => {
			expect(Object.keys(LoginErrorCode)).toHaveLength(3)
			expect(LoginErrorCode.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS')
			expect(LoginErrorCode.ACCOUNT_LOCKED).toBe('ACCOUNT_LOCKED')
			expect(LoginErrorCode.GENERIC).toBe('GENERIC')
		})

		it('should NOT contain token or account status errors', () => {
			const loginCodes = Object.values(LoginErrorCode)
			expect(loginCodes).not.toContain('TOKEN_EXPIRED')
			expect(loginCodes).not.toContain('TOKEN_INVALID')
			expect(loginCodes).not.toContain('ACCOUNT_DISABLED')
			expect(loginCodes).not.toContain('ACCOUNT_DELETED')
		})
	})

	describe('isLoginErrorCode()', () => {
		it('should return true for INVALID_CREDENTIALS', () => {
			expect(isLoginErrorCode(PublicAuthErrorCode.INVALID_CREDENTIALS)).toBe(true)
		})

		it('should return true for ACCOUNT_LOCKED', () => {
			expect(isLoginErrorCode(PublicAuthErrorCode.ACCOUNT_LOCKED)).toBe(true)
		})

		it('should return true for GENERIC', () => {
			expect(isLoginErrorCode(PublicAuthErrorCode.GENERIC)).toBe(true)
		})

		it('should return false for TOKEN_EXPIRED', () => {
			expect(isLoginErrorCode(PublicAuthErrorCode.TOKEN_EXPIRED)).toBe(false)
		})

		it('should return false for TOKEN_INVALID', () => {
			expect(isLoginErrorCode(PublicAuthErrorCode.TOKEN_INVALID)).toBe(false)
		})

		it('should return false for ACCOUNT_DISABLED', () => {
			expect(isLoginErrorCode(PublicAuthErrorCode.ACCOUNT_DISABLED)).toBe(false)
		})

		it('should return false for ACCOUNT_DELETED', () => {
			expect(isLoginErrorCode(PublicAuthErrorCode.ACCOUNT_DELETED)).toBe(false)
		})
	})

	describe('Security: ACCOUNT_DELETED Mapping', () => {
		it('should map ACCOUNT_DELETED to INVALID_CREDENTIALS in InternalToPublicErrorMap', () => {
			expect(InternalToPublicErrorMap[InternalAuthErrorCode.ACCOUNT_DELETED]).toBe(
				PublicAuthErrorCode.INVALID_CREDENTIALS,
			)
		})

		it('should create AuthError with INVALID_CREDENTIALS public code for ACCOUNT_DELETED', () => {
			const error = new AuthError(InternalAuthErrorCode.ACCOUNT_DELETED)

			expect(error.internalCode).toBe(InternalAuthErrorCode.ACCOUNT_DELETED)
			expect(error.publicCode).toBe(PublicAuthErrorCode.INVALID_CREDENTIALS)
		})
	})

	describe('toLoginErrorResponse()', () => {
		it('should preserve message for INVALID_CREDENTIALS errors', () => {
			const error = new AuthError(InternalAuthErrorCode.INVALID_CREDENTIALS)
			const response = toLoginErrorResponse(error)

			expect(response.code).toBe(LoginErrorCode.INVALID_CREDENTIALS)
			expect(response.message).toBe(error.message)
		})

		it('should preserve message for ACCOUNT_LOCKED errors', () => {
			const error = new AuthError(InternalAuthErrorCode.ACCOUNT_LOCKED)
			const response = toLoginErrorResponse(error)

			expect(response.code).toBe(LoginErrorCode.ACCOUNT_LOCKED)
			expect(response.message).toBe(error.message)
		})

		it('should use generic message for TOKEN_EXPIRED errors', () => {
			const error = new AuthError(InternalAuthErrorCode.TOKEN_EXPIRED)
			const response = toLoginErrorResponse(error)

			expect(response.code).toBe(LoginErrorCode.GENERIC)
			expect(response.message).toBe('Authentication failed')
			expect(response.message).not.toBe(error.message)
		})

		it('should use generic message for ACCOUNT_DISABLED errors', () => {
			const error = new AuthError(InternalAuthErrorCode.ACCOUNT_DISABLED)
			const response = toLoginErrorResponse(error)

			expect(response.code).toBe(LoginErrorCode.GENERIC)
			expect(response.message).toBe('Authentication failed')
		})

		it('should NOT leak internal message for non-login error codes', () => {
			const sensitiveErrors = [
				InternalAuthErrorCode.TOKEN_EXPIRED,
				InternalAuthErrorCode.TOKEN_INVALID,
				InternalAuthErrorCode.TOKEN_REVOKED,
				InternalAuthErrorCode.TOKEN_REUSE_DETECTED,
				InternalAuthErrorCode.ACCOUNT_DISABLED,
			]

			for (const code of sensitiveErrors) {
				const error = new AuthError(code)
				const response = toLoginErrorResponse(error)

				expect(response.message).toBe('Authentication failed')
				expect(response.message).not.toContain('Token')
				expect(response.message).not.toContain(UserStatus.DISABLED)
			}
		})
	})
})
