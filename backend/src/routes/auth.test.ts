import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { app } from '../app.js';
import { db } from '../db/index.js';
import { authTokens } from '../db/schema/index.js';
import { createTestUser, createTestHub, createHubAdminWithSession } from '../test/helpers.js';

/**
 * The login surface is the one place an unauthenticated stranger can probe, so
 * what it declines to reveal matters as much as what it does.
 */
describe('Auth API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/login', () => {
    const GENERIC = 'If an account exists with this email, a login link has been sent.';

    it('gives the same answer for an address that exists', async () => {
      await createTestUser({ email: 'known@test.org' });

      const response = await request(app).post('/api/auth/login').send({ email: 'known@test.org' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(GENERIC);
    });

    it('gives the same answer for an address that does not', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.org' });

      // Identical to the response above, deliberately. A different message, or
      // a different status, would turn this endpoint into a way to test whether
      // a given person coordinates a mutual aid group - which for this project
      // is exactly the inference the whole design exists to prevent.
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(GENERIC);
    });

    it('issues a token for a real address and none for an unknown one', async () => {
      const user = await createTestUser({ email: 'issued@test.org' });

      await request(app).post('/api/auth/login').send({ email: 'issued@test.org' });
      await request(app).post('/api/auth/login').send({ email: 'ghost@test.org' });

      // The responses are indistinguishable; the side effects are not.
      const issued = await db.select().from(authTokens).where(eq(authTokens.userId, user.id));
      expect(issued).toHaveLength(1);
    });

    it('gives the same answer for a staff admin outside the whitelist', async () => {
      await createTestUser({ email: 'rogue-admin@test.org', role: 'staff_admin' as never });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rogue-admin@test.org' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(GENERIC);
    });

    it('does not issue a token to a staff admin outside the whitelist', async () => {
      const user = await createTestUser({
        email: 'rogue-admin2@test.org',
        role: 'staff_admin' as never,
      });

      await request(app).post('/api/auth/login').send({ email: 'rogue-admin2@test.org' });

      const issued = await db.select().from(authTokens).where(eq(authTokens.userId, user.id));
      expect(issued).toHaveLength(0);
    });

    it('rejects a malformed address', async () => {
      const response = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
    });

    it('still answers generically when sending the email fails', async () => {
      await createTestUser({ email: 'mailfail@test.org' });
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'mailfail@test.org' });

      // A provider outage must not become an oracle either.
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(GENERIC);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('rejects a token that was never issued', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'c'.repeat(64) });

      expect(response.status).toBe(401);
    });

    it('rejects a malformed token', async () => {
      const response = await request(app).post('/api/auth/verify').send({ token: 'short' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('requires a session', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('rejects a bearer token that is not a session', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${'d'.repeat(64)}`);

      expect(response.status).toBe(401);
    });

    it('returns the caller with their membership resolved', async () => {
      const hub = await createTestHub();
      const { sessionToken, user } = await createHubAdminWithSession(hub.id);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.hubId).toBe(hub.id);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('makes the session unusable afterwards', async () => {
      const hub = await createTestHub();
      const { sessionToken } = await createHubAdminWithSession(hub.id);

      const before = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sessionToken}`);
      expect(before.status).toBe(200);

      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);

      const after = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sessionToken}`);

      // Logout has to revoke server-side. If it only cleared the client, the
      // token would stay live for the rest of its 30-minute window on any
      // machine that had already seen it.
      expect(after.status).toBe(401);
    });

    it('requires a session of its own', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('rate limiting scope', () => {
    it('does not apply the strict login limit to /me', async () => {
      const hub = await createTestHub();
      const { sessionToken } = await createHubAdminWithSession(hub.id);

      // The strict limiter allows 10 per 15 minutes and used to be mounted on
      // the whole /api/auth router. AuthContext calls /me on every app mount,
      // so a coordinator reloading the page eleven times was locked out of the
      // authenticated UI - and behind a shared address, so was everyone else on
      // it. Twenty consecutive calls must all succeed.
      for (let i = 0; i < 20; i++) {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${sessionToken}`);

        expect(response.status).toBe(200);
      }
    }, 20000);
  });

  describe('role enforcement', () => {
    it('refuses a hub-admin route to a group coordinator', async () => {
      const hub = await createTestHub();
      const { createTestGroup, createGroupCoordinatorWithSession } =
        await import('../test/helpers.js');
      const group = await createTestGroup(hub.id);
      const { sessionToken } = await createGroupCoordinatorWithSession(hub.id, group.id);

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          name: 'Should Not Work',
          serviceArea: 'Nowhere',
          aidCategories: ['food'],
          contactEmail: 'nope@test.org',
        });

      // 403 rather than 401: authenticated, but not permitted.
      expect(response.status).toBe(403);
    });
  });
});
