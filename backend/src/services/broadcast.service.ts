import { randomBytes } from 'node:crypto';
import { and, isNotNull, isNull, notInArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { broadcasts, broadcastInvites } from '../db/schema/broadcasts.js';
import { groups } from '../db/schema/groups.js';
import { config } from '../config.js';
import type { Executor } from '../db/executor.js';

/**
 * Length of a real wrapped key: nonce(24) + ephemeral public key(32) + box(48).
 * Decoys are random bytes of exactly this length, so the column gives nothing
 * away.
 */
const WRAPPED_KEY_BYTES = 24 + 32 + 48;

/**
 * Pad a broadcast's invites up to config.padInvitesTo with decoys addressed to
 * real groups that did not match.
 *
 * The decoy recipients have to be real, verified, broadcast-capable groups: a
 * group_id that pointed nowhere, or a distribution that favoured certain groups,
 * would identify the decoys as surely as a boolean column would. Which is why
 * there is no `is_dummy` column here, and must not be one - anything that lets
 * the server tell decoys from real invites lets a database reader do the same,
 * and that reader is the entire threat this defends against.
 *
 * The cost is borne by the recipients: a group cannot tell either, so it fetches
 * decoys, fails to unwrap them, and discards them client-side.
 *
 * This does NOT hide the count from Relay at the moment of submission - the real
 * invite list arrives in the request. It hides it from everyone reading the
 * database afterwards, which is the threat model the project actually states.
 */
async function padInvites(
  tx: Executor,
  broadcastId: string,
  realGroupIds: string[],
  expiresAt: Date
): Promise<number> {
  const shortfall = config.padInvitesTo - realGroupIds.length;
  if (shortfall <= 0) return 0;

  const candidates = await tx
    .select({ id: groups.id })
    .from(groups)
    .where(
      and(
        sql`EXISTS (SELECT 1 FROM group_hub_memberships ghm WHERE ghm.group_id = ${groups.id} AND ghm.verification_status = 'verified')`,
        isNotNull(groups.publicKey),
        isNull(groups.deletedAt),
        realGroupIds.length > 0 ? notInArray(groups.id, realGroupIds) : undefined
      )
    )
    // Random, so the decoys for one broadcast are not the same groups as the
    // decoys for the next. A stable set would be learnable over time.
    .orderBy(sql`random()`)
    .limit(shortfall);

  if (candidates.length === 0) return 0;

  await tx.insert(broadcastInvites).values(
    candidates.map((c) => ({
      broadcastId,
      groupId: c.id,
      wrappedKey: randomBytes(WRAPPED_KEY_BYTES),
      // Identical expiry to the real invites. A different TTL would sort the
      // decoys out of the table at a glance.
      expiresAt,
    }))
  );

  return candidates.length;
}

export interface CreateBroadcastInput {
  ciphertextPayload: string; // base64
  nonce: string; // base64
  region: string;
  categories: string[];
  invites: Array<{ groupId: string; wrappedKey: string }>; // wrappedKey is base64
}

/**
 * Create a broadcast and its per-group invites in a single transaction.
 * CRITICAL: No logging, no IP retention, no tracking on this path.
 *
 * @returns broadcastId (first 8 chars of UUID for receipt display)
 */
export async function createBroadcast(
  input: CreateBroadcastInput
): Promise<{ broadcastId: string }> {
  const ciphertextBuffer = Buffer.from(input.ciphertextPayload, 'base64');
  const nonceBuffer = Buffer.from(input.nonce, 'base64');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await db.transaction(async (tx) => {
    // Insert broadcast
    const [broadcast] = await tx
      .insert(broadcasts)
      .values({
        ciphertextPayload: ciphertextBuffer,
        nonce: nonceBuffer,
        region: input.region,
        categories: input.categories as Array<
          | 'food'
          | 'shelter_housing'
          | 'transportation'
          | 'medical'
          | 'safety_escort'
          | 'childcare'
          | 'legal'
          | 'supplies'
          | 'other'
        >,
        expiresAt,
      })
      .returning({ id: broadcasts.id });

    const broadcastId = broadcast!.id;

    // Insert per-group invites
    if (input.invites.length > 0) {
      await tx.insert(broadcastInvites).values(
        input.invites.map((invite) => ({
          broadcastId,
          groupId: invite.groupId,
          wrappedKey: Buffer.from(invite.wrappedKey, 'base64'),
          expiresAt,
        }))
      );
    }

    await padInvites(
      tx,
      broadcastId,
      input.invites.map((i) => i.groupId),
      expiresAt
    );

    return broadcastId;
  });

  return { broadcastId: result };
}
