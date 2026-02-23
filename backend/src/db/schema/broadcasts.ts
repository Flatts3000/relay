import { pgTable, uuid, varchar, timestamp, pgEnum, index, customType } from 'drizzle-orm/pg-core';
import { broadcastCategoryEnum, groups } from './groups.js';

// Custom type for bytea (binary data)
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return 'bytea';
  },
});

export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'decrypted', 'expired']);

// Broadcasts — encrypted help requests from anonymous individuals
// CRITICAL: Server stores only ciphertext it cannot decrypt
export const broadcasts = pgTable(
  'broadcasts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Encrypted payload — server cannot read this
    ciphertextPayload: bytea('ciphertext_payload').notNull(),
    // Nonce for secretbox decryption
    nonce: bytea('nonce').notNull(),
    // Routing metadata (NOT inside encrypted payload — used for bucket matching)
    region: varchar('region', { length: 255 }).notNull(),
    categories: broadcastCategoryEnum('categories').array().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // Default 7-day TTL
    expiresAt: timestamp('expires_at', { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    expiresAtIdx: index('broadcasts_expires_at_idx').on(table.expiresAt),
  })
);

export type Broadcast = typeof broadcasts.$inferSelect;
export type NewBroadcast = typeof broadcasts.$inferInsert;

// Broadcast invites — per-group wrapped keys for decrypting a broadcast
// Each invite contains the content key wrapped with that group's public key
export const broadcastInvites = pgTable(
  'broadcast_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => broadcasts.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    // Content key wrapped with this group's public key
    wrappedKey: bytea('wrapped_key').notNull(),
    status: inviteStatusEnum('status').notNull().default('pending'),
    decryptedAt: timestamp('decrypted_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    broadcastIdIdx: index('broadcast_invites_broadcast_id_idx').on(table.broadcastId),
    groupStatusIdx: index('broadcast_invites_group_status_idx').on(table.groupId, table.status),
    expiresAtIdx: index('broadcast_invites_expires_at_idx').on(table.expiresAt),
  })
);

export type BroadcastInvite = typeof broadcastInvites.$inferSelect;
export type NewBroadcastInvite = typeof broadcastInvites.$inferInsert;

// Broadcast tombstones — retained after broadcast deletion for aggregate analytics
// CRITICAL: Contains NO identifying information about the individual
export const broadcastTombstones = pgTable('broadcast_tombstones', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Original broadcast ID — NOT a FK since original is deleted
  originalBroadcastId: uuid('original_broadcast_id').notNull(),
  region: varchar('region', { length: 255 }).notNull(),
  categories: broadcastCategoryEnum('categories').array().notNull(),
  // Groups that confirmed receipt (for aggregate reporting)
  groupIds: uuid('group_ids').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // When the broadcast was cleaned up
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type BroadcastTombstone = typeof broadcastTombstones.$inferSelect;
export type NewBroadcastTombstone = typeof broadcastTombstones.$inferInsert;
