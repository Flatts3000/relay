import { pgTable, uuid, varchar, timestamp, pgEnum, index, customType } from 'drizzle-orm/pg-core';
import { hubs } from './hubs.js';

// Custom type for bytea (binary data)
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return 'bytea';
  },
});

export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'verified',
  'revoked',
]);

export const aidCategoryEnum = pgEnum('aid_category', ['rent', 'food', 'utilities', 'other']);

// Broadcast-specific categories (separate from aidCategoryEnum to avoid breaking funding requests)
export const broadcastCategoryEnum = pgEnum('broadcast_category', [
  'food',
  'shelter_housing',
  'transportation',
  'medical',
  'safety_escort',
  'childcare',
  'legal',
  'supplies',
  'other',
]);

export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id),
    name: varchar('name', { length: 255 }).notNull(),
    serviceArea: varchar('service_area', { length: 255 }).notNull(),
    aidCategories: aidCategoryEnum('aid_categories').array().notNull(),
    contactEmail: varchar('contact_email', { length: 255 }).notNull(),
    verificationStatus: verificationStatusEnum('verification_status').notNull().default('pending'),
    // Broadcast encryption key — nullable (groups without keys can't receive broadcasts)
    publicKey: bytea('public_key'),
    // Broadcast category subscriptions
    broadcastCategories: broadcastCategoryEnum('broadcast_categories').array(),
    // Coarse region for broadcast bucket membership
    broadcastServiceArea: varchar('broadcast_service_area', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    // Indexes for common queries
    hubIdIdx: index('groups_hub_id_idx').on(table.hubId),
    verificationStatusIdx: index('groups_verification_status_idx').on(table.verificationStatus),
    serviceAreaIdx: index('groups_service_area_idx').on(table.serviceArea),
  })
);

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
