import { Router } from 'express';
import { anonymousRateLimiter, mailboxCreationRateLimiter } from '../middleware/rate-limit.js';

export const mailboxRouter = Router();

/**
 * CRITICAL SECURITY REQUIREMENTS FOR THIS ROUTER:
 *
 * 1. NO AUTHENTICATION - These routes are completely anonymous
 * 2. NO IP LOGGING - Request logger skips /api/mailbox/* paths
 * 3. NO AUDIT LOGGING - Audit middleware skips /api/mailbox/* paths
 * 4. NO COOKIES - Responses must not set any cookies
 * 5. NO SESSION - No session tracking of any kind
 *
 * Rate limiting uses hashed IPs with rotating salt to prevent abuse
 * while maintaining anonymity.
 */

// Apply anonymous rate limiter to all routes
mailboxRouter.use(anonymousRateLimiter);

/**
 * POST /api/mailbox
 * Create a new anonymous mailbox
 *
 * Request body:
 *   - publicKey: base64-encoded public key
 *   - helpCategory: 'rent' | 'food' | 'utilities' | 'other'
 *   - region: string (city/county)
 *
 * Response:
 *   - id: mailbox UUID (random, not sequential)
 *
 * CRITICAL: No cookies, no logging, no tracking.
 */
mailboxRouter.post('/', mailboxCreationRateLimiter, async (_req, res) => {
  // TODO: Implement create mailbox
  // 1. Validate request body
  // 2. Create mailbox with random UUID
  // 3. Store public key, category, region
  // 4. Return only the mailbox ID
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * GET /api/mailbox/:id
 * Get mailbox and encrypted messages
 *
 * Response:
 *   - id: mailbox UUID
 *   - helpCategory: category
 *   - region: region
 *   - createdAt: timestamp
 *   - messages: array of { id, groupId, groupName, ciphertext, createdAt }
 *
 * Side effect: Updates last_accessed_at timestamp
 *
 * CRITICAL: No cookies, no logging, no tracking.
 */
mailboxRouter.get('/:id', async (_req, res) => {
  // TODO: Implement get mailbox
  // 1. Fetch mailbox by ID
  // 2. Update last_accessed_at
  // 3. Fetch encrypted messages
  // 4. Return mailbox + messages
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * DELETE /api/mailbox/:id
 * Manually delete a mailbox
 *
 * Side effects:
 *   1. Creates tombstone record
 *   2. Hard deletes all messages
 *   3. Hard deletes the mailbox (including public key)
 *
 * CRITICAL: No cookies, no logging, no tracking.
 * CRITICAL: This is a destructive operation with no recovery.
 */
mailboxRouter.delete('/:id', async (_req, res) => {
  // TODO: Implement delete mailbox
  // 1. Create tombstone with metadata
  // 2. Hard delete messages
  // 3. Hard delete mailbox
  res.status(501).json({ error: 'Not implemented' });
});
