import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { db } from '../db/index.js';
import { app } from '../app.js';
import { verificationRequests } from '../db/schema/index.js';
import {
  createTestHub,
  createTestGroup,
  createGroupCoordinatorWithSession,
} from '../test/helpers.js';

/**
 * Peer attestation is one of the three verification methods the project accepts,
 * and the only one that does not require a hub admin to act. It was unreachable:
 * the endpoint required a hubId off the session, and only hub staff ever have
 * one, so a group coordinator - the only role allowed to attest - was rejected
 * every time.
 */
describe('GET /api/verification/attestation-requests', () => {
  it('answers a group coordinator instead of rejecting them', async () => {
    const hub = await createTestHub();
    const group = await createTestGroup(hub.id, {
      name: 'Attesting Group',
      verificationStatus: 'verified',
    });
    const { sessionToken } = await createGroupCoordinatorWithSession(hub.id, group.id);

    const response = await request(app)
      .get('/api/verification/attestation-requests')
      .set('Authorization', `Bearer ${sessionToken}`);

    // The regression: this was a 400 'User is not associated with a group' for
    // every coordinator who ever loaded the page, because a coordinator is group
    // staff and never hub staff, so session.hubId is always null.
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.requests)).toBe(true);
  });

  it('returns a pending request from another group in the same hub', async () => {
    const hub = await createTestHub();
    const attesting = await createTestGroup(hub.id, {
      name: 'Attesting Group',
      contactEmail: 'attesting@test.org',
      verificationStatus: 'verified',
    });
    const applicant = await createTestGroup(hub.id, {
      name: 'Applicant Group',
      contactEmail: 'applicant@test.org',
    });
    await db.insert(verificationRequests).values({
      groupId: applicant.id,
      hubId: hub.id,
      method: 'peer_attestation',
      status: 'pending',
    });

    const { sessionToken } = await createGroupCoordinatorWithSession(hub.id, attesting.id);

    const response = await request(app)
      .get('/api/verification/attestation-requests')
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(response.status).toBe(200);
    // Asserting on the contents, not just the status: resolving the hub from the
    // wrong side would still return 200, just always empty.
    expect(response.body.requests).toHaveLength(1);
    expect(response.body.requests[0].groupName).toBe('Applicant Group');
  });

  it('does not offer a group its own request to attest to', async () => {
    const hub = await createTestHub();
    const group = await createTestGroup(hub.id, { verificationStatus: 'pending' });
    await db.insert(verificationRequests).values({
      groupId: group.id,
      hubId: hub.id,
      method: 'peer_attestation',
      status: 'pending',
    });

    const { sessionToken } = await createGroupCoordinatorWithSession(hub.id, group.id);

    const response = await request(app)
      .get('/api/verification/attestation-requests')
      .set('Authorization', `Bearer ${sessionToken}`);

    // Self-attestation would make peer vouching worthless.
    expect(response.status).toBe(200);
    expect(response.body.requests).toHaveLength(0);
  });

  it('does not leak a pending request from a different hub', async () => {
    const ourHub = await createTestHub({ name: 'Our Hub', contactEmail: 'ours@test.org' });
    const otherHub = await createTestHub({ name: 'Other Hub', contactEmail: 'other@test.org' });

    const attesting = await createTestGroup(ourHub.id, {
      name: 'Attesting Group',
      contactEmail: 'attesting@test.org',
      verificationStatus: 'verified',
    });
    const stranger = await createTestGroup(otherHub.id, {
      name: 'Stranger Group',
      contactEmail: 'stranger@test.org',
    });
    await db.insert(verificationRequests).values({
      groupId: stranger.id,
      hubId: otherHub.id,
      method: 'peer_attestation',
      status: 'pending',
    });

    const { sessionToken } = await createGroupCoordinatorWithSession(ourHub.id, attesting.id);

    const response = await request(app)
      .get('/api/verification/attestation-requests')
      .set('Authorization', `Bearer ${sessionToken}`);

    // Resolving hubs from the group must not widen to every hub. A group's
    // existence and its unverified status are not another hub's business.
    expect(response.status).toBe(200);
    expect(response.body.requests).toHaveLength(0);
  });

  it('requires a session', async () => {
    const response = await request(app).get('/api/verification/attestation-requests');

    expect(response.status).toBe(401);
  });
});
