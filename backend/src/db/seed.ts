import { db, closePool } from './index.js';
import {
  hubs,
  groups,
  users,
  hubMembers,
  groupMembers,
  groupHubMemberships,
} from './schema/index.js';

async function seed() {
  console.log('Seeding database...');

  // Create a test hub
  const [hub] = await db
    .insert(hubs)
    .values({
      name: 'Test Hub',
      contactEmail: 'hub@example.org',
    })
    .returning();

  console.log('Created hub:', hub?.id);

  // Create a test group (no hubId or verificationStatus — those live in group_hub_memberships)
  const [group] = await db
    .insert(groups)
    .values({
      name: 'Test Mutual Aid Group',
      serviceArea: 'Minneapolis, MN',
      aidCategories: ['rent', 'food', 'utilities'],
      contactEmail: 'group@example.org',
    })
    .returning();

  console.log('Created group:', group?.id);

  // Create group↔hub membership (verified)
  await db.insert(groupHubMemberships).values({
    groupId: group!.id,
    hubId: hub!.id,
    verificationStatus: 'verified',
  });

  console.log('Created group-hub membership (verified)');

  // Create a hub admin user (no hubId on user — membership table instead)
  const [hubAdmin] = await db
    .insert(users)
    .values({
      email: 'admin@example.org',
      role: 'hub_admin',
    })
    .returning();

  console.log('Created hub admin:', hubAdmin?.id);

  // Create hub membership for the hub admin
  await db.insert(hubMembers).values({
    userId: hubAdmin!.id,
    hubId: hub!.id,
    isOwner: true,
  });

  // Create a group coordinator user (no groupId on user — membership table instead)
  const [coordinator] = await db
    .insert(users)
    .values({
      email: 'coordinator@example.org',
      role: 'group_coordinator',
    })
    .returning();

  console.log('Created group coordinator:', coordinator?.id);

  // Create group membership for the coordinator
  await db.insert(groupMembers).values({
    userId: coordinator!.id,
    groupId: group!.id,
    isOwner: true,
  });

  // Create staff admin users (no membership records needed)
  const [staffAdmin] = await db
    .insert(users)
    .values([
      { email: 'staff@example.org', role: 'staff_admin' as const },
      { email: 'flatts.scg@gmail.com', role: 'staff_admin' as const },
    ])
    .returning();

  console.log('Created staff admins:', staffAdmin?.id);

  console.log('Seeding complete!');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closePool();
  });
