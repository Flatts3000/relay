import { db } from '../db/index.js';
import { auditLog, type NewAuditLogEntry } from '../db/schema/index.js';
import type { Request } from 'express';

type AuditAction = NewAuditLogEntry['action'];

/**
 * Either the pool-backed client or an open transaction. Callers that write an
 * audit entry alongside the change it describes should pass their transaction,
 * so the entry commits or rolls back with the change rather than separately.
 */
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

interface AuditParams {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

export async function logAuditEvent(
  { userId, action, entityType, entityId, metadata, req }: AuditParams,
  executor: Executor = db
): Promise<void> {
  const ipAddress = req
    ? (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null
    : null;

  const userAgent = req ? req.headers['user-agent']?.slice(0, 500) : null;

  await executor.insert(auditLog).values({
    userId,
    action,
    entityType,
    entityId,
    metadata: metadata ?? null,
    ipAddress,
    userAgent,
  });
}

// Convenience methods
export async function logLogin(userId: string, req: Request): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'login',
    entityType: 'user',
    entityId: userId,
    req,
  });
}

export async function logLogout(userId: string, req: Request): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'logout',
    entityType: 'user',
    entityId: userId,
    req,
  });
}
