-- Remove the mailbox/passphrase model, superseded by encrypted broadcasts (0003).
--
-- CLAUDE.md has described the broadcast model as replacing this since Phase 8,
-- but the tables, routes and pages were never removed and both intake paths
-- stayed live. See issue #15.
--
-- mailbox_tombstones is the reason this is a removal rather than a cleanup. It
-- was retained after mailbox deletion "for analytics" and holds help category,
-- region, timestamps and responding group ids indefinitely, with no deletion
-- path - a permanent record that a request of a given kind existed in a given
-- region at a given time, outliving the deletion it was supposed to follow.
--
-- To be clear about what this does and does not fix: broadcast_tombstones has
-- the same shape and the same absence of a prune path, so the replacement model
-- reproduces the pattern rather than eliminating it. That is tracked in #29.
-- This migration removes one instance of it, not the category of problem.
--
-- Journaled at idx 6, after 0003-0005, which #26 journaled at idx 3-5. Note
-- that drizzle decides what to apply from the journal's `when` timestamp and
-- never from idx, so those timestamps must strictly increase; CI enforces that
-- via scripts/check-migration-journal.js.

DROP TABLE IF EXISTS "mailbox_messages";
--> statement-breakpoint
DROP TABLE IF EXISTS "mailbox_tombstones";
--> statement-breakpoint
DROP TABLE IF EXISTS "mailboxes";
--> statement-breakpoint

-- deletion_type was only ever used by the mailbox tables.
DROP TYPE IF EXISTS "deletion_type";
