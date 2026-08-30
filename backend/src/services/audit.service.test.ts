import { describe, it, expect } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { auditLog } from '../db/schema/index.js';
import { logAuditEvent, logLogin, logLogout } from './audit.service.js';
import { createTestUser } from '../test/helpers.js';

/**
 * Coverage for #70.
 *
 * The audit log recorded an IP address and a browser string against every
 * authenticated write, and against every login and logout. Neither was ever
 * read: the admin audit view selects its columns explicitly and includes
 * neither. Joined against `users` and the membership tables, they made a
 * durable map of organizer email -> group -> IP address -> activity timeline,
 * held indefinitely, for exactly the people this project's threat model is
 * about.
 *
 * This ran in two releases. The first stopped the writing; this one drops the
 * columns, which could not happen at the same time because deploy.sh migrates
 * while the previous containers are still serving, and that image named
 * ip_address in every audit INSERT.
 *
 * The schema assertion is the load-bearing one now. Deleting the code that
 * writes a column leaves the column behind, and the next person to add a
 * convenient `req` would have nothing telling them it was removed on purpose -
 * so the test is written against the database, not against the service.
 */
describe('audit log retains nothing that locates a person', () => {
  it('has no ip_address or user_agent column at all', async () => {
    const result = await db.execute<{ column_name: string }>(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'audit_log'
    `);
    const columns = result.rows.map((r) => r.column_name);

    expect(columns).not.toContain('ip_address');
    expect(columns).not.toContain('user_agent');

    // Guards against the assertion passing because the table went missing.
    expect(columns).toContain('user_id');
    expect(columns).toContain('action');
  });

  it('writes an entry that is attributable to a user and nothing else', async () => {
    const user = await createTestUser({ role: 'hub_admin', email: 'audit-write@test.org' });

    await logAuditEvent({
      userId: user.id,
      action: 'approve',
      entityType: 'funding_request',
      metadata: { note: 'test' },
    });

    const [row] = await db.select().from(auditLog).where(eq(auditLog.userId, user.id));

    expect(row).toBeDefined();
    expect(row!.action).toBe('approve');
    // The row identifies who acted. That is the accountability the audit log
    // exists for, and it needs no network address to provide it.
    expect(row!.userId).toBe(user.id);
    expect(Object.keys(row!)).not.toContain('ipAddress');
    expect(Object.keys(row!)).not.toContain('userAgent');
  });

  it('records sign-in and sign-out without a request object', async () => {
    const user = await createTestUser({
      role: 'group_coordinator',
      email: 'audit-signin@test.org',
    });

    // Neither takes a Request any more. The parameter existed only to reach
    // req.ip, so it went with the column.
    await logLogin(user.id);
    await logLogout(user.id);

    const rows = await db.select().from(auditLog).where(eq(auditLog.userId, user.id));
    const actions = rows.map((r) => r.action).sort();

    expect(actions).toEqual(['login', 'logout']);
  });
});
