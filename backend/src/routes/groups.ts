import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireHubAdmin } from '../middleware/auth.js';
import {
  createGroup,
  getGroupById,
  listGroups,
  updateGroup,
  deleteGroup,
  canUserAccessGroup,
  canUserModifyGroup,
} from '../services/group.service.js';
import {
  createGroupSchema,
  updateGroupSchema,
  groupIdParamSchema,
  listGroupsQuerySchema,
} from '../validations/group.validation.js';

export const groupsRouter = Router();

/**
 * POST /api/groups - Create a new group
 * Used during group registration (hub admin creates group entry)
 */
groupsRouter.post('/', authenticate, requireHubAdmin, async (req, res) => {
  try {
    const input = createGroupSchema.parse(req.body);
    const user = req.user!;

    if (!user.hubId) {
      res.status(400).json({ error: 'User is not associated with a hub' });
      return;
    }

    const group = await createGroup(user.hubId, input, user.id, req);

    res.status(201).json({ group });
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
    throw err;
  }
});

/**
 * GET /api/groups - List all groups
 * Hub admins: see all groups in their hub
 * Group coordinators: see only their own group
 */
groupsRouter.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user!;

    if (user.role === 'hub_admin') {
      if (!user.hubId) {
        res.status(400).json({ error: 'User is not associated with a hub' });
        return;
      }

      const query = listGroupsQuerySchema.parse(req.query);
      const result = await listGroups(user.hubId, query);

      res.json(result);
    } else if (user.role === 'group_coordinator') {
      if (!user.groupId) {
        res.status(400).json({ error: 'User is not associated with a group' });
        return;
      }

      // Group coordinators can only see their own group
      const group = await getGroupById(user.groupId);

      if (!group) {
        res.json({ groups: [], total: 0 });
        return;
      }

      res.json({ groups: [group], total: 1 });
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
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
 * GET /api/groups/:id - Get a specific group
 * Hub admins: can view any group in their hub
 * Group coordinators: can only view their own group
 */
groupsRouter.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = groupIdParamSchema.parse(req.params);
    const user = req.user!;

    const canAccess = await canUserAccessGroup(user.id, user.role, user.hubId, user.groupId, id);

    if (!canAccess) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const group = await getGroupById(id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    res.json({ group });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid group ID format' });
      return;
    }
    throw err;
  }
});

/**
 * PATCH /api/groups/:id - Update a group's profile
 * Only the group coordinator for that specific group can update it
 */
groupsRouter.patch('/:id', authenticate, async (req, res) => {
  try {
    const { id } = groupIdParamSchema.parse(req.params);
    const input = updateGroupSchema.parse(req.body);
    const user = req.user!;

    const canModify = canUserModifyGroup(user.role, user.groupId, id);

    if (!canModify) {
      res.status(403).json({ error: 'You can only update your own group profile' });
      return;
    }

    const group = await updateGroup(id, input, user.id, req);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    res.json({ group });
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
    throw err;
  }
});

/**
 * DELETE /api/groups/:id - Soft delete a group
 * Only hub admins can delete groups in their hub
 */
groupsRouter.delete('/:id', authenticate, requireHubAdmin, async (req, res) => {
  try {
    const { id } = groupIdParamSchema.parse(req.params);
    const user = req.user!;

    if (!user.hubId) {
      res.status(400).json({ error: 'User is not associated with a hub' });
      return;
    }

    // Verify the group belongs to this hub before deleting
    const group = await getGroupById(id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    if (group.hubId !== user.hubId) {
      res.status(403).json({ error: 'You can only delete groups in your hub' });
      return;
    }

    const deleted = await deleteGroup(id, user.id, req);

    if (!deleted) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid group ID format' });
      return;
    }
    throw err;
  }
});
