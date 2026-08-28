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
-- That contradicts the data minimisation the broadcast model was built for.
--
-- NOTE: this file is NOT in meta/_journal.json, matching migrations 0003-0005.
-- drizzle-kit migrate will therefore not apply it. That is a known defect
-- tracked in #26, not an oversight here; journaling this alone would apply a
-- drop before the creates it depends on.

DROP TABLE IF EXISTS "mailbox_messages";
--> statement-breakpoint
DROP TABLE IF EXISTS "mailbox_tombstones";
--> statement-breakpoint
DROP TABLE IF EXISTS "mailboxes";
--> statement-breakpoint

-- deletion_type was only ever used by the mailbox tables.
DROP TYPE IF EXISTS "deletion_type";
