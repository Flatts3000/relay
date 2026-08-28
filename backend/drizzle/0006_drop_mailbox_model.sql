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
-- This IS journaled, unlike 0003-0005. Everything dropped here is created by
-- 0001 and indexed by 0002, both journaled, and 0003-0005 reference neither the
-- mailbox tables nor deletion_type - so applying this at idx 3 is safe and does
-- not depend on the unjournaled migrations. Leaving it unjournaled would strand
-- the tombstone rows in every deployed database forever, now that the service
-- code that could delete them is gone. When #26 repairs the journal, 0003-0005
-- will land at idx 4-6, out of filename order; drizzle applies by journal order,
-- so that is fine.

DROP TABLE IF EXISTS "mailbox_messages";
--> statement-breakpoint
DROP TABLE IF EXISTS "mailbox_tombstones";
--> statement-breakpoint
DROP TABLE IF EXISTS "mailboxes";
--> statement-breakpoint

-- deletion_type was only ever used by the mailbox tables.
DROP TYPE IF EXISTS "deletion_type";
