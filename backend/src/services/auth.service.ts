import { eq, and, gt, lt, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, authTokens, sessions, groups } from '../db/schema/index.js';
import { generateToken, generateExpiresAt } from '../utils/crypto.js';
import type { User } from '../db/schema/index.js';

// Extended user type with group service area for authenticated requests
export interface AuthenticatedUser extends User {
  groupServiceArea?: string | null;
}

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const SESSION_EXPIRY_MINUTES = 30;

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
  sessionToken?: string;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
    .limit(1);

  return result[0] ?? null;
}

export async function createMagicLinkToken(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = generateExpiresAt(MAGIC_LINK_EXPIRY_MINUTES);

  await db.insert(authTokens).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function verifyMagicLinkToken(token: string): Promise<AuthResult> {
  const now = new Date();

  // Find valid, unused token
  const result = await db
    .select({
      authToken: authTokens,
      user: users,
    })
    .from(authTokens)
    .innerJoin(users, eq(authTokens.userId, users.id))
    .where(
      and(eq(authTokens.token, token), gt(authTokens.expiresAt, now), isNull(authTokens.usedAt))
    )
    .limit(1);

  const record = result[0];

  if (!record) {
    return { success: false, error: 'Invalid or expired token' };
  }

  // Mark token as used
  await db.update(authTokens).set({ usedAt: now }).where(eq(authTokens.id, record.authToken.id));

  // Update user's last login
  await db
    .update(users)
    .set({ lastLoginAt: now, updatedAt: now })
    .where(eq(users.id, record.user.id));

  // Create session
  const sessionToken = generateToken();
  const sessionExpiresAt = generateExpiresAt(SESSION_EXPIRY_MINUTES);

  await db.insert(sessions).values({
    userId: record.user.id,
    token: sessionToken,
    expiresAt: sessionExpiresAt,
  });

  return {
    success: true,
    user: record.user,
    sessionToken,
  };
}

export async function validateSession(sessionToken: string): Promise<AuthenticatedUser | null> {
  const now = new Date();

  const result = await db
    .select({
      session: sessions,
      user: users,
      groupServiceArea: groups.serviceArea,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(groups, eq(users.groupId, groups.id))
    .where(
      and(eq(sessions.token, sessionToken), gt(sessions.expiresAt, now), isNull(users.deletedAt))
    )
    .limit(1);

  const record = result[0];

  if (!record) {
    return null;
  }

  // Extend session on activity (sliding expiration)
  const newExpiresAt = generateExpiresAt(SESSION_EXPIRY_MINUTES);
  await db
    .update(sessions)
    .set({ expiresAt: newExpiresAt, lastActivityAt: now })
    .where(eq(sessions.id, record.session.id));

  return {
    ...record.user,
    groupServiceArea: record.groupServiceArea,
  };
}

export async function invalidateSession(sessionToken: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, sessionToken));
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function cleanupExpiredTokens(): Promise<void> {
  const now = new Date();

  // Delete expired auth tokens (expiresAt < now)
  await db.delete(authTokens).where(lt(authTokens.expiresAt, now));

  // Delete expired sessions (expiresAt < now)
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
