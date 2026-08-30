/**
 * Migration entrypoint.
 *
 * Runs from the same compiled output as the server, so production needs neither
 * drizzle-kit nor drizzle.config.ts at runtime.
 *
 * That config opens with `import './src/env.js'`, and the runtime image ships
 * dist/ rather than src/ by design. In development it resolves, because tsx
 * maps it to src/env.ts. In the container it does not exist, so every deploy
 * from 2026-08-29 onward died at the migration step with "Cannot find module
 * './src/env.js'" - after docker compose had already recreated the containers,
 * which is what let new code ship against an un-migrated schema. See #64.
 *
 * The migrator here writes the same drizzle.__drizzle_migrations table that
 * drizzle-kit does, so it picks up an existing database exactly where drizzle-kit
 * left it rather than replaying applied migrations.
 */
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Before ./db/index.js: that module builds its connection pool at import time
// from process.env, so the environment has to be loaded first. ESM evaluates
// imports in source order, which is what makes this work.
import './env.js';

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, closePool } from './db/index.js';

// dist/migrate.js resolves to /app/drizzle; src/migrate.ts resolves to
// backend/drizzle. One path serves both because dist/ and src/ sit at the same
// depth, which is also why development and production cannot drift apart here.
const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');

async function main(): Promise<void> {
  console.log(`Applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('Migrations up to date.');
}

main()
  .then(() => closePool())
  .catch(async (error) => {
    console.error('Migration failed:', error);
    // Reported, not swallowed: the pool is closed so the process can exit
    // cleanly, but the migration error above is what the deploy acts on.
    await closePool().catch((closeError) => console.error('Closing pool failed:', closeError));
    process.exit(1);
  });
