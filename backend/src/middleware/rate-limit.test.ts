import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { anonymousKeyGenerator } from './rate-limit.js';

/**
 * Coverage for #24. These limiters were keyed on req.ip while trust proxy was
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

async function keyFor(app: express.Express, forwardedFor: string): Promise<string> {
  const response = await request(app).get('/key').set('X-Forwarded-For', forwardedFor);
  expect(response.status).toBe(200);
  return response.body.key as string;
}

describe('anonymousKeyGenerator', () => {
  it('ignores a client-supplied X-Forwarded-For prefix', async () => {
    const app = keyProbeApp(1);

    // The security property this issue exists to establish. Caddy appends the
    // real address, so with one trusted hop the rightmost entry decides the
    // bucket and anything the client prepended is ignored.
    //
    // This is the case that separates the fix from the bug it replaced: the old
    // leftmost-parsing implementation would key these two differently, letting
    // anyone mint unlimited buckets by varying a header.
    const spoofed = await keyFor(app, '198.51.100.1, 203.0.113.10');
    const direct = await keyFor(app, '203.0.113.10');

    expect(spoofed).toBe(direct);
  });

  it('derives different keys for different clients behind the proxy', async () => {
    const app = keyProbeApp(1);

    expect(await keyFor(app, '203.0.113.10')).not.toBe(await keyFor(app, '203.0.113.99'));
  });

  it('gives the same client a stable key within a salt window', async () => {
    const app = keyProbeApp(1);

    expect(await keyFor(app, '203.0.113.10')).toBe(await keyFor(app, '203.0.113.10'));
  });

  it('buckets an IPv6 client by prefix rather than exact address', async () => {
    const app = keyProbeApp(1);

    // A single IPv6 client is routinely handed a /64 and can source each request
    // from a different address within it. Keying on the full address would mint
    // a fresh bucket every time and defeat the 5-per-hour limits entirely.
    const first = await keyFor(app, '2001:db8:1234:5600::1');
    const second = await keyFor(app, '2001:db8:1234:5600::beef');

    expect(first).toBe(second);
  });

  it('still separates IPv6 clients in different prefixes', async () => {
    const app = keyProbeApp(1);

    const a = await keyFor(app, '2001:db8:1234:5600::1');
    const b = await keyFor(app, '2001:db8:9999:9900::1');

    expect(a).not.toBe(b);
  });

  it('never returns anything resembling the raw address', async () => {
    const app = keyProbeApp(1);

    const key = await keyFor(app, '203.0.113.10');

    expect(key).not.toContain('203.0.113');
    expect(key).toMatch(/^[0-9a-f]{16}$/);
  });

  it('collapses every client into one key when trust proxy is unset', async () => {
    // The original bug, pinned so a regression is visible: with no trust proxy
    // setting, two distinct clients land in the same bucket.
    const app = keyProbeApp(null);

    expect(await keyFor(app, '203.0.113.10')).toBe(await keyFor(app, '203.0.113.99'));
  });
});

describe('app trust proxy setting', () => {
  it('is driven by configuration rather than hardcoded', async () => {
    const { app } = await import('../app.js');
    const { config } = await import('../config.js');

    // Defaults to 0 so a directly reachable backend - the root
    // docker-compose.yml publishes port 4000 with nothing in front of it -
    // does not trust a hop that is not there. Production sets 1 for Caddy.
    expect(app.get('trust proxy')).toBe(config.trustProxyHops);
    expect(config.trustProxyHops).toBe(0);
  });
});
