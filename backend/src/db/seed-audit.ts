/**
 * Rich development seed used for UX/UI review and manual QA.
 *
 * The plain `seed.ts` creates one hub, one group and one user, which leaves
 * every list, queue and dashboard sitting on an empty state. Reviewing layout,
 * density and hierarchy needs realistic volume, so this seeds each surface with
 * enough rows to show status variety, pagination and long-name wrapping.
 *
 * Development only: it refuses to run against a non-local database host.
 */
import nacl from 'tweetnacl';
import { db, closePool } from './index.js';
import {
  hubs,
  groups,
  users,
  hubMembers,
  groupMembers,
  groupHubMemberships,
  fundingRequests,
  verificationRequests,
  broadcasts,
  broadcastInvites,
  auditLog,
} from './schema/index.js';
import { config } from '../config.js';

if (!['localhost', '127.0.0.1'].includes(config.database.host)) {
  throw new Error(`Refusing to seed a non-local database host: ${config.database.host}`);
}

const CATEGORIES = ['rent', 'food', 'utilities', 'other'] as const;

const REGIONS = [
  'Minneapolis, MN',
  'Saint Paul, MN',
  'Duluth, MN',
  'Rochester, MN',
  'Bloomington, MN',
  'Brooklyn Park, MN',
];

const GROUP_NAMES = [
  'Powderhorn Neighbors',
  'Northside Mutual Aid Collective',
  'Frogtown Food Share',
  'Cedar-Riverside Rent Relief',
  'Lake Street Solidarity Network',
  'Southside Utility Fund',
  'Phillips Community Care',
  'West Bank Emergency Support',
  'Longfellow Neighborhood Aid',
  'Camden Community Response',
  'Seward Cooperative Relief Fund',
  'Whittier Housing Justice Circle',
];

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function seed() {
  console.log('Seeding development data for UX review...');

  const [hub] = await db
    .insert(hubs)
    .values({ name: 'Twin Cities Relief Fund', contactEmail: 'hub@relay.test' })
    .returning();

  const createdGroups: Array<{
    id: string;
    name: string;
    serviceArea: string;
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }> = [];

  for (let i = 0; i < GROUP_NAMES.length; i++) {
    const keypair = nacl.box.keyPair();
    const [group] = await db
      .insert(groups)
      .values({
        name: GROUP_NAMES[i]!,
        serviceArea: REGIONS[i % REGIONS.length]!,
        aidCategories: [CATEGORIES[i % 3]!, CATEGORIES[(i + 1) % 3]!],
        contactEmail: `contact${i}@relay.test`,
        publicKey: Buffer.from(keypair.publicKey),
        // Both halves, or the groups_key_material_complete CHECK rejects the row.
        // A seeded salt is not derivable from any passphrase, so these groups
        // cannot be unlocked through the UI - set a passphrase in group settings
        // to do that. The key is here so the group appears in the broadcast
        // directory and the inbox has something in it.
        keySalt: Buffer.from(nacl.randomBytes(16)),
        broadcastCategories: ['food', 'shelter_housing'],
        broadcastServiceArea: REGIONS[i % REGIONS.length]!,
        createdAt: daysAgo(60 - i * 3),
      })
      .returning();

    // Most groups verified so the public directory has content, the last few
    // pending so the hub verification queue is not empty either.
    await db.insert(groupHubMemberships).values({
      groupId: group!.id,
      hubId: hub!.id,
      verificationStatus: i < 8 ? 'verified' : 'pending',
    });

    createdGroups.push({
      id: group!.id,
      name: group!.name,
      serviceArea: group!.serviceArea,
      publicKey: keypair.publicKey,
      secretKey: keypair.secretKey,
    });
  }

  const [staffAdmin] = await db
    .insert(users)
    .values({ email: 'admin@relay.test', role: 'staff_admin' })
    .returning();

  const [hubAdmin] = await db
    .insert(users)
    .values({ email: 'hub@relay.test', role: 'hub_admin' })
    .returning();
  await db.insert(hubMembers).values({ userId: hubAdmin!.id, hubId: hub!.id, isOwner: true });

  const [coordinator] = await db
    .insert(users)
    .values({ email: 'coordinator@relay.test', role: 'group_coordinator' })
    .returning();
  await db
    .insert(groupMembers)
    .values({ userId: coordinator!.id, groupId: createdGroups[0]!.id, isOwner: true });

  // Funding requests across every status, so list filters and status styling
  // all have something to render.
  const statuses = ['submitted', 'approved', 'declined', 'funds_sent', 'acknowledged'] as const;
  for (let i = 0; i < 18; i++) {
    const status = statuses[i % statuses.length]!;
    const group = createdGroups[i % 8]!;
    const settled = ['approved', 'funds_sent', 'acknowledged'].includes(status);
    await db.insert(fundingRequests).values({
      groupId: group.id,
      amount: String(250 + i * 175),
      category: CATEGORIES[i % 4]!,
      urgency: i % 4 === 0 ? 'urgent' : 'normal',
      region: group.serviceArea,
      justification:
        i % 3 === 0
          ? 'Covering a shortfall for households facing shutoff notices this month. No individual details recorded.'
          : null,
      status,
      approvedBy: status === 'submitted' ? null : hubAdmin!.id,
      declineReason: status === 'declined' ? 'Outside the current funding window.' : null,
      submittedAt: daysAgo(30 - i),
      approvedAt: settled ? daysAgo(28 - i) : null,
      declinedAt: status === 'declined' ? daysAgo(28 - i) : null,
      fundsSentAt: ['funds_sent', 'acknowledged'].includes(status) ? daysAgo(26 - i) : null,
      acknowledgedAt: status === 'acknowledged' ? daysAgo(25 - i) : null,
    });
  }

  // Pending verification requests, one per unverified group, for the hub queue.
  for (const group of createdGroups.slice(8)) {
    await db.insert(verificationRequests).values({
      groupId: group.id,
      hubId: hub!.id,
      method: 'hub_approval',
      status: 'pending',
    });
  }

  // Encrypted broadcasts with per-group wrapped keys, built the way the browser
  // builds them, so the inbox holds ciphertext the server genuinely cannot read.
  for (let i = 0; i < 4; i++) {
    const contentKey = nacl.randomBytes(nacl.secretbox.keyLength);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const message = new TextEncoder().encode(
      JSON.stringify({ message: 'seeded help request', safeWord: 'river-lantern-quiet' })
    );
    const ciphertext = nacl.secretbox(message, nonce, contentKey);

    const [broadcast] = await db
      .insert(broadcasts)
      .values({
        ciphertextPayload: Buffer.from(ciphertext),
        nonce: Buffer.from(nonce),
        region: REGIONS[i % REGIONS.length]!,
        categories: ['food', 'shelter_housing'],
        createdAt: daysAgo(i),
      })
      .returning();

    for (const group of createdGroups.slice(0, 2)) {
      // Packed nonce(24) + ephemeralPubKey(32) + box, matching wrapKeyForGroup
      // and unwrapKey in frontend/src/utils/broadcast-crypto.ts. Any other order
      // produces invites that always fail to unwrap, so the inbox this seed
      // exists to populate would only ever exercise the failure path.
      const ephemeral = nacl.box.keyPair();
      const wrapNonce = nacl.randomBytes(nacl.box.nonceLength);
      const wrapped = nacl.box(contentKey, wrapNonce, group.publicKey, ephemeral.secretKey);
      const packed = Buffer.concat([
        Buffer.from(wrapNonce),
        Buffer.from(ephemeral.publicKey),
        Buffer.from(wrapped),
      ]);

      // Verify the packing round-trips rather than trusting it. This is the one
      // place the seed reimplements production crypto, so it is the one place it
      // can silently drift from it.
      const unwrapped = nacl.box.open(
        packed.subarray(24 + 32),
        packed.subarray(0, 24),
        packed.subarray(24, 24 + 32),
        group.secretKey
      );
      if (!unwrapped) {
        throw new Error('Seeded wrapped key does not unwrap; packing order is wrong');
      }

      await db.insert(broadcastInvites).values({
        broadcastId: broadcast!.id,
        groupId: group.id,
        wrappedKey: packed,
        status: 'pending',
        createdAt: daysAgo(i),
      });
    }
  }

  // Audit entries so the admin audit log renders rows rather than an empty table.
  for (let i = 0; i < 20; i++) {
    await db.insert(auditLog).values({
      userId: i % 2 === 0 ? hubAdmin!.id : staffAdmin!.id,
      action: i % 2 === 0 ? 'verify' : 'approve',
      entityType: i % 2 === 0 ? 'group' : 'funding_request',
      entityId: createdGroups[i % 8]!.id,
      metadata: { source: 'seed' },
      createdAt: daysAgo(i),
    });
  }

  console.log('Seeded:');
  console.log(`  hub:      ${hub!.name}`);
  console.log(`  groups:   ${createdGroups.length} (8 verified, 4 pending)`);
  console.log('  users:    admin@relay.test / hub@relay.test / coordinator@relay.test');
  console.log('  activity: 18 funding requests, 4 verification requests, 4 broadcasts');
  await closePool();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
