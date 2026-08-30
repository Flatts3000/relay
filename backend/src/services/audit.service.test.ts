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
 * This release stops the writing. Dropping the columns has to wait for a second
 * deploy: deploy.sh migrates while the previous containers are still serving,
 * and the old image names ip_address in every audit INSERT, so dropping it here
 * would break the running backend - and the rollback path would restore that
 * same image against the migrated schema.
 *
 * The assertions read the raw columns rather than the Drizzle model, because the
 * model no longer declares them and the point is what reaches the table.
 */
describe('audit log retains nothing that locates a person', () => {
  it('leaves ip_address and user_agent empty on every row it writes', async () => {
    const user = await createTestUser({ role: 'hub_admin', email: 'audit-empty@test.org' });

    await logAuditEvent({ userId: user.id, action: 'approve', entityType: 'funding_request' });

    // Raw SQL, because the schema no longer declares these columns - which is
    // the point. They still exist in the database until the follow-up release
    // drops them, so what this proves is that nothing writes to them any more.
    const result = await db.execute<{ ip_address: string | null; user_agent: string | null }>(sql`
      SELECT ip_address, user_agent FROM audit_log WHERE user_id = ${user.id}
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.ip_address).toBeNull();
    expect(result.rows[0]!.user_agent).toBeNull();
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
    // The columns still exist and the model still declares them until the
    // follow-up release drops them, so the assertion is that nothing puts a
    // value in either - not that the fields are absent.
    expect(row!.ipAddress).toBeNull();
    expect(row!.userAgent).toBeNull();
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
