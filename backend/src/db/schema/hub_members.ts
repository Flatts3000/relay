import { pgTable, uuid, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { hubs } from './hubs.js';

export const hubMembers = pgTable(
  'hub_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id),
    isOwner: boolean('is_owner').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: uniqueIndex('hub_members_user_id_idx').on(table.userId),
  })
);

export type HubMember = typeof hubMembers.$inferSelect;
export type NewHubMember = typeof hubMembers.$inferInsert;
