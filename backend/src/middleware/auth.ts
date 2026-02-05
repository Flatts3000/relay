import type { RequestHandler } from 'express';
import { validateSession } from '../services/auth.service.js';
import type { User } from '../db/schema/index.js';

// Extend Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
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

export const requireRole = (...roles: Array<'hub_admin' | 'group_coordinator'>): RequestHandler => {
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
