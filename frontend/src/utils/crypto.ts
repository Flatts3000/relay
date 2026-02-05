/**
 * E2E Encryption utilities for anonymous mailbox system.
 * Uses TweetNaCl.js for NaCl box encryption.
 *
 * CRITICAL SECURITY NOTES:
 * - Private keys are NEVER sent to the server
 * - Private keys are stored ONLY in browser memory/localStorage
 * - The server can NEVER decrypt messages (only ciphertext is stored)
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * Key pair for E2E encryption
 */
export interface KeyPair {
  publicKey: string; // base64-encoded
  secretKey: string; // base64-encoded
}

/**
 * Encrypted message with nonce
 */
export interface EncryptedMessage {
  ciphertext: string; // base64-encoded (includes nonce prepended)
}

/**
 * Generate a new key pair for anonymous mailbox.
 * The private key should be stored locally by the individual.
 */
export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Encrypt a message for a recipient using their public key.
 * Used by groups to send encrypted replies.
 *
 * @param message - Plaintext message to encrypt
 * @param recipientPublicKey - base64-encoded public key of the recipient
 * @param senderSecretKey - base64-encoded secret key of the sender
 * @returns Encrypted message with ciphertext (nonce prepended to ciphertext)
 */
export function encryptMessage(
  message: string,
  recipientPublicKey: string,
  senderSecretKey: string
): EncryptedMessage {
  const messageBytes = new TextEncoder().encode(message);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const recipientPublicKeyBytes = decodeBase64(recipientPublicKey);
  const senderSecretKeyBytes = decodeBase64(senderSecretKey);

  const encrypted = nacl.box(messageBytes, nonce, recipientPublicKeyBytes, senderSecretKeyBytes);

  // Prepend nonce to ciphertext
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);

  return {
    ciphertext: encodeBase64(fullMessage),
  };
}

/**
 * Decrypt a message using recipient's private key.
 * Used by individuals to read encrypted replies.
 *
 * @param ciphertext - base64-encoded ciphertext (with nonce prepended)
 * @param senderPublicKey - base64-encoded public key of the sender (the group)
 * @param recipientSecretKey - base64-encoded secret key of the recipient (the individual)
 * @returns Decrypted message string, or null if decryption fails
 */
export function decryptMessage(
  ciphertext: string,
  senderPublicKey: string,
  recipientSecretKey: string
): string | null {
  try {
    const fullMessage = decodeBase64(ciphertext);

    // Extract nonce and actual ciphertext
    const nonce = fullMessage.slice(0, nacl.box.nonceLength);
    const encrypted = fullMessage.slice(nacl.box.nonceLength);

    const senderPublicKeyBytes = decodeBase64(senderPublicKey);
    const recipientSecretKeyBytes = decodeBase64(recipientSecretKey);

    const decrypted = nacl.box.open(
      encrypted,
      nonce,
      senderPublicKeyBytes,
      recipientSecretKeyBytes
    );

    if (!decrypted) {
      return null;
    }

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

/**
 * Storage key for the individual's mailbox data.
 * Used to persist key pair and mailbox ID across browser sessions.
 */
const STORAGE_KEY = 'relay_anonymous_mailbox';

/**
 * Mailbox data stored locally
 */
export interface StoredMailboxData {
  id: string;
  keyPair: KeyPair;
  createdAt: string;
}

/**
 * Save mailbox data to local storage.
 * WARNING: This should only be used when the user explicitly chooses to persist.
 */
export function saveMailboxToStorage(data: StoredMailboxData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Load mailbox data from local storage.
 * Returns null if no mailbox data exists.
 */
export function loadMailboxFromStorage(): StoredMailboxData | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as StoredMailboxData;
  } catch {
    return null;
  }
}

/**
 * Clear mailbox data from local storage.
 * Should be called when the user deletes their mailbox.
 */
export function clearMailboxFromStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Generate a one-time use key pair for groups to encrypt replies.
 * This key pair is generated fresh for each reply and the private key
 * is included in the encrypted message metadata so the recipient can decrypt.
 *
 * For NaCl box, we need the sender's private key and recipient's public key.
 * Groups use a fresh ephemeral key pair for each message.
 */
export function generateEphemeralKeyPair(): KeyPair {
  return generateKeyPair();
}
