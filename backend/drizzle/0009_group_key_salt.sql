-- Salt for deriving a group's broadcast keypair from a coordinator passphrase.
--
-- Not a secret: it is served to any coordinator of the group so their browser
-- can rederive the same keypair on another device. Its job is to make a
-- precomputed table useless against one group, which is why it must be per
-- group and random rather than derived from anything guessable like the name.
--
-- Nullable because a group has no broadcast key until a coordinator sets a
-- passphrase, and the two columns are written together.
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "key_salt" bytea;

-- A public key with no salt cannot be rederived from a passphrase by anyone, so
-- it is not usable key material - it only makes the group look broadcast-capable
-- while nothing it receives can ever be opened. Clear any such row before
-- asserting the invariant below. Production has none: until this change there
-- was no endpoint that wrote public_key at all.
UPDATE "groups" SET "public_key" = NULL WHERE "public_key" IS NOT NULL AND "key_salt" IS NULL;

-- Either both halves of the key material are present or neither is. A public
-- key without its salt cannot be rederived by anyone, so the group would look
-- broadcast-capable in the directory while no coordinator could ever decrypt
-- what it received.
ALTER TABLE "groups" DROP CONSTRAINT IF EXISTS "groups_key_material_complete";
ALTER TABLE "groups" ADD CONSTRAINT "groups_key_material_complete"
  CHECK (("public_key" IS NULL) = ("key_salt" IS NULL));
