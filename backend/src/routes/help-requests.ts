import { Router } from 'express';
import { authenticate, requireGroupCoordinator } from '../middleware/auth.js';

export const helpRequestsRouter = Router();

// All routes require group coordinator authentication
helpRequestsRouter.use(authenticate);
helpRequestsRouter.use(requireGroupCoordinator);

/**
 * GET /api/help-requests
 * List open mailboxes matching group's service area
 *
 * Query params:
 *   - category: filter by help category
 *
 * Response: array of
 *   - mailboxId: UUID
 *   - helpCategory: category
 *   - region: region
 *   - createdAt: timestamp
 *
 * NOTE: Does NOT return public key (fetched separately)
 */
helpRequestsRouter.get('/', async (_req, res) => {
  // TODO: Implement list help requests
  // 1. Get group's service area
  // 2. Query mailboxes matching region
  // 3. Filter by category if provided
  // 4. Return mailbox metadata (no public key)
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * GET /api/help-requests/:mailboxId/public-key
 * Get public key for a specific mailbox (for encryption)
 *
 * Response:
 *   - publicKey: base64-encoded public key
 */
helpRequestsRouter.get('/:mailboxId/public-key', async (_req, res) => {
  // TODO: Implement get public key
  // 1. Verify group has access (matching service area)
  // 2. Return public key
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * POST /api/help-requests/:mailboxId/reply
 * Send an encrypted reply to a mailbox
 *
 * Request body:
 *   - ciphertext: base64-encoded encrypted message
 *
 * CRITICAL: Group must encrypt message client-side before sending.
 * Server stores ciphertext only - cannot decrypt.
 */
helpRequestsRouter.post('/:mailboxId/reply', async (_req, res) => {
  // TODO: Implement send reply
  // 1. Verify group has access (matching service area)
  // 2. Store encrypted message with group ID
  // 3. Return success
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * GET /api/help-requests/tombstones
 * Get tombstones for mailboxes this group responded to
 *
 * Response: array of
 *   - helpCategory: category
 *   - region: region
 *   - deletedAt: when mailbox was deleted
 *   - deletionType: 'manual' | 'auto_inactivity'
 */
helpRequestsRouter.get('/tombstones', async (_req, res) => {
  // TODO: Implement get tombstones
  // 1. Query tombstones where this group is in responding_group_ids
  // 2. Return tombstone metadata
  res.status(501).json({ error: 'Not implemented' });
});
