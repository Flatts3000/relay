import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createHash } from 'crypto';
import type { Request } from 'express';

/**
 * Rate limiter for authenticated routes.
 * Standard configuration - 100 requests per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  // Skip rate limiting for health checks, readiness included. An exact match on
  // '/api/health' left '/api/health/ready' rate limited, which matters because
  // the deploy gate and any uptime monitor poll readiness: ~100 ordinary API
  // requests in a 15 minute window would make a healthy deploy fail
  // verification with 429s, or page an on-call falsely.
  skip: (req) => req.path.startsWith('/api/health') || req.path.startsWith('/health'),
});

/**
 * Rate limiter for login/auth requests.
 * More restrictive - 10 requests per 15 minutes per IP.
 */
export const authLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

/**
 * Hash function for anonymous rate limiting.
 * Uses SHA-256 with a rotating salt to hash IP addresses.
 * The salt rotates every 5 minutes to ensure short-lived association.
 *
 * CRITICAL: We NEVER store the raw IP address. Only the hash is stored,
 * and it becomes invalid after the window expires.
 */
function hashIpWithRotatingSalt(ip: string): string {
  // Rotate salt every 5 minutes (use timestamp truncated to 5-minute buckets)
  const timeSlot = Math.floor(Date.now() / (5 * 60 * 1000));
  const salt = `relay-anon-${timeSlot}`;

  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 16);
}

/**
 * Key generator for anonymous routes.
 * Uses hashed IP with rotating salt - no raw IP storage.
 * Exported for reuse by broadcast and other anonymous rate limiters.
 */
export function anonymousKeyGenerator(req: Request): string {
  // req.ip, not a hand-parsed X-Forwarded-For. Taking the leftmost XFF entry
  // takes whatever the client sent, so anyone could pick their own bucket and
  // walk straight through these limits. With trust proxy configured in app.ts,
  // Express derives this from the entry the proxy actually appended.
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Hash the /56 prefix rather than the exact address. A single IPv6 client is
  // routinely handed a /64 and can source every request from a different
  // address in it, which would mint a fresh bucket each time and defeat the
  // 5-per-hour broadcast limit completely. ipKeyGenerator is the
  // library's own defence against this; IPv4 addresses pass through unchanged.
  return hashIpWithRotatingSalt(ipKeyGenerator(ip));
}

/**
 * Rate limiter for anonymous browsing (/api/directory/*).
 *
 * Generous on purpose. Legitimate directory use is bursty - someone in
 * difficulty filtering by region and category - and the whole point of the
 * directory is that they find a group quickly. This sits well above normal
 * browsing and far below scraping.
 *
 * PRIVACY: keys on anonymousKeyGenerator, so the address is hashed with a salt
 * that rotates every 5 minutes and is never stored raw. CLAUDE.md forbids
 * tracking who browses the directory; this is ephemeral use, not tracking.
 */
export const anonymousBrowseRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: false, // Don't leak rate limit info
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: anonymousKeyGenerator,
});

/**
 * Strict rate limiter for broadcast creation.
 * Prevents abuse of anonymous broadcast submission.
 */
export const broadcastCreationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 broadcasts per hour
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Too many broadcast attempts, please try again later.' },
  keyGenerator: anonymousKeyGenerator,
});
