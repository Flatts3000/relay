import { describe, it, expect } from 'vitest';
import nacl from 'tweetnacl';
import {
  MIN_PASSPHRASE_LENGTH,
  generateKeySalt,
  deriveGroupKeypair,
  encodeKey,
  decodeKey,
  matchesRegisteredKey,
} from './group-key';
import { wrapKeyForGroup, unwrapKey, generateContentKey, encodeBase64 } from './broadcast-crypto';

/**
 * A group's broadcast keypair is derived from a coordinator passphrase, so this
 * module decides whether a group can read its help requests at all - and whether
 * anyone else can. The private half must never be reconstructible from what the
 * server stores, which is the public key and the salt.
 */
describe('group key derivation', () => {
  const PASSPHRASE = 'powderhorn winter mutual aid';

  describe('salts', () => {
    it('generates 16 bytes', () => {
      expect(generateKeySalt()).toHaveLength(16);
    });

    it('never generates the same salt twice', () => {
      const salts = new Set(Array.from({ length: 50 }, () => encodeKey(generateKeySalt())));

      // A shared salt would let one precomputation cover several groups, which
      // is the entire reason the salt is per group rather than per product.
      expect(salts.size).toBe(50);
    });
  });

  describe('derivation', () => {
    it('produces a usable NaCl box keypair', async () => {
      const keypair = await deriveGroupKeypair(PASSPHRASE, generateKeySalt());

      expect(keypair.publicKey).toHaveLength(nacl.box.publicKeyLength);
      expect(keypair.secretKey).toHaveLength(nacl.box.secretKeyLength);
    });

    it('is deterministic for the same passphrase and salt', async () => {
      const salt = generateKeySalt();
      const a = await deriveGroupKeypair(PASSPHRASE, salt);
      const b = await deriveGroupKeypair(PASSPHRASE, salt);

      // This is what lets a coordinator unlock on a second device, and two
      // volunteers who share a passphrase both read the group's requests.
      expect(encodeKey(a.secretKey)).toBe(encodeKey(b.secretKey));
      expect(encodeKey(a.publicKey)).toBe(encodeKey(b.publicKey));
    });

    it('produces a different key for a different passphrase', async () => {
      const salt = generateKeySalt();
      const a = await deriveGroupKeypair(PASSPHRASE, salt);
      const b = await deriveGroupKeypair('a completely different phrase', salt);

      expect(encodeKey(a.publicKey)).not.toBe(encodeKey(b.publicKey));
    });

    it('produces a different key for the same passphrase under a different salt', async () => {
      const a = await deriveGroupKeypair(PASSPHRASE, generateKeySalt());
      const b = await deriveGroupKeypair(PASSPHRASE, generateKeySalt());

      // Rotation issues a new salt, so a coordinator reusing their old
      // passphrase still gets a genuinely new key.
      expect(encodeKey(a.publicKey)).not.toBe(encodeKey(b.publicKey));
    });

    it('normalises the passphrase so equivalent Unicode forms agree', async () => {
      const salt = generateKeySalt();

      // The same Spanish phrase typed on two keyboards. One yields a composed
      // n-with-tilde (U+00F1); the other an n followed by a combining tilde
      // (U+006E U+0303). They render identically and compare unequal.
      const composed = 'contraseña de ayuda';
      const decomposed = 'contraseña de ayuda';
      expect(composed).not.toBe(decomposed);
      expect(composed.normalize('NFKC')).toBe(decomposed.normalize('NFKC'));

      const a = await deriveGroupKeypair(composed, salt);
      const b = await deriveGroupKeypair(decomposed, salt);

      // Without NFKC a coordinator is locked out of their own group by a
      // difference they cannot see, on a passphrase they typed correctly.
      expect(encodeKey(a.publicKey)).toBe(encodeKey(b.publicKey));
    });

    it('rejects a passphrase below the minimum length', async () => {
      const salt = generateKeySalt();

      // No iteration count rescues a short passphrase, and this key opens other
      // people's help requests.
      await expect(deriveGroupKeypair('short', salt)).rejects.toThrow(
        `at least ${MIN_PASSPHRASE_LENGTH}`
      );
    });

    it('accepts a passphrase of exactly the minimum length', async () => {
      const salt = generateKeySalt();
      const exact = 'a'.repeat(MIN_PASSPHRASE_LENGTH);

      await expect(deriveGroupKeypair(exact, salt)).resolves.toBeDefined();
    });

    it('salts with exactly the bytes given, not a surrounding buffer', async () => {
      const backing = new Uint8Array(64).fill(7);
      const view = new Uint8Array(backing.buffer, 16, 16);
      const copy = new Uint8Array(view);

      const fromView = await deriveGroupKeypair(PASSPHRASE, view);
      const fromCopy = await deriveGroupKeypair(PASSPHRASE, copy);

      // A view over a larger buffer would otherwise salt with everything behind
      // it, so the same salt bytes would derive different keys depending on how
      // they were allocated.
      expect(encodeKey(fromView.publicKey)).toBe(encodeKey(fromCopy.publicKey));
    });
  });

  describe('matching against the registered key', () => {
    it('accepts the keypair the group actually registered', async () => {
      const salt = generateKeySalt();
      const keypair = await deriveGroupKeypair(PASSPHRASE, salt);

      expect(matchesRegisteredKey(keypair, encodeKey(keypair.publicKey))).toBe(true);
    });

    it('rejects a keypair derived from the wrong passphrase', async () => {
      const salt = generateKeySalt();
      const registered = await deriveGroupKeypair(PASSPHRASE, salt);
      const wrong = await deriveGroupKeypair('not the right passphrase', salt);

      // Without this the only available message is "could not decrypt", which is
      // indistinguishable from a corrupt invite - so the coordinator is told the
      // request is broken when in fact they mistyped.
      expect(matchesRegisteredKey(wrong, encodeKey(registered.publicKey))).toBe(false);
    });
  });

  describe('interoperability with the broadcast path', () => {
    it('opens an invite wrapped to the derived public key', async () => {
      const salt = generateKeySalt();
      const group = await deriveGroupKeypair(PASSPHRASE, salt);
      const contentKey = generateContentKey();

      const wrapped = wrapKeyForGroup(contentKey, group.publicKey);
      const recovered = unwrapKey(wrapped, group.secretKey);

      // The end-to-end claim: a passphrase typed in a browser opens a request
      // encrypted by a stranger who only ever saw the public half.
      expect(recovered).not.toBeNull();
      expect(encodeBase64(recovered!)).toBe(encodeBase64(contentKey));
    });

    it('opens it again after rederiving the key on another device', async () => {
      const salt = generateKeySalt();
      const first = await deriveGroupKeypair(PASSPHRASE, salt);
      const contentKey = generateContentKey();
      const wrapped = wrapKeyForGroup(contentKey, first.publicKey);

      // Same passphrase, same salt fetched from the server, different session.
      const second = await deriveGroupKeypair(PASSPHRASE, decodeKey(encodeKey(salt)));
      const recovered = unwrapKey(wrapped, second.secretKey);

      expect(recovered).not.toBeNull();
      expect(encodeBase64(recovered!)).toBe(encodeBase64(contentKey));
    });

    it('does not open an invite after the passphrase is rotated', async () => {
      const oldKey = await deriveGroupKeypair(PASSPHRASE, generateKeySalt());
      const wrapped = wrapKeyForGroup(generateContentKey(), oldKey.publicKey);

      const rotated = await deriveGroupKeypair('a brand new group passphrase', generateKeySalt());

      // Which is why rotation discards pending invites rather than leaving them
      // to look openable.
      expect(unwrapKey(wrapped, rotated.secretKey)).toBeNull();
    });
  });

  describe('encoding helpers', () => {
    it('round-trips a key through base64', () => {
      const key = nacl.box.keyPair().publicKey;

      expect(encodeKey(decodeKey(encodeKey(key)))).toBe(encodeKey(key));
    });
  });
});
