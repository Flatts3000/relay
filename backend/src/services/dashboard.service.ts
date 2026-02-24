import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { groups } from '../db/schema/groups.js';
import { groupHubMemberships } from '../db/schema/index.js';
import { broadcastInvites } from '../db/schema/broadcasts.js';
import { fundingRequests } from '../db/schema/funding_requests.js';

export interface DashboardSummary {
  group: {
    id: string;
    name: string;
    verificationStatus: string;
  };
  pendingInvites: number;
  fundingRequests: {
    submitted: number;
    approved: number;
    declined: number;
    fundsSent: number;
    acknowledged: number;
  };
}

/**
 * Get dashboard summary for a group coordinator.
 * Returns group info, pending invite count, and funding request counts by status.
 */
export async function getGroupDashboard(groupId: string): Promise<DashboardSummary | null> {
  // Fetch group info
  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
    })
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

  if (!group) {
    return null;
  }

  // Get per-hub verification statuses
  const hubStatuses = await db
    .select({
      hubId: groupHubMemberships.hubId,
      verificationStatus: groupHubMemberships.verificationStatus,
    })
    .from(groupHubMemberships)
    .where(eq(groupHubMemberships.groupId, groupId));

  // Determine aggregate verification status
  const hasVerified = hubStatuses.some((s) => s.verificationStatus === 'verified');
  const hasPending = hubStatuses.some((s) => s.verificationStatus === 'pending');
  const aggregateStatus = hasVerified ? 'verified' : hasPending ? 'pending' : 'revoked';

  // Count pending invites
  const [inviteResult] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(broadcastInvites)
    .where(and(eq(broadcastInvites.groupId, groupId), eq(broadcastInvites.status, 'pending')));

  // Count funding requests by status
  const statusCounts = await db
    .select({
      status: fundingRequests.status,
      count: sql<number>`count(*)::int`,
    })
    .from(fundingRequests)
    .where(and(eq(fundingRequests.groupId, groupId), isNull(fundingRequests.deletedAt)))
    .groupBy(fundingRequests.status);

  const countsByStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    countsByStatus[row.status] = row.count;
  }

  return {
    group: {
      id: group.id,
      name: group.name,
      verificationStatus: aggregateStatus,
    },
    pendingInvites: inviteResult?.count ?? 0,
    fundingRequests: {
      submitted: countsByStatus['submitted'] ?? 0,
      approved: countsByStatus['approved'] ?? 0,
      declined: countsByStatus['declined'] ?? 0,
      fundsSent: countsByStatus['funds_sent'] ?? 0,
      acknowledged: countsByStatus['acknowledged'] ?? 0,
    },
  };
}
