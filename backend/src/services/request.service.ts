import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  fundingRequests,
  fundingRequestStatusHistory,
  groups,
  type FundingRequest,
} from '../db/schema/index.js';
import { logAuditEvent } from './audit.service.js';
import type { Request } from 'express';
import type {
  CreateFundingRequestInput,
  FundingRequestResponse,
  StatusHistoryResponse,
  ListFundingRequestsQuery,
  AidCategory,
  Urgency,
  RequestStatus,
} from '../validations/request.validation.js';

// Valid status transitions
const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  submitted: ['approved', 'declined'],
  approved: ['funds_sent'],
  declined: [], // Terminal state
  funds_sent: ['acknowledged'],
  acknowledged: [], // Terminal state
};

/**
 * Transform a funding request into an API response
 */
function toFundingRequestResponse(
  request: FundingRequest,
  groupName: string
): FundingRequestResponse {
  return {
    id: request.id,
    groupId: request.groupId,
    groupName,
    amount: request.amount,
    category: request.category as AidCategory,
    urgency: request.urgency as Urgency,
    region: request.region,
    justification: request.justification,
    status: request.status as RequestStatus,
    declineReason: request.declineReason,
    clarificationRequest: request.clarificationRequest,
    approvedBy: request.approvedBy,
    submittedAt: request.submittedAt.toISOString(),
    approvedAt: request.approvedAt?.toISOString() ?? null,
    declinedAt: request.declinedAt?.toISOString() ?? null,
    fundsSentAt: request.fundsSentAt?.toISOString() ?? null,
    acknowledgedAt: request.acknowledgedAt?.toISOString() ?? null,
  };
}

/**
 * Record a status change in the history
 */
async function recordStatusChange(
  fundingRequestId: string,
  status: RequestStatus,
  changedBy: string | null,
  notes?: string
): Promise<void> {
  await db.insert(fundingRequestStatusHistory).values({
    fundingRequestId,
    status,
    changedBy,
    notes: notes ?? null,
  });
}

/**
 * Validate status transition
 */
function isValidTransition(currentStatus: RequestStatus, newStatus: RequestStatus): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Create a new funding request
 */
export async function createFundingRequest(
  groupId: string,
  input: CreateFundingRequestInput,
  userId: string,
  req: Request
): Promise<FundingRequestResponse> {
  // Get group info and verify it's verified
  const group = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .limit(1);

  if (!group[0]) {
    throw new Error('Group not found');
  }

  if (group[0].verificationStatus !== 'verified') {
    throw new Error('Only verified groups can submit funding requests');
  }

  // Create the request
  const result = await db
    .insert(fundingRequests)
    .values({
      groupId,
      amount: input.amount.toString(),
      category: input.category,
      urgency: input.urgency,
      region: input.region,
      justification: input.justification ?? null,
      status: 'submitted',
    })
    .returning();

  const request = result[0]!;

  // Record initial status
  await recordStatusChange(request.id, 'submitted', userId);

  await logAuditEvent({
    userId,
    action: 'create',
    entityType: 'funding_request',
    entityId: request.id,
    metadata: {
      groupId,
      amount: input.amount,
      category: input.category,
      urgency: input.urgency,
    },
    req,
  });

  return toFundingRequestResponse(request, group[0].name);
}

/**
 * List funding requests
 */
export async function listFundingRequests(
  hubId: string | null,
  groupId: string | null,
  role: string,
  query: ListFundingRequestsQuery
): Promise<{ requests: FundingRequestResponse[]; total: number }> {
  // Build base conditions
  const conditions = [isNull(fundingRequests.deletedAt), isNull(groups.deletedAt)];

  if (role === 'hub_admin' && hubId) {
    // Hub admins see all requests for groups in their hub
    conditions.push(eq(groups.hubId, hubId));
  } else if (role === 'group_coordinator' && groupId) {
    // Group coordinators only see their own group's requests
    conditions.push(eq(fundingRequests.groupId, groupId));
  } else {
    return { requests: [], total: 0 };
  }

  // Add filters
  if (query.status) {
    conditions.push(eq(fundingRequests.status, query.status));
  }
  if (query.category) {
    conditions.push(eq(fundingRequests.category, query.category));
  }
  if (query.urgency) {
    conditions.push(eq(fundingRequests.urgency, query.urgency));
  }

  // Determine sort order
  let orderBy;
  switch (query.sortBy) {
    case 'oldest':
      orderBy = asc(fundingRequests.submittedAt);
      break;
    case 'amount_high':
      orderBy = desc(sql`${fundingRequests.amount}::numeric`);
      break;
    case 'amount_low':
      orderBy = asc(sql`${fundingRequests.amount}::numeric`);
      break;
    case 'urgent':
      // Sort urgent first, then by date
      orderBy = desc(sql`CASE WHEN ${fundingRequests.urgency} = 'urgent' THEN 1 ELSE 0 END`);
      break;
    case 'newest':
    default:
      orderBy = desc(fundingRequests.submittedAt);
  }

  const results = await db
    .select({
      request: fundingRequests,
      groupName: groups.name,
    })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .where(and(...conditions))
    .orderBy(orderBy);

  return {
    requests: results.map((r) => toFundingRequestResponse(r.request, r.groupName)),
    total: results.length,
  };
}

/**
 * Get a funding request by ID
 */
export async function getFundingRequest(
  requestId: string,
  hubId: string | null,
  groupId: string | null,
  role: string
): Promise<FundingRequestResponse | null> {
  const result = await db
    .select({
      request: fundingRequests,
      groupName: groups.name,
      groupHubId: groups.hubId,
    })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .where(and(eq(fundingRequests.id, requestId), isNull(fundingRequests.deletedAt)))
    .limit(1);

  if (!result[0]) {
    return null;
  }

  // Check access
  if (role === 'hub_admin' && hubId) {
    if (result[0].groupHubId !== hubId) {
      return null;
    }
  } else if (role === 'group_coordinator' && groupId) {
    if (result[0].request.groupId !== groupId) {
      return null;
    }
  } else {
    return null;
  }

  return toFundingRequestResponse(result[0].request, result[0].groupName);
}

/**
 * Get status history for a funding request
 */
export async function getFundingRequestHistory(
  requestId: string
): Promise<StatusHistoryResponse[]> {
  const results = await db
    .select()
    .from(fundingRequestStatusHistory)
    .where(eq(fundingRequestStatusHistory.fundingRequestId, requestId))
    .orderBy(asc(fundingRequestStatusHistory.changedAt));

  return results.map((h) => ({
    id: h.id,
    status: h.status as RequestStatus,
    changedBy: h.changedBy,
    changedAt: h.changedAt.toISOString(),
    notes: h.notes,
  }));
}

/**
 * Approve a funding request
 */
export async function approveFundingRequest(
  requestId: string,
  hubId: string,
  userId: string,
  req: Request
): Promise<FundingRequestResponse> {
  const requestData = await getFundingRequest(requestId, hubId, null, 'hub_admin');

  if (!requestData) {
    throw new Error('Funding request not found');
  }

  if (!isValidTransition(requestData.status, 'approved')) {
    throw new Error('Cannot approve a request with status: ' + requestData.status);
  }

  const updateResult = await db
    .update(fundingRequests)
    .set({
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(fundingRequests.id, requestId))
    .returning();

  await recordStatusChange(requestId, 'approved', userId);

  await logAuditEvent({
    userId,
    action: 'update',
    entityType: 'funding_request',
    entityId: requestId,
    metadata: {
      action: 'approve',
      groupId: requestData.groupId,
      amount: requestData.amount,
    },
    req,
  });

  return toFundingRequestResponse(updateResult[0]!, requestData.groupName);
}

/**
 * Decline a funding request
 */
export async function declineFundingRequest(
  requestId: string,
  hubId: string,
  userId: string,
  reason: string,
  req: Request
): Promise<FundingRequestResponse> {
  const requestData = await getFundingRequest(requestId, hubId, null, 'hub_admin');

  if (!requestData) {
    throw new Error('Funding request not found');
  }

  if (!isValidTransition(requestData.status, 'declined')) {
    throw new Error('Cannot decline a request with status: ' + requestData.status);
  }

  const updateResult = await db
    .update(fundingRequests)
    .set({
      status: 'declined',
      declineReason: reason,
      approvedBy: userId,
      declinedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(fundingRequests.id, requestId))
    .returning();

  await recordStatusChange(requestId, 'declined', userId, reason);

  await logAuditEvent({
    userId,
    action: 'update',
    entityType: 'funding_request',
    entityId: requestId,
    metadata: {
      action: 'decline',
      groupId: requestData.groupId,
      reason,
    },
    req,
  });

  return toFundingRequestResponse(updateResult[0]!, requestData.groupName);
}

/**
 * Request clarification on a funding request
 */
export async function requestClarification(
  requestId: string,
  hubId: string,
  userId: string,
  message: string,
  req: Request
): Promise<FundingRequestResponse> {
  const requestData = await getFundingRequest(requestId, hubId, null, 'hub_admin');

  if (!requestData) {
    throw new Error('Funding request not found');
  }

  if (requestData.status !== 'submitted') {
    throw new Error('Can only request clarification on submitted requests');
  }

  const updateResult = await db
    .update(fundingRequests)
    .set({
      clarificationRequest: message,
      updatedAt: new Date(),
    })
    .where(eq(fundingRequests.id, requestId))
    .returning();

  await logAuditEvent({
    userId,
    action: 'update',
    entityType: 'funding_request',
    entityId: requestId,
    metadata: {
      action: 'clarify',
      groupId: requestData.groupId,
      message,
    },
    req,
  });

  return toFundingRequestResponse(updateResult[0]!, requestData.groupName);
}

/**
 * Mark funds as sent
 */
export async function markFundsSent(
  requestId: string,
  hubId: string,
  userId: string,
  req: Request
): Promise<FundingRequestResponse> {
  const requestData = await getFundingRequest(requestId, hubId, null, 'hub_admin');

  if (!requestData) {
    throw new Error('Funding request not found');
  }

  if (!isValidTransition(requestData.status, 'funds_sent')) {
    throw new Error('Cannot mark funds sent for a request with status: ' + requestData.status);
  }

  const updateResult = await db
    .update(fundingRequests)
    .set({
      status: 'funds_sent',
      fundsSentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(fundingRequests.id, requestId))
    .returning();

  await recordStatusChange(requestId, 'funds_sent', userId);

  await logAuditEvent({
    userId,
    action: 'update',
    entityType: 'funding_request',
    entityId: requestId,
    metadata: {
      action: 'mark_funds_sent',
      groupId: requestData.groupId,
    },
    req,
  });

  return toFundingRequestResponse(updateResult[0]!, requestData.groupName);
}

/**
 * Acknowledge receipt of funds
 */
export async function acknowledgeReceipt(
  requestId: string,
  groupId: string,
  userId: string,
  req: Request
): Promise<FundingRequestResponse> {
  const requestData = await getFundingRequest(requestId, null, groupId, 'group_coordinator');

  if (!requestData) {
    throw new Error('Funding request not found');
  }

  if (!isValidTransition(requestData.status, 'acknowledged')) {
    throw new Error('Cannot acknowledge a request with status: ' + requestData.status);
  }

  const updateResult = await db
    .update(fundingRequests)
    .set({
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(fundingRequests.id, requestId))
    .returning();

  await recordStatusChange(requestId, 'acknowledged', userId);

  await logAuditEvent({
    userId,
    action: 'update',
    entityType: 'funding_request',
    entityId: requestId,
    metadata: {
      action: 'acknowledge',
      groupId,
    },
    req,
  });

  return toFundingRequestResponse(updateResult[0]!, requestData.groupName);
}
