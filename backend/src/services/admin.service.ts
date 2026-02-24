import { eq, and, isNull, ilike, sql, desc, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  hubs,
  groups,
  users,
  verificationRequests,
  fundingRequests,
  fundingRequestStatusHistory,
  auditLog,
  hubMembers,
  groupMembers,
  groupHubMemberships,
} from '../db/schema/index.js';
import { logAuditEvent } from './audit.service.js';
import type { Request } from 'express';
import type {
  ListQuery,
  ListGroupsAdminQuery,
  ListUsersAdminQuery,
  ListVerificationAdminQuery,
  ListFundingAdminQuery,
  AuditLogQuery,
} from '../validations/admin.validation.js';

type RequestStatus = 'submitted' | 'approved' | 'declined' | 'funds_sent' | 'acknowledged';

const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  submitted: ['approved', 'declined'],
  approved: ['funds_sent'],
  declined: [],
  funds_sent: ['acknowledged'],
  acknowledged: [],
};

// ---------- Overview ----------

export async function getAdminOverview() {
  const [hubCount] = await db.select({ count: count() }).from(hubs).where(isNull(hubs.deletedAt));

  const [groupCount] = await db
    .select({ count: count() })
    .from(groups)
    .where(isNull(groups.deletedAt));

  const [userCount] = await db
    .select({ count: count() })
    .from(users)
    .where(isNull(users.deletedAt));

  const [pendingVerification] = await db
    .select({ count: count() })
    .from(verificationRequests)
    .where(eq(verificationRequests.status, 'pending'));

  const [fundingRequestCount] = await db
    .select({ count: count() })
    .from(fundingRequests)
    .where(isNull(fundingRequests.deletedAt));

  const [approvedFunding] = await db
    .select({ total: sql<string>`COALESCE(SUM(${fundingRequests.amount}::numeric), 0)` })
    .from(fundingRequests)
    .where(and(isNull(fundingRequests.deletedAt), eq(fundingRequests.status, 'approved')));

  return {
    totalHubs: hubCount!.count,
    totalGroups: groupCount!.count,
    totalUsers: userCount!.count,
    pendingVerifications: pendingVerification!.count,
    totalFundingRequests: fundingRequestCount!.count,
    totalFundsApproved: approvedFunding!.total,
  };
}

// ---------- Hubs ----------

export async function listHubs(query: ListQuery) {
  const conditions = [isNull(hubs.deletedAt)];

  if (query.search) {
    conditions.push(ilike(hubs.name, `%${query.search}%`));
  }

  const offset = (query.page - 1) * query.limit;

  const [totalResult] = await db
    .select({ count: count() })
    .from(hubs)
    .where(and(...conditions));

  const rows = await db
    .select({
      id: hubs.id,
      name: hubs.name,
      contactEmail: hubs.contactEmail,
      createdAt: hubs.createdAt,
      groupCount: sql<number>`(
        SELECT COUNT(*) FROM group_hub_memberships ghm
        INNER JOIN groups g ON ghm.group_id = g.id
        WHERE ghm.hub_id = ${hubs.id} AND g.deleted_at IS NULL
      )::int`,
    })
    .from(hubs)
    .where(and(...conditions))
    .orderBy(hubs.name)
    .limit(query.limit)
    .offset(offset);

  return {
    data: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    total: totalResult!.count,
    page: query.page,
    limit: query.limit,
  };
}

export async function getHub(hubId: string) {
  const [hub] = await db
    .select()
    .from(hubs)
    .where(and(eq(hubs.id, hubId), isNull(hubs.deletedAt)))
    .limit(1);

  if (!hub) return null;

  const hubGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      serviceArea: groups.serviceArea,
      verificationStatus: groupHubMemberships.verificationStatus,
      contactEmail: groups.contactEmail,
      createdAt: groups.createdAt,
    })
    .from(groupHubMemberships)
    .innerJoin(groups, eq(groupHubMemberships.groupId, groups.id))
    .where(and(eq(groupHubMemberships.hubId, hubId), isNull(groups.deletedAt)))
    .orderBy(groups.name);

  const [userCount] = await db
    .select({ count: count() })
    .from(hubMembers)
    .innerJoin(users, eq(hubMembers.userId, users.id))
    .where(and(eq(hubMembers.hubId, hubId), isNull(users.deletedAt)));

  return {
    id: hub.id,
    name: hub.name,
    contactEmail: hub.contactEmail,
    createdAt: hub.createdAt.toISOString(),
    updatedAt: hub.updatedAt.toISOString(),
    groups: hubGroups.map((g) => ({
      ...g,
      createdAt: g.createdAt.toISOString(),
    })),
    userCount: userCount!.count,
  };
}

// ---------- Groups ----------

export async function listGroups(query: ListGroupsAdminQuery) {
  const conditions = [isNull(groups.deletedAt)];

  if (query.search) {
    conditions.push(
      sql`(${ilike(groups.name, `%${query.search}%`)} OR ${ilike(groups.serviceArea, `%${query.search}%`)})`
    );
  }

  if (query.status) {
    conditions.push(eq(groupHubMemberships.verificationStatus, query.status));
  }

  if (query.hubId) {
    conditions.push(eq(groupHubMemberships.hubId, query.hubId));
  }

  const offset = (query.page - 1) * query.limit;

  // For count, we need to join through groupHubMemberships too if filtering by status or hubId
  const countQuery = db
    .select({ count: count() })
    .from(groups)
    .leftJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .where(and(...conditions));

  const [totalResult] = await countQuery;

  const rows = await db
    .select({
      id: groups.id,
      hubId: groupHubMemberships.hubId,
      hubName: hubs.name,
      name: groups.name,
      serviceArea: groups.serviceArea,
      aidCategories: groups.aidCategories,
      contactEmail: groups.contactEmail,
      verificationStatus: groupHubMemberships.verificationStatus,
      createdAt: groups.createdAt,
    })
    .from(groups)
    .leftJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .leftJoin(hubs, eq(groupHubMemberships.hubId, hubs.id))
    .where(and(...conditions))
    .orderBy(groups.name)
    .limit(query.limit)
    .offset(offset);

  return {
    data: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    total: totalResult!.count,
    page: query.page,
    limit: query.limit,
  };
}

export async function getGroup(groupId: string) {
  const [row] = await db
    .select({
      id: groups.id,
      name: groups.name,
      serviceArea: groups.serviceArea,
      aidCategories: groups.aidCategories,
      contactEmail: groups.contactEmail,
      createdAt: groups.createdAt,
      updatedAt: groups.updatedAt,
    })
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .limit(1);

  if (!row) return null;

  // Get hub associations
  const hubAssociations = await db
    .select({
      hubId: groupHubMemberships.hubId,
      hubName: hubs.name,
      verificationStatus: groupHubMemberships.verificationStatus,
    })
    .from(groupHubMemberships)
    .innerJoin(hubs, eq(groupHubMemberships.hubId, hubs.id))
    .where(eq(groupHubMemberships.groupId, groupId));

  // Get coordinator via group_members
  const [coordinator] = await db
    .select({ email: users.email })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(and(eq(groupMembers.groupId, groupId), isNull(users.deletedAt)))
    .limit(1);

  // Get funding request counts
  const [frCount] = await db
    .select({ count: count() })
    .from(fundingRequests)
    .where(and(eq(fundingRequests.groupId, groupId), isNull(fundingRequests.deletedAt)));

  return {
    ...row,
    hubAssociations,
    coordinatorEmail: coordinator?.email ?? null,
    fundingRequestCount: frCount!.count,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---------- Users ----------

export async function listUsers(query: ListUsersAdminQuery) {
  const conditions = [isNull(users.deletedAt)];

  if (query.search) {
    conditions.push(ilike(users.email, `%${query.search}%`));
  }

  if (query.role) {
    conditions.push(eq(users.role, query.role));
  }

  const offset = (query.page - 1) * query.limit;

  const [totalResult] = await db
    .select({ count: count() })
    .from(users)
    .where(and(...conditions));

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      hubName: hubs.name,
      groupName: groups.name,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .leftJoin(hubMembers, eq(users.id, hubMembers.userId))
    .leftJoin(hubs, eq(hubMembers.hubId, hubs.id))
    .leftJoin(groupMembers, eq(users.id, groupMembers.userId))
    .leftJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(and(...conditions))
    .orderBy(users.email)
    .limit(query.limit)
    .offset(offset);

  return {
    data: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
    })),
    total: totalResult!.count,
    page: query.page,
    limit: query.limit,
  };
}

export async function getUser(userId: string) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      hubId: hubMembers.hubId,
      groupId: groupMembers.groupId,
      hubName: hubs.name,
      groupName: groups.name,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .leftJoin(hubMembers, eq(users.id, hubMembers.userId))
    .leftJoin(hubs, eq(hubMembers.hubId, hubs.id))
    .leftJoin(groupMembers, eq(users.id, groupMembers.userId))
    .leftJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  };
}

export async function updateUserRole(
  userId: string,
  newRole: string,
  adminUserId: string,
  req: Request
) {
  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (!existing) return null;

  const oldRole = existing.role;
  const now = new Date();

  const [updated] = await db
    .update(users)
    .set({ role: newRole as typeof existing.role, updatedAt: now })
    .where(eq(users.id, userId))
    .returning();

  await logAuditEvent({
    userId: adminUserId,
    action: 'update',
    entityType: 'user',
    entityId: userId,
    metadata: { oldRole, newRole },
    req,
  });

  return updated;
}

export async function softDeleteUser(userId: string, adminUserId: string, req: Request) {
  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (!existing) return false;

  const now = new Date();
  await db.update(users).set({ deletedAt: now, updatedAt: now }).where(eq(users.id, userId));

  await logAuditEvent({
    userId: adminUserId,
    action: 'delete',
    entityType: 'user',
    entityId: userId,
    metadata: { email: existing.email, role: existing.role },
    req,
  });

  return true;
}

// ---------- Verification Requests ----------

export async function listVerificationRequests(query: ListVerificationAdminQuery) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (query.status) {
    conditions.push(eq(verificationRequests.status, query.status));
  }

  const offset = (query.page - 1) * query.limit;

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(verificationRequests)
    .where(whereClause);

  const rows = await db
    .select({
      id: verificationRequests.id,
      groupId: verificationRequests.groupId,
      groupName: groups.name,
      groupServiceArea: groups.serviceArea,
      method: verificationRequests.method,
      status: verificationRequests.status,
      sponsorInfo: verificationRequests.sponsorInfo,
      reviewedBy: verificationRequests.reviewedBy,
      reviewedAt: verificationRequests.reviewedAt,
      denialReason: verificationRequests.denialReason,
      createdAt: verificationRequests.createdAt,
    })
    .from(verificationRequests)
    .innerJoin(groups, eq(verificationRequests.groupId, groups.id))
    .where(whereClause)
    .orderBy(desc(verificationRequests.createdAt))
    .limit(query.limit)
    .offset(offset);

  return {
    data: rows.map((r) => ({
      ...r,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total: totalResult!.count,
    page: query.page,
    limit: query.limit,
  };
}

// ---------- Funding Requests ----------

export async function listFundingRequests(query: ListFundingAdminQuery) {
  const conditions = [isNull(fundingRequests.deletedAt)];

  if (query.status) {
    conditions.push(eq(fundingRequests.status, query.status));
  }

  if (query.groupId) {
    conditions.push(eq(fundingRequests.groupId, query.groupId));
  }

  const offset = (query.page - 1) * query.limit;

  const [totalResult] = await db
    .select({ count: count() })
    .from(fundingRequests)
    .where(and(...conditions));

  const rows = await db
    .select({
      id: fundingRequests.id,
      groupId: fundingRequests.groupId,
      groupName: groups.name,
      amount: fundingRequests.amount,
      category: fundingRequests.category,
      urgency: fundingRequests.urgency,
      region: fundingRequests.region,
      status: fundingRequests.status,
      submittedAt: fundingRequests.submittedAt,
      createdAt: fundingRequests.createdAt,
    })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .where(and(...conditions))
    .orderBy(desc(fundingRequests.createdAt))
    .limit(query.limit)
    .offset(offset);

  return {
    data: rows.map((r) => ({
      ...r,
      submittedAt: r.submittedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
    total: totalResult!.count,
    page: query.page,
    limit: query.limit,
  };
}

export async function getFundingRequest(requestId: string) {
  const [row] = await db
    .select({
      id: fundingRequests.id,
      groupId: fundingRequests.groupId,
      groupName: groups.name,
      amount: fundingRequests.amount,
      category: fundingRequests.category,
      urgency: fundingRequests.urgency,
      region: fundingRequests.region,
      justification: fundingRequests.justification,
      status: fundingRequests.status,
      declineReason: fundingRequests.declineReason,
      clarificationRequest: fundingRequests.clarificationRequest,
      approvedBy: fundingRequests.approvedBy,
      submittedAt: fundingRequests.submittedAt,
      approvedAt: fundingRequests.approvedAt,
      declinedAt: fundingRequests.declinedAt,
      fundsSentAt: fundingRequests.fundsSentAt,
      acknowledgedAt: fundingRequests.acknowledgedAt,
    })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .where(and(eq(fundingRequests.id, requestId), isNull(fundingRequests.deletedAt)))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    submittedAt: row.submittedAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    declinedAt: row.declinedAt?.toISOString() ?? null,
    fundsSentAt: row.fundsSentAt?.toISOString() ?? null,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
  };
}

// ---------- Audit Log ----------

export async function getAuditLog(query: AuditLogQuery) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (query.userId) {
    conditions.push(eq(auditLog.userId, query.userId));
  }

  if (query.action) {
    conditions.push(eq(auditLog.action, query.action));
  }

  if (query.entityType) {
    conditions.push(eq(auditLog.entityType, query.entityType));
  }

  const offset = (query.page - 1) * query.limit;

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ count: count() }).from(auditLog).where(whereClause);

  const rows = await db
    .select({
      id: auditLog.id,
      userId: auditLog.userId,
      userEmail: users.email,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(whereClause)
    .orderBy(desc(auditLog.createdAt))
    .limit(query.limit)
    .offset(offset);

  return {
    data: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    total: totalResult!.count,
    page: query.page,
    limit: query.limit,
  };
}

// ---------- Verification Actions ----------

export async function getVerificationRequest(requestId: string) {
  const [row] = await db
    .select({
      id: verificationRequests.id,
      groupId: verificationRequests.groupId,
      groupName: groups.name,
      groupServiceArea: groups.serviceArea,
      method: verificationRequests.method,
      status: verificationRequests.status,
      sponsorInfo: verificationRequests.sponsorInfo,
      reviewedBy: verificationRequests.reviewedBy,
      reviewedAt: verificationRequests.reviewedAt,
      denialReason: verificationRequests.denialReason,
      createdAt: verificationRequests.createdAt,
    })
    .from(verificationRequests)
    .innerJoin(groups, eq(verificationRequests.groupId, groups.id))
    .where(eq(verificationRequests.id, requestId))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function approveVerificationRequest(
  requestId: string,
  adminUserId: string,
  req: Request
) {
  const [existing] = await db
    .select()
    .from(verificationRequests)
    .where(eq(verificationRequests.id, requestId))
    .limit(1);

  if (!existing) return { error: 'not_found' as const };
  if (existing.status !== 'pending') return { error: 'invalid_status' as const };

  const now = new Date();

  await db
    .update(verificationRequests)
    .set({
      status: 'approved',
      reviewedBy: adminUserId,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(verificationRequests.id, requestId));

  // Update the group_hub_membership's verification status instead of groups directly
  if (existing.hubId) {
    await db
      .update(groupHubMemberships)
      .set({ verificationStatus: 'verified', updatedAt: now })
      .where(
        and(
          eq(groupHubMemberships.groupId, existing.groupId),
          eq(groupHubMemberships.hubId, existing.hubId)
        )
      );
  }

  await logAuditEvent({
    userId: adminUserId,
    action: 'approve',
    entityType: 'verification_request',
    entityId: requestId,
    metadata: { groupId: existing.groupId },
    req,
  });

  return { success: true };
}

export async function denyVerificationRequest(
  requestId: string,
  adminUserId: string,
  reason: string,
  req: Request
) {
  const [existing] = await db
    .select()
    .from(verificationRequests)
    .where(eq(verificationRequests.id, requestId))
    .limit(1);

  if (!existing) return { error: 'not_found' as const };
  if (existing.status !== 'pending') return { error: 'invalid_status' as const };

  const now = new Date();

  await db
    .update(verificationRequests)
    .set({
      status: 'denied',
      reviewedBy: adminUserId,
      reviewedAt: now,
      denialReason: reason,
      updatedAt: now,
    })
    .where(eq(verificationRequests.id, requestId));

  await logAuditEvent({
    userId: adminUserId,
    action: 'decline',
    entityType: 'verification_request',
    entityId: requestId,
    metadata: { groupId: existing.groupId, reason },
    req,
  });

  return { success: true };
}

// ---------- Funding Request Actions ----------

async function recordStatusChange(
  fundingRequestId: string,
  status: RequestStatus,
  changedBy: string,
  notes?: string
): Promise<void> {
  await db.insert(fundingRequestStatusHistory).values({
    fundingRequestId,
    status,
    changedBy,
    notes: notes ?? null,
  });
}

export async function adminApproveFundingRequest(
  requestId: string,
  adminUserId: string,
  req: Request
) {
  const [existing] = await db
    .select()
    .from(fundingRequests)
    .where(and(eq(fundingRequests.id, requestId), isNull(fundingRequests.deletedAt)))
    .limit(1);

  if (!existing) return { error: 'not_found' as const };
  if (!VALID_TRANSITIONS[existing.status as RequestStatus]?.includes('approved')) {
    return { error: 'invalid_transition' as const };
  }

  const now = new Date();

  await db
    .update(fundingRequests)
    .set({ status: 'approved', approvedBy: adminUserId, approvedAt: now, updatedAt: now })
    .where(eq(fundingRequests.id, requestId));

  await recordStatusChange(requestId, 'approved', adminUserId);

  await logAuditEvent({
    userId: adminUserId,
    action: 'approve',
    entityType: 'funding_request',
    entityId: requestId,
    metadata: { amount: existing.amount },
    req,
  });

  return { success: true };
}

export async function adminDeclineFundingRequest(
  requestId: string,
  adminUserId: string,
  reason: string,
  req: Request
) {
  const [existing] = await db
    .select()
    .from(fundingRequests)
    .where(and(eq(fundingRequests.id, requestId), isNull(fundingRequests.deletedAt)))
    .limit(1);

  if (!existing) return { error: 'not_found' as const };
  if (!VALID_TRANSITIONS[existing.status as RequestStatus]?.includes('declined')) {
    return { error: 'invalid_transition' as const };
  }

  const now = new Date();

  await db
    .update(fundingRequests)
    .set({ status: 'declined', declineReason: reason, declinedAt: now, updatedAt: now })
    .where(eq(fundingRequests.id, requestId));

  await recordStatusChange(requestId, 'declined', adminUserId, reason);

  await logAuditEvent({
    userId: adminUserId,
    action: 'decline',
    entityType: 'funding_request',
    entityId: requestId,
    metadata: { reason },
    req,
  });

  return { success: true };
}

export async function adminMarkFundsSent(requestId: string, adminUserId: string, req: Request) {
  const [existing] = await db
    .select()
    .from(fundingRequests)
    .where(and(eq(fundingRequests.id, requestId), isNull(fundingRequests.deletedAt)))
    .limit(1);

  if (!existing) return { error: 'not_found' as const };
  if (!VALID_TRANSITIONS[existing.status as RequestStatus]?.includes('funds_sent')) {
    return { error: 'invalid_transition' as const };
  }

  const now = new Date();

  await db
    .update(fundingRequests)
    .set({ status: 'funds_sent', fundsSentAt: now, updatedAt: now })
    .where(eq(fundingRequests.id, requestId));

  await recordStatusChange(requestId, 'funds_sent', adminUserId);

  await logAuditEvent({
    userId: adminUserId,
    action: 'send_funds',
    entityType: 'funding_request',
    entityId: requestId,
    metadata: { amount: existing.amount },
    req,
  });

  return { success: true };
}

export async function adminAcknowledgeFunding(
  requestId: string,
  adminUserId: string,
  req: Request
) {
  const [existing] = await db
    .select()
    .from(fundingRequests)
    .where(and(eq(fundingRequests.id, requestId), isNull(fundingRequests.deletedAt)))
    .limit(1);

  if (!existing) return { error: 'not_found' as const };
  if (!VALID_TRANSITIONS[existing.status as RequestStatus]?.includes('acknowledged')) {
    return { error: 'invalid_transition' as const };
  }

  const now = new Date();

  await db
    .update(fundingRequests)
    .set({ status: 'acknowledged', acknowledgedAt: now, updatedAt: now })
    .where(eq(fundingRequests.id, requestId));

  await recordStatusChange(requestId, 'acknowledged', adminUserId);

  await logAuditEvent({
    userId: adminUserId,
    action: 'acknowledge',
    entityType: 'funding_request',
    entityId: requestId,
    metadata: {},
    req,
  });

  return { success: true };
}
