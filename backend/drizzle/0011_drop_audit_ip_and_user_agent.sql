-- IF EXISTS because CI re-applies every migration against an already-migrated
-- database to prove they are idempotent, and drizzle-kit generates a bare DROP
-- COLUMN, which succeeds once and then errors.
ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "ip_address";--> statement-breakpoint
ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "user_agent";
