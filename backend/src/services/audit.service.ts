import { db } from '../db/index.js';
import type { Executor } from '../db/executor.js';
import { auditLog, type NewAuditLogEntry } from '../db/schema/index.js';
import type { Request } from 'express';

type AuditAction = NewAuditLogEntry['action'];

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
  // req.ip rather than a hand-parsed header, for the same reason as the rate
  // limiter: the leftmost X-Forwarded-For entry is whatever the client sent, so
  // the old value was client-controlled and therefore useless as an audit
  // record. `trust proxy` is set to 1 hop in app.ts.
  //
  // Note this only ever runs on authenticated routes - auditMiddleware is
  // mounted after the anonymous routers in app.ts specifically so anonymous
  // traffic is never audited. Whether coordinator IPs should be retained at
  // all, and for how long, is the retention question in #12.
  const ipAddress = req ? (req.ip ?? req.socket.remoteAddress ?? null) : null;

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
