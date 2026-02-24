import { eq, and, isNull, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  verificationRequests,
  peerAttestations,
  groups,
  groupHubMemberships,
  type VerificationRequest,
} from '../db/schema/index.js';
import { logAuditEvent } from './audit.service.js';
import type { Request } from 'express';
import type {
  CreateVerificationRequestInput,
  VerificationRequestResponse,
  PeerAttestationResponse,
  ListVerificationRequestsQuery,
  VerificationMethod,
} from '../validations/verification.validation.js';

const REQUIRED_ATTESTATIONS = 2;

/**
 * Transform a verification request with group info into an API response
 */
function toVerificationRequestResponse(
  request: VerificationRequest,
  groupName: string,
  groupServiceArea: string,
  attestationCount: number = 0
): VerificationRequestResponse {
  return {
    id: request.id,
    groupId: request.groupId,
    groupName,
    groupServiceArea,
    method: request.method as VerificationMethod,
    status: request.status as 'pending' | 'approved' | 'denied',
    sponsorInfo: request.sponsorInfo,
    attestationCount,
    reviewedBy: request.reviewedBy,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    denialReason: request.denialReason,
    createdAt: request.createdAt.toISOString(),
  };
}

/**
 * Create a verification request for a group
 */
export async function createVerificationRequest(
  groupId: string,
  hubId: string,
  input: CreateVerificationRequestInput,
  userId: string,
  req: Request
): Promise<VerificationRequestResponse> {
  // Get group info
  const group = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .limit(1);

  if (!group[0]) {
    throw new Error('Group not found');
  }

  // Check if group is already verified for this hub via group_hub_memberships
  const [existingMembership] = await db
    .select()
    .from(groupHubMemberships)
    .where(
      and(
        eq(groupHubMemberships.groupId, groupId),
        eq(groupHubMemberships.hubId, hubId),
        eq(groupHubMemberships.verificationStatus, 'verified')
      )
    )
    .limit(1);

  if (existingMembership) {
    throw new Error('Group is already verified');
  }

  // Check for existing pending request
  const existingRequest = await db
    .select()
    .from(verificationRequests)
    .where(
      and(
        eq(verificationRequests.groupId, groupId),
        eq(verificationRequests.hubId, hubId),
        eq(verificationRequests.status, 'pending')
      )
    )
    .limit(1);

  if (existingRequest[0]) {
    throw new Error('A verification request is already pending');
  }

  // Create the request
  const result = await db
    .insert(verificationRequests)
    .values({
      groupId,
      hubId,
      method: input.method,
      sponsorInfo: input.sponsorInfo ?? null,
    })
    .returning();

  const request = result[0]!;

  await logAuditEvent({
    userId,
    action: 'create',
    entityType: 'verification_request',
    entityId: request.id,
    metadata: {
      groupId,
      hubId,
      method: input.method,
    },
    req,
  });

  return toVerificationRequestResponse(request, group[0].name, group[0].serviceArea, 0);
}

/**
 * List verification requests (for hub admin)
 */
export async function listVerificationRequests(
  hubId: string,
  query: ListVerificationRequestsQuery
): Promise<{ requests: VerificationRequestResponse[]; total: number }> {
  // Build conditions — filter by verificationRequests.hubId since it now has the column
  const conditions = [eq(verificationRequests.hubId, hubId), isNull(groups.deletedAt)];

  if (query.status) {
    conditions.push(eq(verificationRequests.status, query.status));
  }

  if (query.method) {
    conditions.push(eq(verificationRequests.method, query.method));
  }

  // Get requests with group info
  const results = await db
    .select({
      request: verificationRequests,
      groupName: groups.name,
      groupServiceArea: groups.serviceArea,
    })
    .from(verificationRequests)
    .innerJoin(groups, eq(verificationRequests.groupId, groups.id))
    .where(and(...conditions))
    .orderBy(verificationRequests.createdAt);

  // Get attestation counts for peer attestation requests
  const requestsWithCounts = await Promise.all(
    results.map(async (result) => {
      let attestationCount = 0;
      if (result.request.method === 'peer_attestation') {
        const countResult = await db
          .select({ count: count() })
          .from(peerAttestations)
          .where(eq(peerAttestations.verificationRequestId, result.request.id));
        attestationCount = countResult[0]?.count ?? 0;
      }
      return toVerificationRequestResponse(
        result.request,
        result.groupName,
        result.groupServiceArea,
        attestationCount
      );
    })
  );

  return {
    requests: requestsWithCounts,
    total: requestsWithCounts.length,
  };
}

/**
 * Get a verification request by ID
 */
export async function getVerificationRequest(
  requestId: string,
  hubId: string
): Promise<VerificationRequestResponse | null> {
  const result = await db
    .select({
      request: verificationRequests,
      groupName: groups.name,
      groupServiceArea: groups.serviceArea,
    })
    .from(verificationRequests)
    .innerJoin(groups, eq(verificationRequests.groupId, groups.id))
    .where(
      and(
        eq(verificationRequests.id, requestId),
        eq(verificationRequests.hubId, hubId),
        isNull(groups.deletedAt)
      )
    )
    .limit(1);

  if (!result[0]) {
    return null;
  }

  let attestationCount = 0;
  if (result[0].request.method === 'peer_attestation') {
    const countResult = await db
      .select({ count: count() })
      .from(peerAttestations)
      .where(eq(peerAttestations.verificationRequestId, requestId));
    attestationCount = countResult[0]?.count ?? 0;
  }

  return toVerificationRequestResponse(
    result[0].request,
    result[0].groupName,
    result[0].groupServiceArea,
    attestationCount
  );
}

/**
 * Approve a verification request
 */
export async function approveVerificationRequest(
  requestId: string,
  hubId: string,
  userId: string,
  req: Request
): Promise<VerificationRequestResponse> {
  const requestData = await getVerificationRequest(requestId, hubId);

  if (!requestData) {
    throw new Error('Verification request not found');
  }

  if (requestData.status !== 'pending') {
    throw new Error('Request has already been reviewed');
  }

  // For peer attestation, check if we have enough attestations
  if (
    requestData.method === 'peer_attestation' &&
    requestData.attestationCount < REQUIRED_ATTESTATIONS
  ) {
    throw new Error(
      `Peer attestation requires ${REQUIRED_ATTESTATIONS} attestations, but only ${requestData.attestationCount} received`
    );
  }

  // Update the verification request
  const updateResult = await db
    .update(verificationRequests)
    .set({
      status: 'approved',
      reviewedBy: userId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(verificationRequests.id, requestId))
    .returning();

  // Update the group's verification status in group_hub_memberships
  await db
    .update(groupHubMemberships)
    .set({
      verificationStatus: 'verified',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(groupHubMemberships.groupId, requestData.groupId),
        eq(groupHubMemberships.hubId, hubId)
      )
    );

  await logAuditEvent({
    userId,
    action: 'update',
    entityType: 'verification_request',
    entityId: requestId,
    metadata: {
      action: 'approve',
      groupId: requestData.groupId,
    },
    req,
  });

  return toVerificationRequestResponse(
    updateResult[0]!,
    requestData.groupName,
    requestData.groupServiceArea,
    requestData.attestationCount
  );
}

/**
 * Deny a verification request
 */
export async function denyVerificationRequest(
  requestId: string,
  hubId: string,
  userId: string,
  reason: string,
  req: Request
): Promise<VerificationRequestResponse> {
  const requestData = await getVerificationRequest(requestId, hubId);

  if (!requestData) {
    throw new Error('Verification request not found');
  }

  if (requestData.status !== 'pending') {
    throw new Error('Request has already been reviewed');
  }

  // Update the verification request
  const updateResult = await db
    .update(verificationRequests)
    .set({
      status: 'denied',
      reviewedBy: userId,
      reviewedAt: new Date(),
      denialReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(verificationRequests.id, requestId))
    .returning();

  await logAuditEvent({
    userId,
    action: 'update',
    entityType: 'verification_request',
    entityId: requestId,
    metadata: {
      action: 'deny',
      groupId: requestData.groupId,
      reason,
    },
    req,
  });

  return toVerificationRequestResponse(
    updateResult[0]!,
    requestData.groupName,
    requestData.groupServiceArea,
    requestData.attestationCount
  );
}

/**
 * Revoke a group's verification
 */
export async function revokeGroupVerification(
  groupId: string,
  hubId: string,
  userId: string,
  req: Request
): Promise<void> {
  // Verify the group exists
  const group = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .limit(1);

  if (!group[0]) {
    throw new Error('Group not found');
  }

  // Check membership and verification status via group_hub_memberships
  const [membership] = await db
    .select()
    .from(groupHubMemberships)
    .where(and(eq(groupHubMemberships.groupId, groupId), eq(groupHubMemberships.hubId, hubId)))
    .limit(1);

  if (!membership) {
    throw new Error('Group not found');
  }

  if (membership.verificationStatus !== 'verified') {
    throw new Error('Group is not verified');
  }

  // Update the group's verification status in group_hub_memberships
  await db
    .update(groupHubMemberships)
    .set({
      verificationStatus: 'revoked',
      updatedAt: new Date(),
    })
    .where(and(eq(groupHubMemberships.groupId, groupId), eq(groupHubMemberships.hubId, hubId)));

  await logAuditEvent({
    userId,
    action: 'update',
    entityType: 'group',
    entityId: groupId,
    metadata: {
      action: 'revoke_verification',
    },
    req,
  });
}

/**
 * Submit a peer attestation
 */
export async function submitPeerAttestation(
  requestId: string,
  attestingGroupId: string,
  userId: string,
  req: Request
): Promise<PeerAttestationResponse> {
  // Get the verification request
  const request = await db
    .select()
    .from(verificationRequests)
    .where(eq(verificationRequests.id, requestId))
    .limit(1);

  if (!request[0]) {
    throw new Error('Verification request not found');
  }

  if (request[0].status !== 'pending') {
    throw new Error('Request has already been reviewed');
  }

  if (request[0].method !== 'peer_attestation') {
    throw new Error('This request does not accept peer attestations');
  }

  // Cannot attest for your own group
  if (request[0].groupId === attestingGroupId) {
    throw new Error('Cannot attest for your own group');
  }

  // Verify the attesting group exists and is not deleted
  const attestingGroup = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, attestingGroupId), isNull(groups.deletedAt)))
    .limit(1);

  if (!attestingGroup[0]) {
    throw new Error('Only verified groups can provide attestations');
  }

  // Verify the attesting group is verified in at least one hub via group_hub_memberships
  const [attestingGroupVerified] = await db
    .select()
    .from(groupHubMemberships)
    .where(
      and(
        eq(groupHubMemberships.groupId, attestingGroupId),
        eq(groupHubMemberships.verificationStatus, 'verified')
      )
    )
    .limit(1);

  if (!attestingGroupVerified) {
    throw new Error('Only verified groups can provide attestations');
  }

  // Check if this group has already attested
  const existingAttestation = await db
    .select()
    .from(peerAttestations)
    .where(
      and(
        eq(peerAttestations.verificationRequestId, requestId),
        eq(peerAttestations.attestingGroupId, attestingGroupId)
      )
    )
    .limit(1);

  if (existingAttestation[0]) {
    throw new Error('Your group has already attested for this request');
  }

  // Create the attestation
  const result = await db
    .insert(peerAttestations)
    .values({
      verificationRequestId: requestId,
      attestingGroupId,
      attestedBy: userId,
    })
    .returning();

  const attestation = result[0]!;

  await logAuditEvent({
    userId,
    action: 'create',
    entityType: 'peer_attestation',
    entityId: attestation.id,
    metadata: {
      verificationRequestId: requestId,
      attestingGroupId,
      targetGroupId: request[0].groupId,
    },
    req,
  });

  return {
    id: attestation.id,
    attestingGroupId,
    attestingGroupName: attestingGroup[0].name,
    attestedAt: attestation.createdAt.toISOString(),
  };
}

/**
 * Get attestations for a verification request
 */
export async function getAttestationsForRequest(
  requestId: string
): Promise<PeerAttestationResponse[]> {
  const results = await db
    .select({
      attestation: peerAttestations,
      groupName: groups.name,
    })
    .from(peerAttestations)
    .innerJoin(groups, eq(peerAttestations.attestingGroupId, groups.id))
    .where(eq(peerAttestations.verificationRequestId, requestId));

  return results.map((result) => ({
    id: result.attestation.id,
    attestingGroupId: result.attestation.attestingGroupId,
    attestingGroupName: result.groupName,
    attestedAt: result.attestation.createdAt.toISOString(),
  }));
}

/**
 * Get pending attestation requests for a group (requests they can attest to)
 */
export async function getPendingAttestationRequests(
  groupId: string,
  hubId: string
): Promise<VerificationRequestResponse[]> {
  // Get all pending peer attestation requests for this hub
  // that this group hasn't already attested to
  const results = await db
    .select({
      request: verificationRequests,
      groupName: groups.name,
      groupServiceArea: groups.serviceArea,
    })
    .from(verificationRequests)
    .innerJoin(groups, eq(verificationRequests.groupId, groups.id))
    .where(
      and(
        eq(verificationRequests.hubId, hubId),
        eq(verificationRequests.method, 'peer_attestation'),
        eq(verificationRequests.status, 'pending'),
        isNull(groups.deletedAt)
      )
    );

  // Filter out requests the group has already attested to and their own request
  const filteredResults = await Promise.all(
    results
      .filter((r) => r.request.groupId !== groupId)
      .map(async (result) => {
        const existingAttestation = await db
          .select()
          .from(peerAttestations)
          .where(
            and(
              eq(peerAttestations.verificationRequestId, result.request.id),
              eq(peerAttestations.attestingGroupId, groupId)
            )
          )
          .limit(1);

        if (existingAttestation[0]) {
          return null;
        }

        const countResult = await db
          .select({ count: count() })
          .from(peerAttestations)
          .where(eq(peerAttestations.verificationRequestId, result.request.id));

        return toVerificationRequestResponse(
          result.request,
          result.groupName,
          result.groupServiceArea,
          countResult[0]?.count ?? 0
        );
      })
  );

  return filteredResults.filter((r): r is VerificationRequestResponse => r !== null);
}

/**
 * Get verification request for a group (group coordinator view)
 */
export async function getGroupVerificationRequest(
  groupId: string
): Promise<VerificationRequestResponse | null> {
  const result = await db
    .select({
      request: verificationRequests,
      groupName: groups.name,
      groupServiceArea: groups.serviceArea,
    })
    .from(verificationRequests)
    .innerJoin(groups, eq(verificationRequests.groupId, groups.id))
    .where(eq(verificationRequests.groupId, groupId))
    .orderBy(verificationRequests.createdAt)
    .limit(1);

  if (!result[0]) {
    return null;
  }

  let attestationCount = 0;
  if (result[0].request.method === 'peer_attestation') {
    const countResult = await db
      .select({ count: count() })
      .from(peerAttestations)
      .where(eq(peerAttestations.verificationRequestId, result[0].request.id));
    attestationCount = countResult[0]?.count ?? 0;
  }

  return toVerificationRequestResponse(
    result[0].request,
    result[0].groupName,
    result[0].groupServiceArea,
    attestationCount
  );
}
