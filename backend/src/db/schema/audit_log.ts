import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'verify',
  'approve',
  'decline',
  'send_funds',
  'acknowledge',
]);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: auditActionEnum('action').notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata'),
  // No ip_address and no user_agent, deliberately and permanently. See #70.
  //
  // Both were recorded against every authenticated write and every login and
  // logout, and neither was ever read: the admin audit view selects its columns
  // explicitly and includes neither. Joined against users and the membership
  // tables they made a durable map of organizer email -> group -> IP address ->
  // activity timeline, held with no retention window, for exactly the people
  // this threat model is about.
  //
  // An audit entry is attributable through userId, which is the accountability
  // this table exists to provide. It does not need a network address to do it.
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
