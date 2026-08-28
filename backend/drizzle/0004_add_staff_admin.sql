-- Idempotent so it is safe to apply regardless of whether this was
-- previously run by hand. See #26.
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'staff_admin';
