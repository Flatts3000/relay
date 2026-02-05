import { z } from 'zod';

export const aidCategories = ['rent', 'food', 'utilities', 'other'] as const;
export type AidCategory = (typeof aidCategories)[number];

export const urgencies = ['normal', 'urgent'] as const;
export type Urgency = (typeof urgencies)[number];

export const requestStatuses = [
  'submitted',
  'approved',
  'declined',
  'funds_sent',
  'acknowledged',
] as const;
export type RequestStatus = (typeof requestStatuses)[number];

// Create funding request schema
export const createFundingRequestSchema = z.object({
  amount: z
    .string()
    .or(z.number())
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Amount must be greater than 0',
    }),
  category: z.enum(aidCategories),
  urgency: z.enum(urgencies).default('normal'),
  region: z.string().min(1).max(255),
  justification: z.string().max(2000).optional(),
});

export type CreateFundingRequestInput = z.infer<typeof createFundingRequestSchema>;

// Decline request schema
export const declineFundingRequestSchema = z.object({
  reason: z
    .string()
    .min(1, 'Decline reason is required')
    .max(1000, 'Decline reason must be 1000 characters or less'),
});

export type DeclineFundingRequestInput = z.infer<typeof declineFundingRequestSchema>;

// Request clarification schema
export const clarifyFundingRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Clarification message is required')
    .max(1000, 'Clarification message must be 1000 characters or less'),
});

export type ClarifyFundingRequestInput = z.infer<typeof clarifyFundingRequestSchema>;

// Request ID param schema
export const requestIdParamSchema = z.object({
  id: z.string().uuid('Invalid request ID format'),
});

// List requests query schema
export const listFundingRequestsQuerySchema = z.object({
  status: z.enum(requestStatuses).optional(),
  category: z.enum(aidCategories).optional(),
  urgency: z.enum(urgencies).optional(),
  sortBy: z.enum(['newest', 'oldest', 'amount_high', 'amount_low', 'urgent']).optional(),
});

export type ListFundingRequestsQuery = z.infer<typeof listFundingRequestsQuerySchema>;

// Funding request response DTO
export interface FundingRequestResponse {
  id: string;
  groupId: string;
  groupName: string;
  amount: string;
  category: AidCategory;
  urgency: Urgency;
  region: string;
  justification: string | null;
  status: RequestStatus;
  declineReason: string | null;
  clarificationRequest: string | null;
  approvedBy: string | null;
  submittedAt: string;
  approvedAt: string | null;
  declinedAt: string | null;
  fundsSentAt: string | null;
  acknowledgedAt: string | null;
}

// Status history response DTO
export interface StatusHistoryResponse {
  id: string;
  status: RequestStatus;
  changedBy: string | null;
  changedAt: string;
  notes: string | null;
}
