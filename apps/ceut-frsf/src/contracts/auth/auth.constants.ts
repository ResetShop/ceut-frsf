/**
 * Password length bounds for user-chosen passwords.
 *
 * Shared contract constants — consumed by `changePasswordRequestSchema` (which runs in both
 * the API and the browser bundle), so these are named-constant defaults rather than env vars.
 * 12 comfortably exceeds the NIST 800-63B 8-char floor and the generated passphrase length
 * (15-22 chars); 128 caps bcrypt input to prevent a hashing DoS.
 */
export const MIN_PASSWORD_LENGTH = 12
export const MAX_PASSWORD_LENGTH = 128
