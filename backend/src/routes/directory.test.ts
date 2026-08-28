import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

/**
 * The public directory is the one surface designed to be read by anyone with no
 * authentication, which makes it the cheapest thing on the site to scrape and
 * the only one where a limiter has to work without identifying anybody.
 *
 * The two routes are limited by separate limiter instances, so they hold
 * separate buckets. The tests below rely on that: the exhaustion test drains
 * /api/directory while every other test reads /api/directory/groups, so no test
 * here depends on running before or after another.
 */
describe('Directory API', () => {
  describe('GET /api/directory/groups', () => {
    it('serves the public directory anonymously', async () => {
      const response = await request(app).get('/api/directory/groups');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.entries)).toBe(true);
    });

    it('sets no cookies', async () => {
      const response = await request(app).get('/api/directory/groups');

      // CLAUDE.md: "No analytics, cookies, or logging for anonymous users".
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('leaks no rate limit headers', async () => {
      const response = await request(app).get('/api/directory/groups');

      // standardHeaders and legacyHeaders are both off for the anonymous
      // limiters. RateLimit-Remaining would tell a caller their requests are
      // being counted against a key, which is the inference the rotating hash
      // exists to prevent. Retry-After is gated behind the same two flags.
      expect(response.headers['ratelimit-remaining']).toBeUndefined();
      expect(response.headers['x-ratelimit-remaining']).toBeUndefined();
      expect(response.headers['retry-after']).toBeUndefined();
    });
  });

  describe('GET /api/directory', () => {
    it('eventually refuses a client that will not stop', async () => {
      // Loops to a wall-clock deadline rather than a fixed count. The limiter
      // key is salted from Math.floor(Date.now() / 5min), so it rotates on an
      // absolute boundary independent of the limiter's own window; a fixed loop
      // that straddled one would reset the counter and fail for no reason.
      const deadline = Date.now() + 20_000;
      let sawLimit = false;

      while (Date.now() < deadline && !sawLimit) {
        const response = await request(app).get('/api/directory');
        if (response.status === 429) sawLimit = true;
      }

      expect(sawLimit).toBe(true);
    }, 30000);
  });
});
