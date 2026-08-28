import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { broadcasts, broadcastInvites, broadcastTombstones } from '../db/schema/broadcasts.js';
import { cleanupDecryptedInvites, cleanupExpiredInvites } from './invite-cleanup.service.js';
import { deleteInvite } from './invite.service.js';
import {
  createTestHub,
  createTestGroup,
  createTestBroadcast,
  createTestInvite,
  TestHub,
  TestGroup,
} from '../test/helpers.js';

/**
 * These cover the deletion guarantees Relay states publicly:
 *
 *   "Per-group invites deleted after confirmation or TTL expiry; ciphertext
 *    deleted when all invites resolved"
 *   "If subpoenaed, Relay has nothing useful to provide"
 *
 * Nothing proved any of that happened before now. A silent failure here means
 * retained material the threat model says should not exist, which is the whole
 * product rather than a detail of it.
 */
describe('broadcast invite lifecycle', () => {
  let hub: TestHub;
  let groupA: TestGroup;
  let groupB: TestGroup;

  beforeEach(async () => {
    hub = await createTestHub();
    groupA = await createTestGroup(hub.id, { name: 'Group A' });
    groupB = await createTestGroup(hub.id, { name: 'Group B' });
  });

  async function inviteCount(broadcastId: string): Promise<number> {
    const rows = await db
      .select()
      .from(broadcastInvites)
      .where(eq(broadcastInvites.broadcastId, broadcastId));
    return rows.length;
  }

  async function broadcastExists(broadcastId: string): Promise<boolean> {
    const rows = await db.select().from(broadcasts).where(eq(broadcasts.id, broadcastId));
    return rows.length > 0;
  }

  describe('the 10-minute window after decryption', () => {
    it('deletes an invite decrypted more than 10 minutes ago', async () => {
      const broadcast = await createTestBroadcast();
      await createTestInvite(broadcast.id, groupA.id, {
        status: 'decrypted',
        decryptedAt: new Date(Date.now() - 11 * 60 * 1000),
      });

      const deleted = await cleanupDecryptedInvites();

      expect(deleted).toBe(1);
      expect(await inviteCount(broadcast.id)).toBe(0);
    });

    it('leaves an invite decrypted within the last 10 minutes alone', async () => {
      const broadcast = await createTestBroadcast();
      await createTestInvite(broadcast.id, groupA.id, {
        status: 'decrypted',
        decryptedAt: new Date(Date.now() - 60 * 1000),
      });

      const deleted = await cleanupDecryptedInvites();

      expect(deleted).toBe(0);
      expect(await inviteCount(broadcast.id)).toBe(1);
    });

    it('leaves a pending invite alone however old it is', async () => {
      const broadcast = await createTestBroadcast();
      // Pending means no group has opened it yet, so the 10-minute window has
      // not started. Only TTL expiry should remove this.
      await createTestInvite(broadcast.id, groupA.id, { status: 'pending' });

      expect(await cleanupDecryptedInvites()).toBe(0);
      expect(await inviteCount(broadcast.id)).toBe(1);
    });
  });

  describe('TTL expiry', () => {
    it('deletes an invite past its expiry', async () => {
      const broadcast = await createTestBroadcast();
      await createTestInvite(broadcast.id, groupA.id, {
        expiresAt: new Date(Date.now() - 1000),
      });

      const deleted = await cleanupExpiredInvites();

      expect(deleted).toBe(1);
      expect(await inviteCount(broadcast.id)).toBe(0);
    });

    it('leaves an unexpired invite alone', async () => {
      const broadcast = await createTestBroadcast();
      await createTestInvite(broadcast.id, groupA.id, {
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      expect(await cleanupExpiredInvites()).toBe(0);
      expect(await inviteCount(broadcast.id)).toBe(1);
    });

    it('deletes an expired invite even if it was never decrypted', async () => {
      const broadcast = await createTestBroadcast();
      await createTestInvite(broadcast.id, groupA.id, {
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000),
      });

      expect(await cleanupExpiredInvites()).toBe(1);
      expect(await inviteCount(broadcast.id)).toBe(0);
    });
  });

  describe('ciphertext removal once all invites resolve', () => {
    it('deletes the broadcast when its last invite goes', async () => {
      const broadcast = await createTestBroadcast();
      await createTestInvite(broadcast.id, groupA.id, {
        expiresAt: new Date(Date.now() - 1000),
      });

      expect(await broadcastExists(broadcast.id)).toBe(true);

      await cleanupExpiredInvites();

      // The ciphertext is the thing a subpoena would reach. It has to be gone,
      // not soft-deleted.
      expect(await broadcastExists(broadcast.id)).toBe(false);
    });

    it('keeps the broadcast while any invite remains', async () => {
      const broadcast = await createTestBroadcast();
      await createTestInvite(broadcast.id, groupA.id, {
        expiresAt: new Date(Date.now() - 1000),
      });
      await createTestInvite(broadcast.id, groupB.id, {
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      await cleanupExpiredInvites();

      expect(await inviteCount(broadcast.id)).toBe(1);
      expect(await broadcastExists(broadcast.id)).toBe(true);
    });

    it('deletes the broadcast once the remaining invite also resolves', async () => {
      const broadcast = await createTestBroadcast();
      const inviteA = await createTestInvite(broadcast.id, groupA.id);
      const inviteB = await createTestInvite(broadcast.id, groupB.id);

      await deleteInvite(inviteA);
      expect(await broadcastExists(broadcast.id)).toBe(true);

      await deleteInvite(inviteB);
      expect(await broadcastExists(broadcast.id)).toBe(false);
    });

    it('writes exactly one tombstone when the broadcast is cleaned up', async () => {
      const broadcast = await createTestBroadcast({ region: 'Marion County' });
      await createTestInvite(broadcast.id, groupA.id, {
        expiresAt: new Date(Date.now() - 1000),
      });

      await cleanupExpiredInvites();

      const tombstones = await db
        .select()
        .from(broadcastTombstones)
        .where(eq(broadcastTombstones.originalBroadcastId, broadcast.id));

      expect(tombstones).toHaveLength(1);
      expect(tombstones[0]?.region).toBe('Marion County');
    });

    it('records only the last group in the tombstone, not every recipient', async () => {
      const broadcast = await createTestBroadcast();
      const inviteA = await createTestInvite(broadcast.id, groupA.id);
      const inviteB = await createTestInvite(broadcast.id, groupB.id);

      await deleteInvite(inviteA);
      await deleteInvite(inviteB);

      const [tombstone] = await db
        .select()
        .from(broadcastTombstones)
        .where(eq(broadcastTombstones.originalBroadcastId, broadcast.id));

      // KNOWN DEFECT, tracked in #31. Both deletion paths collect "all group ids
      // for this broadcast" before deleting the current invite - but by the time
      // the last invite is removed, the earlier ones are already gone, so the
      // tombstone records only the final group rather than every recipient.
      // Pinned as current behaviour rather than asserted as correct. Note the
      // error runs in the privacy-preserving direction, which is why it went
      // unnoticed. Fixing #31 will make this fail; expect [groupA, groupB] then.
      expect(tombstone?.groupIds).toEqual([groupB.id]);
    });
  });

  describe('deleteInvite, the confirm-receipt path', () => {
    it('removes the invite and reports success', async () => {
      const broadcast = await createTestBroadcast();
      const invite = await createTestInvite(broadcast.id, groupA.id);

      expect(await deleteInvite(invite)).toBe(true);
      expect(await inviteCount(broadcast.id)).toBe(0);
    });

    it('reports failure for an invite that no longer exists', async () => {
      expect(await deleteInvite('00000000-0000-0000-0000-000000000000')).toBe(false);
    });

    it('does not touch invites belonging to other broadcasts', async () => {
      const first = await createTestBroadcast();
      const second = await createTestBroadcast();
      const inviteOnFirst = await createTestInvite(first.id, groupA.id);
      await createTestInvite(second.id, groupB.id);

      await deleteInvite(inviteOnFirst);

      expect(await broadcastExists(second.id)).toBe(true);
      expect(await inviteCount(second.id)).toBe(1);
    });
  });
});
