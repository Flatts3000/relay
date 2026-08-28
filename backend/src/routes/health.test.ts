import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { db } from '../db/index.js';

describe('Health API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('reports ok when the process can answer', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    it('stays ok when the database is unreachable, because it is a liveness probe', async () => {
      vi.spyOn(db, 'execute').mockRejectedValue(new Error('connection refused'));

      const response = await request(app).get('/api/health');

      // Deliberate: the container healthcheck polls this, and restarting a
      // healthy process over a brief database blip turns an outage into a
      // restart loop.
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /api/health/ready', () => {
    it('reports ok when the database answers', async () => {
      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('ok');
    });

    it('reports 503 when the database is unreachable', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(db, 'execute').mockRejectedValue(new Error('connection refused'));

      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unavailable');
      expect(response.body.database).toBe('unavailable');
    });

    it('does not leak connection details in the response body', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(db, 'execute').mockRejectedValue(
        new Error(
          'connection to server at "10.0.1.5", port 5432 failed: password authentication failed for user "relay"'
        )
      );

      const response = await request(app).get('/api/health/ready');

      // This endpoint is unauthenticated, and driver errors name the host,
      // database and user.
      const body = JSON.stringify(response.body);
      expect(body).not.toContain('10.0.1.5');
      expect(body).not.toContain('relay');
      expect(body).not.toContain('password');
    });
  });
});
