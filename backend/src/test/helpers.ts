import { db } from '../db/index.js';
import { hubs, groups, users, sessions } from '../db/schema/index.js';
import { generateToken, generateExpiresAt } from '../utils/crypto.js';

export interface TestHub {
  id: string;
  name: string;
  contactEmail: string;
}

export interface TestGroup {
  id: string;
  hubId: string;
  name: string;
  serviceArea: string;
  aidCategories: string[];
  contactEmail: string;
  verificationStatus: string;
}

export interface TestUser {
  id: string;
  email: string;
  role: 'hub_admin' | 'group_coordinator';
  hubId: string | null;
  groupId: string | null;
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
  overrides: Partial<Omit<TestGroup, 'id' | 'hubId'>> = {}
): Promise<TestGroup> {
  const [group] = await db
    .insert(groups)
    .values({
      hubId,
      name: overrides.name || 'Test Group',
      serviceArea: overrides.serviceArea || 'Test City',
      aidCategories: (overrides.aidCategories as ('rent' | 'food' | 'utilities' | 'other')[]) || ['rent', 'food'],
      contactEmail: overrides.contactEmail || 'group@test.org',
      verificationStatus: (overrides.verificationStatus as 'pending' | 'verified' | 'revoked') || 'pending',
    })
    .returning();

  return group as unknown as TestGroup;
}

export async function createTestUser(
  overrides: Partial<TestUser> = {}
): Promise<TestUser> {
  const [user] = await db
    .insert(users)
    .values({
      email: overrides.email || `user-${Date.now()}@test.org`,
      role: overrides.role || 'hub_admin',
      hubId: overrides.hubId || null,
      groupId: overrides.groupId || null,
    })
    .returning();

  return user as unknown as TestUser;
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
  user: TestUser;
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
  user: TestUser;
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
