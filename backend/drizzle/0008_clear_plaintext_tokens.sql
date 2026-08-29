-- Clear credentials that were stored in plaintext.
--
-- As of #48 both token types are stored as a SHA-256 of the issued value.
-- Existing rows hold the raw token, so they can never match a lookup again -
-- they are dead weight that still happens to be a working credential if the
-- row is read directly, which is the whole thing this change removes.
--
-- Effect on users: everyone is signed out and any unclicked magic link stops
-- working. Both are recoverable by requesting a new link, and the database
-- currently holds no user rows at all.
--
-- Deliberately DELETE rather than attempting to migrate: a hash cannot be
-- derived from a value we are trying to stop storing, and re-hashing the
-- plaintext here would just move it rather than retire it.

DELETE FROM "sessions";
--> statement-breakpoint
DELETE FROM "auth_tokens";
