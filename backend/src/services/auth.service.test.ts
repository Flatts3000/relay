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
import { hashToken } from '../utils/crypto.js';

/**
 * Authentication is the whole access control story for coordinator accounts:
 * there are no passwords, so a magic-link token and a session token are the
 * only things standing between an email address and someone else's group.
 *
 * Both token types are stored as a SHA-256 of the issued value (#48), so a copy
 * of the database is not a set of working credentials.
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
        .where(eq(authTokens.token, hashToken(token)));

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
        .where(eq(sessions.token, hashToken(token)));

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
      await db
        .update(sessions)
        .set({ expiresAt: soon })
        .where(eq(sessions.token, hashToken(token)));

      await validateSession(token);

      const [row] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, hashToken(token)));
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
        .where(eq(authTokens.token, hashToken(stale)));

      await cleanupExpiredTokens();

      const remaining = await db.select().from(authTokens).where(eq(authTokens.userId, user.id));
      const tokens = remaining.map((r) => r.token);

      // Rows hold hashes now, so compare against the hashes of the issued values.
      expect(tokens).toContain(hashToken(live));
      expect(tokens).not.toContain(hashToken(stale));
    });
  });

  describe('token storage', () => {
    it('never stores either token type in a replayable form', async () => {
      const user = await createTestUser({ email: 'hashed@test.org' });
      const magic = await createMagicLinkToken(user.id);
      const session = await createSessionForUser(user.id);

      const allTokens = await db.select().from(authTokens);
      const allSessions = await db.select().from(sessions);

      // The point of #48: a copy of this database must not be a set of working
      // credentials. Read access through a backup, a dump, or a legal order
      // should yield hashes, not tokens that replay as a logged-in coordinator.
      expect(allTokens.map((r) => r.token)).not.toContain(magic);
      expect(allSessions.map((r) => r.token)).not.toContain(session);
    });

    it('stores the SHA-256 of each token', async () => {
      const user = await createTestUser({ email: 'sha@test.org' });
      const magic = await createMagicLinkToken(user.id);

      const [row] = await db
        .select()
        .from(authTokens)
        .where(eq(authTokens.token, hashToken(magic)));

      expect(row).toBeDefined();
      expect(row!.token).toBe(hashToken(magic));
      expect(row!.token).toHaveLength(64);
    });

    it('still authenticates with the raw token the caller was given', async () => {
      const user = await createTestUser({ email: 'roundtrip@test.org' });
      const magic = await createMagicLinkToken(user.id);

      // Hashing is only a storage change: the value handed to the user in the
      // email must continue to work, and the hash itself must not.
      const good = await verifyMagicLinkToken(magic);
      expect(good.success).toBe(true);

      const second = await createMagicLinkToken(user.id);
      const withHash = await verifyMagicLinkToken(hashToken(second));
      expect(withHash.success).toBe(false);
    });

    it('does not accept a session by its stored hash', async () => {
      const user = await createTestUser({ email: 'sessionhash@test.org' });
      const session = await createSessionForUser(user.id);

      expect(await validateSession(session)).not.toBeNull();
      expect(await validateSession(hashToken(session))).toBeNull();
    });
  });
});
