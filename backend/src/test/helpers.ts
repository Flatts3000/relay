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
} from '../db/schema/index.js';

type BroadcastCategory = (typeof broadcastCategoryEnum.enumValues)[number];
import { generateToken, generateExpiresAt } from '../utils/crypto.js';

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

  await db.insert(sessions).values({
    userId,
    token,
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

export async function createGroupCoordinatorWithSession(
  hubId: string,
  groupId: string
): Promise<{
  user: TestUser & { hubId: string | null; groupId: string | null };
  sessionToken: string;
}> {
  const user = await createTestUser({
    email: `coordinator-${Date.now()}@test.org`,
    role: 'group_coordinator',
    hubId,
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
