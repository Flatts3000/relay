import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireHubAdmin, requireGroupCoordinator } from '../middleware/auth.js';
import {
  createVerificationRequest,
  listVerificationRequests,
  getVerificationRequest,
  approveVerificationRequest,
  denyVerificationRequest,
  revokeGroupVerification,
  submitPeerAttestation,
  getAttestationsForRequest,
  getPendingAttestationRequests,
  getGroupVerificationRequest,
} from '../services/verification.service.js';
import {
  createVerificationRequestSchema,
  verificationRequestIdParamSchema,
  verificationGroupIdParamSchema,
  listVerificationRequestsQuerySchema,
  denyVerificationRequestSchema,
  type PeerAttestationResponse,
} from '../validations/verification.validation.js';

export const verificationRouter = Router();

// All routes require authentication
verificationRouter.use(authenticate);

/**
 * POST /api/verification/groups/:groupId/request
 * Request verification for a group (group coordinator)
 */
verificationRouter.post('/groups/:groupId/request', requireGroupCoordinator, async (req, res) => {
  try {
    const { groupId } = verificationGroupIdParamSchema.parse(req.params);
    const input = createVerificationRequestSchema.parse(req.body);
    const user = req.user!;

    // Verify the user belongs to this group
    if (user.groupId !== groupId) {
      res.status(403).json({ error: 'You can only request verification for your own group' });
      return;
    }

    const request = await createVerificationRequest(groupId, input, user.id, req);
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
      if (
        err.message === 'Group is already verified' ||
        err.message === 'A verification request is already pending'
      ) {
        res.status(409).json({ error: err.message });
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
 * GET /api/verification/groups/:groupId/status
 * Get current verification request status for a group (group coordinator)
 */
verificationRouter.get('/groups/:groupId/status', requireGroupCoordinator, async (req, res) => {
  try {
    const { groupId } = verificationGroupIdParamSchema.parse(req.params);
    const user = req.user!;

    // Verify the user belongs to this group
    if (user.groupId !== groupId) {
      res.status(403).json({ error: 'You can only view verification status for your own group' });
      return;
    }

    const request = await getGroupVerificationRequest(groupId);
    res.json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid group ID format' });
      return;
    }
    throw err;
  }
});

/**
 * GET /api/verification/requests
 * List verification requests (hub admin)
 */
verificationRouter.get('/requests', requireHubAdmin, async (req, res) => {
  try {
    const user = req.user!;

    if (!user.hubId) {
      res.status(400).json({ error: 'User is not associated with a hub' });
      return;
    }

    const query = listVerificationRequestsQuerySchema.parse(req.query);
    const result = await listVerificationRequests(user.hubId, query);
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
 * GET /api/verification/requests/:id
 * Get verification request details (hub admin)
 */
verificationRouter.get('/requests/:id', requireHubAdmin, async (req, res) => {
  try {
    const { id } = verificationRequestIdParamSchema.parse(req.params);
    const user = req.user!;

    if (!user.hubId) {
      res.status(400).json({ error: 'User is not associated with a hub' });
      return;
    }

    const request = await getVerificationRequest(id, user.hubId);

    if (!request) {
      res.status(404).json({ error: 'Verification request not found' });
      return;
    }

    // Also get attestations if peer attestation method
    let attestations: PeerAttestationResponse[] = [];
    if (request.method === 'peer_attestation') {
      attestations = await getAttestationsForRequest(id);
    }

    res.json({ request, attestations });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID format' });
      return;
    }
    throw err;
  }
});

/**
 * POST /api/verification/requests/:id/approve
 * Approve a verification request (hub admin)
 */
verificationRouter.post('/requests/:id/approve', requireHubAdmin, async (req, res) => {
  try {
    const { id } = verificationRequestIdParamSchema.parse(req.params);
    const user = req.user!;

    if (!user.hubId) {
      res.status(400).json({ error: 'User is not associated with a hub' });
      return;
    }

    const request = await approveVerificationRequest(id, user.hubId, user.id, req);
    res.json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID format' });
      return;
    }
    if (err instanceof Error) {
      if (err.message === 'Verification request not found') {
        res.status(404).json({ error: err.message });
        return;
      }
      if (
        err.message === 'Request has already been reviewed' ||
        err.message.includes('attestations')
      ) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    throw err;
  }
});

/**
 * POST /api/verification/requests/:id/deny
 * Deny a verification request with reason (hub admin)
 */
verificationRouter.post('/requests/:id/deny', requireHubAdmin, async (req, res) => {
  try {
    const { id } = verificationRequestIdParamSchema.parse(req.params);
    const { reason } = denyVerificationRequestSchema.parse(req.body);
    const user = req.user!;

    if (!user.hubId) {
      res.status(400).json({ error: 'User is not associated with a hub' });
      return;
    }

    const request = await denyVerificationRequest(id, user.hubId, user.id, reason, req);
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
      if (err.message === 'Verification request not found') {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.message === 'Request has already been reviewed') {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    throw err;
  }
});

/**
 * POST /api/verification/groups/:groupId/revoke
 * Revoke a group's verification (hub admin)
 */
verificationRouter.post('/groups/:groupId/revoke', requireHubAdmin, async (req, res) => {
  try {
    const { groupId } = verificationGroupIdParamSchema.parse(req.params);
    const user = req.user!;

    if (!user.hubId) {
      res.status(400).json({ error: 'User is not associated with a hub' });
      return;
    }

    await revokeGroupVerification(groupId, user.hubId, user.id, req);
    res.status(204).send();
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid group ID format' });
      return;
    }
    if (err instanceof Error) {
      if (err.message === 'Group not found') {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.message === 'Group is not verified') {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    throw err;
  }
});

/**
 * GET /api/verification/attestation-requests
 * Get pending attestation requests that this group can attest to (group coordinator)
 */
verificationRouter.get('/attestation-requests', requireGroupCoordinator, async (req, res) => {
  const user = req.user!;

  if (!user.groupId || !user.hubId) {
    res.status(400).json({ error: 'User is not associated with a group' });
    return;
  }

  const requests = await getPendingAttestationRequests(user.groupId, user.hubId);
  res.json({ requests });
});

/**
 * POST /api/verification/requests/:id/attest
 * Provide peer attestation for a group (verified group coordinator)
 */
verificationRouter.post('/requests/:id/attest', requireGroupCoordinator, async (req, res) => {
  try {
    const { id } = verificationRequestIdParamSchema.parse(req.params);
    const user = req.user!;

    if (!user.groupId) {
      res.status(400).json({ error: 'User is not associated with a group' });
      return;
    }

    const attestation = await submitPeerAttestation(id, user.groupId, user.id, req);
    res.status(201).json({ attestation });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID format' });
      return;
    }
    if (err instanceof Error) {
      if (err.message === 'Verification request not found') {
        res.status(404).json({ error: err.message });
        return;
      }
      if (
        err.message === 'Request has already been reviewed' ||
        err.message === 'This request does not accept peer attestations' ||
        err.message === 'Cannot attest for your own group' ||
        err.message === 'Only verified groups can provide attestations' ||
        err.message === 'Your group has already attested for this request'
      ) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    throw err;
  }
});
