/**
 * Broadcast encryption utilities for the E2E encrypted help broadcast system.
 * Uses TweetNaCl.js for all cryptographic operations.
 *
 * CRITICAL SECURITY NOTES:
 * - Content keys are generated client-side and never sent to the server in plaintext
 * - Each broadcast uses a unique content key (symmetric, secretbox)
 * - The content key is wrapped per-group using the group's public key (asymmetric, box)
 * - The server stores only ciphertext it cannot decrypt
 * - Safe-words are generated client-side and included only in the encrypted payload
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { WORDLIST } from './wordlist';

/**
 * Generate a random symmetric content key for encrypting the broadcast payload.
 * Uses nacl.secretbox key length (32 bytes).
 */
export function generateContentKey(): Uint8Array {
  return nacl.randomBytes(nacl.secretbox.keyLength);
}

/**
 * Encrypt the broadcast payload with a symmetric content key.
 * Uses nacl.secretbox (XSalsa20-Poly1305).
 *
 * @returns ciphertext and nonce (both as Uint8Array)
 */
export function encryptPayload(
  plaintext: string,
  contentKey: Uint8Array
): { ciphertext: Uint8Array; nonce: Uint8Array } {
  const message = decodeUTF8(plaintext);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(message, nonce, contentKey);
  return { ciphertext, nonce };
}

/**
 * Wrap the content key for a specific group using their public key.
 * Uses an ephemeral keypair + nacl.box (Curve25519-XSalsa20-Poly1305).
 *
 * Output format: nonce(24) + ephemeralPubKey(32) + encrypted(48) = 104 bytes
 *
 * @param contentKey - The 32-byte symmetric content key to wrap
 * @param groupPublicKey - The group's Curve25519 public key (32 bytes)
 * @returns Packed wrapped key (104 bytes)
 */
export function wrapKeyForGroup(contentKey: Uint8Array, groupPublicKey: Uint8Array): Uint8Array {
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(contentKey, nonce, groupPublicKey, ephemeral.secretKey);

  // Pack: nonce(24) + ephemeralPubKey(32) + encrypted(48)
  const packed = new Uint8Array(nonce.length + ephemeral.publicKey.length + encrypted.length);
  packed.set(nonce, 0);
  packed.set(ephemeral.publicKey, nonce.length);
  packed.set(encrypted, nonce.length + ephemeral.publicKey.length);

  return packed;
}

/**
 * Unwrap a content key using the group's secret key.
 * Reverses the packing from wrapKeyForGroup.
 *
 * @param wrappedKey - The 104-byte packed wrapped key
 * @param groupSecretKey - The group's Curve25519 secret key (32 bytes)
 * @returns The 32-byte content key, or null if decryption fails
 */
export function unwrapKey(wrappedKey: Uint8Array, groupSecretKey: Uint8Array): Uint8Array | null {
  const nonceLen = nacl.box.nonceLength; // 24
  const pubKeyLen = nacl.box.publicKeyLength; // 32

  if (wrappedKey.length < nonceLen + pubKeyLen + 1) {
    return null;
  }

  const nonce = wrappedKey.slice(0, nonceLen);
  const ephemeralPubKey = wrappedKey.slice(nonceLen, nonceLen + pubKeyLen);
  const encrypted = wrappedKey.slice(nonceLen + pubKeyLen);

  return nacl.box.open(encrypted, nonce, ephemeralPubKey, groupSecretKey) ?? null;
}

/**
 * Decrypt a broadcast payload using the content key.
 * Reverses encryptPayload.
 *
 * @returns Decrypted plaintext string, or null if decryption fails
 */
export function decryptPayload(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  contentKey: Uint8Array
): string | null {
  const decrypted = nacl.secretbox.open(ciphertext, nonce, contentKey);
  if (!decrypted) return null;
  return encodeUTF8(decrypted);
}

/**
 * Generate a safe-word for out-of-band verification.
 * 3 random words from the wordlist — no numeric suffix, keep it speakable.
 * ~24 bits of entropy (8 bits per word × 3 words).
 */
export function generateSafeWord(): string {
  const randomBytes = new Uint8Array(3);
  crypto.getRandomValues(randomBytes);

  const word0 = WORDLIST[randomBytes[0]!];
  const word1 = WORDLIST[randomBytes[1]!];
  const word2 = WORDLIST[randomBytes[2]!];

  return `${word0}-${word1}-${word2}`;
}

// Re-export for convenience
export { encodeBase64, decodeBase64 };
