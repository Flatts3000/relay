-- Phase 8: Encrypted Help Broadcast System
-- Adds broadcast_category enum, group broadcast columns, and broadcast/invite/tombstone tables

-- Broadcast-specific category enum (separate from aid_category to avoid breaking funding requests)
CREATE TYPE "broadcast_category" AS ENUM (
  'food',
  'shelter_housing',
  'transportation',
  'medical',
  'safety_escort',
  'childcare',
  'legal',
  'supplies',
  'other'
);

-- Invite status enum
CREATE TYPE "invite_status" AS ENUM ('pending', 'decrypted', 'expired');

-- Add broadcast columns to groups table
ALTER TABLE "groups" ADD COLUMN "public_key" bytea;
ALTER TABLE "groups" ADD COLUMN "broadcast_categories" broadcast_category[];
ALTER TABLE "groups" ADD COLUMN "broadcast_service_area" varchar(255);

-- Broadcasts — encrypted help requests from anonymous individuals
CREATE TABLE "broadcasts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ciphertext_payload" bytea NOT NULL,
  "nonce" bytea NOT NULL,
  "region" varchar(255) NOT NULL,
  "categories" broadcast_category[] NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  "deleted_at" timestamp with time zone
);

CREATE INDEX "broadcasts_expires_at_idx" ON "broadcasts" ("expires_at");

-- Broadcast invites — per-group wrapped keys
CREATE TABLE "broadcast_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "broadcast_id" uuid NOT NULL REFERENCES "broadcasts"("id") ON DELETE CASCADE,
  "group_id" uuid NOT NULL REFERENCES "groups"("id"),
  "wrapped_key" bytea NOT NULL,
  "status" invite_status NOT NULL DEFAULT 'pending',
  "decrypted_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "broadcast_invites_broadcast_id_idx" ON "broadcast_invites" ("broadcast_id");
CREATE INDEX "broadcast_invites_group_status_idx" ON "broadcast_invites" ("group_id", "status");
CREATE INDEX "broadcast_invites_expires_at_idx" ON "broadcast_invites" ("expires_at");

-- Broadcast tombstones — retained after deletion for aggregate analytics
CREATE TABLE "broadcast_tombstones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "original_broadcast_id" uuid NOT NULL,
  "region" varchar(255) NOT NULL,
  "categories" broadcast_category[] NOT NULL,
  "group_ids" uuid[],
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone
);
