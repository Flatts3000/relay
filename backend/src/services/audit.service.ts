import { db } from '../db/index.js';
import type { Executor } from '../db/executor.js';
import { auditLog, type NewAuditLogEntry } from '../db/schema/index.js';

type AuditAction = NewAuditLogEntry['action'];

interface AuditParams {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(
  { userId, action, entityType, entityId, metadata }: AuditParams,
  executor: Executor = db
): Promise<void> {
  // No request object is taken, because nothing here needs one any more. The IP
  // address and user agent this used to record were never read by anything, and
  // an audit entry is already attributable through userId. See #70.
  //
  // This only ever runs on authenticated routes: auditMiddleware is mounted
  // after the anonymous routers in app.ts specifically so anonymous traffic is
  // never audited.
  await executor.insert(auditLog).values({
    userId,
    action,
    entityType,
    entityId,
    metadata: metadata ?? null,
  });
}

// Convenience methods
export async function logLogin(userId: string): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'login',
    entityType: 'user',
    entityId: userId,
  });
}

export async function logLogout(userId: string): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'logout',
    entityType: 'user',
    entityId: userId,
  });
}
