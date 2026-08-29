import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import nacl from 'tweetnacl';
import { app } from '../app.js';
import { db } from '../db/index.js';
import { groups, broadcastInvites } from '../db/schema/index.js';
import {
  createTestHub,
  createTestGroup,
  createGroupCoordinatorWithSession,
  createHubAdminWithSession,
  createTestBroadcast,
  createTestInvite,
} from '../test/helpers.js';

function keyMaterial() {
  return {
    publicKey: Buffer.from(nacl.box.keyPair().publicKey).toString('base64'),
    keySalt: Buffer.from(nacl.randomBytes(16)).toString('base64'),
  };
}

/**
 * Registering a broadcast key is what makes a group reachable by an anonymous
 * help request. Until this endpoint existed nothing wrote groups.public_key at
 * all, so every group was filtered out of the broadcast directory, no invite was
 * ever created, and an encrypted request could be sent but never opened.
 */
describe('PUT /api/groups/me/broadcast-key', () => {
  it('stores the key material and makes the group broadcast-capable', async () => {
    const hub = await createTestHub();
    const group = await createTestGroup(hub.id, { verificationStatus: 'verified' });
    const { sessionToken } = await createGroupCoordinatorWithSession(hub.id, group.id);
    const material = keyMaterial();

    const response = await request(app)
      .put('/api/groups/me/broadcast-key')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send(material);

    expect(response.status).toBe(200);

    const [row] = await db.select().from(groups).where(eq(groups.id, group.id));
    expect(row!.publicKey?.toString('base64')).toBe(material.publicKey);
    expect(row!.keySalt?.toString('base64')).toBe(material.keySalt);
  });

  it('returns the salt and public key to the coordinator so another device can rederive', async () => {
    const hub = await createTestHub();
    const group = await createTestGroup(hub.id, { verificationStatus: 'verified' });
    const { sessionToken } = await createGroupCoordinatorWithSession(hub.id, group.id);
    const material = keyMaterial();

    await request(app)
      .put('/api/groups/me/broadcast-key')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send(material)
      .expect(200);

    const response = await request(app)
      .get('/api/groups/me')
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(response.status).toBe(200);
    // Without the salt a coordinator cannot unlock anywhere but the browser they
    // first set the passphrase in, and without the public key the UI cannot tell
    // a wrong passphrase from a corrupt invite.
    expect(response.body.group.keySalt).toBe(material.keySalt);
    expect(response.body.group.broadcastPublicKey).toBe(material.publicKey);
  });

  it('does not leak key material through the hub-facing view of the same group', async () => {
    const hub = await createTestHub();
    const group = await createTestGroup(hub.id, { verificationStatus: 'verified' });
    const { sessionToken: coordToken } = await createGroupCoordinatorWithSession(hub.id, group.id);
    await request(app)
      .put('/api/groups/me/broadcast-key')
      .set('Authorization', `Bearer ${coordToken}`)
      .send(keyMaterial())
      .expect(200);

    const { sessionToken: hubToken } = await createHubAdminWithSession(hub.id);
    const response = await request(app)
      .get(`/api/groups/${group.id}`)
      .set('Authorization', `Bearer ${hubToken}`);

    expect(response.status).toBe(200);
    expect(response.body.group.keySalt).toBeUndefined();
    expect(response.body.group.broadcastPublicKey).toBeUndefined();
  });

  it('discards invites wrapped to the previous key when the passphrase changes', async () => {
    const hub = await createTestHub();
    const group = await createTestGroup(hub.id, { verificationStatus: 'verified' });
    const { sessionToken } = await createGroupCoordinatorWithSession(hub.id, group.id);

    await request(app)
      .put('/api/groups/me/broadcast-key')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send(keyMaterial())
      .expect(200);

    const broadcast = await createTestBroadcast();
    await createTestInvite(broadcast.id, group.id);

    const response = await request(app)
      .put('/api/groups/me/broadcast-key')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send(keyMaterial());

    expect(response.status).toBe(200);
    expect(response.body.invitesDiscarded).toBe(1);

    // Those wrapped keys were sealed to the old public key. Leaving them would
    // show the coordinator pending requests that nothing can ever open.
    const remaining = await db
      .select()
      .from(broadcastInvites)
      .where(eq(broadcastInvites.groupId, group.id));
    expect(remaining).toHaveLength(0);
  });

  it('rejects a public key that is not 32 bytes of base64', async () => {
    const hub = await createTestHub();
    const group = await createTestGroup(hub.id, { verificationStatus: 'verified' });
    const { sessionToken } = await createGroupCoordinatorWithSession(hub.id, group.id);

    const response = await request(app)
      .put('/api/groups/me/broadcast-key')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ publicKey: 'too-short', keySalt: keyMaterial().keySalt });

    expect(response.status).toBe(400);
  });

  it('leaves the stored key untouched when the request is rejected', async () => {
    const hub = await createTestHub();
    const group = await createTestGroup(hub.id, { verificationStatus: 'verified' });
    const { sessionToken } = await createGroupCoordinatorWithSession(hub.id, group.id);
    const good = keyMaterial();

    await request(app)
      .put('/api/groups/me/broadcast-key')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send(good)
      .expect(200);

    await request(app)
      .put('/api/groups/me/broadcast-key')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ publicKey: 'nope', keySalt: 'nope' })
      .expect(400);

    const [row] = await db.select().from(groups).where(eq(groups.id, group.id));
    expect(row!.publicKey?.toString('base64')).toBe(good.publicKey);
  });

  it('refuses a hub admin', async () => {
    const hub = await createTestHub();
    const { sessionToken } = await createHubAdminWithSession(hub.id);

    const response = await request(app)
      .put('/api/groups/me/broadcast-key')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send(keyMaterial());

    // Key custody belongs to the group, not to the hub that verifies it. A hub
    // admin who could set it could read that group's help requests.
    expect(response.status).toBe(403);
  });

  it('requires a session', async () => {
    const response = await request(app).put('/api/groups/me/broadcast-key').send(keyMaterial());

    expect(response.status).toBe(401);
  });
});

describe('GET /api/groups/me', () => {
  it('reports no key material before a passphrase is set', async () => {
    const hub = await createTestHub();
    const group = await createTestGroup(hub.id, { verificationStatus: 'verified' });
    const { sessionToken } = await createGroupCoordinatorWithSession(hub.id, group.id);

    const response = await request(app)
      .get('/api/groups/me')
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(response.status).toBe(200);
    expect(response.body.group.keySalt).toBeNull();
    expect(response.body.group.broadcastPublicKey).toBeNull();
  });

  it('resolves the coordinator group without being told its id', async () => {
    const hub = await createTestHub();
    const group = await createTestGroup(hub.id, { verificationStatus: 'verified' });
    const { sessionToken } = await createGroupCoordinatorWithSession(hub.id, group.id);

    const response = await request(app)
      .get('/api/groups/me')
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(response.body.group.id).toBe(group.id);
    // /me must not be parsed as a uuid by the /:id route sitting below it.
    expect(response.body.error).toBeUndefined();
  });
});
