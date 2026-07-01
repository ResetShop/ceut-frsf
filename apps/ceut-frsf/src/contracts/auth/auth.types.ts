import type { z } from 'zod'
import type {
	changePasswordRequestSchema,
	changePasswordResponseSchema,
	cleanupTokensResponseSchema,
	forgotPasswordRequestSchema,
	forgotPasswordResponseSchema,
	loginRequestSchema,
	loginResponseSchema,
	logoutResponseSchema,
	meResponseSchema,
	refreshResponseSchema,
	resetPasswordRequestSchema,
	resetPasswordResponseSchema,
} from './auth.schemas'

// ============================================================================
// Request Types
// ============================================================================

export type LoginRequest = z.infer<typeof loginRequestSchema>

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>

// ============================================================================
// Response Types
// ============================================================================

export type LoginResponse = z.infer<typeof loginResponseSchema>

export type RefreshResponse = z.infer<typeof refreshResponseSchema>

export type ChangePasswordResponse = z.infer<typeof changePasswordResponseSchema>

export type ForgotPasswordResponse = z.infer<typeof forgotPasswordResponseSchema>

export type ResetPasswordResponse = z.infer<typeof resetPasswordResponseSchema>

export type MeResponse = z.infer<typeof meResponseSchema>

export type LogoutResponse = z.infer<typeof logoutResponseSchema>

export type CleanupTokensResponse = z.infer<typeof cleanupTokensResponseSchema>
