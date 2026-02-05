import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import {
  createTestHub,
  createTestGroup,
  createHubAdminWithSession,
  createGroupCoordinatorWithSession,
  TestHub,
  TestGroup,
} from '../test/helpers.js';

describe('Groups API', () => {
  let hub: TestHub;

  beforeEach(async () => {
    hub = await createTestHub();
  });

  describe('POST /api/groups', () => {
    it('should create a new group as hub admin', async () => {
      const { sessionToken } = await createHubAdminWithSession(hub.id);

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          name: 'New Mutual Aid Group',
          serviceArea: 'Downtown',
          aidCategories: ['rent', 'utilities'],
          contactEmail: 'newgroup@test.org',
        });

      expect(response.status).toBe(201);
      expect(response.body.group).toMatchObject({
        name: 'New Mutual Aid Group',
        serviceArea: 'Downtown',
        aidCategories: ['rent', 'utilities'],
        contactEmail: 'newgroup@test.org',
        verificationStatus: 'pending',
        hubId: hub.id,
      });
      expect(response.body.group.id).toBeDefined();
    });

    it('should reject group creation without authentication', async () => {
      const response = await request(app).post('/api/groups').send({
        name: 'New Group',
        serviceArea: 'Downtown',
        aidCategories: ['rent'],
        contactEmail: 'group@test.org',
      });

      expect(response.status).toBe(401);
    });

    it('should reject group creation by group coordinator', async () => {
      const group = await createTestGroup(hub.id);
      const { sessionToken } = await createGroupCoordinatorWithSession(
        hub.id,
        group.id
      );

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          name: 'Another Group',
          serviceArea: 'Uptown',
          aidCategories: ['food'],
          contactEmail: 'another@test.org',
        });

      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const { sessionToken } = await createHubAdminWithSession(hub.id);

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          name: '',
          serviceArea: '',
          aidCategories: [],
          contactEmail: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toBeDefined();
    });

    it('should validate aid categories are valid values', async () => {
      const { sessionToken } = await createHubAdminWithSession(hub.id);

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          name: 'Test Group',
          serviceArea: 'Test Area',
          aidCategories: ['invalid_category'],
          contactEmail: 'test@test.org',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/groups', () => {
    let group1: TestGroup;

    beforeEach(async () => {
      group1 = await createTestGroup(hub.id, {
        name: 'First Group',
        serviceArea: 'Area A',
        verificationStatus: 'verified',
      });
      await createTestGroup(hub.id, {
        name: 'Second Group',
        serviceArea: 'Area B',
        verificationStatus: 'pending',
      });
    });

    it('should list all groups for hub admin', async () => {
      const { sessionToken } = await createHubAdminWithSession(hub.id);

      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.groups).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should only list own group for group coordinator', async () => {
      const { sessionToken } = await createGroupCoordinatorWithSession(
        hub.id,
        group1.id
      );

      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.groups).toHaveLength(1);
      expect(response.body.groups[0].id).toBe(group1.id);
    });

    it('should filter by verification status', async () => {
      const { sessionToken } = await createHubAdminWithSession(hub.id);

      const response = await request(app)
        .get('/api/groups')
        .query({ verificationStatus: 'verified' })
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.groups).toHaveLength(1);
      expect(response.body.groups[0].verificationStatus).toBe('verified');
    });

    it('should reject without authentication', async () => {
      const response = await request(app).get('/api/groups');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/groups/:id', () => {
    let group: TestGroup;

    beforeEach(async () => {
      group = await createTestGroup(hub.id);
    });

    it('should get group details for hub admin', async () => {
      const { sessionToken } = await createHubAdminWithSession(hub.id);

      const response = await request(app)
        .get(`/api/groups/${group.id}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.group.id).toBe(group.id);
      expect(response.body.group.name).toBe(group.name);
    });

    it('should get own group for group coordinator', async () => {
      const { sessionToken } = await createGroupCoordinatorWithSession(
        hub.id,
        group.id
      );

      const response = await request(app)
        .get(`/api/groups/${group.id}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.group.id).toBe(group.id);
    });

    it('should reject access to other group for group coordinator', async () => {
      const otherGroup = await createTestGroup(hub.id, { name: 'Other Group' });
      const { sessionToken } = await createGroupCoordinatorWithSession(
        hub.id,
        otherGroup.id
      );

      const response = await request(app)
        .get(`/api/groups/${group.id}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent group', async () => {
      const { sessionToken } = await createHubAdminWithSession(hub.id);

      const response = await request(app)
        .get('/api/groups/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const { sessionToken } = await createHubAdminWithSession(hub.id);

      const response = await request(app)
        .get('/api/groups/invalid-id')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/groups/:id', () => {
    let group: TestGroup;

    beforeEach(async () => {
      group = await createTestGroup(hub.id);
    });

    it('should update own group as group coordinator', async () => {
      const { sessionToken } = await createGroupCoordinatorWithSession(
        hub.id,
        group.id
      );

      const response = await request(app)
        .patch(`/api/groups/${group.id}`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          name: 'Updated Group Name',
          serviceArea: 'New Service Area',
        });

      expect(response.status).toBe(200);
      expect(response.body.group.name).toBe('Updated Group Name');
      expect(response.body.group.serviceArea).toBe('New Service Area');
    });

    it('should reject update from hub admin', async () => {
      const { sessionToken } = await createHubAdminWithSession(hub.id);

      const response = await request(app)
        .patch(`/api/groups/${group.id}`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          name: 'Admin Updated Name',
        });

      expect(response.status).toBe(403);
    });

    it('should reject update to other group by coordinator', async () => {
      const otherGroup = await createTestGroup(hub.id, { name: 'Other Group' });
      const { sessionToken } = await createGroupCoordinatorWithSession(
        hub.id,
        otherGroup.id
      );

      const response = await request(app)
        .patch(`/api/groups/${group.id}`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          name: 'Hacked Name',
        });

      expect(response.status).toBe(403);
    });

    it('should validate update fields', async () => {
      const { sessionToken } = await createGroupCoordinatorWithSession(
        hub.id,
        group.id
      );

      const response = await request(app)
        .patch(`/api/groups/${group.id}`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          contactEmail: 'invalid-email',
        });

      expect(response.status).toBe(400);
    });

    it('should allow partial updates', async () => {
      const { sessionToken } = await createGroupCoordinatorWithSession(
        hub.id,
        group.id
      );

      const response = await request(app)
        .patch(`/api/groups/${group.id}`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          name: 'Just Update Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.group.name).toBe('Just Update Name');
      expect(response.body.group.serviceArea).toBe(group.serviceArea);
    });
  });
});
