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

// try/finally rather than .then(closePool).catch(...): chaining the catch after
// the close meant a pool.end() rejection on the SUCCESS path was reported as
// "Migration failed", closed the pool a second time - which pg rejects with
// "Called end on pool more than once" - and exited 1, aborting a deploy whose
// migrations had in fact applied.
try {
  await main();
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  await closePool();
}
