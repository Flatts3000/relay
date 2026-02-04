import { randomBytes } from 'crypto';

export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateExpiresAt(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
