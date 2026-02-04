import { db, closePool } from './index.js';
import { hubs, groups, users } from './schema/index.js';

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

  // Create a test group
  const [group] = await db
    .insert(groups)
    .values({
      hubId: hub!.id,
      name: 'Test Mutual Aid Group',
      serviceArea: 'Minneapolis, MN',
      aidCategories: ['rent', 'food', 'utilities'],
      contactEmail: 'group@example.org',
      verificationStatus: 'verified',
    })
    .returning();

  console.log('Created group:', group?.id);

  // Create a hub admin user
  const [hubAdmin] = await db
    .insert(users)
    .values({
      email: 'admin@example.org',
      role: 'hub_admin',
      hubId: hub!.id,
    })
    .returning();

  console.log('Created hub admin:', hubAdmin?.id);

  // Create a group coordinator user
  const [coordinator] = await db
    .insert(users)
    .values({
      email: 'coordinator@example.org',
      role: 'group_coordinator',
      groupId: group!.id,
    })
    .returning();

  console.log('Created group coordinator:', coordinator?.id);

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
