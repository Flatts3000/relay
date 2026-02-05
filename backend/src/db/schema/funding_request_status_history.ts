import { pgTable, uuid, timestamp, text } from 'drizzle-orm/pg-core';
import { fundingRequests, requestStatusEnum } from './funding_requests.js';
import { users } from './users.js';

// Funding request status history - tracks all status changes
export const fundingRequestStatusHistory = pgTable('funding_request_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  fundingRequestId: uuid('funding_request_id')
    .notNull()
    .references(() => fundingRequests.id),
  status: requestStatusEnum('status').notNull(),
  changedBy: uuid('changed_by').references(() => users.id),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  notes: text('notes'),
});

export type FundingRequestStatusHistory = typeof fundingRequestStatusHistory.$inferSelect;
export type NewFundingRequestStatusHistory = typeof fundingRequestStatusHistory.$inferInsert;
