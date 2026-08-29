import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import nacl from 'tweetnacl';
import { app } from '../app.js';
import { db } from '../db/index.js';
import { groups, broadcasts, broadcastInvites } from '../db/schema/index.js';
import { config } from '../config.js';
import { createTestHub, createTestGroup } from '../test/helpers.js';
import { deleteInvite } from '../services/invite.service.js';

/**
 * The number of invite rows for a broadcast used to be the number of groups that
 * matched its region and categories, readable by anyone holding the database. In
 * an area served by one group that named the recipient.
 *
 * Broadcasts are now padded with decoys addressed to real groups that did not
 * match. Nothing marks a decoy - by design, since anything the server could use
 * to tell them apart would serve a database reader equally well.
 */
async function broadcastCapableGroup(hubId: string, name: string) {
  const group = await createTestGroup(hubId, {
    name,
    contactEmail: `${name.replace(/\s+/g, '-').toLowerCase()}@test.org`,
    verificationStatus: 'verified',
  });
  await db
    .update(groups)
    .set({
      publicKey: Buffer.from(nacl.box.keyPair().publicKey),
      keySalt: Buffer.from(nacl.randomBytes(16)),
      broadcastServiceArea: 'Testville',
      broadcastCategories: ['food'],
    })
    .where(eq(groups.id, group.id));
  return group;
}

function submitBody(inviteGroupIds: string[]) {
  return {
    ciphertextPayload: Buffer.from(nacl.randomBytes(80)).toString('base64'),
    nonce: Buffer.from(nacl.randomBytes(24)).toString('base64'),
    region: 'Testville',
    categories: ['food'],
    invites: inviteGroupIds.map((groupId) => ({
      groupId,
      // Real wrapped keys are nonce(24) + ephemeral public key(32) + box(48).
      wrappedKey: Buffer.from(nacl.randomBytes(104)).toString('base64'),
    })),
    honeypot: '',
    elapsed: 5000,
  };
}

describe('POST /api/broadcasts invite padding', () => {
  let hubId: string;

  beforeEach(async () => {
    const hub = await createTestHub();
    hubId = hub.id;
  });

  it('pads a single-recipient broadcast up to the configured floor', async () => {
    const recipient = await broadcastCapableGroup(hubId, 'Recipient Group');
    for (let i = 0; i < 10; i++) {
      await broadcastCapableGroup(hubId, `Bystander ${i}`);
    }

    const response = await request(app)
      .post('/api/broadcasts')
      .send(submitBody([recipient.id]));
    expect(response.status).toBe(201);

    const invites = await db.select().from(broadcastInvites);

    // The row count must not be 1. One row for a region served by one group is
    // the leak this exists to close.
    expect(invites).toHaveLength(config.padInvitesTo);
  });

  it('gives decoys the same shape as real invites', async () => {
    const recipient = await broadcastCapableGroup(hubId, 'Recipient Group');
    for (let i = 0; i < 10; i++) {
      await broadcastCapableGroup(hubId, `Bystander ${i}`);
    }

    await request(app)
      .post('/api/broadcasts')
      .send(submitBody([recipient.id]))
      .expect(201);

    const invites = await db.select().from(broadcastInvites);
    const expiries = new Set(invites.map((i) => i.expiresAt.getTime()));

    // Nothing sorts the decoys out at a glance: same wrapped key length, same
    // status, same expiry, and every group_id points at a real group.
    for (const invite of invites) {
      expect(invite.wrappedKey).toHaveLength(104);
      expect(invite.status).toBe('pending');
      expect(invite.decryptedAt).toBeNull();
    }
    expect(expiries.size).toBe(1);

    const realGroupIds = new Set(
      (await db.select({ id: groups.id }).from(groups)).map((g) => g.id)
    );
    for (const invite of invites) {
      expect(realGroupIds.has(invite.groupId)).toBe(true);
    }
  });

  it('never truncates when more groups match than the floor', async () => {
    const recipients = [];
    for (let i = 0; i < config.padInvitesTo + 4; i++) {
      recipients.push(await broadcastCapableGroup(hubId, `Recipient ${i}`));
    }

    await request(app)
      .post('/api/broadcasts')
      .send(submitBody(recipients.map((r) => r.id)))
      .expect(201);

    const invites = await db.select().from(broadcastInvites);

    // Dropping a real recipient would mean a person's request silently not
    // reaching a group that serves them - far worse than the count leaking.
    expect(invites).toHaveLength(recipients.length);
    const invited = new Set(invites.map((i) => i.groupId));
    for (const r of recipients) expect(invited.has(r.id)).toBe(true);
  });

  it('still delivers to the real recipient', async () => {
    const recipient = await broadcastCapableGroup(hubId, 'Recipient Group');
    for (let i = 0; i < 10; i++) {
      await broadcastCapableGroup(hubId, `Bystander ${i}`);
    }

    const body = submitBody([recipient.id]);
    await request(app).post('/api/broadcasts').send(body).expect(201);

    const [theirs] = await db
      .select()
      .from(broadcastInvites)
      .where(eq(broadcastInvites.groupId, recipient.id));

    // Padding must not disturb the one invite that carries a real wrapped key.
    expect(theirs).toBeDefined();
    expect(theirs!.wrappedKey!.toString('base64')).toBe(body.invites[0]!.wrappedKey);
  });

  it('pads with as many groups as exist when there are too few to reach the floor', async () => {
    const recipient = await broadcastCapableGroup(hubId, 'Recipient Group');
    await broadcastCapableGroup(hubId, 'Only Other Group');

    await request(app)
      .post('/api/broadcasts')
      .send(submitBody([recipient.id]))
      .expect(201);

    const invites = await db.select().from(broadcastInvites);

    // A small directory cannot reach the floor. Padding with what exists is
    // still better than not padding, and must not fail the submission.
    expect(invites.length).toBeGreaterThan(1);
    expect(invites.length).toBeLessThanOrEqual(config.padInvitesTo);
  });

  it('does not use a group that is unverified or has no broadcast key as a decoy', async () => {
    const recipient = await broadcastCapableGroup(hubId, 'Recipient Group');
    const unverified = await createTestGroup(hubId, {
      name: 'Unverified Group',
      contactEmail: 'unverified@test.org',
      verificationStatus: 'pending',
    });
    const keyless = await createTestGroup(hubId, {
      name: 'Keyless Group',
      contactEmail: 'keyless@test.org',
      verificationStatus: 'verified',
    });

    await request(app)
      .post('/api/broadcasts')
      .send(submitBody([recipient.id]))
      .expect(201);

    const invited = new Set((await db.select().from(broadcastInvites)).map((i) => i.groupId));

    // Decoys have to be drawn from the same population a real recipient comes
    // from. A decoy addressed to a group that could never have received a
    // broadcast identifies itself.
    expect(invited.has(unverified.id)).toBe(false);
    expect(invited.has(keyless.id)).toBe(false);
  });

  it('varies which groups are used as decoys between broadcasts', async () => {
    const recipient = await broadcastCapableGroup(hubId, 'Recipient Group');
    for (let i = 0; i < 14; i++) {
      await broadcastCapableGroup(hubId, `Bystander ${i}`);
    }

    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/broadcasts')
        .send(submitBody([recipient.id]))
        .expect(201);
    }
    for (const invite of await db.select().from(broadcastInvites)) {
      if (invite.groupId !== recipient.id) seen.add(invite.groupId);
    }

    // A fixed decoy set would be learnable: the group that appears on every
    // broadcast is the one that never really matched.
    expect(seen.size).toBeGreaterThan(config.padInvitesTo - 1);
  });
  it('keeps the ciphertext alive until TTL once decoys are present', async () => {
    const recipient = await broadcastCapableGroup(hubId, 'Recipient Group');
    for (let i = 0; i < 10; i++) {
      await broadcastCapableGroup(hubId, `Bystander ${i}`);
    }

    await request(app)
      .post('/api/broadcasts')
      .send(submitBody([recipient.id]))
      .expect(201);

    const [broadcast] = await db.select().from(broadcasts);
    const [theirs] = await db
      .select()
      .from(broadcastInvites)
      .where(eq(broadcastInvites.groupId, recipient.id));

    // The real recipient confirms and their invite goes.
    await deleteInvite(theirs!.id);

    // The ciphertext does NOT go with it, and this is the cost of padding.
    //
    // Deletion is triggered by the last invite for a broadcast disappearing.
    // Decoys are never confirmed by anyone - nobody can open them - so they
    // survive to the 7-day TTL and hold the broadcast open behind them. Before
    // padding, a single-recipient broadcast was destroyed the moment that
    // recipient confirmed.
    //
    // It cannot be fixed by resolving decoys sooner: anything that let the
    // server retire them early would let a database reader pick them out, which
    // is the whole thing padding exists to prevent. Asserted here so the
    // tradeoff is visible rather than discovered.
    const remaining = await db.select().from(broadcasts).where(eq(broadcasts.id, broadcast!.id));
    expect(remaining).toHaveLength(1);

    const survivors = await db
      .select()
      .from(broadcastInvites)
      .where(eq(broadcastInvites.broadcastId, broadcast!.id));
    expect(survivors.length).toBeGreaterThan(0);
    expect(survivors.every((i) => i.groupId !== recipient.id)).toBe(true);
  });
});
