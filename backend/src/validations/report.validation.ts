import { z } from 'zod';

// Date range query schema
export const dateRangeQuerySchema = z.object({
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid start date format' }),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid end date format' }),
});

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;

// Export format schema
export const exportQuerySchema = dateRangeQuerySchema.extend({
  format: z.enum(['csv', 'json']).default('csv'),
});

export type ExportQuery = z.infer<typeof exportQuerySchema>;

// Summary report response
export interface CategorySummary {
  category: string;
  totalAmount: string;
  requestCount: number;
  approvedCount: number;
  declinedCount: number;
  pendingCount: number;
}

export interface SummaryReportResponse {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  totals: {
    totalAmount: string;
    totalRequests: number;
    approvedRequests: number;
    declinedRequests: number;
    pendingRequests: number;
    fundsSentRequests: number;
    acknowledgedRequests: number;
  };
  byCategory: CategorySummary[];
}

// Groups report response
export interface GroupsReportResponse {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  totalGroups: number;
  groupsWithFunding: number;
  groupsWithApprovedRequests: number;
  verifiedGroups: number;
}

// Timing report response
export interface TimingReportResponse {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  averageTimeToApproval: number | null; // in hours
  averageTimeToFundsSent: number | null; // in hours
  averageTimeToAcknowledged: number | null; // in hours
  medianTimeToApproval: number | null; // in hours
  requestsAnalyzed: number;
}

// Export data row (for CSV)
export interface ExportDataRow {
  period: string;
  category: string;
  totalAmount: string;
  requestCount: number;
  approvedCount: number;
  declinedCount: number;
  avgTimeToFundingHours: number | null;
}
