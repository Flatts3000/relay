import { Router } from 'express';
import { authenticate, requireGroupCoordinator } from '../middleware/auth.js';
import {
  listHelpRequestsQuerySchema,
  mailboxIdParamSchema,
  sendReplySchema,
} from '../validations/mailbox.validation.js';
import {
  listHelpRequests,
  getMailboxPublicKey,
  sendReply,
  getGroupTombstones,
} from '../services/mailbox.service.js';

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
helpRequestsRouter.get('/', async (req, res) => {
  const queryParsed = listHelpRequestsQuerySchema.safeParse(req.query);

  if (!queryParsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: queryParsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const user = req.user!;

  if (!user.groupServiceArea) {
    res.status(400).json({ error: 'User does not have an associated group service area' });
    return;
  }

  const requests = await listHelpRequests(user.groupServiceArea, queryParsed.data.category);
  res.json({ requests, total: requests.length });
});

/**
 * GET /api/help-requests/:mailboxId/public-key
 * Get public key for a specific mailbox (for encryption)
 *
 * Response:
 *   - publicKey: base64-encoded public key
 */
helpRequestsRouter.get('/:mailboxId/public-key', async (req, res) => {
  const paramsParsed = mailboxIdParamSchema.safeParse({ id: req.params.mailboxId });

  if (!paramsParsed.success) {
    res.status(400).json({
      error: 'Invalid mailbox ID',
      details: paramsParsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const user = req.user!;

  if (!user.groupServiceArea) {
    res.status(400).json({ error: 'User does not have an associated group service area' });
    return;
  }

  const result = await getMailboxPublicKey(paramsParsed.data.id, user.groupServiceArea);

  if (!result) {
    res.status(404).json({ error: 'Mailbox not found or not in your service area' });
    return;
  }

  res.json(result);
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
helpRequestsRouter.post('/:mailboxId/reply', async (req, res) => {
  const paramsParsed = mailboxIdParamSchema.safeParse({ id: req.params.mailboxId });

  if (!paramsParsed.success) {
    res.status(400).json({
      error: 'Invalid mailbox ID',
      details: paramsParsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const bodyParsed = sendReplySchema.safeParse(req.body);

  if (!bodyParsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: bodyParsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const user = req.user!;

  if (!user.groupId || !user.groupServiceArea) {
    res.status(400).json({ error: 'User does not have an associated group' });
    return;
  }

  const result = await sendReply(
    paramsParsed.data.id,
    user.groupId,
    user.groupServiceArea,
    bodyParsed.data.ciphertext
  );

  if (!result) {
    res.status(404).json({ error: 'Mailbox not found or not in your service area' });
    return;
  }

  res.status(201).json(result);
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
helpRequestsRouter.get('/tombstones', async (req, res) => {
  const user = req.user!;

  if (!user.groupId) {
    res.status(400).json({ error: 'User does not have an associated group' });
    return;
  }

  const tombstones = await getGroupTombstones(user.groupId);
  res.json({ tombstones, total: tombstones.length });
});
