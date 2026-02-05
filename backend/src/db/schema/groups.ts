import { pgTable, uuid, varchar, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { hubs } from './hubs.js';

export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'verified',
  'revoked',
]);

export const aidCategoryEnum = pgEnum('aid_category', ['rent', 'food', 'utilities', 'other']);

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
