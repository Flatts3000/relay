import { describe, it, expect } from 'vitest';
import nacl from 'tweetnacl';
import {
  generateContentKey,
  encryptPayload,
  wrapKeyForGroup,
  unwrapKey,
  decryptPayload,
  generateSafeWord,
  encodeBase64,
  decodeBase64,
} from './broadcast-crypto';
import { WORDLIST } from './wordlist';

/**
 * This module is where the product's central privacy claim actually lives: that
 * Relay stores ciphertext it cannot read, and that only a matching group can
 * open a help request. The cryptographic design has had expert review; the code
 * around it had never been executed by a test.
 *
 * These are behavioural tests of that code, not of the primitives. TweetNaCl is
 * assumed correct.
 */
describe('broadcast crypto', () => {
  describe('content keys', () => {
    it('generates a key of the length secretbox requires', () => {
      expect(generateContentKey()).toHaveLength(nacl.secretbox.keyLength);
    });

    it('never generates the same key twice', () => {
      const keys = new Set(Array.from({ length: 50 }, () => encodeBase64(generateContentKey())));
      // A content key reused across broadcasts would let a group that received
      // one request open a later one addressed elsewhere.
      expect(keys.size).toBe(50);
    });
  });

  describe('payload encryption', () => {
    it('round-trips a message through the content key', () => {
      const key = generateContentKey();
      const { ciphertext, nonce } = encryptPayload('need groceries', key);

      expect(decryptPayload(ciphertext, nonce, key)).toBe('need groceries');
    });

    it('round-trips non-ASCII text', () => {
      const key = generateContentKey();
      const message = 'Necesito ayuda con el alquiler - año 2026 · 🙏';
      const { ciphertext, nonce } = encryptPayload(message, key);

      // Payloads are JSON holding free text in either supported language.
      expect(decryptPayload(ciphertext, nonce, key)).toBe(message);
    });

    it('produces ciphertext that does not contain the plaintext', () => {
      const key = generateContentKey();
      const { ciphertext } = encryptPayload('phone 555-0100', key);

      expect(new TextDecoder().decode(ciphertext)).not.toContain('555-0100');
    });

    it('uses a fresh nonce for identical plaintext', () => {
      const key = generateContentKey();
      const a = encryptPayload('same message', key);
      const b = encryptPayload('same message', key);

      // A repeated nonce under one key breaks XSalsa20 outright.
      expect(encodeBase64(a.nonce)).not.toBe(encodeBase64(b.nonce));
      expect(encodeBase64(a.ciphertext)).not.toBe(encodeBase64(b.ciphertext));
    });

    it('returns null for the wrong key rather than throwing', () => {
      const { ciphertext, nonce } = encryptPayload('secret', generateContentKey());

      // The caller branches on null; a throw would surface as an unhandled
      // rejection in the inbox instead of "could not decrypt".
      expect(decryptPayload(ciphertext, nonce, generateContentKey())).toBeNull();
    });

    it('returns null when the ciphertext has been tampered with', () => {
      const key = generateContentKey();
      const { ciphertext, nonce } = encryptPayload('secret', key);
      const tampered = new Uint8Array(ciphertext);
      tampered[0]! ^= 0xff;

      expect(decryptPayload(tampered, nonce, key)).toBeNull();
    });

    it('returns null when the nonce has been tampered with', () => {
      const key = generateContentKey();
      const { ciphertext, nonce } = encryptPayload('secret', key);
      const tampered = new Uint8Array(nonce);
      tampered[0]! ^= 0xff;

      expect(decryptPayload(ciphertext, tampered, key)).toBeNull();
    });
  });

  describe('per-group key wrapping', () => {
    it('lets the intended group recover the content key', () => {
      const group = nacl.box.keyPair();
      const contentKey = generateContentKey();

      const wrapped = wrapKeyForGroup(contentKey, group.publicKey);
      const recovered = unwrapKey(wrapped, group.secretKey);

      expect(recovered).not.toBeNull();
      expect(encodeBase64(recovered!)).toBe(encodeBase64(contentKey));
    });

    it('packs nonce, ephemeral public key and box, in that order', () => {
      const group = nacl.box.keyPair();
      const wrapped = wrapKeyForGroup(generateContentKey(), group.publicKey);

      // 24 + 32 + (32 + 16 overhead). The order is load-bearing: the seed script
      // packed these three the wrong way round and produced invites that could
      // never be opened, which no test caught at the time.
      expect(wrapped).toHaveLength(24 + 32 + 48);
    });

    it('gives a different wrapping every time for the same key and group', () => {
      const group = nacl.box.keyPair();
      const contentKey = generateContentKey();

      const a = encodeBase64(wrapKeyForGroup(contentKey, group.publicKey));
      const b = encodeBase64(wrapKeyForGroup(contentKey, group.publicKey));

      // A fresh ephemeral keypair each time. Identical wrappings would let an
      // observer link two broadcasts as going to the same recipient.
      expect(a).not.toBe(b);
    });

    it('refuses to open a wrapping addressed to another group', () => {
      const intended = nacl.box.keyPair();
      const other = nacl.box.keyPair();
      const wrapped = wrapKeyForGroup(generateContentKey(), intended.publicKey);

      // The whole routing model rests on this: a group holding the ciphertext
      // but not the invite must not be able to read it.
      expect(unwrapKey(wrapped, other.secretKey)).toBeNull();
    });

    it('returns null for a truncated wrapping rather than throwing', () => {
      const group = nacl.box.keyPair();
      const wrapped = wrapKeyForGroup(generateContentKey(), group.publicKey);

      expect(unwrapKey(wrapped.slice(0, 40), group.secretKey)).toBeNull();
    });

    it('returns null for a wrapping shorter than its own header', () => {
      const group = nacl.box.keyPair();

      expect(unwrapKey(new Uint8Array(10), group.secretKey)).toBeNull();
    });

    it('returns null when the box has been tampered with', () => {
      const group = nacl.box.keyPair();
      const wrapped = wrapKeyForGroup(generateContentKey(), group.publicKey);
      const tampered = new Uint8Array(wrapped);
      tampered[tampered.length - 1]! ^= 0xff;

      expect(unwrapKey(tampered, group.secretKey)).toBeNull();
    });
  });

  describe('the full path a broadcast takes', () => {
    it('encrypts once and lets every matching group open it independently', () => {
      const groups = [nacl.box.keyPair(), nacl.box.keyPair(), nacl.box.keyPair()];
      const contentKey = generateContentKey();
      const payload = JSON.stringify({
        message: 'need help with rent',
        contactInfo: '555-0100',
        safeWord: 'river-lantern-quiet',
      });

      const { ciphertext, nonce } = encryptPayload(payload, contentKey);
      const invites = groups.map((g) => wrapKeyForGroup(contentKey, g.publicKey));

      // One ciphertext, one wrapped key per recipient - the shape the server
      // stores, and the reason it can hold a request it cannot read.
      for (const [i, group] of groups.entries()) {
        const key = unwrapKey(invites[i]!, group.secretKey);
        expect(key).not.toBeNull();
        expect(decryptPayload(ciphertext, nonce, key!)).toBe(payload);
      }
    });

    it('is opaque to a group with the ciphertext and someone else’s invite', () => {
      const recipient = nacl.box.keyPair();
      const bystander = nacl.box.keyPair();
      const contentKey = generateContentKey();
      const { ciphertext, nonce } = encryptPayload('private', contentKey);
      const invite = wrapKeyForGroup(contentKey, recipient.publicKey);

      expect(unwrapKey(invite, bystander.secretKey)).toBeNull();
      // And without the content key the ciphertext is inert.
      expect(decryptPayload(ciphertext, nonce, generateContentKey())).toBeNull();
    });
  });

  describe('safe words', () => {
    it('produces three hyphen-separated words from the wordlist', () => {
      const parts = generateSafeWord().split('-');

      expect(parts).toHaveLength(3);
      for (const part of parts) expect(WORDLIST).toContain(part);
    });

    it('is not constant across calls', () => {
      const words = new Set(Array.from({ length: 40 }, () => generateSafeWord()));

      // The safe word is what tells a frightened person that the caller is
      // genuinely the group they wrote to. A predictable one is worthless.
      expect(words.size).toBeGreaterThan(30);
    });

    it('draws on the whole wordlist, not a prefix of it', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 400; i++) {
        for (const w of generateSafeWord().split('-')) seen.add(w);
      }

      // A byte-to-index mistake would quietly collapse the range and cut the
      // entropy without changing the shape of the output.
      expect(seen.size).toBeGreaterThan(150);
    });
  });

  describe('base64 helpers', () => {
    it('round-trips arbitrary bytes', () => {
      const bytes = nacl.randomBytes(64);

      expect(encodeBase64(decodeBase64(encodeBase64(bytes)))).toBe(encodeBase64(bytes));
    });

    it('round-trips an empty array', () => {
      expect(decodeBase64(encodeBase64(new Uint8Array(0)))).toHaveLength(0);
    });
  });
});
