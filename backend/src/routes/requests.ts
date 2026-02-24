import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireHubAdmin, requireGroupCoordinator } from '../middleware/auth.js';
import {
  createFundingRequest,
  listFundingRequests,
  getFundingRequest,
  getFundingRequestHistory,
  approveFundingRequest,
  declineFundingRequest,
  requestClarification,
  markFundsSent,
  acknowledgeReceipt,
} from '../services/request.service.js';
import {
  createFundingRequestSchema,
  requestIdParamSchema,
  listFundingRequestsQuerySchema,
  declineFundingRequestSchema,
  clarifyFundingRequestSchema,
} from '../validations/request.validation.js';

export const requestsRouter = Router();

// All routes require authentication
requestsRouter.use(authenticate);

/**
 * POST /api/requests
 * Submit a new funding request (verified groups only)
 */
requestsRouter.post('/', requireGroupCoordinator, async (req, res) => {
  try {
    const input = createFundingRequestSchema.parse(req.body);
    const user = req.user!;

    if (!user.groupId) {
      res.status(400).json({ error: 'User is not associated with a group' });
      return;
    }

    const request = await createFundingRequest(user.groupId, input, user.id, req);
    res.status(201).json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    if (err instanceof Error) {
      if (err.message === 'Only verified groups can submit funding requests') {
        res.status(403).json({ error: err.message });
        return;
      }
      if (err.message === 'Group not found') {
        res.status(404).json({ error: err.message });
        return;
      }
    }
    throw err;
  }
});

/**
 * GET /api/requests
 * List funding requests
 * - Hub admins see all requests for their hub
 * - Group coordinators see only their group's requests
 */
requestsRouter.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const query = listFundingRequestsQuerySchema.parse(req.query);

    const result = await listFundingRequests(
      user.hubId ?? null,
      user.groupId ?? null,
      user.role,
      query
    );

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    throw err;
  }
});

/**
 * GET /api/requests/:id
 * Get funding request details
 */
requestsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = requestIdParamSchema.parse(req.params);
    const user = req.user!;

    const request = await getFundingRequest(
      id,
      user.hubId ?? null,
      user.groupId ?? null,
      user.role
    );

    if (!request) {
      res.status(404).json({ error: 'Funding request not found' });
      return;
    }

    // Get status history
    const history = await getFundingRequestHistory(id);

    res.json({ request, history });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID format' });
      return;
    }
    throw err;
  }
});

/**
 * POST /api/requests/:id/approve
 * Approve a funding request (hub admin)
 */
requestsRouter.post('/:id/approve', requireHubAdmin, async (req, res) => {
  try {
    const { id } = requestIdParamSchema.parse(req.params);
    const user = req.user!;

    if (!user.hubId) {
      res.status(400).json({ error: 'User is not associated with a hub' });
      return;
    }

    const request = await approveFundingRequest(id, user.hubId, user.id, req);
    res.json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID format' });
      return;
    }
    if (err instanceof Error) {
      if (err.message === 'Funding request not found') {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.message.startsWith('Cannot approve')) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    throw err;
  }
});

/**
 * POST /api/requests/:id/decline
 * Decline a funding request with reason (hub admin)
 */
requestsRouter.post('/:id/decline', requireHubAdmin, async (req, res) => {
  try {
    const { id } = requestIdParamSchema.parse(req.params);
    const { reason } = declineFundingRequestSchema.parse(req.body);
    const user = req.user!;

    if (!user.hubId) {
      res.status(400).json({ error: 'User is not associated with a hub' });
      return;
    }

    const request = await declineFundingRequest(id, user.hubId, user.id, reason, req);
    res.json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    if (err instanceof Error) {
      if (err.message === 'Funding request not found') {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.message.startsWith('Cannot decline')) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    throw err;
  }
});

/**
 * POST /api/requests/:id/clarify
 * Request clarification on a funding request (hub admin)
 */
requestsRouter.post('/:id/clarify', requireHubAdmin, async (req, res) => {
  try {
    const { id } = requestIdParamSchema.parse(req.params);
    const { message } = clarifyFundingRequestSchema.parse(req.body);
    const user = req.user!;

    if (!user.hubId) {
      res.status(400).json({ error: 'User is not associated with a hub' });
      return;
    }

    const request = await requestClarification(id, user.hubId, user.id, message, req);
    res.json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    if (err instanceof Error) {
      if (err.message === 'Funding request not found') {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.message.startsWith('Can only request')) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    throw err;
  }
});

/**
 * POST /api/requests/:id/mark-sent
 * Mark funds as sent (hub admin)
 */
requestsRouter.post('/:id/mark-sent', requireHubAdmin, async (req, res) => {
  try {
    const { id } = requestIdParamSchema.parse(req.params);
    const user = req.user!;

    if (!user.hubId) {
      res.status(400).json({ error: 'User is not associated with a hub' });
      return;
    }

    const request = await markFundsSent(id, user.hubId, user.id, req);
    res.json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID format' });
      return;
    }
    if (err instanceof Error) {
      if (err.message === 'Funding request not found') {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.message.startsWith('Cannot mark')) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    throw err;
  }
});

/**
 * POST /api/requests/:id/acknowledge
 * Acknowledge receipt of funds (group coordinator)
 */
requestsRouter.post('/:id/acknowledge', requireGroupCoordinator, async (req, res) => {
  try {
    const { id } = requestIdParamSchema.parse(req.params);
    const user = req.user!;

    if (!user.groupId) {
      res.status(400).json({ error: 'User is not associated with a group' });
      return;
    }

    const request = await acknowledgeReceipt(id, user.groupId, user.id, req);
    res.json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID format' });
      return;
    }
    if (err instanceof Error) {
      if (err.message === 'Funding request not found') {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.message.startsWith('Cannot acknowledge')) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    throw err;
  }
});
