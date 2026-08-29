import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import {
  createTestHub,
  createTestGroup,
  createTestUser,
  createTestSession,
} from '../test/helpers.js';

async function staffAdminSession(): Promise<string> {
  const user = await createTestUser({
    email: `staff-${Date.now()}@test.org`,
    role: 'staff_admin' as never,
  });
  return createTestSession(user.id);
}

/**
 * The staff admin console is the only view of the system as a whole. These
 * endpoints had no tests, and the hubs listing returned 500 on every single
 * call: its group-count subquery interpolated an unqualified "id" while joining
 * groups, which also has one, so Postgres refused the query as ambiguous.
 */
describe('Admin API', () => {
  describe('GET /api/admin/hubs', () => {
    it('lists hubs with a group count', async () => {
      const hub = await createTestHub({ name: 'Counted Hub', contactEmail: 'counted@test.org' });
      await createTestGroup(hub.id, { name: 'One', contactEmail: 'one@test.org' });
      await createTestGroup(hub.id, { name: 'Two', contactEmail: 'two@test.org' });
      const token = await staffAdminSession();

      const response = await request(app)
        .get('/api/admin/hubs?page=1&limit=25')
        .set('Authorization', `Bearer ${token}`);

      // The regression was a 500, so the status assertion is the load-bearing
      // one. The count is asserted too, because the broken column reference was
      // inside the count expression: a version that dropped the subquery
      // entirely would also stop 500ing.
      expect(response.status).toBe(200);
      const row = response.body.data.find((h: { id: string }) => h.id === hub.id);
      expect(row).toBeDefined();
      expect(row.groupCount).toBe(2);
    });

    it('reports zero for a hub with no groups', async () => {
      const hub = await createTestHub({ name: 'Empty Hub', contactEmail: 'empty@test.org' });
      const token = await staffAdminSession();

      const response = await request(app)
        .get('/api/admin/hubs')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const row = response.body.data.find((h: { id: string }) => h.id === hub.id);
      expect(row.groupCount).toBe(0);
    });

    it('refuses a hub admin', async () => {
      const hub = await createTestHub();
      const user = await createTestUser({ email: `ha-${Date.now()}@test.org`, hubId: hub.id });
      const token = await createTestSession(user.id);

      const response = await request(app)
        .get('/api/admin/hubs')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it('requires a session', async () => {
      const response = await request(app).get('/api/admin/hubs');

      expect(response.status).toBe(401);
    });
  });
});
