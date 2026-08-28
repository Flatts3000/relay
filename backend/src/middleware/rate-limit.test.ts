import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { anonymousKeyGenerator } from './rate-limit.js';

/**
 * Coverage for #24. These limiters were keyed on req.ip while `trust proxy` was
 * unset, so req.ip was the proxy's address for every request and all clients
 * shared one bucket. The anonymous generator additionally read the leftmost
 * X-Forwarded-For entry, which is whatever the client sent.
 */
function keyProbeApp(trustProxy: number | boolean | null) {
  const app = express();
  if (trustProxy !== null) {
    app.set('trust proxy', trustProxy);
  }
  app.get('/key', (req, res) => {
    res.json({ key: anonymousKeyGenerator(req), ip: req.ip });
  });
  return app;
}

describe('anonymousKeyGenerator', () => {
  it('derives different keys for different clients behind the proxy', async () => {
    const app = keyProbeApp(1);

    // One proxy hop: the rightmost entry is what the proxy appended, so the
    // client-controlled prefix must not decide the bucket.
    const a = await request(app).get('/key').set('X-Forwarded-For', '203.0.113.10');
    const b = await request(app).get('/key').set('X-Forwarded-For', '203.0.113.99');

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.key).not.toBe(b.body.key);
  });

  it('gives the same client a stable key within a salt window', async () => {
    const app = keyProbeApp(1);

    const first = await request(app).get('/key').set('X-Forwarded-For', '203.0.113.10');
    const second = await request(app).get('/key').set('X-Forwarded-For', '203.0.113.10');

    expect(first.body.key).toBe(second.body.key);
  });

  it('never returns anything resembling the raw address', async () => {
    const app = keyProbeApp(1);

    const response = await request(app).get('/key').set('X-Forwarded-For', '203.0.113.10');

    // The key is a truncated salted hash. The raw address must not survive into
    // anything that could be stored or logged.
    expect(response.body.key).not.toContain('203.0.113');
    expect(response.body.key).toMatch(/^[0-9a-f]{16}$/);
  });

  it('collapses every client into one key when trust proxy is unset', async () => {
    // The bug this issue was about, pinned so a regression is visible: with no
    // trust proxy setting, two distinct clients produce the same bucket.
    const app = keyProbeApp(null);

    const a = await request(app).get('/key').set('X-Forwarded-For', '203.0.113.10');
    const b = await request(app).get('/key').set('X-Forwarded-For', '203.0.113.99');

    expect(a.body.key).toBe(b.body.key);
  });
});

describe('app trust proxy setting', () => {
  it('is enabled on the real app so req.ip is not the proxy address', async () => {
    const { app } = await import('../app.js');

    expect(app.get('trust proxy')).toBe(1);
  });
});
