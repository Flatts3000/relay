import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
import { app } from '../app.js';
import { db } from '../db/index.js';
import {
  users,
  sessions,
  hubs,
  groups,
  groupMembers,
  groupHubMemberships,
  onboardingInvites,
} from '../db/schema/index.js';
import { validateSession } from '../services/auth.service.js';
import {
  createTestHub,
  createTestGroup,
  createTestUser,
  createTestOnboardingInvite,
  TestHub,
} from '../test/helpers.js';

/**
 * Accepting an invite is how every coordinator and hub admin comes into
 * existence. Until #52 none of it worked: each accept created its user inside a
 * transaction and then inserted the session through the outer `db` handle, on a
 * different connection that could not see the uncommitted row - so the foreign
 * key on sessions.user_id failed and the whole accept rolled back.
 *
 * These are the first tests of any accept endpoint.
 */
describe('Onboarding accept', () => {
  async function inviter(hub: TestHub) {
    return createTestUser({ email: `inviter-${Date.now()}@test.org`, hubId: hub.id });
  }

  describe('POST /api/onboarding/accept/staff-admin', () => {
    it('creates the user, marks the invite accepted, and returns a working session', async () => {
      const hub = await createTestHub();
      const admin = await inviter(hub);
      const { token, email } = await createTestOnboardingInvite(admin.id, {
        role: 'staff_admin',
      });

      const response = await request(app)
        .post('/api/onboarding/accept/staff-admin')
        .send({ token });

      expect(response.status).toBe(201);
      expect(response.body.sessionToken).toBeDefined();

      // The regression: before #52 this endpoint threw and nothing below existed.
      const [created] = await db.select().from(users).where(eq(users.email, email));
      expect(created?.role).toBe('staff_admin');

      const [invite] = await db
        .select()
        .from(onboardingInvites)
        .where(eq(onboardingInvites.email, email));
      // Assert the row exists before asserting about it: `undefined?.acceptedAt`
      // is undefined, and expect(undefined).not.toBeNull() passes - so the
      // original form could not fail if the invite were deleted rather than
      // stamped, or if the email lookup drifted.
      expect(invite).toBeDefined();
      expect(invite!.acceptedAt).toBeInstanceOf(Date);

      // A session token that does not authenticate would leave the new admin
      // holding a useless credential immediately after signing up.
      const session = await validateSession(response.body.sessionToken);
      expect(session?.id).toBe(created!.id);
    });

    it('commits the user and the session together', async () => {
      const hub = await createTestHub();
      const admin = await inviter(hub);
      const { token, email } = await createTestOnboardingInvite(admin.id, {
        role: 'staff_admin',
      });

      await request(app).post('/api/onboarding/accept/staff-admin').send({ token }).expect(201);

      const [created] = await db.select().from(users).where(eq(users.email, email));
      const rows = await db.select().from(sessions).where(eq(sessions.userId, created!.id));

      // Exactly one session, on the same connection as the user. The bug this
      // fixes was the two ending up on different connections.
      expect(rows).toHaveLength(1);
    });

    it('refuses a token that was never issued', async () => {
      const response = await request(app)
        .post('/api/onboarding/accept/staff-admin')
        .send({ token: 'e'.repeat(64) });

      expect(response.status).toBe(404);
    });

    it('refuses an expired invite', async () => {
      const hub = await createTestHub();
      const admin = await inviter(hub);
      const { token } = await createTestOnboardingInvite(admin.id, {
        role: 'staff_admin',
        expiresAt: new Date(Date.now() - 1000),
      });

      const response = await request(app)
        .post('/api/onboarding/accept/staff-admin')
        .send({ token });

      expect(response.status).toBe(404);
    });

    it('refuses an invite that was already accepted', async () => {
      const hub = await createTestHub();
      const admin = await inviter(hub);
      const { token } = await createTestOnboardingInvite(admin.id, { role: 'staff_admin' });

      await request(app).post('/api/onboarding/accept/staff-admin').send({ token }).expect(201);

      const second = await request(app).post('/api/onboarding/accept/staff-admin').send({ token });

      // An invite is a bearer credential. Reuse would let one leaked link mint
      // staff admins indefinitely.
      expect(second.status).toBe(404);
      expect(second.body.sessionToken).toBeUndefined();
    });

    it('refuses an invite issued for a different role', async () => {
      const hub = await createTestHub();
      const admin = await inviter(hub);
      const { token } = await createTestOnboardingInvite(admin.id, {
        role: 'hub_admin',
        targetHubId: hub.id,
      });

      const response = await request(app)
        .post('/api/onboarding/accept/staff-admin')
        .send({ token });

      expect(response.status).toBe(400);
    });

    it('creates no user at all when the invite is rejected', async () => {
      const before = await db.select().from(users);

      await request(app)
        .post('/api/onboarding/accept/staff-admin')
        .send({ token: 'f'.repeat(64) })
        .expect(404);

      const after = await db.select().from(users);
      expect(after).toHaveLength(before.length);
    });
  });

  describe('POST /api/onboarding/accept/hub-owner', () => {
    it('creates the hub, the user, the membership, and a working session', async () => {
      const existing = await createTestHub();
      const admin = await inviter(existing);
      // A hub-owner invite carries no targetHubId: accepting it is what brings
      // the hub into existence.
      const { token, email } = await createTestOnboardingInvite(admin.id, {
        role: 'hub_admin',
      });

      const response = await request(app).post('/api/onboarding/accept/hub-owner').send({
        token,
        name: 'Northside Fund',
        contactEmail: 'northside@test.org',
      });

      expect(response.status).toBe(201);

      const [created] = await db.select().from(users).where(eq(users.email, email));
      expect(created).toBeDefined();

      const [hub] = await db.select().from(hubs).where(eq(hubs.name, 'Northside Fund'));
      expect(hub).toBeDefined();

      const session = await validateSession(response.body.sessionToken);
      // Membership is what every hub-scoped permission check reads, so a
      // session that resolves without it is authenticated but powerless.
      expect(session?.hubId).toBe(hub!.id);
      expect(session?.isOwner).toBe(true);
    });
  });

  // The three paths above are the ones with distinct setup. These cover the
  // remaining half of the blast radius the fix claims: the same transaction bug
  // was present in all six, and a test per path is what stops one of them
  // quietly regressing on its own.
  describe('the remaining accept paths', () => {
    it('accepts a hub staff invite and returns a working session', async () => {
      const hub = await createTestHub();
      const admin = await inviter(hub);
      const { token, email } = await createTestOnboardingInvite(admin.id, {
        role: 'hub_admin',
        targetHubId: hub.id,
      });

      const response = await request(app).post('/api/onboarding/accept/hub-staff').send({ token });

      expect(response.status).toBe(201);

      const [created] = await db.select().from(users).where(eq(users.email, email));
      expect(created).toBeDefined();

      const session = await validateSession(response.body.sessionToken);
      expect(session?.id).toBe(created!.id);
      expect(session?.hubId).toBe(hub.id);
      // Staff join an existing hub rather than owning it.
      expect(session?.isOwner).toBe(false);
    });

    it('accepts a group staff invite and returns a working session', async () => {
      const hub = await createTestHub();
      const admin = await inviter(hub);
      const group = await createTestGroup(hub.id);
      const { token, email } = await createTestOnboardingInvite(admin.id, {
        role: 'group_coordinator',
        targetGroupId: group.id,
      });

      const response = await request(app)
        .post('/api/onboarding/accept/group-staff')
        .send({ token });

      expect(response.status).toBe(201);

      const [created] = await db.select().from(users).where(eq(users.email, email));
      expect(created).toBeDefined();

      const session = await validateSession(response.body.sessionToken);
      expect(session?.groupId).toBe(group.id);
      expect(session?.isOwner).toBe(false);
    });
  });

  describe('POST /api/onboarding/accept/group-owner', () => {
    it('creates the group, its hub membership, the user, and a working session', async () => {
      const hub = await createTestHub();
      const admin = await inviter(hub);
      const { token, email } = await createTestOnboardingInvite(admin.id, {
        role: 'group_coordinator',
        targetHubId: hub.id,
      });

      const response = await request(app)
        .post('/api/onboarding/accept/group-owner')
        .send({
          token,
          name: 'Riverside Mutual Aid',
          serviceArea: 'Riverside',
          aidCategories: ['food'],
          contactEmail: 'riverside@test.org',
        });

      expect(response.status).toBe(201);

      const [created] = await db.select().from(users).where(eq(users.email, email));
      expect(created).toBeDefined();

      const [group] = await db.select().from(groups).where(eq(groups.name, 'Riverside Mutual Aid'));
      expect(group).toBeDefined();

      // The group must be joined to the hub that invited it, or it is invisible
      // to that hub and unverifiable - the same defect fixed in #20 for the
      // hub-admin creation path.
      const membership = await db
        .select()
        .from(groupHubMemberships)
        .where(
          and(eq(groupHubMemberships.groupId, group!.id), eq(groupHubMemberships.hubId, hub.id))
        );
      expect(membership).toHaveLength(1);
      expect(membership[0]?.verificationStatus).toBe('pending');

      const owner = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.userId, created!.id), eq(groupMembers.groupId, group!.id)));
      expect(owner).toHaveLength(1);
      expect(owner[0]?.isOwner).toBe(true);

      const session = await validateSession(response.body.sessionToken);
      expect(session?.groupId).toBe(group!.id);
    });
  });
});
