import { eq, and, lt, sql, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { broadcasts, broadcastInvites, broadcastTombstones } from '../db/schema/broadcasts.js';

const TEN_MINUTES_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000; // Run every minute

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Delete decrypted invites older than 10 minutes.
 * This enforces the 10-minute auto-delete window after a group decrypts an invite.
 */
async function cleanupDecryptedInvites(): Promise<number> {
  const cutoff = new Date(Date.now() - TEN_MINUTES_MS);

  const expired = await db
    .select({
      id: broadcastInvites.id,
      broadcastId: broadcastInvites.broadcastId,
      groupId: broadcastInvites.groupId,
    })
    .from(broadcastInvites)
    .where(
      and(
        eq(broadcastInvites.status, 'decrypted'),
        isNotNull(broadcastInvites.decryptedAt),
        lt(broadcastInvites.decryptedAt, cutoff)
      )
    );

  for (const invite of expired) {
    await deleteInviteAndMaybeCleanupBroadcast(invite.id, invite.broadcastId);
  }

  return expired.length;
}

/**
 * Delete invites that have exceeded their TTL (7 days by default).
 */
async function cleanupExpiredInvites(): Promise<number> {
  const now = new Date();

  const expired = await db
    .select({
      id: broadcastInvites.id,
      broadcastId: broadcastInvites.broadcastId,
      groupId: broadcastInvites.groupId,
    })
    .from(broadcastInvites)
    .where(lt(broadcastInvites.expiresAt, now));

  for (const invite of expired) {
    await deleteInviteAndMaybeCleanupBroadcast(invite.id, invite.broadcastId);
  }

  return expired.length;
}

/**
 * Delete a single invite and clean up the parent broadcast if it was the last one.
 * Runs in a transaction to ensure atomicity.
 */
async function deleteInviteAndMaybeCleanupBroadcast(
  inviteId: string,
  broadcastId: string
): Promise<void> {
  await db.transaction(async (tx) => {
    // Collect all group IDs for this broadcast BEFORE deleting (for tombstone)
    const allInvites = await tx
      .select({ groupId: broadcastInvites.groupId })
      .from(broadcastInvites)
      .where(eq(broadcastInvites.broadcastId, broadcastId));

    const allGroupIds = [...new Set(allInvites.map((i) => i.groupId))];

    // Hard delete the invite
    await tx.delete(broadcastInvites).where(eq(broadcastInvites.id, inviteId));

    // Check remaining invites
    const remainingInvites = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(broadcastInvites)
      .where(eq(broadcastInvites.broadcastId, broadcastId));

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
        .where(eq(broadcasts.id, broadcastId));

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
  });
}

/**
 * Run all cleanup tasks. Called on interval.
 */
async function runCleanup(): Promise<void> {
  try {
    const decryptedCount = await cleanupDecryptedInvites();
    const expiredCount = await cleanupExpiredInvites();

    if (decryptedCount > 0 || expiredCount > 0) {
      console.log(
        `[invite-cleanup] Cleaned up ${decryptedCount} decrypted + ${expiredCount} expired invites`
      );
    }
  } catch (err) {
    // Log but don't crash — cleanup will retry on next interval
    console.error('[invite-cleanup] Error during cleanup:', err);
  }
}

/**
 * Start the periodic invite cleanup scheduler.
 * Runs every 60 seconds by default.
 */
export function startInviteCleanup(): void {
  if (cleanupTimer) return; // Already running

  // Run once immediately on startup
  void runCleanup();

  cleanupTimer = setInterval(() => {
    void runCleanup();
  }, CLEANUP_INTERVAL_MS);

  console.log('[invite-cleanup] Scheduler started (interval: 60s)');
}

/**
 * Stop the cleanup scheduler. Called during graceful shutdown.
 */
export function stopInviteCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('[invite-cleanup] Scheduler stopped');
  }
}
