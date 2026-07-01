import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { FAIL_FAST_MESSAGE, resolveSeedAdminCredentials, type SeedAdminCredentials } from './seed-admin-credentials'

const VALID_EMAIL = 'admin@example.com'
const VALID_PASSWORD = 'MySecretPass123' // 15 chars, within 12–128

function promptResult(): SeedAdminCredentials {
	return { email: 'prompted@example.com', password: 'PromptedPass123', firstName: 'Prompted', lastName: 'Person' }
}

describe('resolveSeedAdminCredentials', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	describe('env path — happy path', () => {
		it('resolves supplied credentials and defaults the names; never prompts', async () => {
			const promptFn = fn<[], Promise<SeedAdminCredentials>>().mockResolvedValue(promptResult())

			const result = await resolveSeedAdminCredentials({
				envInput: { email: VALID_EMAIL, password: VALID_PASSWORD, firstName: undefined, lastName: undefined },
				isInteractive: false,
				promptFn,
			})

			expect(result).toEqual({ email: VALID_EMAIL, password: VALID_PASSWORD, firstName: 'Admin', lastName: 'User' })
			expect(promptFn.calls).toHaveLength(0)
		})

		it('uses explicit first/last name when provided', async () => {
			const promptFn = fn<[], Promise<SeedAdminCredentials>>().mockResolvedValue(promptResult())

			const result = await resolveSeedAdminCredentials({
				envInput: { email: VALID_EMAIL, password: VALID_PASSWORD, firstName: 'Ada', lastName: 'Lovelace' },
				isInteractive: false,
				promptFn,
			})

			expect(result).toEqual({ email: VALID_EMAIL, password: VALID_PASSWORD, firstName: 'Ada', lastName: 'Lovelace' })
		})

		it('ignores isInteractive when env credentials are present', async () => {
			const promptFn = fn<[], Promise<SeedAdminCredentials>>().mockResolvedValue(promptResult())

			await resolveSeedAdminCredentials({
				envInput: { email: VALID_EMAIL, password: VALID_PASSWORD, firstName: undefined, lastName: undefined },
				isInteractive: true,
				promptFn,
			})

			expect(promptFn.calls).toHaveLength(0)
		})

		it('accepts a password at the minimum length boundary (12 chars)', async () => {
			const password = 'x'.repeat(12)
			const result = await resolveSeedAdminCredentials({
				envInput: { email: VALID_EMAIL, password, firstName: undefined, lastName: undefined },
				isInteractive: false,
				promptFn: fn<[], Promise<SeedAdminCredentials>>().mockResolvedValue(promptResult()),
			})

			expect(result.password).toBe(password)
		})

		it('accepts a password at the maximum length boundary (128 chars)', async () => {
			const password = 'x'.repeat(128)
			const result = await resolveSeedAdminCredentials({
				envInput: { email: VALID_EMAIL, password, firstName: undefined, lastName: undefined },
				isInteractive: false,
				promptFn: fn<[], Promise<SeedAdminCredentials>>().mockResolvedValue(promptResult()),
			})

			expect(result.password).toBe(password)
		})
	})

	describe('env path — validation failures', () => {
		function resolveWith(email: string, password: string): Promise<SeedAdminCredentials> {
			return resolveSeedAdminCredentials({
				envInput: { email, password, firstName: undefined, lastName: undefined },
				isInteractive: false,
				promptFn: fn<[], Promise<SeedAdminCredentials>>().mockResolvedValue(promptResult()),
			})
		}

		it('throws on an invalid email', async () => {
			await expect(resolveWith('notanemail', VALID_PASSWORD)).rejects.toThrow(/Invalid SEED_ADMIN_EMAIL/)
		})

		it('throws when the password is shorter than the minimum', async () => {
			await expect(resolveWith(VALID_EMAIL, 'short')).rejects.toThrow(/Invalid SEED_ADMIN_PASSWORD.*12/)
		})

		it('throws when the password exceeds the maximum', async () => {
			await expect(resolveWith(VALID_EMAIL, 'x'.repeat(129))).rejects.toThrow(/Invalid SEED_ADMIN_PASSWORD.*128/)
		})
	})

	describe('interactive TTY path', () => {
		it('calls promptFn exactly once and resolves with its value', async () => {
			const promptFn = fn<[], Promise<SeedAdminCredentials>>().mockResolvedValue(promptResult())

			const result = await resolveSeedAdminCredentials({
				envInput: { email: undefined, password: undefined, firstName: undefined, lastName: undefined },
				isInteractive: true,
				promptFn,
			})

			expect(result).toEqual(promptResult())
			expect(promptFn.calls).toHaveLength(1)
		})

		it('propagates an error thrown by promptFn', async () => {
			const promptFn = fn<[], Promise<SeedAdminCredentials>>().mockRejectedValue(new Error('prompt aborted'))

			await expect(
				resolveSeedAdminCredentials({
					envInput: { email: undefined, password: undefined, firstName: undefined, lastName: undefined },
					isInteractive: true,
					promptFn,
				}),
			).rejects.toThrow('prompt aborted')
		})
	})

	describe('fail-fast path', () => {
		function resolveNonInteractive(
			email: string | undefined,
			password: string | undefined,
		): Promise<SeedAdminCredentials> {
			return resolveSeedAdminCredentials({
				envInput: { email, password, firstName: undefined, lastName: undefined },
				isInteractive: false,
				promptFn: fn<[], Promise<SeedAdminCredentials>>().mockResolvedValue(promptResult()),
			})
		}

		it('throws the fail-fast message when neither env nor TTY is available', async () => {
			await expect(resolveNonInteractive(undefined, undefined)).rejects.toThrow(FAIL_FAST_MESSAGE)
		})

		it('falls through to fail-fast when only the email is set', async () => {
			await expect(resolveNonInteractive(VALID_EMAIL, undefined)).rejects.toThrow(FAIL_FAST_MESSAGE)
		})

		it('falls through to fail-fast when only the password is set', async () => {
			await expect(resolveNonInteractive(undefined, VALID_PASSWORD)).rejects.toThrow(FAIL_FAST_MESSAGE)
		})
	})
})
