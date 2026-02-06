import { eq, and, isNull, arrayContains } from 'drizzle-orm';
import { db } from '../db/index.js';
import { mailboxes, mailboxMessages, mailboxTombstones } from '../db/schema/mailboxes.js';
import { groups } from '../db/schema/groups.js';
import type {
  CreateMailboxInput,
  MailboxResponse,
  MailboxMessageResponse,
  HelpRequestResponse,
  PublicKeyResponse,
  TombstoneResponse,
  AidCategory,
} from '../validations/mailbox.validation.js';

/**
 * Look up a mailbox by its public key (derived from passphrase).
 * Used when an individual enters their passphrase on a new device.
 * CRITICAL: No logging, no IP retention, no tracking.
 */
export async function getMailboxByPublicKey(publicKey: string): Promise<{ id: string } | null> {
  const publicKeyBuffer = Buffer.from(publicKey, 'base64');

  const [mailbox] = await db
    .select({ id: mailboxes.id })
    .from(mailboxes)
    .where(and(eq(mailboxes.publicKey, publicKeyBuffer), isNull(mailboxes.deletedAt)));

  return mailbox ?? null;
}

/**
 * Create a new anonymous mailbox
 * CRITICAL: No logging, no IP retention, no tracking
 */
export async function createMailbox(input: CreateMailboxInput): Promise<{ id: string }> {
  const publicKeyBuffer = Buffer.from(input.publicKey, 'base64');

  const [inserted] = await db
    .insert(mailboxes)
    .values({
      publicKey: publicKeyBuffer,
      helpCategory: input.helpCategory,
      region: input.region,
    })
    .returning({ id: mailboxes.id });

  // Insert always returns a row
  return { id: inserted!.id };
}

/**
 * Get mailbox with messages
 * Side effect: Updates last_accessed_at timestamp
 */
export async function getMailbox(mailboxId: string): Promise<MailboxResponse | null> {
  // Update last_accessed_at and get mailbox in one query
  const [mailbox] = await db
    .update(mailboxes)
    .set({ lastAccessedAt: new Date() })
    .where(and(eq(mailboxes.id, mailboxId), isNull(mailboxes.deletedAt)))
    .returning({
      id: mailboxes.id,
      helpCategory: mailboxes.helpCategory,
      region: mailboxes.region,
      createdAt: mailboxes.createdAt,
    });

  if (!mailbox) {
    return null;
  }

  // Fetch messages with group names
  const messages = await db
    .select({
      id: mailboxMessages.id,
      groupId: mailboxMessages.groupId,
      groupName: groups.name,
      ciphertext: mailboxMessages.ciphertext,
      createdAt: mailboxMessages.createdAt,
    })
    .from(mailboxMessages)
    .innerJoin(groups, eq(mailboxMessages.groupId, groups.id))
    .where(eq(mailboxMessages.mailboxId, mailboxId))
    .orderBy(mailboxMessages.createdAt);

  const messageResponses: MailboxMessageResponse[] = messages.map((msg) => ({
    id: msg.id,
    groupId: msg.groupId,
    groupName: msg.groupName,
    ciphertext: msg.ciphertext ? msg.ciphertext.toString('base64') : '',
    createdAt: msg.createdAt.toISOString(),
  }));

  return {
    id: mailbox.id,
    helpCategory: mailbox.helpCategory as AidCategory,
    region: mailbox.region,
    createdAt: mailbox.createdAt.toISOString(),
    messages: messageResponses,
  };
}

/**
 * Delete mailbox (manual deletion by user)
 * Creates tombstone, then hard deletes messages and mailbox
 */
export async function deleteMailbox(mailboxId: string): Promise<boolean> {
  return await db.transaction(async (tx) => {
    // Get mailbox data for tombstone
    const [mailbox] = await tx
      .select({
        id: mailboxes.id,
        helpCategory: mailboxes.helpCategory,
        region: mailboxes.region,
        createdAt: mailboxes.createdAt,
      })
      .from(mailboxes)
      .where(and(eq(mailboxes.id, mailboxId), isNull(mailboxes.deletedAt)));

    if (!mailbox) {
      return false;
    }

    // Check if there were any responses
    const messagesResult = await tx
      .select({ groupId: mailboxMessages.groupId })
      .from(mailboxMessages)
      .where(eq(mailboxMessages.mailboxId, mailboxId));

    const hadResponses = messagesResult.length > 0;
    const respondingGroupIds = [...new Set(messagesResult.map((m) => m.groupId))];

    // Create tombstone
    await tx.insert(mailboxTombstones).values({
      originalMailboxId: mailbox.id,
      helpCategory: mailbox.helpCategory,
      region: mailbox.region,
      hadResponses,
      respondingGroupIds: respondingGroupIds.length > 0 ? respondingGroupIds : null,
      deletionType: 'manual',
      createdAt: mailbox.createdAt,
    });

    // Hard delete messages (cascade should handle this, but be explicit)
    await tx.delete(mailboxMessages).where(eq(mailboxMessages.mailboxId, mailboxId));

    // Hard delete mailbox
    await tx.delete(mailboxes).where(eq(mailboxes.id, mailboxId));

    return true;
  });
}

/**
 * List open mailboxes matching a region
 * For group coordinators to see help requests in their service area
 */
export async function listHelpRequests(
  region: string,
  category?: AidCategory
): Promise<HelpRequestResponse[]> {
  const conditions = [eq(mailboxes.region, region), isNull(mailboxes.deletedAt)];

  if (category) {
    conditions.push(eq(mailboxes.helpCategory, category));
  }

  const results = await db
    .select({
      mailboxId: mailboxes.id,
      helpCategory: mailboxes.helpCategory,
      region: mailboxes.region,
      createdAt: mailboxes.createdAt,
    })
    .from(mailboxes)
    .where(and(...conditions))
    .orderBy(mailboxes.createdAt);

  return results.map((r) => ({
    mailboxId: r.mailboxId,
    helpCategory: r.helpCategory as AidCategory,
    region: r.region,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Get public key for a specific mailbox
 * Used by groups to encrypt their replies
 */
export async function getMailboxPublicKey(
  mailboxId: string,
  region: string
): Promise<PublicKeyResponse | null> {
  const [mailbox] = await db
    .select({
      publicKey: mailboxes.publicKey,
      region: mailboxes.region,
    })
    .from(mailboxes)
    .where(and(eq(mailboxes.id, mailboxId), isNull(mailboxes.deletedAt)));

  if (!mailbox) {
    return null;
  }

  // Verify group has access (matching service area)
  if (mailbox.region !== region) {
    return null;
  }

  return {
    publicKey: mailbox.publicKey ? mailbox.publicKey.toString('base64') : '',
  };
}

/**
 * Send encrypted reply to a mailbox
 */
export async function sendReply(
  mailboxId: string,
  groupId: string,
  groupServiceArea: string,
  ciphertext: string
): Promise<{ id: string } | null> {
  // Verify mailbox exists and matches group's service area
  const [mailbox] = await db
    .select({
      id: mailboxes.id,
      region: mailboxes.region,
    })
    .from(mailboxes)
    .where(and(eq(mailboxes.id, mailboxId), isNull(mailboxes.deletedAt)));

  if (!mailbox) {
    return null;
  }

  // Verify group has access (matching service area)
  if (mailbox.region !== groupServiceArea) {
    return null;
  }

  const ciphertextBuffer = Buffer.from(ciphertext, 'base64');

  const [inserted] = await db
    .insert(mailboxMessages)
    .values({
      mailboxId,
      groupId,
      ciphertext: ciphertextBuffer,
    })
    .returning({ id: mailboxMessages.id });

  // Insert always returns a row
  return { id: inserted!.id };
}

/**
 * Get tombstones for mailboxes a group responded to
 */
export async function getGroupTombstones(groupId: string): Promise<TombstoneResponse[]> {
  const results = await db
    .select({
      helpCategory: mailboxTombstones.helpCategory,
      region: mailboxTombstones.region,
      deletedAt: mailboxTombstones.deletedAt,
      deletionType: mailboxTombstones.deletionType,
    })
    .from(mailboxTombstones)
    .where(arrayContains(mailboxTombstones.respondingGroupIds, [groupId]))
    .orderBy(mailboxTombstones.deletedAt);

  return results.map((r) => ({
    helpCategory: r.helpCategory as AidCategory,
    region: r.region,
    deletedAt: r.deletedAt.toISOString(),
    deletionType: r.deletionType as 'manual' | 'auto_inactivity',
  }));
}

/**
 * Auto-delete inactive mailboxes
 * Called by scheduled job
 */
export async function deleteInactiveMailboxes(inactivityDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactivityDays);

  // Find inactive mailboxes
  const inactiveMailboxes = await db
    .select({ id: mailboxes.id })
    .from(mailboxes)
    .where(
      and(
        isNull(mailboxes.deletedAt),
        eq(mailboxes.lastAccessedAt, mailboxes.lastAccessedAt) // placeholder for lt
      )
    );

  // For now, we'll use a raw SQL approach for the date comparison
  // This is a simplified version - in production you'd use proper date comparison
  let deletedCount = 0;

  for (const mailbox of inactiveMailboxes) {
    // Get full mailbox data
    const [fullMailbox] = await db.select().from(mailboxes).where(eq(mailboxes.id, mailbox.id));

    if (fullMailbox && fullMailbox.lastAccessedAt < cutoffDate) {
      await db.transaction(async (tx) => {
        // Check if there were any responses
        const messagesResult = await tx
          .select({ groupId: mailboxMessages.groupId })
          .from(mailboxMessages)
          .where(eq(mailboxMessages.mailboxId, mailbox.id));

        const hadResponses = messagesResult.length > 0;
        const respondingGroupIds = [...new Set(messagesResult.map((m) => m.groupId))];

        // Create tombstone
        await tx.insert(mailboxTombstones).values({
          originalMailboxId: mailbox.id,
          helpCategory: fullMailbox.helpCategory,
          region: fullMailbox.region,
          hadResponses,
          respondingGroupIds: respondingGroupIds.length > 0 ? respondingGroupIds : null,
          deletionType: 'auto_inactivity',
          createdAt: fullMailbox.createdAt,
        });

        // Hard delete messages
        await tx.delete(mailboxMessages).where(eq(mailboxMessages.mailboxId, mailbox.id));

        // Hard delete mailbox
        await tx.delete(mailboxes).where(eq(mailboxes.id, mailbox.id));

        deletedCount++;
      });
    }
  }

  return deletedCount;
}
