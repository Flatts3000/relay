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

-- Defensive repairs for rows predating the constraint, rather than failing the
-- migration. The two directions repair differently on purpose:
--
--   decrypted with no timestamp -> stamp it from created_at. Fails safe toward
--   deletion, which is the right direction for this system.
--
--   timestamp but not decrypted -> clear the timestamp. Promoting these to
--   'decrypted' instead would delete a pending invite ten minutes later that no
--   group ever opened, which is data loss in the wrong direction.

UPDATE "broadcast_invites"
SET "decrypted_at" = "created_at"
WHERE "status" = 'decrypted' AND "decrypted_at" IS NULL;
--> statement-breakpoint

UPDATE "broadcast_invites"
SET "decrypted_at" = NULL
WHERE "status" <> 'decrypted' AND "decrypted_at" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "broadcast_invites"
DROP CONSTRAINT IF EXISTS "broadcast_invites_decrypted_at_required";
--> statement-breakpoint

-- Biconditional, not one-directional. The mirror case - decrypted_at set while
-- status is still 'pending' - has the identical failure: cleanupDecryptedInvites
-- filters on status = 'decrypted', so such a row is skipped by the 10-minute
-- sweep and survives to the 7-day TTL still holding the wrapped content key,
-- keeping the broadcast ciphertext alive with it. A writer that stamps the
-- timestamp and forgets the status is exactly as plausible as one that does the
-- reverse.
--
-- Note this forbids retaining decrypted_at on a row moved to 'expired'. Nothing
-- sets that status today - expiry is a hard delete in cleanupExpiredInvites, and
-- the enum value is unused - but a future decrypted -> expired transition would
-- need this constraint revisited rather than worked around.
ALTER TABLE "broadcast_invites"
ADD CONSTRAINT "broadcast_invites_decrypted_at_required"
CHECK (("status" = 'decrypted') = ("decrypted_at" IS NOT NULL));
