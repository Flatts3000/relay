import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { config } from '../config.js';

/**
 * Rate limiter for authenticated routes.
 * 600 requests per 15 minutes per IP by default, via API_RATE_LIMIT_MAX.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.apiRateLimitMax,
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
 * Rate limiters for the two routes that issue credentials.
 *
 * Two instances, so they hold separate buckets. Sharing one meant a person
 * repeatedly requesting links could exhaust the budget and leave somebody else
 * unable to complete /verify while holding a valid, unexpired magic link -
 * the same shared-bucket failure separated in the directory limiters, one route
 * over. The addresses this user base arrives from are frequently shared
 * (shelter and library wifi, mobile CGNAT), so the budget is per building more
 * often than per person.
 *
 * Both key on req.ip via the library default, NOT on the hashed rotating key
 * used for anonymous traffic. That is deliberate: the hashed key's salt rotates
 * every 5 minutes, which would hand an attacker a fresh bucket three times per
 * window and gut the control. CLAUDE.md's IP constraint covers anonymous
 * routes, and these are the authenticated surface - but note the address is
 * held in the limiter's memory store for the window, and is not persisted.
 */
function credentialRateLimiter(message: string) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.authLoginRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });
}

export const authLoginRateLimiter = credentialRateLimiter(
  'Too many login attempts, please try again later.'
);

export const authVerifyRateLimiter = credentialRateLimiter(
  'Too many verification attempts, please try again later.'
);

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
 * Rate limiters for the anonymous directory. Two instances, deliberately.
 *
 * They must not share a bucket. GET /api/directory is a hard prerequisite of
 * submitting a help broadcast - BroadcastSubmitPage fetches matching groups and
 * aborts if that fails - while GET /api/directory/groups is ordinary browsing.
 * A single router-level limiter let someone browse the directory, exhaust the
 * budget, then be unable to ask for help for the next five minutes. Separate
 * limiter instances mean separate stores, so browsing can never starve the
 * crisis path.
 *
 * Limits are set for shared egress. anonymousKeyGenerator keys on the hashed
 * client address, and the people this is built for disproportionately sit
 * behind one IP: shelter and library wifi, clinics, and mobile carriers using
 * CGNAT. A budget that looks generous per person is not generous per building,
 * so these are set well above what one user needs.
 *
 * PRIVACY: the address is hashed with a salt rotating every 5 minutes and never
 * stored raw. Note that rotation also bounds the key's life, so the effective
 * policy is per absolute 5-minute slot rather than a sliding window, and a
 * caller straddling a boundary can get two slots back to back. Acceptable here:
 * these limits exist to stop scraping, not to be exact.
 */
export const directoryLookupRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60, // one request per broadcast attempt; 60 is far above any real need
  standardHeaders: false, // Don't leak rate limit info
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: anonymousKeyGenerator,
});

export const directoryBrowseRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 240, // searching is interactive; see the debounce in GroupDirectoryPage
  standardHeaders: false,
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
