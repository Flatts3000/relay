-- Migration: Onboarding schema changes
-- Decouples user↔hub/group into membership tables, adds multi-hub group support, adds onboarding invites.

-- 1. Create hub_members table
CREATE TABLE IF NOT EXISTS "hub_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "hub_id" uuid NOT NULL REFERENCES "hubs"("id"),
  "is_owner" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "hub_members_user_id_idx" ON "hub_members" ("user_id");

-- 2. Create group_members table
CREATE TABLE IF NOT EXISTS "group_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "group_id" uuid NOT NULL REFERENCES "groups"("id"),
  "is_owner" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "group_members_user_id_idx" ON "group_members" ("user_id");

-- 3. Create group_hub_memberships table
CREATE TABLE IF NOT EXISTS "group_hub_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL REFERENCES "groups"("id"),
  "hub_id" uuid NOT NULL REFERENCES "hubs"("id"),
  "verification_status" "verification_status" NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "group_hub_memberships_group_hub_idx" ON "group_hub_memberships" ("group_id", "hub_id");

-- 4. Create onboarding_invites table
CREATE TABLE IF NOT EXISTS "onboarding_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "role" "user_role" NOT NULL,
  "target_hub_id" uuid REFERENCES "hubs"("id"),
  "target_group_id" uuid REFERENCES "groups"("id"),
  "invited_by_id" uuid NOT NULL REFERENCES "users"("id"),
  "token" varchar(64) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_invites_token_idx" ON "onboarding_invites" ("token");
CREATE INDEX IF NOT EXISTS "onboarding_invites_email_idx" ON "onboarding_invites" ("email");

-- 5. Add hub_id to verification_requests
ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "hub_id" uuid REFERENCES "hubs"("id");

-- 6. Migrate data: users.hub_id → hub_members (all existing users are owners)
INSERT INTO "hub_members" ("user_id", "hub_id", "is_owner")
SELECT "id", "hub_id", true
FROM "users"
WHERE "hub_id" IS NOT NULL AND "deleted_at" IS NULL
ON CONFLICT DO NOTHING;

-- 7. Migrate data: users.group_id → group_members (all existing users are owners)
INSERT INTO "group_members" ("user_id", "group_id", "is_owner")
SELECT "id", "group_id", true
FROM "users"
WHERE "group_id" IS NOT NULL AND "deleted_at" IS NULL
ON CONFLICT DO NOTHING;

-- 8. Migrate data: groups.(hub_id, verification_status) → group_hub_memberships
INSERT INTO "group_hub_memberships" ("group_id", "hub_id", "verification_status")
SELECT "id", "hub_id", "verification_status"
FROM "groups"
WHERE "hub_id" IS NOT NULL AND "deleted_at" IS NULL
ON CONFLICT DO NOTHING;

-- 9. Migrate data: set verification_requests.hub_id from groups.hub_id
UPDATE "verification_requests" vr
SET "hub_id" = g."hub_id"
FROM "groups" g
WHERE vr."group_id" = g."id" AND g."hub_id" IS NOT NULL;

-- 10. Drop removed columns and indexes
DROP INDEX IF EXISTS "groups_hub_id_idx";
DROP INDEX IF EXISTS "groups_verification_status_idx";
ALTER TABLE "groups" DROP COLUMN IF EXISTS "hub_id";
ALTER TABLE "groups" DROP COLUMN IF EXISTS "verification_status";
ALTER TABLE "users" DROP COLUMN IF EXISTS "hub_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "group_id";
