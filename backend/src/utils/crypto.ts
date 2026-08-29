import { randomBytes, createHash } from 'crypto';

export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a bearer token for storage.
 *
 * Magic-link and session tokens are 32 bytes of CSPRNG output, so they are not
 * guessable and need no salt or key stretching - a fast hash is the right
 * choice for a value looked up on every authenticated request. What this buys
 * is that a copy of the database is no longer a set of working credentials:
 * read access through a backup, a dump, or a legal order yields hashes rather
 * than tokens that can be replayed as a logged-in coordinator.
 *
 * Output is 64 hex characters, matching the existing varchar(64) columns.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateExpiresAt(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
