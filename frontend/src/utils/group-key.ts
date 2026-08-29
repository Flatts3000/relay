import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64 } from 'tweetnacl-util';

/**
 * Group broadcast keys, derived from a coordinator passphrase.
 *
 * A group needs a keypair to receive encrypted help requests, and until now the
 * product had no way to give it one: nothing generated a keypair, nothing stored
 * one, and the invite screen asked coordinators to paste a base64 private key
 * that had never existed. Every group therefore had a null public key, was
 * filtered out of the broadcast directory, and could never be sent an invite.
 *
 * Deriving the key from a passphrase rather than handing out a key file is what
 * suits these users. A keyfile is one lost laptop away from a group losing every
 * pending request, cannot be used from a second device, and cannot be shared
 * between the two or three volunteers who share the work. A passphrase can be
 * written in a notebook, remembered, or passed along in person.
 *
 * The passphrase never leaves the browser. Only the public key and the salt are
 * uploaded, so a database dump - or a subpoena - yields nothing that opens a
 * broadcast, which is the guarantee the whole design exists to protect.
 */

/**
 * PBKDF2-HMAC-SHA256, at OWASP's current figure for that function.
 *
 * The threat this defends against is concrete: anyone holding the database has
 * both the salt and the ciphertext, so a weak stretch turns a guessable
 * passphrase into a group's decryption key offline and at leisure. The cost is
 * a few seconds on a low-end phone, paid once per unlock, which is the right
 * side of that trade for a key that opens strangers' help requests.
 */
const PBKDF2_ITERATIONS = 600_000;

/** NaCl box secret keys are 32 bytes; X25519 clamps the value itself. */
const KEY_BYTES = 32;

const SALT_BYTES = 16;

/**
 * Short passphrases are not rescued by any iteration count, and a coordinator
 * choosing one is choosing it for a key that opens other people's help requests.
 */
export const MIN_PASSPHRASE_LENGTH = 12;

export interface GroupKeypair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/** A fresh random salt, for a group registering key material for the first time. */
export function generateKeySalt(): Uint8Array {
  return nacl.randomBytes(SALT_BYTES);
}

/**
 * Stretch a passphrase into a group keypair.
 *
 * Deterministic: the same passphrase and salt always produce the same keypair,
 * which is what lets a coordinator unlock on a second device, and lets two
 * volunteers who share a passphrase both read the group's requests.
 */
export async function deriveGroupKeypair(
  passphrase: string,
  salt: Uint8Array
): Promise<GroupKeypair> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`);
  }

  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      // Uint8Array is copied into a fresh ArrayBuffer: a view over a larger
      // buffer would otherwise salt with whatever else that buffer holds.
      salt: new Uint8Array(salt).buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    KEY_BYTES * 8
  );

  return nacl.box.keyPair.fromSecretKey(new Uint8Array(bits));
}

export function encodeKey(key: Uint8Array): string {
  return encodeBase64(key);
}

export function decodeKey(value: string): Uint8Array {
  return decodeBase64(value);
}

/**
 * Confirm a derived keypair matches the public key the group registered.
 *
 * Without this a wrong passphrase would derive a valid but unrelated keypair and
 * fail later, at unwrap, where the only honest message is "could not decrypt" -
 * indistinguishable from a corrupt invite. Comparing against the registered
 * public key lets the wrong-passphrase case say so plainly.
 */
export function matchesRegisteredKey(derived: GroupKeypair, registeredBase64: string): boolean {
  return encodeBase64(derived.publicKey) === registeredBase64;
}
