import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireStaffAdmin } from '../middleware/auth.js';
import * as adminService from '../services/admin.service.js';
import {
  listQuerySchema,
  listGroupsAdminQuerySchema,
  listUsersAdminQuerySchema,
  listVerificationAdminQuerySchema,
  listFundingAdminQuerySchema,
  auditLogQuerySchema,
  updateUserRoleSchema,
  idParamSchema,
  denyVerificationSchema,
  declineFundingSchema,
} from '../validations/admin.validation.js';

export const adminRouter = Router();

// All admin routes require authentication + staff_admin role
adminRouter.use(authenticate, requireStaffAdmin);

// ---------- Overview ----------

adminRouter.get('/overview', async (_req, res) => {
  const overview = await adminService.getAdminOverview();
  res.json(overview);
});

// ---------- Hubs ----------

adminRouter.get('/hubs', async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await adminService.listHubs(query);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: err.errors });
      return;
    }
    throw err;
  }
});

adminRouter.get('/hubs/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const hub = await adminService.getHub(id);
    if (!hub) {
      res.status(404).json({ error: 'Hub not found' });
      return;
    }
    res.json(hub);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid hub ID' });
      return;
    }
    throw err;
  }
});

// ---------- Groups ----------

adminRouter.get('/groups', async (req, res) => {
  try {
    const query = listGroupsAdminQuerySchema.parse(req.query);
    const result = await adminService.listGroups(query);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: err.errors });
      return;
    }
    throw err;
  }
});

adminRouter.get('/groups/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const group = await adminService.getGroup(id);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    res.json(group);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid group ID' });
      return;
    }
    throw err;
  }
});

// ---------- Users ----------

adminRouter.get('/users', async (req, res) => {
  try {
    const query = listUsersAdminQuerySchema.parse(req.query);
    const result = await adminService.listUsers(query);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: err.errors });
      return;
    }
    throw err;
  }
});

adminRouter.get('/users/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const user = await adminService.getUser(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }
    throw err;
  }
});

adminRouter.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { role } = updateUserRoleSchema.parse(req.body);
    const updated = await adminService.updateUserRole(id, role, req.user!.id, req);
    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ id: updated.id, email: updated.email, role: updated.role });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: err.errors });
      return;
    }
    throw err;
  }
});

adminRouter.delete('/users/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    // Prevent self-deletion
    if (id === req.user!.id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    const deleted = await adminService.softDeleteUser(id, req.user!.id, req);
    if (!deleted) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }
    throw err;
  }
});

// ---------- Verification Requests ----------

adminRouter.get('/verification', async (req, res) => {
  try {
    const query = listVerificationAdminQuerySchema.parse(req.query);
    const result = await adminService.listVerificationRequests(query);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: err.errors });
      return;
    }
    throw err;
  }
});

adminRouter.get('/verification/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const request = await adminService.getVerificationRequest(id);
    if (!request) {
      res.status(404).json({ error: 'Verification request not found' });
      return;
    }
    res.json(request);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }
    throw err;
  }
});

adminRouter.patch('/verification/:id/approve', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await adminService.approveVerificationRequest(id, req.user!.id, req);
    if ('error' in result) {
      const status = result.error === 'not_found' ? 404 : 409;
      res
        .status(status)
        .json({
          error:
            result.error === 'not_found'
              ? 'Verification request not found'
              : 'Request is not in pending status',
        });
      return;
    }
    res.json({ message: 'Verification request approved' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }
    throw err;
  }
});

adminRouter.patch('/verification/:id/deny', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { reason } = denyVerificationSchema.parse(req.body);
    const result = await adminService.denyVerificationRequest(id, req.user!.id, reason, req);
    if ('error' in result) {
      const status = result.error === 'not_found' ? 404 : 409;
      res
        .status(status)
        .json({
          error:
            result.error === 'not_found'
              ? 'Verification request not found'
              : 'Request is not in pending status',
        });
      return;
    }
    res.json({ message: 'Verification request denied' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: err.errors });
      return;
    }
    throw err;
  }
});

// ---------- Funding Requests ----------

adminRouter.get('/funding-requests', async (req, res) => {
  try {
    const query = listFundingAdminQuerySchema.parse(req.query);
    const result = await adminService.listFundingRequests(query);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: err.errors });
      return;
    }
    throw err;
  }
});

adminRouter.get('/funding-requests/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const request = await adminService.getFundingRequest(id);
    if (!request) {
      res.status(404).json({ error: 'Funding request not found' });
      return;
    }
    res.json(request);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }
    throw err;
  }
});

adminRouter.patch('/funding-requests/:id/approve', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await adminService.adminApproveFundingRequest(id, req.user!.id, req);
    if ('error' in result) {
      const status = result.error === 'not_found' ? 404 : 409;
      res
        .status(status)
        .json({
          error:
            result.error === 'not_found'
              ? 'Funding request not found'
              : 'Invalid status transition',
        });
      return;
    }
    res.json({ message: 'Funding request approved' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }
    throw err;
  }
});

adminRouter.patch('/funding-requests/:id/decline', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { reason } = declineFundingSchema.parse(req.body);
    const result = await adminService.adminDeclineFundingRequest(id, req.user!.id, reason, req);
    if ('error' in result) {
      const status = result.error === 'not_found' ? 404 : 409;
      res
        .status(status)
        .json({
          error:
            result.error === 'not_found'
              ? 'Funding request not found'
              : 'Invalid status transition',
        });
      return;
    }
    res.json({ message: 'Funding request declined' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: err.errors });
      return;
    }
    throw err;
  }
});

adminRouter.patch('/funding-requests/:id/send-funds', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await adminService.adminMarkFundsSent(id, req.user!.id, req);
    if ('error' in result) {
      const status = result.error === 'not_found' ? 404 : 409;
      res
        .status(status)
        .json({
          error:
            result.error === 'not_found'
              ? 'Funding request not found'
              : 'Invalid status transition',
        });
      return;
    }
    res.json({ message: 'Funds marked as sent' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }
    throw err;
  }
});

adminRouter.patch('/funding-requests/:id/acknowledge', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await adminService.adminAcknowledgeFunding(id, req.user!.id, req);
    if ('error' in result) {
      const status = result.error === 'not_found' ? 404 : 409;
      res
        .status(status)
        .json({
          error:
            result.error === 'not_found'
              ? 'Funding request not found'
              : 'Invalid status transition',
        });
      return;
    }
    res.json({ message: 'Funding acknowledged' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }
    throw err;
  }
});

// ---------- Audit Log ----------

adminRouter.get('/audit-log', async (req, res) => {
  try {
    const query = auditLogQuerySchema.parse(req.query);
    const result = await adminService.getAuditLog(query);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: err.errors });
      return;
    }
    throw err;
  }
});
