import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

/**
 * The public directory is the one surface designed to be read by anyone with no
 * authentication, which makes it the cheapest thing on the site to scrape and
 * the only one where a limiter has to work without identifying anybody.
 */
describe('Directory API', () => {
  it('serves the public directory anonymously', async () => {
    const response = await request(app).get('/api/directory');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.entries)).toBe(true);
  });

  it('sets no cookies on the anonymous directory routes', async () => {
    const response = await request(app).get('/api/directory');

    // CLAUDE.md: "No analytics, cookies, or logging for anonymous users".
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('does not leak rate limit headers that would confirm a client is tracked', async () => {
    const response = await request(app).get('/api/directory');

    // standardHeaders is off for the anonymous limiters. RateLimit-Remaining
    // would tell a caller their requests are being counted against a key, which
    // is exactly the inference the hashed rotating key exists to prevent.
    expect(response.headers['ratelimit-remaining']).toBeUndefined();
    expect(response.headers['x-ratelimit-remaining']).toBeUndefined();
  });

  // MUST BE LAST in this file. The limiter's store is module-level and its
  // window is 5 minutes, and TRUST_PROXY_HOPS is 0 under test so every request
  // in this process resolves to the same key regardless of X-Forwarded-For.
  // This test therefore exhausts the bucket the tests above rely on, and there
  // is no reset hook to undo it. Any future directory test belongs above this
  // one.
  it('eventually rate limits a client (exhausts the shared bucket)', async () => {
    // The limiter allows 60 per 5 minutes. Walk past it and confirm the door
    // actually closes, rather than trusting that the middleware is wired up.
    let sawLimit = false;

    for (let i = 0; i < 75; i++) {
      const response = await request(app).get('/api/directory');

      if (response.status === 429) {
        sawLimit = true;
        break;
      }
    }

    expect(sawLimit).toBe(true);
  }, 30000);
});
