import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { authTokens, sessions, users } from '../db/schema/index.js';
import {
  createMagicLinkToken,
  verifyMagicLinkToken,
  validateSession,
  createSessionForUser,
  invalidateSession,
  invalidateAllUserSessions,
  cleanupExpiredTokens,
} from './auth.service.js';
import { createTestUser, createTestHub } from '../test/helpers.js';

/**
 * Authentication is the whole access control story for coordinator accounts:
 * there are no passwords, so a magic-link token and a session token are the
 * only things standing between an email address and someone else's group.
 *
 * Note these tests assert the CURRENT storage model, in which both token types
 * are held in the database in plaintext. That is a real weakness, filed as #48,
 * and deliberately not changed here - the point of writing these first is that
 * the change lands against tests rather than without them.
 */
describe('auth service', () => {
  describe('magic link tokens', () => {
    it('issues a token that verifies once and returns a session', async () => {
      const user = await createTestUser({ email: 'issue@test.org' });
      const token = await createMagicLinkToken(user.id);

      const result = await verifyMagicLinkToken(token);

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe(user.id);
      expect(result.sessionToken).toBeDefined();
    });

    it('refuses to verify the same token twice', async () => {
      const user = await createTestUser({ email: 'replay@test.org' });
      const token = await createMagicLinkToken(user.id);

      const first = await verifyMagicLinkToken(token);
      const second = await verifyMagicLinkToken(token);

      // A magic link arrives by email and may sit in an inbox, a mail server
      // log, or a browser history. Single use is what stops a copy of it being
      // worth anything later.
      expect(first.success).toBe(true);
      expect(second.success).toBe(false);
      expect(second.error).toBe('Invalid or expired token');
    });

    it('refuses an expired token', async () => {
      const user = await createTestUser({ email: 'expired@test.org' });
      const token = await createMagicLinkToken(user.id);

      await db
        .update(authTokens)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(authTokens.token, token));

      const result = await verifyMagicLinkToken(token);

      expect(result.success).toBe(false);
    });

    it('refuses a token that was never issued', async () => {
      const result = await verifyMagicLinkToken('a'.repeat(64));

      expect(result.success).toBe(false);
    });

    it('records the login against the user', async () => {
      const user = await createTestUser({ email: 'lastlogin@test.org' });
      const token = await createMagicLinkToken(user.id);

      await verifyMagicLinkToken(token);

      const [row] = await db.select().from(users).where(eq(users.id, user.id));
      expect(row?.lastLoginAt).not.toBeNull();
    });
  });

  describe('sessions', () => {
    it('validates a live session and enriches it with membership', async () => {
      const hub = await createTestHub();
      const user = await createTestUser({ email: 'live@test.org', hubId: hub.id });
      const token = await createSessionForUser(user.id);

      const result = await validateSession(token);

      expect(result?.id).toBe(user.id);
      // Routes authorise on hubId, so an unenriched session would silently fail
      // every hub-scoped permission check.
      expect(result?.hubId).toBe(hub.id);
    });

    it('rejects an expired session', async () => {
      const user = await createTestUser({ email: 'stale@test.org' });
      const token = await createSessionForUser(user.id);

      await db
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(sessions.token, token));

      expect(await validateSession(token)).toBeNull();
    });

    it('rejects a session token that was never issued', async () => {
      expect(await validateSession('b'.repeat(64))).toBeNull();
    });

    it('rejects a live session belonging to a soft-deleted user', async () => {
      const user = await createTestUser({ email: 'deleted@test.org' });
      const token = await createSessionForUser(user.id);

      await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, user.id));

      // Removing someone's access has to take effect against sessions they
      // already hold, not just stop them logging in again.
      expect(await validateSession(token)).toBeNull();
    });

    it('extends the expiry on use', async () => {
      const user = await createTestUser({ email: 'sliding@test.org' });
      const token = await createSessionForUser(user.id);

      const soon = new Date(Date.now() + 60 * 1000);
      await db.update(sessions).set({ expiresAt: soon }).where(eq(sessions.token, token));

      await validateSession(token);

      const [row] = await db.select().from(sessions).where(eq(sessions.token, token));
      expect(row!.expiresAt.getTime()).toBeGreaterThan(soon.getTime());
    });

    it('invalidates a single session on logout', async () => {
      const user = await createTestUser({ email: 'logout@test.org' });
      const token = await createSessionForUser(user.id);

      await invalidateSession(token);

      expect(await validateSession(token)).toBeNull();
    });

    it('invalidates every session a user holds', async () => {
      const user = await createTestUser({ email: 'allout@test.org' });
      const first = await createSessionForUser(user.id);
      const second = await createSessionForUser(user.id);

      await invalidateAllUserSessions(user.id);

      expect(await validateSession(first)).toBeNull();
      expect(await validateSession(second)).toBeNull();
    });

    it('leaves other users’ sessions alone when invalidating one user', async () => {
      const a = await createTestUser({ email: 'a@test.org' });
      const b = await createTestUser({ email: 'b@test.org' });
      const tokenA = await createSessionForUser(a.id);
      const tokenB = await createSessionForUser(b.id);

      await invalidateAllUserSessions(a.id);

      expect(await validateSession(tokenA)).toBeNull();
      expect(await validateSession(tokenB)).not.toBeNull();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('removes expired magic link tokens and leaves live ones', async () => {
      const user = await createTestUser({ email: 'cleanup@test.org' });
      const stale = await createMagicLinkToken(user.id);
      const live = await createMagicLinkToken(user.id);

      await db
        .update(authTokens)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(authTokens.token, stale));

      await cleanupExpiredTokens();

      const remaining = await db.select().from(authTokens).where(eq(authTokens.userId, user.id));
      const tokens = remaining.map((r) => r.token);

      expect(tokens).toContain(live);
      expect(tokens).not.toContain(stale);
    });
  });

  describe('token storage', () => {
    it('stores both token types in plaintext (see #48)', async () => {
      const user = await createTestUser({ email: 'plaintext@test.org' });
      const magic = await createMagicLinkToken(user.id);
      const session = await createSessionForUser(user.id);

      const [tokenRow] = await db.select().from(authTokens).where(eq(authTokens.token, magic));
      const [sessionRow] = await db.select().from(sessions).where(eq(sessions.token, session));

      // Pinned deliberately rather than asserted as correct. Anyone with read
      // access to the database - including any of the 90 days of retained S3
      // backups - gets directly replayable credentials. #48 changes this to
      // store a SHA-256 of the token; when it does, these two assertions should
      // invert to expect the stored value NOT to equal the issued one.
      expect(tokenRow?.token).toBe(magic);
      expect(sessionRow?.token).toBe(session);
    });
  });
});
