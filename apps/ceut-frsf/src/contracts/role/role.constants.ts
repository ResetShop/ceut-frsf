/**
 * Code of the seeded Administrator role (see `src/db/seed.ts`). Shared across the frontend and
 * backend so admin-lockout guards (e.g. preventing an admin from removing their own admin role)
 * reference a single source of truth instead of hardcoding the literal `'admin'`.
 */
export const ADMIN_ROLE_CODE = 'admin'
