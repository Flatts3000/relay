import { db } from '../db/index.js';
import {
  hubs,
  groups,
  users,
  sessions,
  hubMembers,
  groupMembers,
  groupHubMemberships,
  broadcasts,
  broadcastInvites,
  broadcastCategoryEnum,
  onboardingInvites,
} from '../db/schema/index.js';

type BroadcastCategory = (typeof broadcastCategoryEnum.enumValues)[number];
import { randomUUID } from 'crypto';
import { generateToken, generateExpiresAt, hashToken } from '../utils/crypto.js';

export interface TestHub {
  id: string;
  name: string;
  contactEmail: string;
}

export interface TestGroup {
  id: string;
  name: string;
  serviceArea: string;
  aidCategories: string[];
  contactEmail: string;
}

export interface TestUser {
  id: string;
  email: string;
  role: 'hub_admin' | 'group_coordinator';
}

export async function createTestHub(overrides: Partial<TestHub> = {}): Promise<TestHub> {
  const result = await db
    .insert(hubs)
    .values({
      name: overrides.name || 'Test Hub',
      contactEmail: overrides.contactEmail || 'hub@test.org',
    })
    .returning();

  return result[0]!;
}

export async function createTestGroup(
  hubId: string,
  overrides: Partial<Omit<TestGroup, 'id'>> & {
    verificationStatus?: 'pending' | 'verified' | 'revoked';
  } = {}
): Promise<TestGroup & { hubId: string; verificationStatus: string }> {
  const [group] = await db
    .insert(groups)
    .values({
      name: overrides.name || 'Test Group',
      serviceArea: overrides.serviceArea || 'Test City',
      aidCategories: (overrides.aidCategories as ('rent' | 'food' | 'utilities' | 'other')[]) || [
        'rent',
        'food',
      ],
      contactEmail: overrides.contactEmail || 'group@test.org',
    })
    .returning();

  // Create group↔hub membership
  await db.insert(groupHubMemberships).values({
    groupId: group!.id,
    hubId,
    verificationStatus: overrides.verificationStatus || 'pending',
  });

  return {
    ...group!,
    aidCategories: group!.aidCategories as string[],
    hubId,
    verificationStatus: overrides.verificationStatus || 'pending',
  };
}

export async function createTestUser(
  overrides: Partial<TestUser> & { hubId?: string; groupId?: string } = {}
): Promise<TestUser & { hubId: string | null; groupId: string | null }> {
  const [user] = await db
    .insert(users)
    .values({
      email: overrides.email || `user-${Date.now()}@test.org`,
      role: overrides.role || 'hub_admin',
    })
    .returning();

  // Create membership records if hubId or groupId provided
  if (overrides.hubId) {
    await db.insert(hubMembers).values({
      userId: user!.id,
      hubId: overrides.hubId,
      isOwner: true,
    });
  }

  if (overrides.groupId) {
    await db.insert(groupMembers).values({
      userId: user!.id,
      groupId: overrides.groupId,
      isOwner: true,
    });
  }

  return {
    id: user!.id,
    email: user!.email,
    role: user!.role as 'hub_admin' | 'group_coordinator',
    hubId: overrides.hubId || null,
    groupId: overrides.groupId || null,
  };
}

export async function createTestSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = generateExpiresAt(30); // 30 minutes

  // Stored hashed, exactly as createSessionForUser does, so fixtures behave
  // like real sessions rather than bypassing the storage model under test.
  await db.insert(sessions).values({
    userId,
    token: hashToken(token),
    expiresAt,
  });

  return token;
}

export async function createHubAdminWithSession(hubId: string): Promise<{
  user: TestUser & { hubId: string | null; groupId: string | null };
  sessionToken: string;
}> {
  const user = await createTestUser({
    email: `admin-${Date.now()}@test.org`,
    role: 'hub_admin',
    hubId,
  });
  const sessionToken = await createTestSession(user.id);
  return { user, sessionToken };
}

/**
 * A group coordinator, built the way onboarding actually builds one.
 *
 * The hubId parameter is deliberately NOT turned into a hub_members row. No
 * production path ever writes one for a group coordinator - hub_members is only
 * written by the hub-owner and hub-staff accept flows - so a fixture that
 * created one gave every test a coordinator whose session carried a hubId that
 * no real coordinator can have. That divergence hid two bugs until a manual
 * pass found them: the new funding request form rejected verified groups, and
 * the peer attestation endpoint 400'd for every possible caller. Both read a
 * hubId off the session that is structurally always null in production.
 *
 * The hub relationship still exists, through the group's own membership, which
 * createTestGroup(hubId) writes. That is the real one.
 */
export async function createGroupCoordinatorWithSession(
  _hubId: string,
  groupId: string
): Promise<{
  user: TestUser & { hubId: string | null; groupId: string | null };
  sessionToken: string;
}> {
  const user = await createTestUser({
    email: `coordinator-${Date.now()}@test.org`,
    role: 'group_coordinator',
    groupId,
  });
  const sessionToken = await createTestSession(user.id);
  return { user, sessionToken };
}

// --- Broadcast fixtures -----------------------------------------------------

export interface TestBroadcast {
  id: string;
  region: string;
  categories: BroadcastCategory[];
}

/**
 * Create a broadcast carrying real ciphertext bytes, so a test can read the
 * payload back before cleanup and confirm there was something to destroy.
 */
export async function createTestBroadcast(
  overrides: { region?: string; categories?: BroadcastCategory[]; expiresAt?: Date } = {}
): Promise<TestBroadcast> {
  const [row] = await db
    .insert(broadcasts)
    .values({
      ciphertextPayload: Buffer.from('ciphertext-that-relay-cannot-read'),
      nonce: Buffer.from('nonce-0123456789'),
      region: overrides.region ?? 'Test County',
      categories: overrides.categories ?? ['food'],
      ...(overrides.expiresAt ? { expiresAt: overrides.expiresAt } : {}),
    })
    .returning();

  return {
    id: row!.id,
    region: row!.region,
    categories: row!.categories as BroadcastCategory[],
  };
}

export async function createTestInvite(
  broadcastId: string,
  groupId: string,
  overrides: {
    status?: 'pending' | 'decrypted' | 'expired';
    decryptedAt?: Date;
    expiresAt?: Date;
    createdAt?: Date;
  } = {}
): Promise<string> {
  const [row] = await db
    .insert(broadcastInvites)
    .values({
      broadcastId,
      groupId,
      wrappedKey: Buffer.from('wrapped-content-key'),
      status: overrides.status ?? 'pending',
      ...(overrides.decryptedAt ? { decryptedAt: overrides.decryptedAt } : {}),
      ...(overrides.expiresAt ? { expiresAt: overrides.expiresAt } : {}),
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    })
    .returning({ id: broadcastInvites.id });

  return row!.id;
}

// --- Onboarding fixtures ----------------------------------------------------

/**
 * Insert an onboarding invite directly. Returns the raw token, which is what an
 * invitee would receive by email.
 */
export async function createTestOnboardingInvite(
  invitedById: string,
  overrides: {
    email?: string;
    role?: 'staff_admin' | 'hub_admin' | 'group_coordinator';
    targetHubId?: string;
    targetGroupId?: string;
    expiresAt?: Date;
    acceptedAt?: Date;
  } = {}
): Promise<{ token: string; email: string }> {
  const token = generateToken();
  // randomUUID rather than a clock: two invites created in the same millisecond
  // would otherwise share an address, and users.email is UNIQUE, so accepting
  // both would surface as a confusing 400 from the accept route rather than a
  // fixture error. Lowercased because the production create path does the same,
  // and a fixture that skips it would let a case-sensitivity bug hide.
  const email = (overrides.email ?? `invitee-${randomUUID()}@test.org`).toLowerCase();

  await db.insert(onboardingInvites).values({
    email,
    role: overrides.role ?? 'staff_admin',
    targetHubId: overrides.targetHubId ?? null,
    targetGroupId: overrides.targetGroupId ?? null,
    invitedById,
    // Hashed, exactly as createOnboardingInvite stores it. A fixture that wrote
    // the raw value would make every test here pass against a service that had
    // stopped hashing - the same way the coordinator fixture's invented
    // hub_members row hid two bugs until a manual pass found them.
    token: hashToken(token),
    expiresAt: overrides.expiresAt ?? generateExpiresAt(48 * 60),
    ...(overrides.acceptedAt ? { acceptedAt: overrides.acceptedAt } : {}),
  });

  return { token, email };
}
