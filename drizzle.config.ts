// drizzle.config.ts
import { dbEnv } from '@config/db.env'
import { defineConfig } from 'drizzle-kit'

// The `drizzle:create-migrations` / `drizzle:push-migrations` scripts invoke drizzle-kit through
// `tsx --tsconfig apps/ceut-frsf/tsconfig.json`, so the `@config/*` alias resolves when this
// config loads. Reading `dbEnv.PG_CONNECTION_STRING` (instead of process.env) makes the script fail
// fast at boot with the formatted FATAL message when PG_CONNECTION_STRING is missing. This file is
// not part of any Nx project's lint/typecheck target, so the alias import does not trip
// @nx/enforce-module-boundaries.
//
// Points at `apps/ceut-frsf` rather than `apps/reference-app` because `apps/ceut-frsf` is the
// actually-deployed app in this fork (see `railway.json`) — `apps/reference-app` is never
// deployed and exists solely as the canonical schematic source.
export default defineConfig({
	// TODO: Manage to define dialect programmatically via config when setting up the repo
	// dialect: 'mysql',
	dialect: 'postgresql',
	schema: './apps/ceut-frsf/src/db/schema',
	dbCredentials: {
		// TODO: Manage to define dbCredentials programmatically via config when setting up the repo
		// url: dbEnv.MYSQL_CONNECTION_STRING,
		url: dbEnv.PG_CONNECTION_STRING,
	},
})
