import type { RequestHandler, Request, Response, NextFunction } from 'express';
import { logAuditEvent } from '../services/audit.service.js';
import type { NewAuditLogEntry } from '../db/schema/index.js';

// Paths that should NEVER have audit logging (anonymous routes)
const ANONYMOUS_PATHS = ['/api/mailbox'];

// Map HTTP methods to audit actions
function getAuditAction(method: string, path: string): NewAuditLogEntry['action'] | null {
  // Login/logout have their own audit calls, skip here
  if (path.includes('/auth/verify')) return 'login';
  if (path.includes('/auth/logout')) return 'logout';

  switch (method) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return null; // Don't audit GET requests
  }
}

// Extract entity type from path
function getEntityType(path: string): string {
  // Remove /api/ prefix and get first segment
  const segments = path.replace(/^\/api\//, '').split('/');
  return segments[0] || 'unknown';
}

// Extract entity ID from path (assumes RESTful /api/resource/:id pattern)
function getEntityId(path: string): string | undefined {
  const segments = path.replace(/^\/api\//, '').split('/');
  // UUID pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  for (const segment of segments) {
    if (uuidPattern.test(segment)) {
      return segment;
    }
  }
  return undefined;
}

/**
 * Audit logging middleware for authenticated routes.
 *
 * CRITICAL: This middleware MUST NOT be applied to /api/mailbox/* routes.
 * Anonymous routes must have NO audit logging to protect user privacy.
 *
 * This middleware:
 * 1. Checks if route is anonymous (skip if so)
 * 2. Only logs mutating operations (POST, PUT, PATCH, DELETE)
 * 3. Logs after the response is sent (to capture success/failure)
 * 4. Includes user ID, action, entity type, and entity ID
 */
export const auditMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // CRITICAL: Skip audit logging for anonymous routes
  const isAnonymousRoute = ANONYMOUS_PATHS.some((path) => req.path.startsWith(path));
  if (isAnonymousRoute) {
    return next();
  }

  // Skip if no user (unauthenticated request)
  if (!req.user) {
    return next();
  }

  // Get audit action based on HTTP method
  const action = getAuditAction(req.method, req.path);

  // Skip GET requests and other non-auditable actions
  if (!action) {
    return next();
  }

  // Capture response finish to log after completion
  res.on('finish', () => {
    // Only log successful operations (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const entityType = getEntityType(req.path);
      const entityId = getEntityId(req.path);

      logAuditEvent({
        userId: req.user?.id,
        action,
        entityType,
        entityId,
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          requestId: req.requestId,
        },
        req,
      }).catch((err) => {
        // Log error but don't fail the request
        console.error('Failed to log audit event:', err);
      });
    }
  });

  next();
};

/**
 * Create audit middleware for specific routes.
 * Use this when you need custom audit logging for specific operations.
 */
export function createAuditMiddleware(
  action: NewAuditLogEntry['action'],
  entityType: string
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // CRITICAL: Never audit anonymous routes
    const isAnonymousRoute = ANONYMOUS_PATHS.some((path) => req.path.startsWith(path));
    if (isAnonymousRoute) {
      return next();
    }

    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = getEntityId(req.path) || req.params?.['id'];

        logAuditEvent({
          userId: req.user.id,
          action,
          entityType,
          entityId,
          metadata: {
            requestId: req.requestId,
          },
          req,
        }).catch((err) => {
          console.error('Failed to log audit event:', err);
        });
      }
    });

    next();
  };
}
