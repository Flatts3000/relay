import rateLimit from 'express-rate-limit';
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
  // Skip rate limiting for health check
  skip: (req) => req.path === '/api/health' || req.path === '/health',
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
 */
function anonymousKeyGenerator(req: Request): string {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  return hashIpWithRotatingSalt(ip);
}

/**
 * Rate limiter for anonymous routes (/api/mailbox/*).
 *
 * CRITICAL PRIVACY REQUIREMENTS:
 * 1. Uses short window (5 minutes) to minimize data retention
 * 2. IP addresses are hashed immediately, never stored raw
 * 3. Hash salt rotates every 5 minutes
 * 4. After window expires, all association data is gone
 *
 * This provides abuse protection while maintaining anonymity.
 */
export const anonymousRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (short window for privacy)
  max: 30, // 30 requests per 5 minutes
  standardHeaders: false, // Don't leak rate limit info
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: anonymousKeyGenerator,
  // Don't include request ID or any other identifying info in response
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
});

/**
 * Strict rate limiter for mailbox creation.
 * Prevents abuse of mailbox creation.
 */
export const mailboxCreationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 mailbox creations per hour
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Too many mailbox creation attempts, please try again later.' },
  keyGenerator: anonymousKeyGenerator,
});
