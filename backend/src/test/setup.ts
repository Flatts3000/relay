import { beforeAll, afterAll, afterEach } from 'vitest';
import { db, closePool } from '../db/index.js';
import { sql } from 'drizzle-orm';

// Test database setup
beforeAll(async () => {
  // Ensure test environment
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('Tests must run with NODE_ENV=test');
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
