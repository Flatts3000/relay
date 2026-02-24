import { z } from 'zod';

// Shared query parameters for paginated list endpoints
export const listQuerySchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

// User role update
export const updateUserRoleSchema = z.object({
  role: z.enum(['hub_admin', 'group_coordinator', 'staff_admin']),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// Filter schemas
export const listGroupsAdminQuerySchema = listQuerySchema.extend({
  status: z.enum(['pending', 'verified', 'revoked']).optional(),
  hubId: z.string().uuid().optional(),
});

export type ListGroupsAdminQuery = z.infer<typeof listGroupsAdminQuerySchema>;

export const listUsersAdminQuerySchema = listQuerySchema.extend({
  role: z.enum(['hub_admin', 'group_coordinator', 'staff_admin']).optional(),
});

export type ListUsersAdminQuery = z.infer<typeof listUsersAdminQuerySchema>;

export const listVerificationAdminQuerySchema = listQuerySchema.extend({
  status: z.enum(['pending', 'approved', 'denied']).optional(),
});

export type ListVerificationAdminQuery = z.infer<typeof listVerificationAdminQuerySchema>;

export const listFundingAdminQuerySchema = listQuerySchema.extend({
  status: z.enum(['submitted', 'approved', 'declined', 'funds_sent', 'acknowledged']).optional(),
  groupId: z.string().uuid().optional(),
});

export type ListFundingAdminQuery = z.infer<typeof listFundingAdminQuerySchema>;

export const auditLogQuerySchema = listQuerySchema.extend({
  userId: z.string().uuid().optional(),
  action: z
    .enum([
      'create',
      'update',
      'delete',
      'login',
      'logout',
      'verify',
      'approve',
      'decline',
      'send_funds',
      'acknowledge',
    ])
    .optional(),
  entityType: z.string().max(50).optional(),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

// UUID param
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// Verification deny
export const denyVerificationSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(1000),
});

export type DenyVerificationInput = z.infer<typeof denyVerificationSchema>;

// Funding decline
export const declineFundingSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(1000),
});

export type DeclineFundingInput = z.infer<typeof declineFundingSchema>;
