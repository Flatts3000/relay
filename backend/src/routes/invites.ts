import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireGroupCoordinator } from '../middleware/auth.js';
import {
  getInvitesForGroup,
  getCiphertextForBroadcast,
  markInviteDecrypted,
  deleteInvite,
} from '../services/invite.service.js';

export const invitesRouter = Router();

// All invite routes require authentication as group coordinator
invitesRouter.use(authenticate, requireGroupCoordinator);

const inviteIdSchema = z.object({
  inviteId: z.string().uuid('Invalid invite ID'),
});

/**
 * GET /api/invites
 * List pending invites for the authenticated user's group.
 */
invitesRouter.get('/', async (req, res) => {
  if (!req.user?.groupId) {
    res.status(403).json({ error: 'No group assigned' });
    return;
  }

  const invites = await getInvitesForGroup(req.user.groupId);
  res.json({ invites });
});

/**
 * GET /api/invites/:inviteId/ciphertext
 * Get the broadcast ciphertext + nonce for decryption.
 */
invitesRouter.get('/:inviteId/ciphertext', async (req, res) => {
  const parsed = inviteIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid invite ID' });
    return;
  }

  // Look up the invite to get the broadcastId
  const invites = await getInvitesForGroup(req.user!.groupId!);
  const invite = invites.find((i) => i.inviteId === parsed.data.inviteId);

  if (!invite) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }

  const ciphertext = await getCiphertextForBroadcast(invite.broadcastId);
  if (!ciphertext) {
    res.status(404).json({ error: 'Broadcast not found' });
    return;
  }

  res.json(ciphertext);
});

/**
 * POST /api/invites/:inviteId/decrypt
 * Mark an invite as decrypted. Starts the 10-minute auto-delete window.
 */
invitesRouter.post('/:inviteId/decrypt', async (req, res) => {
  const parsed = inviteIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid invite ID' });
    return;
  }

  const success = await markInviteDecrypted(parsed.data.inviteId);
  if (!success) {
    res.status(404).json({ error: 'Invite not found or already decrypted' });
    return;
  }

  res.json({ success: true });
});

/**
 * DELETE /api/invites/:inviteId
 * Hard delete an invite. Triggers broadcast cleanup if last invite.
 */
invitesRouter.delete('/:inviteId', async (req, res) => {
  const parsed = inviteIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid invite ID' });
    return;
  }

  const success = await deleteInvite(parsed.data.inviteId);
  if (!success) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }

  res.status(204).send();
});
