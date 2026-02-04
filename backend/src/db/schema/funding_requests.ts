import { pgTable, uuid, varchar, timestamp, pgEnum, decimal, text } from 'drizzle-orm/pg-core';
import { groups, aidCategoryEnum } from './groups.js';

export const urgencyEnum = pgEnum('urgency', ['normal', 'urgent']);

export const requestStatusEnum = pgEnum('request_status', [
  'submitted',
  'approved',
  'declined',
  'funds_sent',
  'acknowledged',
]);

export const fundingRequests = pgTable('funding_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  category: aidCategoryEnum('category').notNull(),
  urgency: urgencyEnum('urgency').notNull().default('normal'),
  region: varchar('region', { length: 255 }).notNull(),
  justification: text('justification'),
  status: requestStatusEnum('status').notNull().default('submitted'),
  declineReason: text('decline_reason'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  declinedAt: timestamp('declined_at', { withTimezone: true }),
  fundsSentAt: timestamp('funds_sent_at', { withTimezone: true }),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type FundingRequest = typeof fundingRequests.$inferSelect;
export type NewFundingRequest = typeof fundingRequests.$inferInsert;
