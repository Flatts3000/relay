import { pgTable, uuid, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { groups } from './groups.js';

export const groupMembers = pgTable(
  'group_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    isOwner: boolean('is_owner').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: uniqueIndex('group_members_user_id_idx').on(table.userId),
  })
);

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
