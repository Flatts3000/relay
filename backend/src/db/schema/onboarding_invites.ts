import { pgTable, uuid, varchar, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './users.js';
import { hubs } from './hubs.js';
import { groups } from './groups.js';
import { users } from './users.js';

export const onboardingInvites = pgTable(
  'onboarding_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull(),
    targetHubId: uuid('target_hub_id').references(() => hubs.id),
    targetGroupId: uuid('target_group_id').references(() => groups.id),
    invitedById: uuid('invited_by_id')
      .notNull()
      .references(() => users.id),
    token: varchar('token', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('onboarding_invites_token_idx').on(table.token),
    emailIdx: index('onboarding_invites_email_idx').on(table.email),
  })
);

export type OnboardingInvite = typeof onboardingInvites.$inferSelect;
export type NewOnboardingInvite = typeof onboardingInvites.$inferInsert;
