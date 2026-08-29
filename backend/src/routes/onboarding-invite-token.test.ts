import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { app } from '../app.js';
import { db } from '../db/index.js';
import { onboardingInvites, users } from '../db/schema/index.js';
import { hashToken } from '../utils/crypto.js';
import {
  createTestHub,
  createTestGroup,
  createTestUser,
  createTestSession,
  createHubAdminWithSession,
  createTestOnboardingInvite,
} from '../test/helpers.js';

/**
 * An onboarding invite is a bearer credential, and the one with the largest
 * blast radius in the system: an unexpired, unaccepted staff-admin invite
 * creates a staff_admin account and hands back a live session for it. Stored
 * raw, a single row read out of a nightly dump was therefore a privilege
 * escalation to the highest role in the product, from a backup file.
 *
 * Sessions and magic links were hashed in #48. This is the one that change
 * missed.
 */
describe('Onboarding invite token storage', () => {
  it('never stores the token in a replayable form', async () => {
    const hub = await createTestHub();
    const admin = await createTestUser({ email: `inviter-${Date.now()}@test.org`, hubId: hub.id });
    const { token } = await createTestOnboardingInvite(admin.id, { role: 'staff_admin' });

    const rows = await db.select().from(onboardingInvites);

    // The point of the change: a copy of this table must not be a set of working
    // invitation links.
    expect(rows.map((r) => r.token)).not.toContain(token);
  });

  it('stores the SHA-256 of the issued token', async () => {
    const hub = await createTestHub();
    const admin = await createTestUser({ email: `inviter2-${Date.now()}@test.org`, hubId: hub.id });
    const { token } = await createTestOnboardingInvite(admin.id, { role: 'staff_admin' });

    const [row] = await db
      .select()
      .from(onboardingInvites)
      .where(eq(onboardingInvites.token, hashToken(token)));

    expect(row).toBeDefined();
    expect(row!.token).toHaveLength(64);
  });

  it('still accepts the raw token the recipient was emailed', async () => {
    const hub = await createTestHub();
    const admin = await createTestUser({ email: `inviter3-${Date.now()}@test.org`, hubId: hub.id });
    const { token, email } = await createTestOnboardingInvite(admin.id, { role: 'staff_admin' });

    // Hashing is a storage change only. If the emailed value stopped working,
    // nobody could ever be onboarded again.
    const response = await request(app).post('/api/onboarding/accept/staff-admin').send({ token });

    expect(response.status).toBe(201);
    expect(response.body.sessionToken).toBeDefined();

    // Assert the account actually exists rather than trusting the status: a 201
    // that created nothing would be the exact failure mode of a lookup that
    // stopped matching.
    const [created] = await db.select().from(users).where(eq(users.email, email));
    expect(created?.role).toBe('staff_admin');
  });

  it('does not accept an invite by its stored hash', async () => {
    const hub = await createTestHub();
    const admin = await createTestUser({ email: `inviter4-${Date.now()}@test.org`, hubId: hub.id });
    const { token } = await createTestOnboardingInvite(admin.id, { role: 'staff_admin' });

    // Otherwise the hash is just the credential under another name, and reading
    // the row out of a dump would still be enough.
    const response = await request(app)
      .post('/api/onboarding/accept/staff-admin')
      .send({ token: hashToken(token) });

    expect(response.status).toBe(404);
  });

  it('does not hand out invite tokens through the list endpoint', async () => {
    const hub = await createTestHub();
    const { user: admin, sessionToken } = await createHubAdminWithSession(hub.id);
    const { token } = await createTestOnboardingInvite(admin.id, {
      role: 'hub_admin',
      targetHubId: hub.id,
    });

    const response = await request(app)
      .get('/api/onboarding/invites')
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(response.status).toBe(200);
    expect(response.body.invites.length).toBeGreaterThan(0);

    // These rows are serialised straight to the caller, and a bare select()
    // included the token - so listing invites handed back a working invitation
    // link for every pending invite the caller could see. Neither the raw value
    // nor its hash belongs in the response.
    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain(token);
    expect(serialised).not.toContain(hashToken(token));
    for (const invite of response.body.invites) {
      expect(invite.token).toBeUndefined();
    }
  });

  it('does not hand out invite tokens to a group coordinator either', async () => {
    const hub = await createTestHub();
    const group = await createTestGroup(hub.id, { verificationStatus: 'verified' });
    const admin = await createTestUser({ email: `inviter5-${Date.now()}@test.org`, hubId: hub.id });
    const { token } = await createTestOnboardingInvite(admin.id, {
      role: 'group_coordinator',
      targetGroupId: group.id,
    });

    const coordinator = await createTestUser({
      email: `coord-${Date.now()}@test.org`,
      role: 'group_coordinator',
      groupId: group.id,
    });
    const session = await createTestSession(coordinator.id);

    const response = await request(app)
      .get('/api/onboarding/invites')
      .set('Authorization', `Bearer ${session}`);

    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toContain(token);
  });

  it('rejects an invite that was already accepted', async () => {
    const hub = await createTestHub();
    const admin = await createTestUser({ email: `inviter6-${Date.now()}@test.org`, hubId: hub.id });
    const { token } = await createTestOnboardingInvite(admin.id, { role: 'staff_admin' });

    await request(app).post('/api/onboarding/accept/staff-admin').send({ token }).expect(201);

    const second = await request(app).post('/api/onboarding/accept/staff-admin').send({ token });

    // Single use has to survive the storage change: hashing must not
    // accidentally decouple the lookup from the acceptedAt guard.
    expect(second.status).toBe(404);
  });
});
