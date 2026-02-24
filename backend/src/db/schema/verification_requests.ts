import { pgTable, uuid, timestamp, pgEnum, text } from 'drizzle-orm/pg-core';
import { groups } from './groups.js';
import { hubs } from './hubs.js';
import { users } from './users.js';

export const verificationMethodEnum = pgEnum('verification_method', [
  'hub_approval',
  'peer_attestation',
  'sponsor_reference',
]);

export const verificationRequestStatusEnum = pgEnum('verification_request_status', [
  'pending',
  'approved',
  'denied',
]);

export const verificationRequests = pgTable('verification_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id),
  hubId: uuid('hub_id').references(() => hubs.id),
  method: verificationMethodEnum('method').notNull(),
  status: verificationRequestStatusEnum('status').notNull().default('pending'),
  // For sponsor reference method
  sponsorInfo: text('sponsor_info'),
  // Review information
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  denialReason: text('denial_reason'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type NewVerificationRequest = typeof verificationRequests.$inferInsert;

// Peer attestations - tracks which verified groups have vouched for a pending group
export const peerAttestations = pgTable('peer_attestations', {
  id: uuid('id').primaryKey().defaultRandom(),
  verificationRequestId: uuid('verification_request_id')
    .notNull()
    .references(() => verificationRequests.id),
  attestingGroupId: uuid('attesting_group_id')
    .notNull()
    .references(() => groups.id),
  attestedBy: uuid('attested_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PeerAttestation = typeof peerAttestations.$inferSelect;
export type NewPeerAttestation = typeof peerAttestations.$inferInsert;
