import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  customType,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { groups, aidCategoryEnum } from './groups.js';

// Custom type for bytea (binary data)
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return 'bytea';
  },
});

export const deletionTypeEnum = pgEnum('deletion_type', ['manual', 'auto_inactivity']);

// Mailboxes - anonymous help request inboxes
// CRITICAL: No PII stored. Only public key, category, region.
export const mailboxes = pgTable(
  'mailboxes',
  {
    // Random UUID - NOT sequential to prevent enumeration
    id: uuid('id').primaryKey().defaultRandom(),
    // Public key for E2E encryption (recipients encrypt with this)
    publicKey: bytea('public_key').notNull(),
    // Help category (rent, food, utilities, other)
    helpCategory: aidCategoryEnum('help_category').notNull(),
    // Region (city/county)
    region: varchar('region', { length: 255 }).notNull(),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).notNull().defaultNow(),
    // Soft delete tracking
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletionType: deletionTypeEnum('deletion_type'),
  },
  (table) => ({
    // Indexes for common queries
    regionIdx: index('mailboxes_region_idx').on(table.region),
    helpCategoryIdx: index('mailboxes_help_category_idx').on(table.helpCategory),
    lastAccessedAtIdx: index('mailboxes_last_accessed_at_idx').on(table.lastAccessedAt),
  })
);

export type Mailbox = typeof mailboxes.$inferSelect;
export type NewMailbox = typeof mailboxes.$inferInsert;

// Mailbox messages - encrypted responses from groups
// CRITICAL: Server stores only ciphertext. Cannot decrypt.
export const mailboxMessages = pgTable(
  'mailbox_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mailboxId: uuid('mailbox_id')
      .notNull()
      .references(() => mailboxes.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    // Encrypted message content - server cannot read
    ciphertext: bytea('ciphertext').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Index for fetching messages by mailbox
    mailboxIdIdx: index('mailbox_messages_mailbox_id_idx').on(table.mailboxId),
  })
);

export type MailboxMessage = typeof mailboxMessages.$inferSelect;
export type NewMailboxMessage = typeof mailboxMessages.$inferInsert;

// Mailbox tombstones - retained after mailbox deletion for analytics
// CRITICAL: Contains NO identifying information about the individual
export const mailboxTombstones = pgTable('mailbox_tombstones', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Original mailbox ID - NOT a FK since original is deleted
  originalMailboxId: uuid('original_mailbox_id').notNull(),
  // Aggregate data only
  helpCategory: aidCategoryEnum('help_category').notNull(),
  region: varchar('region', { length: 255 }).notNull(),
  // Whether any groups responded
  hadResponses: boolean('had_responses').notNull().default(false),
  // Which groups responded (for their view of tombstones)
  respondingGroupIds: uuid('responding_group_ids').array(),
  // How the mailbox was deleted
  deletionType: deletionTypeEnum('deletion_type').notNull(),
  // When the original mailbox was created
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  // When the mailbox was deleted (tombstone created)
  deletedAt: timestamp('deleted_at', { withTimezone: true }).notNull().defaultNow(),
});

export type MailboxTombstone = typeof mailboxTombstones.$inferSelect;
export type NewMailboxTombstone = typeof mailboxTombstones.$inferInsert;
