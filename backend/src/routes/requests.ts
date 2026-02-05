import { Router } from 'express';
import { authenticate, requireHubAdmin, requireGroupCoordinator } from '../middleware/auth.js';

export const requestsRouter = Router();

// All routes require authentication
requestsRouter.use(authenticate);

/**
 * POST /api/requests
 * Submit a new funding request (verified groups only)
 */
requestsRouter.post('/', requireGroupCoordinator, async (_req, res) => {
  // TODO: Implement submit funding request
  // Must verify group is verified before allowing submission
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * GET /api/requests
 * List funding requests
 * - Hub admins see all requests for their hub
 * - Group coordinators see only their group's requests
 */
requestsRouter.get('/', async (_req, res) => {
  // TODO: Implement list funding requests with role-based filtering
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * GET /api/requests/:id
 * Get funding request details
 */
requestsRouter.get('/:id', async (_req, res) => {
  // TODO: Implement get funding request
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * POST /api/requests/:id/approve
 * Approve a funding request (hub admin)
 */
requestsRouter.post('/:id/approve', requireHubAdmin, async (_req, res) => {
  // TODO: Implement approve funding request
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * POST /api/requests/:id/decline
 * Decline a funding request with reason (hub admin)
 */
requestsRouter.post('/:id/decline', requireHubAdmin, async (_req, res) => {
  // TODO: Implement decline funding request
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * POST /api/requests/:id/clarify
 * Request clarification on a funding request (hub admin)
 */
requestsRouter.post('/:id/clarify', requireHubAdmin, async (_req, res) => {
  // TODO: Implement request clarification
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * POST /api/requests/:id/mark-sent
 * Mark funds as sent (hub admin)
 */
requestsRouter.post('/:id/mark-sent', requireHubAdmin, async (_req, res) => {
  // TODO: Implement mark funds sent
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * POST /api/requests/:id/acknowledge
 * Acknowledge receipt of funds (group coordinator)
 */
requestsRouter.post('/:id/acknowledge', requireGroupCoordinator, async (_req, res) => {
  // TODO: Implement acknowledge receipt
  res.status(501).json({ error: 'Not implemented' });
});
