import { db } from '../db/index.js';
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

export async function logAuditEvent({
  userId,
  action,
  entityType,
  entityId,
  metadata,
  req,
}: AuditParams): Promise<void> {
  const ipAddress = req
    ? (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null
    : null;

  const userAgent = req ? req.headers['user-agent']?.slice(0, 500) : null;

  await db.insert(auditLog).values({
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
