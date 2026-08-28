-- Make "decrypted with no timestamp" unrepresentable.
--
-- cleanupDecryptedInvites deletes an invite only when status = 'decrypted' AND
-- decrypted_at IS NOT NULL AND decrypted_at < now() - 10 minutes. An invite in
-- decrypted status with a null timestamp matches none of that, so it escapes
-- the 10-minute window entirely and survives to the 7-day TTL - a thousandfold
-- overrun on the retention guarantee Relay states publicly, while still holding
-- the wrapped content key for a broadcast whose ciphertext is therefore also
-- still present.
--
-- markInviteDecrypted sets both columns in one UPDATE, so no such row can exist
-- today. Nothing but that single call site enforces it: the columns are
-- independent, and a backfill, an admin action, or a second decrypt path could
-- set one without the other and create rows that outlive their window with no
-- error anywhere. A constraint is the only thing that makes that impossible
-- rather than merely unwritten.
--
-- See issue #33.

-- Defensive: repair any row that predates the constraint rather than failing
-- the migration. Falling back to created_at fails safe toward deletion, which
-- is the correct direction for this system.
UPDATE "broadcast_invites"
SET "decrypted_at" = "created_at"
WHERE "status" = 'decrypted' AND "decrypted_at" IS NULL;
--> statement-breakpoint

ALTER TABLE "broadcast_invites"
DROP CONSTRAINT IF EXISTS "broadcast_invites_decrypted_at_required";
--> statement-breakpoint

ALTER TABLE "broadcast_invites"
ADD CONSTRAINT "broadcast_invites_decrypted_at_required"
CHECK ("status" <> 'decrypted' OR "decrypted_at" IS NOT NULL);
