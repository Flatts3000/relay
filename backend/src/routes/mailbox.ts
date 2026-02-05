import { Router } from 'express';
import { anonymousRateLimiter, mailboxCreationRateLimiter } from '../middleware/rate-limit.js';
import { createMailboxSchema, mailboxIdParamSchema } from '../validations/mailbox.validation.js';
import { createMailbox, getMailbox, deleteMailbox } from '../services/mailbox.service.js';

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
mailboxRouter.post('/', mailboxCreationRateLimiter, async (req, res) => {
  const parsed = createMailboxSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const result = await createMailbox(parsed.data);
  res.status(201).json(result);
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
mailboxRouter.get('/:id', async (req, res) => {
  const paramsParsed = mailboxIdParamSchema.safeParse(req.params);

  if (!paramsParsed.success) {
    res.status(400).json({
      error: 'Invalid mailbox ID',
      details: paramsParsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const mailbox = await getMailbox(paramsParsed.data.id);

  if (!mailbox) {
    res.status(404).json({ error: 'Mailbox not found' });
    return;
  }

  res.json(mailbox);
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
mailboxRouter.delete('/:id', async (req, res) => {
  const paramsParsed = mailboxIdParamSchema.safeParse(req.params);

  if (!paramsParsed.success) {
    res.status(400).json({
      error: 'Invalid mailbox ID',
      details: paramsParsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const deleted = await deleteMailbox(paramsParsed.data.id);

  if (!deleted) {
    res.status(404).json({ error: 'Mailbox not found' });
    return;
  }

  res.status(204).send();
});
