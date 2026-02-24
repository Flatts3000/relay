import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { groups, verificationStatusEnum } from './groups.js';
import { hubs } from './hubs.js';

export const groupHubMemberships = pgTable(
  'group_hub_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id),
    verificationStatus: verificationStatusEnum('verification_status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupHubIdx: uniqueIndex('group_hub_memberships_group_hub_idx').on(table.groupId, table.hubId),
  })
);

export type GroupHubMembership = typeof groupHubMemberships.$inferSelect;
export type NewGroupHubMembership = typeof groupHubMemberships.$inferInsert;
