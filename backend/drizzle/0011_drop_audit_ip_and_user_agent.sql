-- IF EXISTS because this file gets re-applied. CI re-runs every migration
-- against an already-migrated database to prove they are idempotent, and
-- drizzle-kit generates a bare DROP COLUMN, which fails the second time.
ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "ip_address";--> statement-breakpoint
ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "user_agent";
