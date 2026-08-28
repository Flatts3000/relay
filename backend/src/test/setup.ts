import { beforeAll, afterAll, afterEach } from 'vitest';
import { db, closePool } from '../db/index.js';
import { sql } from 'drizzle-orm';

// Test database setup
beforeAll(async () => {
  // Refuse to run against anything that is not a test database.
  //
  // Checking NODE_ENV here would be useless: vitest.config.ts hardcodes
  // env: { NODE_ENV: 'test' }, so the check can never fail. It also would not
  // protect the right thing. dotenv does not override variables already present
  // in the environment, so a developer with DB_NAME or DB_PORT exported in their
  // shell runs this suite against whatever that points at - and teardown below
  // truncates every table it finds. Assert on the database actually connected to.
  const result = await db.execute<{ current_database: string }>(sql`SELECT current_database()`);
  const dbName = result.rows[0]?.current_database;

  if (!dbName || !/_test$/.test(dbName)) {
    throw new Error(
      `Refusing to run tests against database "${dbName}". ` +
        'The test database name must end in "_test". ' +
        'Check DB_NAME/DB_PORT in your environment - an exported value overrides .env.test.'
    );
  }
});

afterEach(async () => {
  // Clean up test data between tests.
  //
  // This truncates every table in the public schema rather than deleting from a
  // hand-maintained list. The previous list-based version had gone stale: tables
  // added after it was written (hub_members, group_members, group_hub_memberships,
  // onboarding_invites, broadcasts, broadcast_invites) were never added, so the
  // DELETE on users failed a foreign key constraint and every test errored in
  // teardown. Discovering the table set at runtime means schema changes cannot
  // silently break isolation again.
  //
  // CASCADE resolves ordering, so no dependency ordering is maintained here.
  await db.execute(sql`
    DO $$
    DECLARE
      target text;
    BEGIN
      SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
        INTO target
        FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename <> '__drizzle_migrations';

      IF target IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || target || ' RESTART IDENTITY CASCADE';
      END IF;
    END $$;
  `);
});

afterAll(async () => {
  // Release the connection pool so the test process can exit cleanly.
  await closePool();
});
