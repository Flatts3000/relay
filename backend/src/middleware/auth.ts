import type { RequestHandler } from 'express';
import { validateSession, type AuthenticatedUser } from '../services/auth.service.js';

// Extend Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

export const authenticate: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const sessionToken = authHeader.slice(7);
  const user = await validateSession(sessionToken);

  if (!user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  req.user = user;
  req.sessionToken = sessionToken;
  next();
};

export const requireRole = (
  ...roles: Array<'hub_admin' | 'group_coordinator' | 'staff_admin'>
): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requireHubAdmin: RequestHandler = requireRole('hub_admin');
export const requireGroupCoordinator: RequestHandler = requireRole('group_coordinator');
export const requireStaffAdmin: RequestHandler = requireRole('staff_admin');

/**
 * Middleware factory that verifies the authenticated user belongs to a specific group.
 * Used to ensure group coordinators can only access their own group's resources.
 *
 * @param groupIdParam - The name of the route parameter containing the group ID (default: 'groupId')
 *
 * Usage:
 *   router.get('/groups/:groupId/details', authenticate, requireGroupMember('groupId'), handler);
 *   router.get('/groups/:id', authenticate, requireGroupMember('id'), handler);
 */
export const requireGroupMember = (groupIdParam: string = 'groupId'): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const groupId = req.params[groupIdParam];

    if (!groupId) {
      res.status(400).json({ error: 'Group ID is required' });
      return;
    }

    // Staff admins can access any group
    if (req.user.role === 'staff_admin') {
      next();
      return;
    }

    // Hub admins can access groups in their hub (verified via group_hub_memberships)
    if (req.user.role === 'hub_admin' && req.user.hubId) {
      // The hub_admin's hubId is enriched from membership tables.
      // Route-level service calls will verify group→hub association via group_hub_memberships.
      next();
      return;
    }

    // Group coordinators can only access their own group
    if (req.user.groupId !== groupId) {
      res.status(403).json({ error: 'You do not have access to this group' });
      return;
    }

    next();
  };
};

/**
 * Middleware that verifies the user can access a specific hub.
 * Hub admins can only access their own hub.
 *
 * @param hubIdParam - The name of the route parameter containing the hub ID (default: 'hubId')
 */
export const requireHubMember = (hubIdParam: string = 'hubId'): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hubId = req.params[hubIdParam];

    if (!hubId) {
      res.status(400).json({ error: 'Hub ID is required' });
      return;
    }

    // Staff admins can access any hub
    if (req.user.role === 'staff_admin') {
      next();
      return;
    }

    // Check user belongs to this hub
    if (req.user.hubId !== hubId) {
      res.status(403).json({ error: 'You do not have access to this hub' });
      return;
    }

    next();
  };
};
