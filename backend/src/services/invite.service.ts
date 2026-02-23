import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { broadcasts, broadcastInvites, broadcastTombstones } from '../db/schema/broadcasts.js';

export interface InviteResponse {
  inviteId: string;
  broadcastId: string;
  wrappedKey: string; // base64
  region: string;
  categories: string[];
  createdAt: string;
  expiresAt: string;
}

/**
 * Get pending invites for a group.
 * Joins with broadcasts for routing metadata.
 */
export async function getInvitesForGroup(groupId: string): Promise<InviteResponse[]> {
  const results = await db
    .select({
      inviteId: broadcastInvites.id,
      broadcastId: broadcastInvites.broadcastId,
      wrappedKey: broadcastInvites.wrappedKey,
      region: broadcasts.region,
      categories: broadcasts.categories,
      createdAt: broadcastInvites.createdAt,
      expiresAt: broadcastInvites.expiresAt,
    })
    .from(broadcastInvites)
    .innerJoin(broadcasts, eq(broadcastInvites.broadcastId, broadcasts.id))
    .where(and(eq(broadcastInvites.groupId, groupId), eq(broadcastInvites.status, 'pending')))
    .orderBy(broadcastInvites.createdAt);

  return results.map((r) => ({
    inviteId: r.inviteId,
    broadcastId: r.broadcastId,
    wrappedKey: r.wrappedKey ? r.wrappedKey.toString('base64') : '',
    region: r.region,
    categories: r.categories,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));
}

/**
 * Get the ciphertext and nonce for a broadcast.
 * Used when a group wants to decrypt an invite.
 */
export async function getCiphertextForBroadcast(
  broadcastId: string
): Promise<{ ciphertextPayload: string; nonce: string } | null> {
  const [result] = await db
    .select({
      ciphertextPayload: broadcasts.ciphertextPayload,
      nonce: broadcasts.nonce,
    })
    .from(broadcasts)
    .where(eq(broadcasts.id, broadcastId));

  if (!result) return null;

  return {
    ciphertextPayload: result.ciphertextPayload ? result.ciphertextPayload.toString('base64') : '',
    nonce: result.nonce ? result.nonce.toString('base64') : '',
  };
}

/**
 * Mark an invite as decrypted. Starts the 10-minute auto-delete countdown.
 */
export async function markInviteDecrypted(inviteId: string): Promise<boolean> {
  const [updated] = await db
    .update(broadcastInvites)
    .set({
      status: 'decrypted',
      decryptedAt: new Date(),
    })
    .where(and(eq(broadcastInvites.id, inviteId), eq(broadcastInvites.status, 'pending')))
    .returning({ id: broadcastInvites.id });

  return !!updated;
}

/**
 * Hard delete an invite.
 * If this was the last invite for the broadcast, clean up the broadcast too.
 */
export async function deleteInvite(inviteId: string): Promise<boolean> {
  return await db.transaction(async (tx) => {
    // Get invite data before deletion
    const [invite] = await tx
      .select({
        id: broadcastInvites.id,
        broadcastId: broadcastInvites.broadcastId,
        groupId: broadcastInvites.groupId,
      })
      .from(broadcastInvites)
      .where(eq(broadcastInvites.id, inviteId));

    if (!invite) return false;

    // Collect all group IDs for this broadcast BEFORE deleting (for tombstone)
    const allInvites = await tx
      .select({ groupId: broadcastInvites.groupId })
      .from(broadcastInvites)
      .where(eq(broadcastInvites.broadcastId, invite.broadcastId));

    const allGroupIds = [...new Set(allInvites.map((i) => i.groupId))];

    // Hard delete the invite
    await tx.delete(broadcastInvites).where(eq(broadcastInvites.id, inviteId));

    // Check if this was the last invite for the broadcast
    const remainingInvites = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(broadcastInvites)
      .where(eq(broadcastInvites.broadcastId, invite.broadcastId));

    const remaining = remainingInvites[0]?.count ?? 0;

    if (remaining === 0) {
      // All invites resolved — create tombstone and delete broadcast
      const [broadcast] = await tx
        .select({
          id: broadcasts.id,
          region: broadcasts.region,
          categories: broadcasts.categories,
        })
        .from(broadcasts)
        .where(eq(broadcasts.id, invite.broadcastId));

      if (broadcast) {
        await tx.insert(broadcastTombstones).values({
          originalBroadcastId: broadcast.id,
          region: broadcast.region,
          categories: broadcast.categories,
          groupIds: allGroupIds,
          deletedAt: new Date(),
        });

        // Hard delete the broadcast (ciphertext gone forever)
        await tx.delete(broadcasts).where(eq(broadcasts.id, broadcast.id));
      }
    }

    return true;
  });
}
