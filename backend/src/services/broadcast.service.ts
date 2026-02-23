import { db } from '../db/index.js';
import { broadcasts, broadcastInvites } from '../db/schema/broadcasts.js';

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

    return broadcastId;
  });

  return { broadcastId: result };
}
