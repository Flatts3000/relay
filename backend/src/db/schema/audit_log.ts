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
  // Declared but never written, and on their way out. See #70.
  //
  // Both were recorded against every authenticated write and every login and
  // logout, and neither was ever read: the admin audit view selects its columns
  // explicitly and includes neither. Joined against users and the membership
  // tables they made a durable map of organizer email -> group -> IP address ->
  // activity timeline, for exactly the people this threat model is about.
  //
  // Nothing populates them as of this release. They cannot be dropped in the
  // same one: deploy.sh migrates while the previous backend is still serving,
  // and that image names ip_address in every audit INSERT, so removing the
  // column would break it - and the rollback path would restore that same image
  // against the migrated schema. The drop follows once this code is deployed.
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
