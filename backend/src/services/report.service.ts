import { eq, and, gte, lte, isNull, sql, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { fundingRequests } from '../db/schema/funding_requests.js';
import { groups } from '../db/schema/groups.js';
import { groupHubMemberships } from '../db/schema/index.js';
import type {
  DateRangeQuery,
  SummaryReportResponse,
  GroupsReportResponse,
  TimingReportResponse,
  CategorySummary,
  ExportDataRow,
} from '../validations/report.validation.js';

/**
 * Build date range conditions for queries
 */
function buildDateConditions(query: DateRangeQuery, dateField: typeof fundingRequests.submittedAt) {
  const conditions = [isNull(fundingRequests.deletedAt)];

  if (query.startDate) {
    conditions.push(gte(dateField, new Date(query.startDate)));
  }

  if (query.endDate) {
    conditions.push(lte(dateField, new Date(query.endDate)));
  }

  return conditions;
}

/**
 * Get summary report with totals and breakdown by category
 * CRITICAL: Returns aggregate data only - no individual request details
 */
export async function getSummaryReport(
  hubId: string,
  query: DateRangeQuery
): Promise<SummaryReportResponse> {
  const conditions = buildDateConditions(query, fundingRequests.submittedAt);

  // Get totals
  const totalsResult = await db
    .select({
      totalAmount: sql<string>`COALESCE(SUM(${fundingRequests.amount}), 0)`,
      totalRequests: count(),
      approvedRequests: sql<number>`COUNT(*) FILTER (WHERE ${fundingRequests.status} = 'approved' OR ${fundingRequests.status} = 'funds_sent' OR ${fundingRequests.status} = 'acknowledged')`,
      declinedRequests: sql<number>`COUNT(*) FILTER (WHERE ${fundingRequests.status} = 'declined')`,
      pendingRequests: sql<number>`COUNT(*) FILTER (WHERE ${fundingRequests.status} = 'submitted')`,
      fundsSentRequests: sql<number>`COUNT(*) FILTER (WHERE ${fundingRequests.status} = 'funds_sent' OR ${fundingRequests.status} = 'acknowledged')`,
      acknowledgedRequests: sql<number>`COUNT(*) FILTER (WHERE ${fundingRequests.status} = 'acknowledged')`,
    })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .innerJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .where(and(...conditions, eq(groupHubMemberships.hubId, hubId)));

  // Get breakdown by category
  const categoryResults = await db
    .select({
      category: fundingRequests.category,
      totalAmount: sql<string>`COALESCE(SUM(${fundingRequests.amount}), 0)`,
      requestCount: count(),
      approvedCount: sql<number>`COUNT(*) FILTER (WHERE ${fundingRequests.status} = 'approved' OR ${fundingRequests.status} = 'funds_sent' OR ${fundingRequests.status} = 'acknowledged')`,
      declinedCount: sql<number>`COUNT(*) FILTER (WHERE ${fundingRequests.status} = 'declined')`,
      pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${fundingRequests.status} = 'submitted')`,
    })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .innerJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .where(and(...conditions, eq(groupHubMemberships.hubId, hubId)))
    .groupBy(fundingRequests.category);

  const byCategory: CategorySummary[] = categoryResults.map((r) => ({
    category: r.category,
    totalAmount: r.totalAmount,
    requestCount: Number(r.requestCount),
    approvedCount: Number(r.approvedCount),
    declinedCount: Number(r.declinedCount),
    pendingCount: Number(r.pendingCount),
  }));

  const totals = totalsResult[0] || {
    totalAmount: '0',
    totalRequests: 0,
    approvedRequests: 0,
    declinedRequests: 0,
    pendingRequests: 0,
    fundsSentRequests: 0,
    acknowledgedRequests: 0,
  };

  return {
    period: {
      startDate: query.startDate || null,
      endDate: query.endDate || null,
    },
    totals: {
      totalAmount: String(totals.totalAmount),
      totalRequests: Number(totals.totalRequests),
      approvedRequests: Number(totals.approvedRequests),
      declinedRequests: Number(totals.declinedRequests),
      pendingRequests: Number(totals.pendingRequests),
      fundsSentRequests: Number(totals.fundsSentRequests),
      acknowledgedRequests: Number(totals.acknowledgedRequests),
    },
    byCategory,
  };
}

/**
 * Get groups report - count of groups supported
 * CRITICAL: Returns aggregate data only - no individual group details
 */
export async function getGroupsReport(
  hubId: string,
  query: DateRangeQuery
): Promise<GroupsReportResponse> {
  // Total groups in hub (via group_hub_memberships)
  const totalGroupsResult = await db
    .select({ count: count() })
    .from(groupHubMemberships)
    .innerJoin(groups, eq(groupHubMemberships.groupId, groups.id))
    .where(and(eq(groupHubMemberships.hubId, hubId), isNull(groups.deletedAt)));

  // Verified groups (via group_hub_memberships)
  const verifiedGroupsResult = await db
    .select({ count: count() })
    .from(groupHubMemberships)
    .innerJoin(groups, eq(groupHubMemberships.groupId, groups.id))
    .where(
      and(
        eq(groupHubMemberships.hubId, hubId),
        eq(groupHubMemberships.verificationStatus, 'verified'),
        isNull(groups.deletedAt)
      )
    );

  // Groups with approved requests in date range
  const conditions = buildDateConditions(query, fundingRequests.submittedAt);

  const groupsWithApprovedResult = await db
    .selectDistinct({ groupId: fundingRequests.groupId })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .innerJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .where(
      and(
        ...conditions,
        eq(groupHubMemberships.hubId, hubId),
        sql`${fundingRequests.status} IN ('approved', 'funds_sent', 'acknowledged')`
      )
    );

  // Groups with funds sent in date range
  const groupsWithFundingResult = await db
    .selectDistinct({ groupId: fundingRequests.groupId })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .innerJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .where(
      and(
        ...conditions,
        eq(groupHubMemberships.hubId, hubId),
        sql`${fundingRequests.status} IN ('funds_sent', 'acknowledged')`
      )
    );

  return {
    period: {
      startDate: query.startDate || null,
      endDate: query.endDate || null,
    },
    totalGroups: Number(totalGroupsResult[0]?.count || 0),
    groupsWithFunding: groupsWithFundingResult.length,
    groupsWithApprovedRequests: groupsWithApprovedResult.length,
    verifiedGroups: Number(verifiedGroupsResult[0]?.count || 0),
  };
}

/**
 * Get timing report - average time to funding
 * CRITICAL: Returns aggregate data only - no individual request details
 */
export async function getTimingReport(
  hubId: string,
  query: DateRangeQuery
): Promise<TimingReportResponse> {
  const conditions = buildDateConditions(query, fundingRequests.submittedAt);

  // Average time from submission to approval (for approved/funds_sent/acknowledged requests)
  const approvalTimingResult = await db
    .select({
      avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${fundingRequests.approvedAt} - ${fundingRequests.submittedAt})) / 3600)`,
      count: count(),
    })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .innerJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .where(
      and(
        ...conditions,
        eq(groupHubMemberships.hubId, hubId),
        sql`${fundingRequests.approvedAt} IS NOT NULL`
      )
    );

  // Average time from submission to funds sent
  const fundsSentTimingResult = await db
    .select({
      avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${fundingRequests.fundsSentAt} - ${fundingRequests.submittedAt})) / 3600)`,
    })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .innerJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .where(
      and(
        ...conditions,
        eq(groupHubMemberships.hubId, hubId),
        sql`${fundingRequests.fundsSentAt} IS NOT NULL`
      )
    );

  // Average time from submission to acknowledged
  const acknowledgedTimingResult = await db
    .select({
      avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${fundingRequests.acknowledgedAt} - ${fundingRequests.submittedAt})) / 3600)`,
    })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .innerJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .where(
      and(
        ...conditions,
        eq(groupHubMemberships.hubId, hubId),
        sql`${fundingRequests.acknowledgedAt} IS NOT NULL`
      )
    );

  // Median time to approval (using percentile_cont)
  const medianResult = await db
    .select({
      medianHours: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (${fundingRequests.approvedAt} - ${fundingRequests.submittedAt})) / 3600)`,
    })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .innerJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .where(
      and(
        ...conditions,
        eq(groupHubMemberships.hubId, hubId),
        sql`${fundingRequests.approvedAt} IS NOT NULL`
      )
    );

  const avgApproval = approvalTimingResult[0]?.avgHours;
  const avgFundsSent = fundsSentTimingResult[0]?.avgHours;
  const avgAcknowledged = acknowledgedTimingResult[0]?.avgHours;
  const median = medianResult[0]?.medianHours;

  return {
    period: {
      startDate: query.startDate || null,
      endDate: query.endDate || null,
    },
    averageTimeToApproval: avgApproval ? Math.round(avgApproval * 10) / 10 : null,
    averageTimeToFundsSent: avgFundsSent ? Math.round(avgFundsSent * 10) / 10 : null,
    averageTimeToAcknowledged: avgAcknowledged ? Math.round(avgAcknowledged * 10) / 10 : null,
    medianTimeToApproval: median ? Math.round(median * 10) / 10 : null,
    requestsAnalyzed: Number(approvalTimingResult[0]?.count || 0),
  };
}

/**
 * Get export data for CSV/JSON export
 * CRITICAL: Returns aggregate data only - no individual request details
 */
export async function getExportData(
  hubId: string,
  query: DateRangeQuery
): Promise<ExportDataRow[]> {
  const conditions = buildDateConditions(query, fundingRequests.submittedAt);

  // Get data by category with timing
  const results = await db
    .select({
      category: fundingRequests.category,
      totalAmount: sql<string>`COALESCE(SUM(${fundingRequests.amount}), 0)`,
      requestCount: count(),
      approvedCount: sql<number>`COUNT(*) FILTER (WHERE ${fundingRequests.status} IN ('approved', 'funds_sent', 'acknowledged'))`,
      declinedCount: sql<number>`COUNT(*) FILTER (WHERE ${fundingRequests.status} = 'declined')`,
      avgTimeToFundingHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${fundingRequests.fundsSentAt} - ${fundingRequests.submittedAt})) / 3600) FILTER (WHERE ${fundingRequests.fundsSentAt} IS NOT NULL)`,
    })
    .from(fundingRequests)
    .innerJoin(groups, eq(fundingRequests.groupId, groups.id))
    .innerJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .where(and(...conditions, eq(groupHubMemberships.hubId, hubId)))
    .groupBy(fundingRequests.category);

  const periodStr =
    query.startDate && query.endDate
      ? `${query.startDate} to ${query.endDate}`
      : query.startDate
        ? `From ${query.startDate}`
        : query.endDate
          ? `Until ${query.endDate}`
          : 'All time';

  return results.map((r) => ({
    period: periodStr,
    category: r.category,
    totalAmount: r.totalAmount,
    requestCount: Number(r.requestCount),
    approvedCount: Number(r.approvedCount),
    declinedCount: Number(r.declinedCount),
    avgTimeToFundingHours: r.avgTimeToFundingHours
      ? Math.round(r.avgTimeToFundingHours * 10) / 10
      : null,
  }));
}

/**
 * Convert export data to CSV string
 */
export function convertToCSV(data: ExportDataRow[]): string {
  if (data.length === 0) {
    return 'Period,Category,Total Amount,Request Count,Approved Count,Declined Count,Avg Time to Funding (hours)\n';
  }

  const headers = [
    'Period',
    'Category',
    'Total Amount',
    'Request Count',
    'Approved Count',
    'Declined Count',
    'Avg Time to Funding (hours)',
  ];

  const rows = data.map((row) => [
    `"${row.period}"`,
    row.category,
    row.totalAmount,
    row.requestCount,
    row.approvedCount,
    row.declinedCount,
    row.avgTimeToFundingHours ?? '',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
