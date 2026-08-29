import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  index,
  customType,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Custom type for bytea (binary data)
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return 'bytea';
  },
});

export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'verified',
  'revoked',
]);

export const aidCategoryEnum = pgEnum('aid_category', ['rent', 'food', 'utilities', 'other']);

// Broadcast-specific categories (separate from aidCategoryEnum to avoid breaking funding requests)
export const broadcastCategoryEnum = pgEnum('broadcast_category', [
  'food',
  'shelter_housing',
  'transportation',
  'medical',
  'safety_escort',
  'childcare',
  'legal',
  'supplies',
  'other',
]);

export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    serviceArea: varchar('service_area', { length: 255 }).notNull(),
    aidCategories: aidCategoryEnum('aid_categories').array().notNull(),
    contactEmail: varchar('contact_email', { length: 255 }).notNull(),
    // Broadcast encryption key - nullable (groups without keys can't receive broadcasts)
    publicKey: bytea('public_key'),
    // Salt the coordinator's passphrase is stretched with to rederive the
    // keypair above. Not a secret: it is served to coordinators of this group so
    // they can unlock on another device. Written and cleared together with
    // publicKey, enforced by a CHECK in migration 0009.
    keySalt: bytea('key_salt'),
    // Broadcast category subscriptions
    broadcastCategories: broadcastCategoryEnum('broadcast_categories').array(),
    // Coarse region for broadcast bucket membership
    broadcastServiceArea: varchar('broadcast_service_area', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    serviceAreaIdx: index('groups_service_area_idx').on(table.serviceArea),
    // Declared here as well as in migration 0009 because CI builds the test
    // schema with `drizzle-kit push`, straight from these definitions, and never
    // runs the migration SQL. A constraint that lives only in the migration
    // exists in production and nowhere any test can see it.
    keyMaterialComplete: check(
      'groups_key_material_complete',
      sql`(${table.publicKey} IS NULL) = (${table.keySalt} IS NULL)`
    ),
  })
);

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
