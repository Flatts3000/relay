import { beforeAll, afterAll, afterEach } from 'vitest';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

// Test database setup
beforeAll(async () => {
  // Ensure test environment
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('Tests must run with NODE_ENV=test');
  }
});

afterEach(async () => {
  // Clean up test data between tests
  // Tables are cleaned in reverse order of dependencies
  await db.execute(sql`DELETE FROM audit_log`);
  await db.execute(sql`DELETE FROM sessions`);
  await db.execute(sql`DELETE FROM auth_tokens`);
  await db.execute(sql`DELETE FROM funding_requests`);
  await db.execute(sql`DELETE FROM users`);
  await db.execute(sql`DELETE FROM groups`);
  await db.execute(sql`DELETE FROM hubs`);
});

afterAll(async () => {
  // Close database connection
  // Note: drizzle-orm/pg doesn't expose a direct close method
  // The connection will be closed when the process exits
});
