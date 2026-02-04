import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const hubs = pgTable('hubs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Hub = typeof hubs.$inferSelect;
export type NewHub = typeof hubs.$inferInsert;
